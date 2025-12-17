/**
 * Vapi Tool Handlers
 *
 * These functions handle the tool calls from the Vapi assistant.
 * Each tool updates the database and returns a message for the assistant.
 */

import { createServiceClient } from '../supabase/server';
import type {
  ConfirmOrderArgs,
  ChangeQuantityArgs,
  ChangeAddressArgs,
  CancelOrderArgs,
  RequestCallbackArgs,
  ToolResponse,
  VapiTool,
} from './types';

// ============================================
// Tool Definitions (for Vapi Assistant config)
// ============================================

export const orderConfirmationTools: VapiTool[] = [
  {
    type: 'function',
    function: {
      name: 'confirm_order',
      description: 'Mark the order as confirmed after the customer confirms all details. Call this when the customer has agreed to all order details and payment.',
      parameters: {
        type: 'object',
        properties: {
          delivery_time: {
            type: 'string',
            enum: ['morning', 'afternoon', 'evening', 'any'],
            description: 'Customer\'s preferred delivery time window',
          },
          notes: {
            type: 'string',
            description: 'Any additional notes or special instructions from the conversation',
          },
        },
        required: ['delivery_time'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'change_quantity',
      description: 'Update the quantity of an item in the order. Use when customer wants to increase, decrease, or remove an item.',
      parameters: {
        type: 'object',
        properties: {
          item_name: {
            type: 'string',
            description: 'Name or partial name of the item to change (will fuzzy match)',
          },
          new_quantity: {
            type: 'string', // Using string to parse as number - Vapi sometimes sends strings
            description: 'New quantity for the item. Use 0 to remove the item entirely.',
          },
        },
        required: ['item_name', 'new_quantity'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'change_address',
      description: 'Update the delivery address for the order.',
      parameters: {
        type: 'object',
        properties: {
          new_address: {
            type: 'string',
            description: 'The new delivery address provided by the customer',
          },
        },
        required: ['new_address'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancel_order',
      description: 'Cancel the order completely. Only use when customer explicitly wants to cancel.',
      parameters: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
            description: 'Reason for cancellation',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'request_callback',
      description: 'Request a callback from human support. Use when customer has complex issues or requests human assistance.',
      parameters: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
            description: 'Why the customer needs human support',
          },
        },
      },
    },
  },
];

// ============================================
// Tool Handler Functions
// ============================================

/**
 * Get order from call via Vapi call ID
 */
async function getOrderFromVapiCall(vapiCallId: string) {
  const supabase = await createServiceClient();

  const { data: call, error } = await supabase
    .from('calls')
    .select('*, orders(*)')
    .eq('vapi_call_id', vapiCallId)
    .single();

  if (error || !call) {
    throw new Error(`Call not found for Vapi ID: ${vapiCallId}`);
  }

  const order = Array.isArray(call.orders) ? call.orders[0] : call.orders;
  if (!order) {
    throw new Error(`Order not found for call: ${call.id}`);
  }

  return { call, order };
}

/**
 * Handle confirm_order tool call
 */
export async function handleConfirmOrder(
  vapiCallId: string,
  args: ConfirmOrderArgs
): Promise<ToolResponse> {
  try {
    const { call, order } = await getOrderFromVapiCall(vapiCallId);
    const supabase = await createServiceClient();

    // Update order with delivery preference
    await supabase
      .from('orders')
      .update({
        delivery_time_preference: args.delivery_time,
        delivery_instructions: args.notes
          ? `${order.delivery_instructions || ''}\n[Call Note]: ${args.notes}`.trim()
          : order.delivery_instructions,
      })
      .eq('id', order.id);

    // Update call outcome
    await supabase
      .from('calls')
      .update({
        outcome: 'confirmed',
        responses: {
          ...(call.responses || {}),
          CONFIRMATION: {
            intent: 'CONFIRM',
            delivery_time: args.delivery_time,
            notes: args.notes,
            timestamp: new Date().toISOString(),
          },
        },
      })
      .eq('id', call.id);

    return {
      success: true,
      message: `Order confirmed! Delivery preference set to ${args.delivery_time}. Thank you for confirming your order.`,
      data: { delivery_time: args.delivery_time },
    };
  } catch (error: any) {
    console.error('Error in handleConfirmOrder:', error);
    return {
      success: false,
      message: 'I had trouble confirming the order. Please try again or request a callback.',
    };
  }
}

/**
 * Handle change_quantity tool call
 */
export async function handleChangeQuantity(
  vapiCallId: string,
  args: ChangeQuantityArgs
): Promise<ToolResponse> {
  try {
    const { call, order } = await getOrderFromVapiCall(vapiCallId);
    const supabase = await createServiceClient();

    // Parse quantity (Vapi might send string or number)
    const newQuantity = typeof args.new_quantity === 'string'
      ? parseInt(args.new_quantity, 10)
      : args.new_quantity;

    if (isNaN(newQuantity) || newQuantity < 0) {
      return {
        success: false,
        message: `I couldn't understand the quantity "${args.new_quantity}". Please specify a number.`,
      };
    }

    // Find the item (fuzzy match)
    const items = [...(order.items as any[])];
    const searchTerm = args.item_name.toLowerCase();
    const itemIndex = items.findIndex(item =>
      item.name.toLowerCase().includes(searchTerm) ||
      searchTerm.includes(item.name.toLowerCase())
    );

    if (itemIndex === -1) {
      const availableItems = items.map(i => i.name).join(', ');
      return {
        success: false,
        message: `I couldn't find "${args.item_name}" in your order. Your order contains: ${availableItems}`,
      };
    }

    const item = items[itemIndex];
    const oldQuantity = item.quantity;

    // Update or remove item
    if (newQuantity === 0) {
      items.splice(itemIndex, 1);
    } else {
      items[itemIndex] = { ...item, quantity: newQuantity };
    }

    // Check if order is now empty
    if (items.length === 0) {
      return {
        success: false,
        message: 'You cannot remove all items from the order. Would you like to cancel the order instead?',
      };
    }

    // Recalculate total
    const newTotal = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);

    // Update database
    await supabase
      .from('orders')
      .update({
        items,
        total_amount: newTotal,
      })
      .eq('id', order.id);

    // Update payment record amount
    await supabase
      .from('payments')
      .update({ amount: newTotal })
      .eq('order_id', order.id)
      .eq('status', 'pending');

    // Update call responses
    await supabase
      .from('calls')
      .update({
        responses: {
          ...(call.responses || {}),
          QUANTITY_CHANGE: {
            intent: 'CHANGE',
            item_name: item.name,
            old_quantity: oldQuantity,
            new_quantity: newQuantity,
            timestamp: new Date().toISOString(),
          },
        },
      })
      .eq('id', call.id);

    // Build response message
    let message: string;
    if (newQuantity === 0) {
      message = `I've removed ${item.name} from your order. Your new total is $${newTotal.toFixed(2)}.`;
    } else if (newQuantity > oldQuantity) {
      message = `I've increased ${item.name} from ${oldQuantity} to ${newQuantity}. Your new total is $${newTotal.toFixed(2)}.`;
    } else {
      message = `I've decreased ${item.name} from ${oldQuantity} to ${newQuantity}. Your new total is $${newTotal.toFixed(2)}.`;
    }

    return {
      success: true,
      message,
      data: {
        item_name: item.name,
        old_quantity: oldQuantity,
        new_quantity: newQuantity,
        new_total: newTotal,
      },
    };
  } catch (error: any) {
    console.error('Error in handleChangeQuantity:', error);
    return {
      success: false,
      message: 'I had trouble updating the quantity. Please try again.',
    };
  }
}

/**
 * Handle change_address tool call
 */
export async function handleChangeAddress(
  vapiCallId: string,
  args: ChangeAddressArgs
): Promise<ToolResponse> {
  try {
    const { call, order } = await getOrderFromVapiCall(vapiCallId);
    const supabase = await createServiceClient();

    const oldAddress = order.delivery_address;

    // Update address
    await supabase
      .from('orders')
      .update({ delivery_address: args.new_address })
      .eq('id', order.id);

    // Update call responses
    await supabase
      .from('calls')
      .update({
        responses: {
          ...(call.responses || {}),
          ADDRESS_CHANGE: {
            intent: 'CHANGE',
            old_address: oldAddress,
            new_address: args.new_address,
            timestamp: new Date().toISOString(),
          },
        },
      })
      .eq('id', call.id);

    return {
      success: true,
      message: `I've updated your delivery address to: ${args.new_address}`,
      data: { new_address: args.new_address },
    };
  } catch (error: any) {
    console.error('Error in handleChangeAddress:', error);
    return {
      success: false,
      message: 'I had trouble updating the address. Please try again.',
    };
  }
}

/**
 * Handle cancel_order tool call
 */
export async function handleCancelOrder(
  vapiCallId: string,
  args: CancelOrderArgs
): Promise<ToolResponse> {
  try {
    const { call, order } = await getOrderFromVapiCall(vapiCallId);
    const supabase = await createServiceClient();

    // Update call outcome
    await supabase
      .from('calls')
      .update({
        outcome: 'cancelled',
        responses: {
          ...(call.responses || {}),
          CANCELLATION: {
            intent: 'CANCEL',
            reason: args.reason,
            timestamp: new Date().toISOString(),
          },
        },
      })
      .eq('id', call.id);

    // Note: Payment cancellation will happen in the end-of-call handler
    // We just mark the intent here

    return {
      success: true,
      message: 'I understand you want to cancel the order. Your order will be cancelled and you won\'t be charged. Is there anything else I can help with?',
      data: { cancelled: true, reason: args.reason },
    };
  } catch (error: any) {
    console.error('Error in handleCancelOrder:', error);
    return {
      success: false,
      message: 'I had trouble processing the cancellation. Please hold while I connect you to support.',
    };
  }
}

/**
 * Handle request_callback tool call
 */
export async function handleRequestCallback(
  vapiCallId: string,
  args: RequestCallbackArgs
): Promise<ToolResponse> {
  try {
    const { call, order } = await getOrderFromVapiCall(vapiCallId);
    const supabase = await createServiceClient();

    // Update call with callback request
    await supabase
      .from('calls')
      .update({
        outcome: 'callback_requested',
        responses: {
          ...(call.responses || {}),
          CALLBACK_REQUEST: {
            intent: 'CALLBACK',
            reason: args.reason,
            timestamp: new Date().toISOString(),
          },
        },
      })
      .eq('id', call.id);

    // TODO: Could trigger notification to admin here

    return {
      success: true,
      message: 'I\'ve noted your request for a callback. A team member will contact you shortly. Thank you for your patience.',
      data: { callback_requested: true, reason: args.reason },
    };
  } catch (error: any) {
    console.error('Error in handleRequestCallback:', error);
    return {
      success: false,
      message: 'I had trouble processing your callback request. Please try calling our support line directly.',
    };
  }
}

/**
 * Main tool handler dispatcher
 */
export async function handleToolCall(
  vapiCallId: string,
  toolName: string,
  args: Record<string, any>
): Promise<ToolResponse> {
  switch (toolName) {
    case 'confirm_order':
      return handleConfirmOrder(vapiCallId, args as ConfirmOrderArgs);
    case 'change_quantity':
      return handleChangeQuantity(vapiCallId, args as ChangeQuantityArgs);
    case 'change_address':
      return handleChangeAddress(vapiCallId, args as ChangeAddressArgs);
    case 'cancel_order':
      return handleCancelOrder(vapiCallId, args as CancelOrderArgs);
    case 'request_callback':
      return handleRequestCallback(vapiCallId, args as RequestCallbackArgs);
    default:
      return {
        success: false,
        message: `Unknown tool: ${toolName}`,
      };
  }
}
