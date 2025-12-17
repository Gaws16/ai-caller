/**
 * Vapi Integration Test Endpoint
 *
 * Use this to test the Vapi integration locally without making real calls.
 *
 * Usage:
 * GET  /api/vapi/test              - Check configuration
 * POST /api/vapi/test?action=call  - Simulate initiating a call (requires order_id)
 * POST /api/vapi/test?action=tool  - Simulate a tool call webhook
 * POST /api/vapi/test?action=end   - Simulate end-of-call webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';

export async function GET(request: NextRequest) {
  // Check Vapi configuration
  const config = {
    VAPI_API_KEY: process.env.VAPI_API_KEY ? '✓ Set' : '✗ Missing',
    VAPI_ASSISTANT_ID: process.env.VAPI_ASSISTANT_ID ? '✓ Set' : '✗ Missing',
    VAPI_PHONE_NUMBER_ID: process.env.VAPI_PHONE_NUMBER_ID ? '✓ Set' : '✗ Missing',
    VAPI_WEBHOOK_SECRET: process.env.VAPI_WEBHOOK_SECRET ? '✓ Set' : '○ Optional',
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? '✓ Set' : '✗ Missing',
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Set' : '✗ Missing',
  };

  const allRequired = config.VAPI_API_KEY.includes('✓') &&
    config.VAPI_ASSISTANT_ID.includes('✓') &&
    config.VAPI_PHONE_NUMBER_ID.includes('✓');

  return NextResponse.json({
    status: allRequired ? 'ready' : 'missing_config',
    config,
    message: allRequired
      ? 'Vapi configuration looks good! You can test with POST requests.'
      : 'Some required environment variables are missing.',
    endpoints: {
      initiate_call: 'POST /api/vapi/initiate-call',
      webhook: 'POST /api/vapi/webhook',
      stripe_webhook: 'POST /api/webhooks/stripe',
    },
    test_actions: {
      'POST ?action=call&order_id=xxx': 'Test call initiation (dry run)',
      'POST ?action=tool': 'Test tool call webhook handler',
      'POST ?action=end': 'Test end-of-call webhook handler',
    },
  });
}

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');

  try {
    switch (action) {
      case 'call':
        return testCallInitiation(request);
      case 'tool':
        return testToolCall(request);
      case 'end':
        return testEndOfCall(request);
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: call, tool, or end' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Test call initiation without actually calling Vapi
 */
async function testCallInitiation(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get('order_id');

  if (!orderId) {
    return NextResponse.json(
      { error: 'order_id query parameter required' },
      { status: 400 }
    );
  }

  const supabase = await createServiceClient();

  // Fetch order
  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  const order = orderData as Database['public']['Tables']['orders']['Row'] | null;
  if (orderError || !order) {
    return NextResponse.json(
      { error: 'Order not found', details: orderError?.message },
      { status: 404 }
    );
  }

  // Build what would be sent to Vapi
  const items = order.items as Array<{ name: string; quantity: number; price: number }>;
  const itemsList = items
    .map(item => `${item.quantity}x ${item.name} ($${item.price.toFixed(2)} each)`)
    .join(', ');

  const vapiPayload = {
    assistantId: process.env.VAPI_ASSISTANT_ID || 'NOT_SET',
    phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID || 'NOT_SET',
    customer: {
      number: order.customer_phone,
      name: order.customer_name,
    },
    assistantOverrides: {
      variableValues: {
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        order_id: order.id,
        items_list: itemsList,
        total_amount: Number(order.total_amount).toFixed(2),
        delivery_address: order.delivery_address,
        payment_brand: order.payment_method_brand || 'card',
        payment_last4: order.payment_method_last4 || '****',
      },
    },
    metadata: {
      order_id: order.id,
    },
  };

  return NextResponse.json({
    success: true,
    message: 'Dry run - this is what would be sent to Vapi',
    order: {
      id: order.id,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      total_amount: order.total_amount,
      items: order.items,
    },
    vapi_payload: vapiPayload,
    note: 'To make a real call, POST to /api/vapi/initiate-call with { "order_id": "..." }',
  });
}

/**
 * Test tool call webhook handler
 */
async function testToolCall(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  // Default mock payload
  const mockPayload = body.payload || {
    message: {
      type: 'tool-calls',
      toolCallList: [
        {
          id: 'test-tool-call-123',
          type: 'function',
          function: {
            name: body.tool_name || 'confirm_order',
            arguments: JSON.stringify(body.tool_args || {
              delivery_time: 'afternoon',
              notes: 'Test call',
            }),
          },
        },
      ],
    },
    call: {
      id: body.vapi_call_id || 'test-vapi-call-id',
      status: 'in-progress',
    },
  };

  // Forward to webhook handler
  const webhookUrl = new URL('/api/vapi/webhook', request.url);
  const response = await fetch(webhookUrl.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mockPayload),
  });

  const result = await response.json();

  return NextResponse.json({
    success: response.ok,
    message: 'Tool call test completed',
    mock_payload_sent: mockPayload,
    webhook_response: result,
    note: 'To test with a real call, you need a vapi_call_id from an actual call',
  });
}

/**
 * Test end-of-call webhook handler
 */
async function testEndOfCall(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  const mockPayload = body.payload || {
    message: {
      type: 'end-of-call-report',
      endedReason: body.ended_reason || 'assistant-ended-call',
      transcript: 'Test transcript...',
      summary: 'Customer confirmed order for afternoon delivery.',
    },
    call: {
      id: body.vapi_call_id || 'test-vapi-call-id',
      status: 'ended',
      duration: 120,
    },
  };

  // Forward to webhook handler
  const webhookUrl = new URL('/api/vapi/webhook', request.url);
  const response = await fetch(webhookUrl.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mockPayload),
  });

  const result = await response.json();

  return NextResponse.json({
    success: response.ok,
    message: 'End-of-call test completed',
    mock_payload_sent: mockPayload,
    webhook_response: result,
  });
}
