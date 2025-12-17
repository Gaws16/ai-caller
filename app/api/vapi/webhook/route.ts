/**
 * Vapi Webhook Handler
 *
 * Handles all Vapi webhook events including:
 * - tool-calls: Execute tool functions and return results
 * - end-of-call-report: Process call outcome and payment
 * - status-update: Track call status changes
 *
 * Using Edge Runtime for faster response times on Vercel Hobby plan.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Use Edge Runtime for faster cold starts and longer timeout for streaming
export const runtime = 'edge';

// Initialize clients for Edge Runtime
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.acacia' as any,
});

// ============================================
// Types
// ============================================

interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

// Vapi webhook payload - structure varies by event type
interface VapiWebhookPayload {
  message: {
    type: string;
    toolCallList?: ToolCall[];
    call?: {
      id: string;
      status?: string;
      metadata?: Record<string, string>;
    };
    endedReason?: string;
    transcript?: string;
    summary?: string;
    status?: string;
  };
  // Call info can be at root level or inside message
  call?: {
    id: string;
    status: string;
    duration?: number;
    metadata?: Record<string, string>;
  };
}

/**
 * Extract call ID from Vapi payload (handles different payload structures)
 */
function extractCallId(body: any): string | null {
  // Try different possible locations for the call ID
  return body?.call?.id
    || body?.message?.call?.id
    || body?.callId
    || body?.message?.callId
    || null;
}

// ============================================
// Main Handler
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const messageType = body.message?.type;
    const callId = extractCallId(body);

    console.log('Vapi webhook received:', messageType, 'callId:', callId);

    switch (messageType) {
      case 'tool-calls':
        return handleToolCalls(body, callId);

      case 'end-of-call-report':
        return handleEndOfCall(body, callId);

      case 'status-update':
        return handleStatusUpdate(body, callId);

      default:
        // Acknowledge other events
        console.log('Unhandled Vapi event type:', messageType);
        return NextResponse.json({ received: true });
    }
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// Tool Call Handler
// ============================================

async function handleToolCalls(body: any, vapiCallId: string | null): Promise<NextResponse> {
  const toolCalls = body.message?.toolCallList || [];
  const results: Array<{ toolCallId: string; result: string }> = [];

  if (!vapiCallId) {
    console.error('No call ID found in tool-calls webhook');
    // Return empty results - Vapi will continue the conversation
    return NextResponse.json({ results: [] });
  }

  for (const toolCall of toolCalls) {
    // Vapi sends arguments as object (not JSON string) in toolCallList
    let args: Record<string, any>;
    if (typeof toolCall.function.arguments === 'string') {
      args = JSON.parse(toolCall.function.arguments || '{}');
    } else {
      args = toolCall.function.arguments || {};
    }

    let result: { success: boolean; message: string; data?: any };

    try {
      switch (toolCall.function.name) {
        case 'confirm_order':
          result = await handleConfirmOrder(vapiCallId, args);
          break;
        case 'change_quantity':
          result = await handleChangeQuantity(vapiCallId, args);
          break;
        case 'change_address':
          result = await handleChangeAddress(vapiCallId, args);
          break;
        case 'cancel_order':
          result = await handleCancelOrder(vapiCallId, args);
          break;
        case 'request_callback':
          result = await handleRequestCallback(vapiCallId, args);
          break;
        default:
          result = { success: false, message: `Unknown tool: ${toolCall.function.name}` };
      }
    } catch (error: any) {
      console.error(`Error handling tool ${toolCall.function.name}:`, error);
      result = { success: false, message: 'An error occurred processing your request.' };
    }

    results.push({
      toolCallId: toolCall.id,
      result: JSON.stringify(result),
    });
  }

  return NextResponse.json({ results });
}

// ============================================
// End of Call Handler
// ============================================

