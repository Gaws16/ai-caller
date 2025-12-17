/**
 * Stripe Webhook Handler (Vercel)
 *
 * Handles Stripe webhook events and triggers Vapi calls for order confirmation.
 * This replaces the Supabase edge function for Stripe webhooks.
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { createServiceClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.acacia' as any,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${err.message}` },
      { status: 400 }
    );
  }

  const supabase = await createServiceClient();

  // Check for idempotency
  const { data: existing } = await supabase
    .from('payments')
    .select('id')
    .eq('stripe_event_id', event.id)
    .single();

  if (existing) {
    console.log(`Event ${event.id} already processed, skipping`);
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case 'setup_intent.succeeded':
        await handleSetupIntentSucceeded(event, supabase);
        break;

      case 'payment_intent.amount_capturable_updated':
        // Legacy flow - kept for backwards compatibility
        await handlePaymentAuthorized(event, supabase);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event, supabase);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event, supabase);
        break;

      case 'payment_intent.canceled':
        await handlePaymentCanceled(event, supabase);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle SetupIntent succeeded - card saved, trigger Vapi call
 */
async function handleSetupIntentSucceeded(event: Stripe.Event, supabase: any) {
  const setupIntent = event.data.object as Stripe.SetupIntent;
  const orderId = setupIntent.metadata?.order_id;

  console.log(`SetupIntent succeeded for order ${orderId}`);

  if (!orderId) {
    console.log('No order_id in SetupIntent metadata, skipping');
    return;
  }

  // Wait for order to exist (might be created slightly after)
  let order;
  for (let i = 0; i < 3; i++) {
    const { data } = await supabase
      .from('orders')
      .select('id, customer_phone, payment_status')
      .eq('id', orderId)
      .single();
    if (data) {
      order = data;
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
  }

  if (!order) {
    throw new Error(`Order ${orderId} not found after retry`);
  }

  // Check if call already exists
  const { data: existingCall } = await supabase
    .from('calls')
    .select('id')
    .eq('order_id', orderId)
    .limit(1);

  if (existingCall && existingCall.length > 0) {
    console.log(`Call already exists for order ${orderId}, skipping`);
    return;
  }

  // Update order status
  await supabase
    .from('orders')
    .update({ payment_status: 'authorized' })
    .eq('id', orderId);

  // Trigger Vapi call
  await triggerVapiCall(orderId);
}

/**
 * Legacy: Handle PaymentIntent authorization
 */
async function handlePaymentAuthorized(event: Stripe.Event, supabase: any) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const orderId = paymentIntent.metadata?.order_id;

  if (!orderId) {
    throw new Error('Order ID not found in payment intent metadata');
  }

  // Check if call already exists
  const { data: existingCall } = await supabase
    .from('calls')
    .select('id, vapi_call_id, twilio_call_sid')
    .eq('order_id', orderId)
    .limit(1);

  if (existingCall && existingCall.length > 0 &&
      (existingCall[0].vapi_call_id || existingCall[0].twilio_call_sid)) {
    console.log(`Call already exists for order ${orderId}, skipping`);
    return;
  }

  // Get payment method details
  let cardDetails = null;
  if (paymentIntent.payment_method) {
    try {
      const pmId = typeof paymentIntent.payment_method === 'string'
        ? paymentIntent.payment_method
        : paymentIntent.payment_method.id;
      const pm = await stripe.paymentMethods.retrieve(pmId);
      cardDetails = pm.card;
    } catch (err) {
      console.error('Failed to retrieve payment method:', err);
    }
  }

  // Create payment record
  await supabase.from('payments').insert({
    stripe_event_id: event.id,
    order_id: orderId,
    stripe_payment_intent_id: paymentIntent.id,
    amount: paymentIntent.amount / 100,
    currency: paymentIntent.currency,
    status: 'pending',
    payment_method_details: cardDetails ? {
      brand: cardDetails.brand,
      last4: cardDetails.last4,
      exp_month: cardDetails.exp_month,
      exp_year: cardDetails.exp_year,
    } : null,
  });

  // Update order
  await supabase
    .from('orders')
    .update({
      payment_status: 'authorized',
      payment_method_brand: cardDetails?.brand || null,
      payment_method_last4: cardDetails?.last4 || null,
    })
    .eq('id', orderId);

  // Trigger Vapi call
  await triggerVapiCall(orderId);
}

async function handlePaymentSucceeded(event: Stripe.Event, supabase: any) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const orderId = paymentIntent.metadata?.order_id;

  if (!orderId) return;

  await supabase.from('payments').insert({
    stripe_event_id: event.id,
    order_id: orderId,
    stripe_payment_intent_id: paymentIntent.id,
    amount: paymentIntent.amount / 100,
    currency: paymentIntent.currency,
    status: 'succeeded',
    processed_at: new Date().toISOString(),
  });

  await supabase
    .from('orders')
    .update({ payment_status: 'paid' })
    .eq('id', orderId);
}

async function handlePaymentFailed(event: Stripe.Event, supabase: any) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const orderId = paymentIntent.metadata?.order_id;

  if (!orderId) return;

  await supabase
    .from('orders')
    .update({ payment_status: 'failed' })
    .eq('id', orderId);
}

async function handlePaymentCanceled(event: Stripe.Event, supabase: any) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const orderId = paymentIntent.metadata?.order_id;

  if (!orderId) return;

  await supabase
    .from('orders')
    .update({ payment_status: 'cancelled', status: 'cancelled' })
    .eq('id', orderId);
}

/**
 * Trigger a Vapi call for order confirmation
 */
async function triggerVapiCall(orderId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  console.log(`Triggering Vapi call for order ${orderId}`);

  try {
    const response = await fetch(`${baseUrl}/api/vapi/initiate-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ order_id: orderId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to trigger Vapi call:', errorText);
    } else {
      const data = await response.json();
      console.log(`Vapi call initiated: ${data.vapi_call_id}`);
    }
  } catch (error) {
    console.error('Error triggering Vapi call:', error);
  }
}
