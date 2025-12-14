import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import twilio from 'npm:twilio@^5.10.7'
import Anthropic from 'npm:@anthropic-ai/sdk@^0.71.2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')!
const webhookBaseUrl = Deno.env.get('TWILIO_WEBHOOK_BASE_URL') || supabaseUrl

const anthropic = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY')!,
})

serve(async (req) => {
  // Verify Twilio signature
  const signature = req.headers.get('X-Twilio-Signature')
  const url = req.url
  const formData = await req.formData()
  const params = Object.fromEntries(formData.entries())

  const isValid = twilio.validateRequest(
    twilioAuthToken,
    signature || '',
    url,
    params
  )

  if (!isValid) {
    return new Response('Forbidden', { status: 403 })
  }

  // Extract parameters
  const callId = new URL(req.url).searchParams.get('call_id')
  const speechResult = formData.get('SpeechResult') as string | null
  const callSid = formData.get('CallSid') as string | null

  if (!callId) {
    return new Response('Missing call_id', { status: 400 })
  }

  // Load call and order data
  const { data: call, error: callError } = await supabase
    .from('calls')
    .select('*, orders(*)')
    .eq('id', callId)
    .single()

  if (callError || !call) {
    return new Response('Call not found', { status: 404 })
  }

  const order = Array.isArray(call.orders) ? call.orders[0] : call.orders
  if (!order) {
    return new Response('Order not found', { status: 404 })
  }

  const currentStep = call.current_step || 'ORDER_CONFIRMATION'

  // Process user's speech (if any)
  let intent: string | null = null
  let extractedData: any = {}

  if (speechResult && currentStep !== 'ORDER_CONFIRMATION') {
    try {
      const result = await classifyIntentWithClaude(speechResult, currentStep, order)
      intent = result.intent
      extractedData = result.data

      // Store response
      const responses = (call.responses as Record<string, any>) || {}
      responses[currentStep] = { speech: speechResult, intent, data: extractedData }

      await supabase
        .from('calls')
        .update({ responses })
        .eq('id', callId)
    } catch (error) {
      console.error('Error classifying intent:', error)
      // Fallback to keyword classification
      intent = simpleKeywordClassification(speechResult, currentStep)
    }
  }

  // Determine next step
  const nextStep = getNextStep(currentStep, intent, speechResult)

  // Update call state
  await supabase
    .from('calls')
    .update({ current_step: nextStep })
    .eq('id', callId)

  // Generate TwiML response
  const twiml = generateTwiML(nextStep, order, extractedData, callId)

  return new Response(twiml, {
    headers: { 'Content-Type': 'text/xml' },
  })
})

async function classifyIntentWithClaude(
  speechResult: string,
  currentStep: string,
  order: any
): Promise<{ intent: string; data: any }> {
  const prompt = buildPromptForStep(currentStep, speechResult, order)

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const response = message.content[0]
  const text = response.type === 'text' ? response.text : ''

  // Parse Claude's response (expecting JSON)
  try {
    return JSON.parse(text)
  } catch {
    return { intent: 'UNCLEAR', data: {} }
  }
}

function buildPromptForStep(step: string, speech: string, order: any): string {
  const items = Array.isArray(order.items) ? order.items : []
  const itemsList = items.map((i: any) => `${i.quantity} ${i.name}`).join(', ')

  const prompts: Record<string, string> = {
    ORDER_CONFIRMATION: `
You are analyzing a customer's response to an order confirmation question.

Order details: ${JSON.stringify(items)}
Customer said: "${speech}"

Classify the customer's intent. Respond with JSON only:
{
  "intent": "CONFIRM" | "DENY" | "CANCEL" | "UNCLEAR",
  "data": {}
}

Intent definitions:
- CONFIRM: Customer agrees with the order (e.g., "yes", "correct", "that's right")
- DENY: Customer disagrees but doesn't want to cancel (e.g., "no that's wrong", "I didn't order that")
- CANCEL: Customer wants to cancel the order (e.g., "cancel", "I don't want it anymore")
- UNCLEAR: Can't determine intent or customer asked to repeat
`,
    ADDRESS_CONFIRMATION: `
You are analyzing a customer's response to an address confirmation question.

Current address: ${order.delivery_address}
Customer said: "${speech}"

Classify intent and extract new address if provided. Respond with JSON only:
{
  "intent": "CONFIRM" | "CHANGE" | "UNCLEAR",
  "data": {
    "new_address": "..." // Only if intent is CHANGE
  }
}

Intent definitions:
- CONFIRM: Customer confirms address is correct
- CHANGE: Customer wants to change address (extract new address from speech)
- UNCLEAR: Can't determine or customer asked to repeat
`,
    PAYMENT_CONFIRMATION: `
You are analyzing a customer's response to a payment method confirmation.

Payment method: ${order.payment_method_brand} ending in ${order.payment_method_last4}
Payment type: ${order.payment_type}
Customer said: "${speech}"

Classify intent. Respond with JSON only:
{
  "intent": "CONFIRM" | "CHANGE_METHOD" | "CANCEL" | "UNCLEAR",
  "data": {}
}

Intent definitions:
- CONFIRM: Customer confirms payment method is correct
- CHANGE_METHOD: Customer wants to use different payment method
- CANCEL: Customer wants to cancel
- UNCLEAR: Can't determine intent
`,
    DELIVERY_TIME: `
You are analyzing a customer's delivery time preference.

Customer said: "${speech}"

Extract delivery time preference. Respond with JSON only:
{
  "intent": "SPECIFIED",
  "data": {
    "delivery_time": "morning" | "afternoon" | "evening" | "any"
  }
}

Map the customer's speech to one of the time slots.
If they say "any time" or "doesn't matter", use "any".
`,
  }

  return prompts[step] || 'Unable to process this step.'
}