async function handleEndOfCall(body: any, vapiCallId: string | null): Promise<NextResponse> {
  const endedReason = body.message?.endedReason;

  if (!vapiCallId) {
    console.error('No call ID found in end-of-call-report webhook');
    return NextResponse.json({ received: true });
  }

  console.log(`Call ended: ${vapiCallId}, reason: ${endedReason}`);

  // Get call record
  const { data: call, error: callError } = await supabase
    .from('calls')
    .select('*, orders(*)')
    .eq('vapi_call_id', vapiCallId)
    .single();

  if (callError || !call) {
    console.error('Call not found:', callError);
    return NextResponse.json({ received: true });
  }

  const order = Array.isArray(call.orders) ? call.orders[0] : call.orders;

  // Update call record with end data
  await supabase
    .from('calls')
    .update({
      ended_at: new Date().toISOString(),
      duration_seconds: body.call?.duration || body.message?.duration,
      transcript: body.message?.transcript,
    })
    .eq('id', call.id);

  // Determine final outcome and process payment
  const outcome = call.outcome || 'no-answer';

  if (outcome === 'confirmed' || outcome === 'changed') {
    // Capture payment
    await capturePayment(order.id);
  } else if (outcome === 'cancelled') {
    // Cancel payment
    await cancelPayment(order.id);
  } else if (endedReason === 'customer-did-not-answer' || endedReason === 'customer-busy') {
    // Handle no-answer - schedule retry
    await handleNoAnswer(call.id);
  }

  return NextResponse.json({ received: true });
}

// ============================================
// Status Update Handler
// ============================================

async function handleStatusUpdate(body: any, vapiCallId: string | null): Promise<NextResponse> {
  const status = body.message?.status;

  if (!vapiCallId) {
    console.error('No call ID found in status-update webhook');
    return NextResponse.json({ received: true });
  }

  console.log(`Call status update: ${vapiCallId} -> ${status}`);

  // Update call status in database
  await supabase
    .from('calls')
    .update({
      current_step: `VAPI_${status?.toUpperCase()}`,
    })
    .eq('vapi_call_id', vapiCallId);

  return NextResponse.json({ received: true });
}

// ============================================
// Tool Implementations (Inline for Edge Runtime)
// ============================================

async function getCallAndOrder(vapiCallId: string) {
  const { data: call, error } = await supabase
    .from('calls')
    .select('*, orders(*)')
    .eq('vapi_call_id', vapiCallId)
    .single();

  if (error || !call) {
    throw new Error(`Call not found: ${vapiCallId}`);
  }

  const order = Array.isArray(call.orders) ? call.orders[0] : call.orders;
  return { call, order };
}

async function handleConfirmOrder(vapiCallId: string, args: any) {
  const { call, order } = await getCallAndOrder(vapiCallId);

  await supabase
    .from('orders')
    .update({ delivery_time_preference: args.delivery_time })
    .eq('id', order.id);

  await supabase
    .from('calls')
    .update({
      outcome: 'confirmed',
      responses: {
        ...(call.responses || {}),
        CONFIRMATION: { intent: 'CONFIRM', delivery_time: args.delivery_time },
      },
    })
    .eq('id', call.id);

  return {
    success: true,
    message: `Order confirmed! Delivery set for ${args.delivery_time}. Thank you!`,
  };
}

async function handleChangeQuantity(vapiCallId: string, args: any) {
  const { call, order } = await getCallAndOrder(vapiCallId);

  const newQuantity = parseInt(args.new_quantity, 10);
  if (isNaN(newQuantity) || newQuantity < 0) {
    return { success: false, message: 'Invalid quantity specified.' };
  }

  const items = [...(order.items as any[])];
  const searchTerm = args.item_name.toLowerCase();
  const itemIndex = items.findIndex((i: any) =>
    i.name.toLowerCase().includes(searchTerm)
  );

  if (itemIndex === -1) {
    return {
      success: false,
      message: `I couldn't find "${args.item_name}" in your order.`,
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
      message: 'Cannot remove all items. Would you like to cancel instead?',
    };
  }

  const newTotal = items.reduce((sum: number, i: any) => sum + i.price * i.quantity, 0);

  await supabase
    .from('orders')
    .update({ items, total_amount: newTotal })
    .eq('id', order.id);

  await supabase
    .from('payments')
    .update({ amount: newTotal })
    .eq('order_id', order.id)
    .eq('status', 'pending');

  await supabase
    .from('calls')
    .update({
      responses: {
        ...(call.responses || {}),
        QUANTITY_CHANGE: { item: item.name, from: oldQty, to: newQuantity },
      },
    })
    .eq('id', call.id);

  const action = newQuantity === 0 ? 'removed' : newQuantity > oldQty ? 'increased' : 'decreased';
  return {
    success: true,
    message: `${item.name} ${action}. New total: $${newTotal.toFixed(2)}.`,
  };
}

