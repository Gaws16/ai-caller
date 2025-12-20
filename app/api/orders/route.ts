import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { createSetupIntent, createCustomer, stripe } from "@/lib/stripe";
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
  billing_cycle: z.enum(["monthly", "yearly"]).optional(), // Required for subscriptions
});

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      console.error("Failed to parse request body:", e);
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const validatedData = orderSchema.parse(body);

    const supabase = await createServiceClient();

    // Validate billing_cycle for subscriptions
    if (
      validatedData.payment_type === "subscription" &&
      !validatedData.billing_cycle
    ) {
      return NextResponse.json(
        { error: "billing_cycle is required for subscription orders" },
        { status: 400 }
      );
    }

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
      billing_cycle: validatedData.billing_cycle || null,
    };

    // Type assertion needed due to Supabase type inference limitations with service role client
    const { data: order, error: orderError } = await supabase
      .from("orders")
      // @ts-expect-error - Type inference issue with service role client, but types are correct
      .insert(orderData)
      .select()
      .single();

    if (orderError || !order) {
      console.error("Error creating order:", {
        error: orderError,
        code: orderError?.code,
        message: orderError?.message,
        hint: orderError?.hint,
        orderData: { ...orderData, items: "[items array]" },
        // Don't log full items
      });

      // Check if it's a column error (migration not applied)
      // Only trigger if it's specifically a "column does not exist" error
      const errorMessage = orderError?.message?.toLowerCase() || "";
      const isColumnError =
        orderError?.code === "42703" || // undefined_column
        errorMessage.includes('column "billing_cycle" does not exist') ||
        errorMessage.includes("column billing_cycle does not exist");

      if (isColumnError) {
        return NextResponse.json(
          {
            error: "Database migration required",
            details:
              "The billing_cycle column is missing. Please run: supabase db push or apply migration 006_add_billing_cycle.sql",
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          error: "Failed to create order",
          details: orderError?.message || orderError?.hint || "Unknown error",
        },
        { status: 500 }
      );
    }

    const orderResult = order as Database["public"]["Tables"]["orders"]["Row"];

    // Create Stripe Setup Intent to save card without charging
    // Payment will be created AFTER call confirmation with final amount
    try {
      // Build return URL for 3D Secure authentication redirect
      const origin =
        request.headers.get("origin") ||
        process.env.NEXT_PUBLIC_BASE_URL ||
        "http://localhost:3000";
      const returnUrl = `${origin}/order-confirmation?order_id=${orderResult.id}`;

      // Create a Stripe Customer first (required for off-session payments)
      const customer = await createCustomer({
        name: validatedData.customer_name,
        email: validatedData.customer_email,
        phone: validatedData.customer_phone,
        metadata: {
          order_id: orderResult.id,
        },
      });

      // Store customer ID in order
      await supabase
        .from("orders")
        // @ts-expect-error - Type inference issue with service role client
        .update({ stripe_customer_id: customer.id })
        .eq("id", orderResult.id);

      // Extract IP address and user agent for mandate_data (required for Link payments)
      const ipAddress =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        undefined;
      const userAgent = request.headers.get("user-agent") || undefined;

      const setupIntent = await createSetupIntent({
        paymentMethodId: validatedData.payment_method_id,
        orderId: orderResult.id,
        returnUrl,
        customerId: customer.id,
        ipAddress,
        userAgent,
      });

      // Get payment method details from Stripe
      const paymentMethodId =
        typeof setupIntent.payment_method === "string"
          ? setupIntent.payment_method
          : setupIntent.payment_method?.id;

      let paymentDetails = {
        brand: null as string | null,
        last4: null as string | null,
        expMonth: null as number | null,
        expYear: null as number | null,
      };

      if (paymentMethodId) {
        const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
        if (pm.card) {
          paymentDetails = {
            brand: pm.card.brand,
            last4: pm.card.last4,
            expMonth: pm.card.exp_month,
            expYear: pm.card.exp_year,
          };
        }
      }

      // Update order with payment method info
      await supabase
        .from("orders")
        // @ts-expect-error - Type inference issue with service role client
        .update({
          payment_method_brand: paymentDetails.brand,
          payment_method_last4: paymentDetails.last4,
        })
        .eq("id", orderResult.id);

      // Create payment record with setup intent info (no payment intent yet)
      await supabase
        .from("payments")
        // @ts-expect-error - Type inference issue with service role client
        .insert({
          stripe_event_id: `setup_${setupIntent.id}`, // Use setup intent ID as event ID
          order_id: orderResult.id,
          stripe_payment_intent_id: null, // Will be created after call confirmation
          amount: validatedData.total_amount,
          currency: validatedData.currency,
          status: "pending",
          payment_method_id: paymentMethodId, // Store for later charging
          payment_method_details: paymentDetails,
        });

      return NextResponse.json({
        order: {
          id: orderResult.id,
          status: orderResult.status,
          payment_status: orderResult.payment_status,
        },
        setup_intent: {
          id: setupIntent.id,
          status: setupIntent.status,
          payment_method: paymentMethodId,
        },
      });
    } catch (stripeError) {
      console.error("Error creating setup intent:", stripeError);

      // Update order status to failed
      await supabase
        .from("orders")
        // @ts-expect-error - Type inference issue with service role client
        .update({ payment_status: "failed", status: "pending" })
        .eq("id", orderResult.id);

      const errorMessage =
        stripeError instanceof Error
          ? stripeError.message
          : "Unknown error occurred";

      return NextResponse.json(
        {
          error: "Failed to create setup intent",
          details: errorMessage,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.issues);
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Unexpected error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}