function simpleKeywordClassification(speech: string, step: string): string {
  const lower = speech.toLowerCase()

  // Positive confirmations
  if (/(yes|correct|right|confirm|yep|yeah|sure|ok)/i.test(lower)) {
    return 'CONFIRM'
  }

  // Negative/Change
  if (/(no|wrong|change|different|update)/i.test(lower)) {
    return 'CHANGE'
  }

  // Cancel
  if (/(cancel|don't want|nevermind|stop)/i.test(lower)) {
    return 'CANCEL'
  }

  return 'UNCLEAR'
}

function getNextStep(
  current: string,
  intent: string | null,
  speech: string | null
): string {
  // If customer cancelled at any point
  if (intent === 'CANCEL') {
    return 'CALL_COMPLETE_CANCELLED'
  }

  // If unclear, ask again
  if (intent === 'UNCLEAR') {
    return current // Stay on same step
  }

  // State transitions
  const transitions: Record<string, string> = {
    ORDER_CONFIRMATION: 'ADDRESS_CONFIRMATION',
    ADDRESS_CONFIRMATION: 'PAYMENT_CONFIRMATION',
    PAYMENT_CONFIRMATION: 'DELIVERY_TIME',
    DELIVERY_TIME: 'CALL_COMPLETE_CONFIRMED',
  }

  return transitions[current] || 'CALL_COMPLETE_CONFIRMED'
}

function generateTwiML(
  step: string,
  order: any,
  extractedData: any,
  callId: string
): string {
  const baseUrl = webhookBaseUrl
  const items = Array.isArray(order.items) ? order.items : []
  const itemsList = items.map((i: any) => `${i.quantity} ${i.name}`).join(', ')

  switch (step) {
    case 'ORDER_CONFIRMATION':
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" timeout="5" action="${baseUrl}/functions/v1/call-handler?call_id=${callId}">
    <Say voice="Polly.Joanna">
      Hello! This is our store calling to confirm your order.
      You ordered ${itemsList}. Is this correct?
    </Say>
  </Gather>
  <Say>We didn't receive your response. Please try again.</Say>
  <Redirect>${baseUrl}/functions/v1/call-handler?call_id=${callId}</Redirect>
</Response>`

    case 'ADDRESS_CONFIRMATION':
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" timeout="5" action="${baseUrl}/functions/v1/call-handler?call_id=${callId}">
    <Say voice="Polly.Joanna">
      Great! Your delivery address is ${order.delivery_address}. Is this correct? 
      If you need to change it, please say the new address.
    </Say>
  </Gather>
  <Say>We didn't receive your response. Please try again.</Say>
  <Redirect>${baseUrl}/functions/v1/call-handler?call_id=${callId}</Redirect>
</Response>`

    case 'PAYMENT_CONFIRMATION':
      let paymentMessage = ''
      if (order.payment_type === 'subscription') {
        paymentMessage = `Your monthly subscription of $${order.total_amount} will be charged to your ${order.payment_method_brand} ending in ${order.payment_method_last4}`
      } else {
        paymentMessage = `Your payment of $${order.total_amount} will be charged to your ${order.payment_method_brand} ending in ${order.payment_method_last4}`
      }

      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" timeout="5" action="${baseUrl}/functions/v1/call-handler?call_id=${callId}">
    <Say voice="Polly.Joanna">
      ${paymentMessage}. Is this correct?
    </Say>
  </Gather>
  <Say>We didn't receive your response. Please try again.</Say>
  <Redirect>${baseUrl}/functions/v1/call-handler?call_id=${callId}</Redirect>
</Response>`

    case 'DELIVERY_TIME':
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" timeout="5" action="${baseUrl}/functions/v1/call-handler?call_id=${callId}">
    <Say voice="Polly.Joanna">
      When would you prefer delivery? You can choose morning, afternoon, or evening.
    </Say>
  </Gather>
  <Say>We didn't receive your response. Please try again.</Say>
  <Redirect>${baseUrl}/functions/v1/call-handler?call_id=${callId}</Redirect>
</Response>`

    case 'CALL_COMPLETE_CONFIRMED':
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">
    Thank you! Your order has been confirmed. 
    ${extractedData.delivery_time ? `We'll deliver during the ${extractedData.delivery_time}.` : ''}
    Have a great day!
  </Say>
  <Hangup/>
</Response>`

    case 'CALL_COMPLETE_CANCELLED':
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">
    We understand. Your order has been cancelled and you will not be charged. 
    Thank you for letting us know.
  </Say>
  <Hangup/>
</Response>`

    default:
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">We're experiencing technical difficulties. Please call us directly.</Say>
  <Hangup/>
</Response>`
  }
}

