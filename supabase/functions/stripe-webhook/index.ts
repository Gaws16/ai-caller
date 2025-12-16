import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "npm:stripe@^20.0.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-12-18.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  const body = await req.text();

  // Verify webhook signature (must use async version in Deno/Edge runtime)
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response(
      `Webhook signature verification failed: ${err.message}`,
      {
        status: 400,
      }
    );
  }

  // Check for idempotency (already processed this event?)
  const { data: existing } = await supabase
    .from("payments")
    .select("id")
    .eq("stripe_event_id", event.id)
    .single();

  if (existing) {
    console.log(`Event ${event.id} already processed, skipping`);
    return new Response(JSON.stringify({ received: true, duplicate: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Handle different event types
  try {
    switch (event.type) {
      case "payment_intent.amount_capturable_updated":
        await handlePaymentAuthorized(event);
        break;

      case "payment_intent.succeeded":
        await handlePaymentSucceeded(event);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentFailed(event);
        break;

      case "payment_intent.canceled":
        await handlePaymentCanceled(event);
        break;

      case "customer.subscription.created":
        await handleSubscriptionCreated(event);
        break;

      case "invoice.paid":
        await handleInvoicePaid(event);
        break;

      case "invoice.payment_failed":
        await handleInvoiceFailed(event);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

async function handlePaymentAuthorized(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const orderId = paymentIntent.metadata.order_id;

  if (!orderId) {
    throw new Error("Order ID not found in payment intent metadata");
  }

  // Retry logic: Order might not exist yet
  let order;
  for (let i = 0; i < 3; i++) {
    const { data } = await supabase
      .from("orders")
      .select("id")
      .eq("id", orderId)
      .single();
    if (data) {
      order = data;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
  }

  if (!order) {
    throw new Error(`Order ${orderId} not found after retry`);
  }

  // Check if a call was already triggered for this order (prevent duplicate calls)
  const { data: existingCall } = await supabase
    .from("calls")
    .select("id, twilio_call_sid")
    .eq("order_id", orderId)
    .limit(1);

  if (
    existingCall &&
    existingCall.length > 0 &&
    existingCall[0].twilio_call_sid
  ) {
    console.log(
      `Call already exists for order ${orderId} with Twilio SID ${existingCall[0].twilio_call_sid}, skipping duplicate webhook`
    );
    // Call was already successfully triggered, don't trigger again
    return;
  }

  console.log(
    `Processing new payment authorization for order ${orderId}, PI: ${paymentIntent.id}`
  );

  // Get payment method details
  const paymentMethod = paymentIntent.payment_method;
  console.log(
    "Payment method from intent:",
    paymentMethod,
    "type:",
    typeof paymentMethod
  );

  let cardDetails = null;
  if (paymentMethod) {
    try {
      // payment_method can be a string ID or an expanded object
      const pmId =
        typeof paymentMethod === "string" ? paymentMethod : paymentMethod.id;
      console.log("Retrieving payment method:", pmId);
      const pm = await stripe.paymentMethods.retrieve(pmId);
      cardDetails = pm.card;
      console.log(
        "Card details retrieved:",
        cardDetails
          ? { brand: cardDetails.brand, last4: cardDetails.last4 }
          : "null"
      );
    } catch (err) {
      console.error("Failed to retrieve payment method:", err);
    }
  } else {
    console.log("No payment method on intent - card details will be null");
  }

  // Create payment record with idempotency key
  const { data: insertedPayment, error: insertError } = await supabase
    .from("payments")
    .insert({
      stripe_event_id: event.id, // Idempotency key!
      order_id: orderId,
      stripe_payment_intent_id: paymentIntent.id,
      amount: paymentIntent.amount / 100, // Convert from cents
      currency: paymentIntent.currency,
      status: "pending",
      payment_method_details: cardDetails
        ? {
            brand: cardDetails.brand,
            last4: cardDetails.last4,
            exp_month: cardDetails.exp_month,
            exp_year: cardDetails.exp_year,
          }
        : null,
    })
    .select();

  if (insertError) {
    console.error("Failed to insert payment record:", insertError);
    throw new Error(`Failed to create payment record: ${insertError.message}`);
  }

  console.log("Payment record created:", insertedPayment);

  // Update order with payment details
  const { error: updateError } = await supabase
    .from("orders")
    .update({
      payment_status: "authorized",
      payment_method_brand: cardDetails?.brand || null,
      payment_method_last4: cardDetails?.last4 || null,
    })
    .eq("id", orderId);

  if (updateError) {
    console.error("Failed to update order with card details:", updateError);
  } else {
    console.log("Order updated with card details:", {
      brand: cardDetails?.brand,
      last4: cardDetails?.last4,
    });
  }

  // TRIGGER CALL
  await triggerCall(orderId);
}

// Helper function to trigger the call - can be reused
async function triggerCall(orderId: string) {
  const webhookBaseUrl = Deno.env.get("TWILIO_WEBHOOK_BASE_URL") || supabaseUrl;
  const initiateCallUrl = `${webhookBaseUrl}/functions/v1/initiate-call`;

  console.log(`Triggering call for order ${orderId}`);

  try {
    const response = await fetch(initiateCallUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ order_id: orderId }),
    });

    if (!response.ok) {
      console.error("Failed to trigger call:", await response.text());
    } else {
      console.log(`Call triggered successfully for order ${orderId}`);
    }
  } catch (error) {
    console.error("Error triggering call:", error);
  }
}

async function handlePaymentSucceeded(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const orderId = paymentIntent.metadata.order_id;

  if (!orderId) {
    return;
  }

  // Create payment record (with idempotency)
  await supabase.from("payments").insert({
    stripe_event_id: event.id,
    order_id: orderId,
    stripe_payment_intent_id: paymentIntent.id,
    amount: paymentIntent.amount / 100,
    currency: paymentIntent.currency,
    status: "succeeded",
    processed_at: new Date().toISOString(),
  });

  // Update order
  await supabase
    .from("orders")
    .update({ payment_status: "paid" })
    .eq("id", orderId);
}

async function handlePaymentFailed(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const orderId = paymentIntent.metadata.order_id;

  if (!orderId) {
    return;
  }

  await supabase
    .from("orders")
    .update({ payment_status: "failed" })
    .eq("id", orderId);
}

async function handlePaymentCanceled(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const orderId = paymentIntent.metadata.order_id;

  if (!orderId) {
    return;
  }

  await supabase
    .from("orders")
    .update({
      payment_status: "cancelled",
      status: "cancelled",
    })
    .eq("id", orderId);
}

async function handleSubscriptionCreated(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  const orderId = subscription.metadata.order_id;

  if (!orderId) {
    return;
  }

  // Update payment record with subscription ID
  await supabase
    .from("payments")
    .update({
      stripe_subscription_id: subscription.id,
      subscription_status: subscription.status,
      subscription_interval:
        subscription.items.data[0]?.price.recurring?.interval || null,
    })
    .eq("order_id", orderId);
}

async function handleInvoicePaid(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  const subscriptionId = invoice.subscription;

  if (!subscriptionId || typeof subscriptionId !== "string") {
    return;
  }

  // Find payment record by subscription ID
  const { data: payment } = await supabase
    .from("payments")
    .select("order_id")
    .eq("stripe_subscription_id", subscriptionId)
    .single();

  if (payment) {
    // Create new payment record for recurring payment
    await supabase.from("payments").insert({
      stripe_event_id: event.id,
      order_id: payment.order_id,
      stripe_subscription_id: subscriptionId,
      stripe_invoice_id: invoice.id,
      amount: invoice.amount_paid / 100,
      currency: invoice.currency,
      status: "succeeded",
      processed_at: new Date().toISOString(),
    });
  }
}

async function handleInvoiceFailed(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  const subscriptionId = invoice.subscription;

  if (!subscriptionId || typeof subscriptionId !== "string") {
    return;
  }

  // Update subscription status
  await supabase
    .from("payments")
    .update({
      subscription_status: "past_due",
    })
    .eq("stripe_subscription_id", subscriptionId);
}

async function handleSubscriptionDeleted(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;

  // Update subscription status
  await supabase
    .from("payments")
    .update({
      subscription_status: "cancelled",
    })
    .eq("stripe_subscription_id", subscription.id);
}
