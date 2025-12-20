/**
 * Vapi Webhook Payment Processing
 *
 * Payment processing functions for Vapi webhook events.
 * These functions are designed to work with Edge Runtime.
 */

import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

// Initialize clients for Edge Runtime
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/**
 * Capture payment for an order
 * Handles both one-time payments and subscriptions
 */
export async function capturePayment(orderId: string): Promise<void> {
  console.log("Capturing payment for order:", orderId);

  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("order_id", orderId)
    .eq("status", "pending")
    .limit(1)
    .single();

  if (!payment?.payment_method_id) {
    console.error("No payment method found");
    return;
  }

  const { data: order } = await supabase
    .from("orders")
    .select(
      "total_amount, currency, stripe_customer_id, payment_type, billing_cycle, items"
    )
    .eq("id", orderId)
    .single();

  if (!order?.stripe_customer_id) {
    console.error("No customer ID found");
    return;
  }

  const finalAmount = Math.round(Number(order.total_amount) * 100);
  const currency = order.currency || "usd";

  try {
    // Check if this is a subscription order
    if (order.payment_type === "subscription") {
      await createSubscription(orderId, order, payment, finalAmount, currency);
    } else {
      await createOneTimePayment(
        orderId,
        order,
        payment,
        finalAmount,
        currency
      );
    }
  } catch (error: any) {
    console.error("Payment capture failed:", error.message);
    await supabase.from("payments").update({ status: "failed" }).eq("id", payment.id);
    await supabase
      .from("orders")
      .update({ payment_status: "failed" })
      .eq("id", orderId);
  }
}

/**
 * Create a subscription payment
 */
async function createSubscription(
  orderId: string,
  order: any,
  payment: any,
  finalAmount: number,
  currency: string
): Promise<void> {
  console.log("Creating subscription for order:", orderId);

  if (!order.billing_cycle) {
    console.error("Billing cycle is required for subscription orders");
    return;
  }

      // Get product name from order items
      const items = order.items as Array<{ name?: string }> | null;
      const productName = Array.isArray(items) && items.length > 0 && items[0]
        ? items[0].name || "Subscription"
        : "Subscription";

  // Create or get product and price
  const product = await getOrCreateProduct(productName, orderId);
  const price = await getOrCreatePrice(
    product.id,
    orderId,
    finalAmount,
    currency,
    order.billing_cycle
  );

  // Create subscription
  const subscription = await stripe.subscriptions.create({
    customer: order.stripe_customer_id,
    items: [{ price: price.id }],
    default_payment_method: payment.payment_method_id,
    metadata: { order_id: orderId },
    expand: ["latest_invoice.payment_intent"],
  });

  console.log("Subscription created:", subscription.id, subscription.status);

  // Update payment record
  const interval = order.billing_cycle === "monthly" ? "month" : "year";
  await supabase
    .from("payments")
    .update({
      stripe_subscription_id: subscription.id,
      amount: order.total_amount,
      status: subscription.status === "active" ? "succeeded" : "pending",
      subscription_interval: interval,
      subscription_status: subscription.status,
    })
    .eq("id", payment.id);

  // Update order status
  if (subscription.status === "active") {
    await supabase
      .from("orders")
      .update({ payment_status: "paid" })
      .eq("id", orderId);
  }

  console.log("Subscription created successfully:", subscription.id);
}

/**
 * Create a one-time payment
 */
async function createOneTimePayment(
  orderId: string,
  order: any,
  payment: any,
  finalAmount: number,
  currency: string
): Promise<void> {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: finalAmount,
    currency: currency,
    customer: order.stripe_customer_id,
    payment_method: payment.payment_method_id,
    confirm: true,
    off_session: true,
    metadata: { order_id: orderId },
  });

  await supabase
    .from("payments")
    .update({
      stripe_payment_intent_id: paymentIntent.id,
      status:
        paymentIntent.status === "succeeded" ? "succeeded" : "pending",
    })
    .eq("id", payment.id);

  if (paymentIntent.status === "succeeded") {
    await supabase
      .from("orders")
      .update({ payment_status: "paid" })
      .eq("id", orderId);
  }

  console.log("Payment captured:", paymentIntent.id);
}

/**
 * Get or create a Stripe product
 */
async function getOrCreateProduct(
  productName: string,
  orderId: string
): Promise<Stripe.Product> {
  // Search for existing product
  const existingProducts = await stripe.products.search({
    query: `name:'${productName}' AND metadata['order_id']:'${orderId}'`,
    limit: 1,
  });

  if (existingProducts.data.length > 0) {
    return existingProducts.data[0];
  }

  // Create new product
  return await stripe.products.create({
    name: productName,
    metadata: { order_id: orderId },
  });
}

/**
 * Get or create a Stripe price
 */
async function getOrCreatePrice(
  productId: string,
  orderId: string,
  amount: number,
  currency: string,
  billingCycle: string
): Promise<Stripe.Price> {
  const interval = billingCycle === "monthly" ? "month" : "year";

  // Search for existing price
  const existingPrices = await stripe.prices.list({
    product: productId,
    active: true,
    limit: 10,
  });

  const price = existingPrices.data.find(
    (p) =>
      p.recurring?.interval === interval &&
      p.unit_amount === amount &&
      p.currency === currency
  );

  if (price) {
    return price;
  }

  // Create new price
  return await stripe.prices.create({
    product: productId,
    unit_amount: amount,
    currency: currency,
    recurring: { interval },
    metadata: { order_id: orderId },
  });
}

/**
 * Cancel payment for an order
 */
export async function cancelPayment(orderId: string): Promise<void> {
  console.log("Cancelling payment for order:", orderId);

  await supabase
    .from("orders")
    .update({ payment_status: "cancelled", status: "cancelled" })
    .eq("id", orderId);

  await supabase
    .from("payments")
    .update({ status: "cancelled" })
    .eq("order_id", orderId)
    .eq("status", "pending");
}

