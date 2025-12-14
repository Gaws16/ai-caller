import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { createPaymentIntent, getPaymentMethodDetails } from "@/lib/stripe";
import { z } from "zod";
import type { Database } from "@/lib/supabase/types";

type OrderInsert = Database["public"]["Tables"]["orders"]["Insert"];

const orderSchema = z.object({
  customer_name: z.string().min(1),
  customer_phone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  customer_email: z.string().email().optional(),
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.number().int().positive(),
      price: z.number().positive(),
    })
  ),
  total_amount: z.number().positive(),
  currency: z.string().default("usd"),
  delivery_address: z.string().min(1),
  delivery_instructions: z.string().optional(),
  payment_type: z.enum(["one_time", "subscription"]),
  payment_method_id: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = orderSchema.parse(body);

    const supabase = await createServiceClient();

    // Create order in database
    const orderData: OrderInsert = {
      customer_name: validatedData.customer_name,
      customer_phone: validatedData.customer_phone,
      customer_email: validatedData.customer_email,
      items: validatedData.items,
      total_amount: validatedData.total_amount,
      currency: validatedData.currency,
      delivery_address: validatedData.delivery_address,
      delivery_instructions: validatedData.delivery_instructions,
      payment_type: validatedData.payment_type,
      payment_status: "pending",
      status: "pending",
    };

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert(orderData as any)
      .select()
      .single();

    if (orderError || !order) {
      console.error("Error creating order:", orderError);
      return NextResponse.json(
        { error: "Failed to create order", details: orderError?.message },
        { status: 500 }
      );
    }

    const orderResult = order as Database["public"]["Tables"]["orders"]["Row"];

    // Create Stripe Payment Intent with manual capture
    try {
      // Get the base URL for return URL
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        request.headers.get("origin") ||
        `http://${request.headers.get("host") || "localhost:3000"}`;
      const returnUrl = `${baseUrl}/checkout/success?order=${orderResult.id}`;

      const paymentIntent = await createPaymentIntent({
        amount: Math.round(validatedData.total_amount * 100), // Convert to cents
        currency: validatedData.currency,
        paymentMethodId: validatedData.payment_method_id,
        orderId: orderResult.id,
        returnUrl,
      });

      // Get payment method details
      const paymentDetails = getPaymentMethodDetails(paymentIntent);

      // Update order with payment method info
      await (supabase as any)
        .from("orders")
        .update({
          payment_method_brand: paymentDetails.brand,
          payment_method_last4: paymentDetails.last4,
        })
        .eq("id", orderResult.id);

      // Create payment record
      await supabase.from("payments").insert({
        stripe_event_id: `temp_${Date.now()}`, // Temporary, will be updated by webhook
        order_id: orderResult.id,
        stripe_payment_intent_id: paymentIntent.id,
        amount: validatedData.total_amount,
        currency: validatedData.currency,
        status: "pending",
        payment_method_details: paymentDetails,
      } as any);

      return NextResponse.json({
        order: {
          id: orderResult.id,
          status: orderResult.status,
          payment_status: orderResult.payment_status,
        },
        payment_intent: {
          id: paymentIntent.id,
          status: paymentIntent.status,
        },
      });
    } catch (stripeError: any) {
      console.error("Error creating payment intent:", stripeError);

      // Update order status to failed
      await (supabase as any)
        .from("orders")
        .update({ payment_status: "failed", status: "pending" })
        .eq("id", orderResult.id);

      return NextResponse.json(
        {
          error: "Failed to create payment intent",
          details: stripeError.message,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
