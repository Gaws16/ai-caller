import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'npm:stripe@^20.0.0'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-12-18.acacia',
  httpClient: Stripe.createFetchHttpClient(),
})

serve(async (req) => {
  try {
    const formData = await req.formData()
    const callId = new URL(req.url).searchParams.get('call_id')
    const callStatus = formData.get('CallStatus') as string | null
    const callDuration = formData.get('CallDuration') as string | null

    if (!callId) {
      return new Response(JSON.stringify({ error: 'call_id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Update call with status and duration
    await supabase
      .from('calls')
      .update({
        ended_at: new Date().toISOString(),
        duration_seconds: callDuration ? parseInt(callDuration) : null,
      })
      .eq('id', callId)

    // Handle no-answer
    if (callStatus === 'no-answer' || callStatus === 'busy') {
      const { data: call } = await supabase
        .from('calls')
        .select('retry_count')
        .eq('id', callId)
        .single()

      if (call && call.retry_count < 1) {
        // Schedule retry
        const retryDelayMinutes = parseInt(Deno.env.get('RETRY_DELAY_MINUTES') || '120')
        const nextRetry = new Date(Date.now() + retryDelayMinutes * 60 * 1000)

        await supabase
          .from('calls')
          .update({
            outcome: 'no-answer',
            next_retry_at: nextRetry.toISOString(),
          })
          .eq('id', callId)
      } else {
        // Max retries reached
        await supabase
          .from('calls')
          .update({ outcome: 'no-answer' })
          .eq('id', callId)

        // Notify admin (will be implemented in email-notifications)
        console.log(`Call ${callId} failed after maximum retries`)
      }
    }

    // If call completed, process outcome
    if (callStatus === 'completed') {
      await processCallOutcome(callId)
    }

    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('Error in call-status:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})

async function processCallOutcome(callId: string) {
  const { data: call, error: callError } = await supabase
    .from('calls')
    .select('*, orders(*)')
    .eq('id', callId)
    .single()

  if (callError || !call) {
    console.error('Call not found:', callError)
    return
  }

  const order = Array.isArray(call.orders) ? call.orders[0] : call.orders
  if (!order) {
    console.error('Order not found for call:', callId)
    return
  }

  const responses = (call.responses as Record<string, any>) || {}

  // Determine final outcome
  let outcome = 'confirmed'
  let needsCapture = true

  // Check if customer cancelled
  if (Object.values(responses).some((r: any) => r.intent === 'CANCEL')) {
    outcome = 'cancelled'
    needsCapture = false

    // Cancel payment intent
    await cancelPaymentAfterCallCancellation(order.id)
  }
  // Check if customer changed anything
  else if (Object.values(responses).some((r: any) => r.intent === 'CHANGE')) {
    outcome = 'changed'

    // Apply changes to order
    if (responses.ADDRESS_CONFIRMATION?.data?.new_address) {
      await supabase
        .from('orders')
        .update({ delivery_address: responses.ADDRESS_CONFIRMATION.data.new_address })
        .eq('id', order.id)
    }
  }

  // Store delivery preference
  if (responses.DELIVERY_TIME?.data?.delivery_time) {
    await supabase
      .from('orders')
      .update({ delivery_time_preference: responses.DELIVERY_TIME.data.delivery_time })
      .eq('id', order.id)
  }

  // Update call outcome
  await supabase.from('calls').update({ outcome }).eq('id', callId)

  // Capture payment if confirmed
  if (needsCapture) {
    await capturePaymentAfterConfirmation(order.id)
  }
}

async function capturePaymentAfterConfirmation(orderId: string) {
  // Get payment intent ID - use limit(1) instead of single() to handle duplicates gracefully
  const { data: payments, error: paymentError } = await supabase
    .from('payments')
    .select('stripe_payment_intent_id, status')
    .eq('order_id', orderId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)

  const payment = payments?.[0]

  console.log('Looking for payment with order_id:', orderId)
  console.log('Found payments:', payments?.length || 0, 'using first one:', payment)

  if (!payment || !payment.stripe_payment_intent_id) {
    console.error('Payment intent not found for order:', orderId)
    return
  }

  try {
    // Capture the payment
    await stripe.paymentIntents.capture(payment.stripe_payment_intent_id)
    // Stripe will send payment_intent.succeeded webhook which will update the database
  } catch (error) {
    console.error('Error capturing payment:', error)
  }
}

async function cancelPaymentAfterCallCancellation(orderId: string) {
  // Use limit(1) instead of single() to handle duplicates gracefully
  const { data: payments } = await supabase
    .from('payments')
    .select('stripe_payment_intent_id')
    .eq('order_id', orderId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)

  const payment = payments?.[0]

  if (!payment || !payment.stripe_payment_intent_id) {
    console.error('Payment intent not found for order:', orderId)
    return
  }

  try {
    // Cancel the payment intent (release funds)
    await stripe.paymentIntents.cancel(payment.stripe_payment_intent_id)

    // Update database
    await supabase
      .from('orders')
      .update({
        payment_status: 'cancelled',
        status: 'cancelled',
      })
      .eq('id', orderId)
  } catch (error) {
    console.error('Error cancelling payment:', error)
  }
}

