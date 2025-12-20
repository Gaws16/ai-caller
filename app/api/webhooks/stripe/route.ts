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
import {
  initiateOrderConfirmationCall,
  isWithinCallingHours,
  getNextCallingTime,
} from '@/lib/vapi/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

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

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event, supabase);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event, supabase);
        break;

      case 'invoice.payment_failed':
        await handleInvoiceFailed(event, supabase);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event, supabase);
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
  await triggerVapiCall(orderId, supabase);
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
  await triggerVapiCall(orderId, supabase);
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
 * Handle subscription created - store subscription ID in payment record
 */
async function handleSubscriptionCreated(event: Stripe.Event, supabase: any) {
  const subscription = event.data.object as Stripe.Subscription;
  const orderId = subscription.metadata?.order_id;

  if (!orderId) {
    console.log('No order_id in subscription metadata, skipping');
    return;
  }

  // Update payment record with subscription ID
  await supabase
    .from('payments')
    .update({
      stripe_subscription_id: subscription.id,
      subscription_status: subscription.status,
      subscription_interval:
        subscription.items.data[0]?.price.recurring?.interval || null,
    })
    .eq('order_id', orderId)
    .eq('status', 'pending');
}

/**
 * Handle invoice paid - recurring subscription payment succeeded
 */
async function handleInvoicePaid(event: Stripe.Event, supabase: any) {
  const invoice = event.data.object as Stripe.Invoice;
  const subscriptionId = invoice.subscription;

  if (!subscriptionId || typeof subscriptionId !== 'string') {
    return;
  }

  // Find payment record by subscription ID
  const { data: payment } = await supabase
    .from('payments')
    .select('order_id')
    .eq('stripe_subscription_id', subscriptionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!payment) {
    console.log('No payment record found for subscription:', subscriptionId);
    return;
  }

  // Create new payment record for this recurring payment
  await supabase.from('payments').insert({
    stripe_event_id: event.id,
    stripe_subscription_id: subscriptionId,
    stripe_invoice_id: invoice.id,
    order_id: payment.order_id,
    amount: invoice.amount_paid / 100,
    currency: invoice.currency,
    status: 'succeeded',
    processed_at: new Date().toISOString(),
  });
}

/**
 * Handle invoice payment failed - subscription payment failed
 */
async function handleInvoiceFailed(event: Stripe.Event, supabase: any) {
  const invoice = event.data.object as Stripe.Invoice;
  const subscriptionId = invoice.subscription;

  if (!subscriptionId || typeof subscriptionId !== 'string') {
    return;
  }

  // Update subscription status
  await supabase
    .from('payments')
    .update({
      subscription_status: 'past_due',
    })
    .eq('stripe_subscription_id', subscriptionId);
}

/**
 * Handle subscription deleted - subscription cancelled
 */
async function handleSubscriptionDeleted(event: Stripe.Event, supabase: any) {
  const subscription = event.data.object as Stripe.Subscription;

  // Update subscription status
  await supabase
    .from('payments')
    .update({
      subscription_status: 'cancelled',
    })
    .eq('stripe_subscription_id', subscription.id);
}

/**
 * Trigger a Vapi call for order confirmation
 * Directly calls Vapi API instead of internal HTTP request to avoid deployment protection issues
 */
async function triggerVapiCall(orderId: string, supabase: any) {
  console.log(`Triggering Vapi call for order ${orderId}`);

  try {
    // Fetch order details
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !orderData) {
      console.error('Order not found for Vapi call:', orderError);
      return;
    }

    const order = orderData;

    // Check calling hours (disabled for testing - set CALL_HOURS_START=0 and CALL_HOURS_END=24 to enable 24/7)
    const skipCallingHoursCheck = process.env.SKIP_CALLING_HOURS_CHECK === 'true';
    if (!skipCallingHoursCheck && !isWithinCallingHours()) {
      const nextCallTime = getNextCallingTime();

      // Create call record scheduled for later (outcome stays null until call happens)
      const { data: scheduledCall, error: scheduleError } = await supabase
        .from('calls')
        .insert({
          order_id: orderId,
          current_step: 'SCHEDULED',
          next_retry_at: nextCallTime.toISOString(),
        })
        .select()
        .single();

      if (scheduleError) {
        console.error('Error scheduling call:', scheduleError);
        return;
      }

      console.log(`Call scheduled for ${nextCallTime.toISOString()}`);
      return;
    }

    // Create call record first
    const { data: callRecord, error: callError } = await supabase
      .from('calls')
      .insert({
        order_id: orderId,
        started_at: new Date().toISOString(),
        current_step: 'VAPI_INITIATED',
      })
      .select()
      .single();

    if (callError || !callRecord) {
      console.error('Error creating call record:', callError);
      return;
    }

    // Initiate Vapi call directly
    const vapiCall = await initiateOrderConfirmationCall(
      {
        id: order.id,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        items: order.items as Array<{
          name: string;
          quantity: number;
          price: number;
        }>,
        total_amount: Number(order.total_amount),
        delivery_address: order.delivery_address,
        payment_method_brand: order.payment_method_brand,
        payment_method_last4: order.payment_method_last4,
      },
      callRecord.id
    );

    // Update call record with Vapi call ID
    await supabase
      .from('calls')
      .update({
        vapi_call_id: vapiCall.id,
      })
      .eq('id', callRecord.id);

    console.log(`Vapi call initiated: ${vapiCall.id} for order ${orderId}`);
  } catch (error: any) {
    console.error('Error triggering Vapi call:', error.message);
  }
}