async function handleChangeAddress(vapiCallId: string, args: any) {
  const { call, order } = await getCallAndOrder(vapiCallId);

  await supabase
    .from('orders')
    .update({ delivery_address: args.new_address })
    .eq('id', order.id);

  await supabase
    .from('calls')
    .update({
      responses: {
        ...(call.responses || {}),
        ADDRESS_CHANGE: { new_address: args.new_address },
      },
    })
    .eq('id', call.id);

  return {
    success: true,
    message: `Address updated to: ${args.new_address}`,
  };
}

async function handleCancelOrder(vapiCallId: string, args: any) {
  const { call } = await getCallAndOrder(vapiCallId);

  await supabase
    .from('calls')
    .update({
      outcome: 'cancelled',
      responses: {
        ...(call.responses || {}),
        CANCELLATION: { reason: args.reason },
      },
    })
    .eq('id', call.id);

  return {
    success: true,
    message: 'Order will be cancelled. You won\'t be charged.',
  };
}

async function handleRequestCallback(vapiCallId: string, args: any) {
  const { call } = await getCallAndOrder(vapiCallId);

  await supabase
    .from('calls')
    .update({
      outcome: 'callback_requested',
      responses: {
        ...(call.responses || {}),
        CALLBACK: { reason: args.reason },
      },
    })
    .eq('id', call.id);

  return {
    success: true,
    message: 'A team member will call you back shortly.',
  };
}

// ============================================
// Payment Processing
// ============================================

async function capturePayment(orderId: string) {
  console.log('Capturing payment for order:', orderId);

  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('order_id', orderId)
    .eq('status', 'pending')
    .limit(1)
    .single();

  if (!payment?.payment_method_id) {
    console.error('No payment method found');
    return;
  }

  const { data: order } = await supabase
    .from('orders')
    .select('total_amount, currency, stripe_customer_id')
    .eq('id', orderId)
    .single();

  if (!order?.stripe_customer_id) {
    console.error('No customer ID found');
    return;
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(Number(order.total_amount) * 100),
      currency: order.currency || 'usd',
      customer: order.stripe_customer_id,
      payment_method: payment.payment_method_id,
      confirm: true,
      off_session: true,
      metadata: { order_id: orderId },
    });

    await supabase
      .from('payments')
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        status: paymentIntent.status === 'succeeded' ? 'succeeded' : 'pending',
      })
      .eq('id', payment.id);

    if (paymentIntent.status === 'succeeded') {
      await supabase
        .from('orders')
        .update({ payment_status: 'paid' })
        .eq('id', orderId);
    }

    console.log('Payment captured:', paymentIntent.id);
  } catch (error: any) {
    console.error('Payment capture failed:', error.message);
    await supabase
      .from('payments')
      .update({ status: 'failed' })
      .eq('id', payment.id);
    await supabase
      .from('orders')
      .update({ payment_status: 'failed' })
      .eq('id', orderId);
  }
}

async function cancelPayment(orderId: string) {
  console.log('Cancelling payment for order:', orderId);

  await supabase
    .from('orders')
    .update({ payment_status: 'cancelled', status: 'cancelled' })
    .eq('id', orderId);

  await supabase
    .from('payments')
    .update({ status: 'cancelled' })
    .eq('order_id', orderId)
    .eq('status', 'pending');
}

async function handleNoAnswer(callId: string) {
  const retryDelayMinutes = parseInt(process.env.RETRY_DELAY_MINUTES || '120', 10);
  const nextRetry = new Date(Date.now() + retryDelayMinutes * 60 * 1000);

  const { data: call } = await supabase
    .from('calls')
    .select('retry_count')
    .eq('id', callId)
    .single();

  if (call && (call.retry_count || 0) < 1) {
    await supabase
      .from('calls')
      .update({
        outcome: 'no-answer',
        next_retry_at: nextRetry.toISOString(),
      })
      .eq('id', callId);
    console.log(`Retry scheduled for: ${nextRetry.toISOString()}`);
  } else {
    await supabase
      .from('calls')
      .update({ outcome: 'no-answer' })
      .eq('id', callId);
    console.log('Max retries reached');
  }
}
