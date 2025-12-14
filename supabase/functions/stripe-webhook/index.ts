import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'npm:stripe@^20.0.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-12-18.acacia',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  const body = await req.text()

  // Verify webhook signature
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return new Response(`Webhook signature verification failed: ${err.message}`, {
      status: 400,
    })
  }

  // Check for idempotency (already processed this event?)
  const { data: existing } = await supabase
    .from('payments')
    .select('id')
    .eq('stripe_event_id', event.id)
    .single()

  if (existing) {
    console.log(`Event ${event.id} already processed, skipping`)
    return new Response(JSON.stringify({ received: true, duplicate: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Handle different event types
  try {
    switch (event.type) {
      case 'payment_intent.amount_capturable_updated':
        await handlePaymentAuthorized(event)
        break

      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event)
        break

      case 'payment_intent.canceled':
        await handlePaymentCanceled(event)
        break

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event)
        break

      case 'invoice.paid':
        await handleInvoicePaid(event)
        break

      case 'invoice.payment_failed':
        await handleInvoiceFailed(event)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})

async function handlePaymentAuthorized(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent
  const orderId = paymentIntent.metadata.order_id

  if (!orderId) {
    throw new Error('Order ID not found in payment intent metadata')
  }

  // Retry logic: Order might not exist yet
  let order
  for (let i = 0; i < 3; i++) {
    const { data } = await supabase.from('orders').select('id').eq('id', orderId).single()
    if (data) {
      order = data
      break
    }
    await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)))
  }

  if (!order) {
    throw new Error(`Order ${orderId} not found after retry`)
  }

  // Get payment method details
  const paymentMethod = paymentIntent.payment_method
  let cardDetails = null
  if (typeof paymentMethod === 'object' && paymentMethod) {
    const pm = await stripe.paymentMethods.retrieve(paymentMethod as string)
    cardDetails = pm.card
  }

  // Create payment record with idempotency key
  await supabase.from('payments').insert({
    stripe_event_id: event.id, // Idempotency key!
    order_id: orderId,
    stripe_payment_intent_id: paymentIntent.id,
    amount: paymentIntent.amount / 100, // Convert from cents
    currency: paymentIntent.currency,
    status: 'pending',
    payment_method_details: cardDetails
      ? {
          brand: cardDetails.brand,
          last4: cardDetails.last4,
          exp_month: cardDetails.exp_month,
          exp_year: cardDetails.exp_year,
        }
      : null,
  })

  // Update order
  await supabase
    .from('orders')
    .update({
      payment_status: 'authorized',
      payment_method_brand: cardDetails?.brand || null,
      payment_method_last4: cardDetails?.last4 || null,
    })
    .eq('id', orderId)

  // TRIGGER CALL
  const webhookBaseUrl = Deno.env.get('TWILIO_WEBHOOK_BASE_URL') || supabaseUrl
  const initiateCallUrl = `${webhookBaseUrl}/functions/v1/initiate-call`

  try {
    const response = await fetch(initiateCallUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ order_id: orderId }),
    })

    if (!response.ok) {
      console.error('Failed to trigger call:', await response.text())
    }
  } catch (error) {
    console.error('Error triggering call:', error)
  }
}

async function handlePaymentSucceeded(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent
  const orderId = paymentIntent.metadata.order_id

  if (!orderId) {
    return
  }

  // Create payment record (with idempotency)
  await supabase.from('payments').insert({
    stripe_event_id: event.id,
    order_id: orderId,
    stripe_payment_intent_id: paymentIntent.id,
    amount: paymentIntent.amount / 100,
    currency: paymentIntent.currency,
    status: 'succeeded',
    processed_at: new Date().toISOString(),
  })

  // Update order
  await supabase.from('orders').update({ payment_status: 'paid' }).eq('id', orderId)
}

async function handlePaymentFailed(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent
  const orderId = paymentIntent.metadata.order_id

  if (!orderId) {
    return
  }

  await supabase.from('orders').update({ payment_status: 'failed' }).eq('id', orderId)
}

async function handlePaymentCanceled(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent
  const orderId = paymentIntent.metadata.order_id

  if (!orderId) {
    return
  }

  await supabase
    .from('orders')
    .update({
      payment_status: 'cancelled',
      status: 'cancelled',
    })
    .eq('id', orderId)
}

async function handleSubscriptionCreated(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription
  const orderId = subscription.metadata.order_id

  if (!orderId) {
    return
  }

  // Update payment record with subscription ID
  await supabase
    .from('payments')
    .update({
      stripe_subscription_id: subscription.id,
      subscription_status: subscription.status,
      subscription_interval: subscription.items.data[0]?.price.recurring?.interval || null,
    })
    .eq('order_id', orderId)
}

async function handleInvoicePaid(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice
  const subscriptionId = invoice.subscription

  if (!subscriptionId || typeof subscriptionId !== 'string') {
    return
  }

  // Find payment record by subscription ID
  const { data: payment } = await supabase
    .from('payments')
    .select('order_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (payment) {
    // Create new payment record for recurring payment
    await supabase.from('payments').insert({
      stripe_event_id: event.id,
      order_id: payment.order_id,
      stripe_subscription_id: subscriptionId,
      stripe_invoice_id: invoice.id,
      amount: invoice.amount_paid / 100,
      currency: invoice.currency,
      status: 'succeeded',
      processed_at: new Date().toISOString(),
    })
  }
}

async function handleInvoiceFailed(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice
  const subscriptionId = invoice.subscription

  if (!subscriptionId || typeof subscriptionId !== 'string') {
    return
  }

  // Update subscription status
  await supabase
    .from('payments')
    .update({
      subscription_status: 'past_due',
    })
    .eq('stripe_subscription_id', subscriptionId)
}

async function handleSubscriptionDeleted(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription

  // Update subscription status
  await supabase
    .from('payments')
    .update({
      subscription_status: 'cancelled',
    })
    .eq('stripe_subscription_id', subscription.id)
}

