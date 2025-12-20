/**
 * Vapi Webhook Tool Handlers
 *
 * Tool handler functions for Vapi webhook events.
 * These functions are designed to work with Edge Runtime.
 */

import { createClient } from "@supabase/supabase-js";
import { getCallAndOrder } from "./webhook-helpers";
import { capturePayment, cancelPayment } from "./webhook-payment";
import { endVapiCall } from "./webhook-helpers";

// Initialize Supabase client for Edge Runtime
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Tool response type
 */
export interface ToolResult {
  success: boolean;
  message: string;
  data?: any;
  endCall?: boolean;
}

/**
 * Handle confirm_order tool call
 */
export async function handleConfirmOrder(
  vapiCallId: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const { call, order } = await getCallAndOrder(vapiCallId);

  await supabase
    .from("orders")
    .update({
      delivery_time_preference: String(args.delivery_time),
      status: "confirmed",
    })
    .eq("id", order.id);

  await supabase
    .from("calls")
    .update({
      outcome: "confirmed",
      responses: {
        ...(call.responses || {}),
        CONFIRMATION: {
          intent: "CONFIRM",
          delivery_time: String(args.delivery_time),
        },
      },
    })
    .eq("id", call.id);

  // Capture payment immediately when order is confirmed
  console.log(`Capturing payment for confirmed order: ${order.id}`);
  await capturePayment(order.id);

  // Schedule call to end (don't await - let it happen after response)
  endVapiCall(vapiCallId).catch(console.error);

  return {
    success: true,
    message: `Order confirmed! Delivery set for ${String(args.delivery_time)}. Thank you and goodbye!`,
    endCall: true, // Signal to Vapi to end the call
  };
}

/**
 * Handle change_quantity tool call
 */
export async function handleChangeQuantity(
  vapiCallId: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const { call, order } = await getCallAndOrder(vapiCallId);

  const newQuantity = parseInt(String(args.new_quantity), 10);
  if (isNaN(newQuantity) || newQuantity < 0) {
    return { success: false, message: "Invalid quantity specified." };
  }

  const items = [...(order.items as Array<{ name: string; quantity: number; price: number }>)];
  const searchTerm = String(args.item_name).toLowerCase();
  const itemIndex = items.findIndex((i) =>
    i.name.toLowerCase().includes(searchTerm)
  );

  if (itemIndex === -1) {
    return {
      success: false,
      message: `I couldn't find "${String(args.item_name)}" in your order.`,
    };
  }

  const item = items[itemIndex];
  const oldQty = item.quantity;

  if (newQuantity === 0) {
    items.splice(itemIndex, 1);
  } else {
    items[itemIndex] = { ...item, quantity: newQuantity };
  }

  if (items.length === 0) {
    return {
      success: false,
      message: "Cannot remove all items. Would you like to cancel instead?",
    };
  }

  const newTotal = items.reduce(
    (sum, i) => sum + i.price * i.quantity,
    0
  );

  await supabase
    .from("orders")
    .update({ items, total_amount: newTotal })
    .eq("id", order.id);

  await supabase
    .from("payments")
    .update({ amount: newTotal })
    .eq("order_id", order.id)
    .eq("status", "pending");

  await supabase
    .from("calls")
    .update({
      responses: {
        ...(call.responses || {}),
        QUANTITY_CHANGE: { item: item.name, from: oldQty, to: newQuantity },
      },
    })
    .eq("id", call.id);

  const action =
    newQuantity === 0
      ? "removed"
      : newQuantity > oldQty
      ? "increased"
      : "decreased";
  return {
    success: true,
    message: `${item.name} ${action}. New total: $${newTotal.toFixed(2)}.`,
  };
}

/**
 * Handle change_address tool call
 */
export async function handleChangeAddress(
  vapiCallId: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const { call, order } = await getCallAndOrder(vapiCallId);

  await supabase
    .from("orders")
    .update({ delivery_address: String(args.new_address) })
    .eq("id", order.id);

  await supabase
    .from("calls")
    .update({
      responses: {
        ...(call.responses || {}),
        ADDRESS_CHANGE: { new_address: String(args.new_address) },
      },
    })
    .eq("id", call.id);

  return {
    success: true,
    message: `Address updated to: ${String(args.new_address)}`,
  };
}

/**
 * Handle cancel_order tool call
 */
export async function handleCancelOrder(
  vapiCallId: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const { call, order } = await getCallAndOrder(vapiCallId);

  // Update order status
  await supabase
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", order.id);

  await supabase
    .from("calls")
    .update({
      outcome: "cancelled",
      responses: {
        ...(call.responses || {}),
        CANCELLATION: { reason: args.reason ? String(args.reason) : undefined },
      },
    })
    .eq("id", call.id);

  // Cancel payment immediately
  console.log(`Cancelling payment for order: ${order.id}`);
  await cancelPayment(order.id);

  // Schedule call to end (don't await - let it happen after response)
  endVapiCall(vapiCallId).catch(console.error);

  return {
    success: true,
    message: "Order has been cancelled. You won't be charged. Goodbye!",
    endCall: true, // Signal to Vapi to end the call
  };
}

/**
 * Handle request_callback tool call
 */
export async function handleRequestCallback(
  vapiCallId: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const { call } = await getCallAndOrder(vapiCallId);

  await supabase
    .from("calls")
    .update({
      outcome: "callback_requested",
      responses: {
        ...(call.responses || {}),
        CALLBACK: { reason: args.reason ? String(args.reason) : undefined },
      },
    })
    .eq("id", call.id);

  return {
    success: true,
    message: "A team member will call you back shortly.",
  };
}

/**
 * Dispatch tool call to appropriate handler
 */
export async function dispatchToolCall(
  vapiCallId: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  switch (toolName) {
    case "confirm_order":
      return handleConfirmOrder(vapiCallId, args);
    case "change_quantity":
      return handleChangeQuantity(vapiCallId, args);
    case "change_address":
      return handleChangeAddress(vapiCallId, args);
    case "cancel_order":
      return handleCancelOrder(vapiCallId, args);
    case "request_callback":
      return handleRequestCallback(vapiCallId, args);
    default:
      return {
        success: false,
        message: `Unknown tool: ${toolName}`,
      };
  }
}

