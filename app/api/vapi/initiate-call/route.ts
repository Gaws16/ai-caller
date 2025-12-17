/**
 * Vapi Initiate Call API Route
 *
 * This endpoint initiates an outbound call via Vapi.ai for order confirmation.
 * Called by the Stripe webhook after SetupIntent succeeds.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import {
  initiateOrderConfirmationCall,
  isWithinCallingHours,
  getNextCallingTime,
} from "@/lib/vapi/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { order_id } = body;

    if (!order_id) {
      return NextResponse.json(
        { error: "order_id is required" },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();

    // Fetch order details
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single();

    const order = orderData as
      | Database["public"]["Tables"]["orders"]["Row"]
      | null;
    if (orderError || !order) {
      console.error("Order not found:", orderError);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check if call already exists for this order
    const { data: existingCall } = await supabase
      .from("calls")
      .select("id, vapi_call_id")
      .eq("order_id", order_id)
      .limit(1);

    const firstCall = existingCall?.[0] as
      | { id: string; vapi_call_id: string | null }
      | undefined;
    if (firstCall?.vapi_call_id) {
      console.log(`Call already exists for order ${order_id}, skipping`);
      return NextResponse.json({
        success: true,
        message: "Call already initiated",
        call_id: firstCall.id,
      });
    }

    // Check calling hours
    if (!isWithinCallingHours()) {
      const nextCallTime = getNextCallingTime();

      // Create call record scheduled for later
      const { data: scheduledCall, error: scheduleError } = await (
        supabase.from("calls") as any
      )
        .insert({
          order_id,
          outcome: "scheduled",
          next_retry_at: nextCallTime.toISOString(),
        })
        .select()
        .single();

      if (scheduleError) {
        console.error("Error scheduling call:", scheduleError);
        return NextResponse.json(
          { error: "Failed to schedule call" },
          { status: 500 }
        );
      }

      console.log(`Call scheduled for ${nextCallTime.toISOString()}`);
      return NextResponse.json({
        success: true,
        message: "Call scheduled for next available time",
        scheduled_for: nextCallTime.toISOString(),
        call_id: scheduledCall.id,
      });
    }

    // Create call record first
    const { data: callRecord, error: callError } = await (
      supabase.from("calls") as any
    )
      .insert({
        order_id,
        started_at: new Date().toISOString(),
        current_step: "VAPI_INITIATED",
      })
      .select()
      .single();

    if (callError || !callRecord) {
      console.error("Error creating call record:", callError);
      return NextResponse.json(
        { error: "Failed to create call record" },
        { status: 500 }
      );
    }

    // Initiate Vapi call
    try {
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
      await (supabase.from("calls") as any)
        .update({
          vapi_call_id: vapiCall.id,
        })
        .eq("id", callRecord.id);

      console.log(`Vapi call initiated: ${vapiCall.id} for order ${order_id}`);

      return NextResponse.json({
        success: true,
        call_id: callRecord.id,
        vapi_call_id: vapiCall.id,
        status: vapiCall.status,
      });
    } catch (vapiError: any) {
      console.error("Error initiating Vapi call:", vapiError);

      // Update call record with error
      await (supabase.from("calls") as any)
        .update({
          outcome: "failed",
          responses: {
            error: vapiError.message,
            timestamp: new Date().toISOString(),
          },
        })
        .eq("id", callRecord.id);

      return NextResponse.json(
        { error: "Failed to initiate call", details: vapiError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error in initiate-call:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
