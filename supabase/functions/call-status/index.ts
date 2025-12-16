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

// NEW: Create and charge PaymentIntent after call confirmation
// This is the SetupIntent flow - we create the PaymentIntent now with the final amount
async function capturePaymentAfterConfirmation(orderId: string) {
  console.log('Creating payment for confirmed order:', orderId)

  // Get payment record with saved payment method
  const { data: payments } = await supabase
    .from('payments')
    .select('id, payment_method_id, stripe_payment_intent_id, amount, currency, status')
    .eq('order_id', orderId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)

  const payment = payments?.[0]

  if (!payment) {
    console.error('Payment record not found for order:', orderId)
    return
  }

  // Get the current order total and customer ID (may have changed during call)
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('total_amount, currency, stripe_customer_id')
    .eq('id', orderId)
    .single()

  if (orderError) {
    console.error('Error fetching order:', orderError.message, orderError.details)
    return
  }

  if (!order) {
    console.error('Order not found:', orderId)
    return
  }

  const finalAmount = Math.round(Number(order.total_amount) * 100) // Convert to cents
  const currency = order.currency || 'usd'
  const customerId = order.stripe_customer_id

  console.log(`Final amount: ${finalAmount} cents (${order.total_amount} ${currency})`)
  console.log(`Customer ID: ${customerId}`)

  // Check if we have a payment method (SetupIntent flow) or payment intent (legacy flow)
  if (payment.payment_method_id) {
    // NEW SetupIntent flow: Create and charge a new PaymentIntent
    try {
      console.log('Using SetupIntent flow with payment_method:', payment.payment_method_id)

      if (!customerId) {
        console.error('No customer ID found for order - cannot charge off-session')
        throw new Error('Customer ID required for off-session payment')
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: finalAmount,
        currency: currency,
        customer: customerId, // Required for off-session payments
        payment_method: payment.payment_method_id,
        confirm: true,
        off_session: true,
        metadata: {
          order_id: orderId,
        },
      })

      console.log('PaymentIntent created and charged:', paymentIntent.id, paymentIntent.status)

      // Update payment record with the new payment intent ID
      await supabase
        .from('payments')
        .update({
          stripe_payment_intent_id: paymentIntent.id,
          amount: order.total_amount,
          status: paymentIntent.status === 'succeeded' ? 'succeeded' : 'pending',
        })
        .eq('id', payment.id)

      // Update order status
      if (paymentIntent.status === 'succeeded') {
        await supabase
          .from('orders')
          .update({ payment_status: 'paid' })
          .eq('id', orderId)
      }

    } catch (error) {
      console.error('Error creating payment:', error)

      // Update payment status to failed
      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', payment.id)

      await supabase
        .from('orders')
        .update({ payment_status: 'failed' })
        .eq('id', orderId)
    }
  } else if (payment.stripe_payment_intent_id) {
    // LEGACY PaymentIntent flow: Capture existing authorization
    try {
      console.log('Using legacy flow, capturing payment_intent:', payment.stripe_payment_intent_id)

      // For legacy flow, we might need to update amount if it changed
      // Note: Can only capture up to authorized amount
      await stripe.paymentIntents.capture(payment.stripe_payment_intent_id, {
        amount_to_capture: finalAmount,
      })

      console.log('Payment captured successfully')
    } catch (error) {
      console.error('Error capturing payment:', error)
    }
  } else {
    console.error('No payment method or payment intent found for order:', orderId)
  }
}

// Handle call cancellation - no charge needed
async function cancelPaymentAfterCallCancellation(orderId: string) {
  console.log('Cancelling order after call rejection:', orderId)

  // Get payment record to check if there's a PaymentIntent to cancel
  const { data: payments } = await supabase
    .from('payments')
    .select('stripe_payment_intent_id, payment_method_id')
    .eq('order_id', orderId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)

  const payment = payments?.[0]

  // If there's an existing PaymentIntent (legacy flow), cancel it
  if (payment?.stripe_payment_intent_id) {
    try {
      await stripe.paymentIntents.cancel(payment.stripe_payment_intent_id)
      console.log('PaymentIntent cancelled')
    } catch (error) {
      console.error('Error cancelling PaymentIntent:', error)
    }
  }

  // For SetupIntent flow, no PaymentIntent exists yet, so nothing to cancel with Stripe
  // Just update the database

  // Update order status
  await supabase
    .from('orders')
    .update({
      payment_status: 'cancelled',
      status: 'cancelled',
    })
    .eq('id', orderId)

  // Update payment status
  await supabase
    .from('payments')
    .update({ status: 'cancelled' })
    .eq('order_id', orderId)
    .eq('status', 'pending')

  console.log('Order cancelled successfully')
}

