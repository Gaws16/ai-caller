/**
 * Payment Processing Module
 *
 * Extracted from call-status edge function for reuse across
 * Twilio and Vapi implementations.
 */

import { stripe } from "./stripe";
import { createServiceClient } from "./supabase/server";
import type { Database } from "./supabase/types";

/**
 * Capture payment after order confirmation
 * Uses the SetupIntent flow - creates and charges a new PaymentIntent
 */
export async function capturePaymentAfterConfirmation(
  orderId: string
): Promise<{
  success: boolean;
  paymentIntentId?: string;
  error?: string;
}> {
  console.log("Creating payment for confirmed order:", orderId);

  const supabase = await createServiceClient();

  // Get payment record with saved payment method
  const { data: payments, error: paymentError } = await supabase
    .from("payments")
    .select(
      "id, payment_method_id, stripe_payment_intent_id, amount, currency, status"
    )
    .eq("order_id", orderId)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1);

  if (paymentError) {
    console.error("Error fetching payment:", paymentError);
    return { success: false, error: paymentError.message };
  }

  const payment = payments?.[0] as
    | Pick<
        Database["public"]["Tables"]["payments"]["Row"],
        | "id"
        | "payment_method_id"
        | "stripe_payment_intent_id"
        | "amount"
        | "currency"
        | "status"
      >
    | undefined;

  if (!payment) {
    console.error("Payment record not found for order:", orderId);
    return { success: false, error: "Payment record not found" };
  }

  // Get the current order total and customer ID (may have changed during call)
  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .select("total_amount, currency, stripe_customer_id")
    .eq("id", orderId)
    .single();

  if (orderError) {
    console.error("Error fetching order:", orderError.message);
    return { success: false, error: orderError.message };
  }

  const order = orderData as Pick<
    Database["public"]["Tables"]["orders"]["Row"],
    "total_amount" | "currency" | "stripe_customer_id"
  > | null;
  if (!order) {
    console.error("Order not found:", orderId);
    return { success: false, error: "Order not found" };
  }

  const finalAmount = Math.round(Number(order.total_amount) * 100); // Convert to cents
  const currency = order.currency || "usd";
  const customerId = order.stripe_customer_id;

  console.log(
    `Final amount: ${finalAmount} cents (${order.total_amount} ${currency})`
  );
  console.log(`Customer ID: ${customerId}`);

  // Check if we have a payment method (SetupIntent flow) or payment intent (legacy flow)
  if (payment.payment_method_id) {
    // NEW SetupIntent flow: Create and charge a new PaymentIntent
    try {
      console.log(
        "Using SetupIntent flow with payment_method:",
        payment.payment_method_id
      );

      if (!customerId) {
        console.error(
          "No customer ID found for order - cannot charge off-session"
        );
        return {
          success: false,
          error: "Customer ID required for off-session payment",
        };
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
      });

      console.log(
        "PaymentIntent created and charged:",
        paymentIntent.id,
        paymentIntent.status
      );

      // Update payment record with the new payment intent ID
      await (supabase.from("payments") as any)
        .update({
          stripe_payment_intent_id: paymentIntent.id,
          amount: order.total_amount,
          status:
            paymentIntent.status === "succeeded" ? "succeeded" : "pending",
        })
        .eq("id", payment.id);

      // Update order status
      if (paymentIntent.status === "succeeded") {
        await (supabase.from("orders") as any)
          .update({ payment_status: "paid" })
          .eq("id", orderId);
      }

      return { success: true, paymentIntentId: paymentIntent.id };
    } catch (error: any) {
      console.error("Error creating payment:", error);

      // Update payment status to failed
      await (supabase.from("payments") as any)
        .update({ status: "failed" })
        .eq("id", payment.id);

      await (supabase.from("orders") as any)
        .update({ payment_status: "failed" })
        .eq("id", orderId);

      return { success: false, error: error.message };
    }
  } else if (payment.stripe_payment_intent_id) {
    // LEGACY PaymentIntent flow: Capture existing authorization
    try {
      console.log(
        "Using legacy flow, capturing payment_intent:",
        payment.stripe_payment_intent_id
      );

      // For legacy flow, we might need to update amount if it changed
      // Note: Can only capture up to authorized amount
      const capturedIntent = await stripe.paymentIntents.capture(
        payment.stripe_payment_intent_id,
        {
          amount_to_capture: finalAmount,
        }
      );

      console.log("Payment captured successfully");

      // Update payment record
      await (supabase.from("payments") as any)
        .update({ status: "succeeded" })
        .eq("id", payment.id);

      // Update order status
      await (supabase.from("orders") as any)
        .update({ payment_status: "paid" })
        .eq("id", orderId);

      return { success: true, paymentIntentId: capturedIntent.id };
    } catch (error: any) {
      console.error("Error capturing payment:", error);
      return { success: false, error: error.message };
    }
  } else {
    console.error(
      "No payment method or payment intent found for order:",
      orderId
    );
    return {
      success: false,
      error: "No payment method or payment intent found",
    };
  }
}

/**
 * Cancel payment after customer rejects order during call
 * For SetupIntent flow, no charge has been made yet
 */
export async function cancelPaymentAfterCallCancellation(
  orderId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  console.log("Cancelling order after call rejection:", orderId);

  const supabase = await createServiceClient();

  // Get payment record to check if there's a PaymentIntent to cancel
  const { data: payments } = await supabase
    .from("payments")
    .select("stripe_payment_intent_id, payment_method_id")
    .eq("order_id", orderId)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1);

  const payment = payments?.[0] as
    | Pick<
        Database["public"]["Tables"]["payments"]["Row"],
        "stripe_payment_intent_id" | "payment_method_id"
      >
    | undefined;

  // If there's an existing PaymentIntent (legacy flow), cancel it
  if (payment?.stripe_payment_intent_id) {
    try {
      await stripe.paymentIntents.cancel(payment.stripe_payment_intent_id);
      console.log("PaymentIntent cancelled");
    } catch (error: any) {
      console.error("Error cancelling PaymentIntent:", error);
      // Continue anyway - update database
    }
  }

  // For SetupIntent flow, no PaymentIntent exists yet, so nothing to cancel with Stripe
  // Just update the database

  // Update order status
  await (supabase.from("orders") as any)
    .update({
      payment_status: "cancelled",
      status: "cancelled",
    })
    .eq("id", orderId);

  // Update payment status
  await (supabase.from("payments") as any)
    .update({ status: "cancelled" })
    .eq("order_id", orderId)
    .eq("status", "pending");

  console.log("Order cancelled successfully");
  return { success: true };
}
