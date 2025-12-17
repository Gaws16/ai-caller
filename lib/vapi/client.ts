/**
 * Vapi.ai API Client
 *
 * Wrapper for the Vapi.ai REST API to initiate and manage voice calls.
 */

import type {
  CreateVapiCallParams,
  VapiCallResponse,
  VapiAssistantConfig,
  OrderContext,
} from "./types";

const VAPI_API_URL = "https://api.vapi.ai";

/**
 * Get the Vapi API key from environment
 */
function getApiKey(): string {
  const apiKey = process.env.VAPI_API_KEY;
  if (!apiKey) {
    throw new Error("VAPI_API_KEY environment variable is not set");
  }
  return apiKey;
}

/**
 * Create an outbound phone call via Vapi.ai
 */
export async function createVapiCall(
  params: CreateVapiCallParams
): Promise<VapiCallResponse> {
  const apiKey = getApiKey();

  const response = await fetch(`${VAPI_API_URL}/call/phone`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Vapi call creation failed:", {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
    });
    throw new Error(
      `Vapi call creation failed: ${response.status} - ${errorText}`
    );
  }

  const data = await response.json();
  return data as VapiCallResponse;
}

/**
 * Get call details from Vapi
 */
export async function getVapiCall(callId: string): Promise<VapiCallResponse> {
  const apiKey = getApiKey();

  const response = await fetch(`${VAPI_API_URL}/call/${callId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to get Vapi call: ${response.status} - ${errorText}`
    );
  }

  return response.json();
}

/**
 * End an active call
 */
export async function endVapiCall(callId: string): Promise<void> {
  const apiKey = getApiKey();

  const response = await fetch(`${VAPI_API_URL}/call/${callId}/stop`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to end Vapi call: ${response.status} - ${errorText}`
    );
  }
}

/**
 * Build assistant variable values from order data
 */
export function buildOrderContext(order: {
  id: string;
  customer_name: string;
  customer_phone: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  total_amount: number;
  delivery_address: string;
  payment_method_brand?: string | null;
  payment_method_last4?: string | null;
}): OrderContext {
  // Format items list for the assistant
  const itemsList = order.items
    .map(
      (item) =>
        `${item.quantity}x ${item.name} ($${item.price.toFixed(2)} each)`
    )
    .join(", ");

  return {
    customer_name: order.customer_name,
    customer_phone: order.customer_phone,
    order_id: order.id,
    items_list: itemsList,
    total_amount: order.total_amount.toFixed(2),
    delivery_address: order.delivery_address,
    payment_brand: order.payment_method_brand || "card",
    payment_last4: order.payment_method_last4 || "****",
  };
}

/**
 * Create a call with order context
 * This is the main function used to initiate order confirmation calls
 */
export async function initiateOrderConfirmationCall(
  order: {
    id: string;
    customer_name: string;
    customer_phone: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    total_amount: number;
    delivery_address: string;
    payment_method_brand?: string | null;
    payment_method_last4?: string | null;
  },
  callRecordId: string
): Promise<VapiCallResponse> {
  const assistantId = process.env.VAPI_ASSISTANT_ID;
  const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;

  if (!assistantId) {
    throw new Error("VAPI_ASSISTANT_ID environment variable is not set");
  }
  if (!phoneNumberId) {
    throw new Error("VAPI_PHONE_NUMBER_ID environment variable is not set");
  }

  // Build order context for assistant
  const orderContext = buildOrderContext(order);

  // Create the call
  const vapiCall = await createVapiCall({
    assistantId,
    phoneNumberId,
    customer: {
      number: order.customer_phone,
      name: order.customer_name,
    },
    assistantOverrides: {
      variableValues: orderContext as unknown as Record<string, string>,
    },
    metadata: {
      order_id: order.id,
      call_record_id: callRecordId,
    },
    name: `Order Confirmation - ${order.customer_name}`,
  });

  return vapiCall;
}

/**
 * Verify Vapi webhook signature
 * Vapi uses HMAC-SHA256 for webhook signatures
 */
export async function verifyVapiWebhookSignature(
  payload: string,
  signature: string | null
): Promise<boolean> {
  const secret = process.env.VAPI_WEBHOOK_SECRET;

  // If no secret configured, skip verification (not recommended for production)
  if (!secret) {
    console.warn(
      "VAPI_WEBHOOK_SECRET not set - skipping signature verification"
    );
    return true;
  }

  if (!signature) {
    console.error("No signature provided in webhook request");
    return false;
  }

  try {
    // Use Web Crypto API (available in Edge Runtime)
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(payload);

    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign("HMAC", key, messageData);
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return computedSignature === signature;
  } catch (error) {
    console.error("Error verifying webhook signature:", error);
    return false;
  }
}

/**
 * Check if we're within allowed calling hours
 * Default: 9 AM - 9 PM local time
 */
export function isWithinCallingHours(): boolean {
  const startHour = parseInt(process.env.CALL_HOURS_START || "9", 10);
  const endHour = parseInt(process.env.CALL_HOURS_END || "21", 10);

  const now = new Date();
  const currentHour = now.getHours();

  return currentHour >= startHour && currentHour < endHour;
}

/**
 * Calculate next available calling time
 */
export function getNextCallingTime(): Date {
  const startHour = parseInt(process.env.CALL_HOURS_START || "9", 10);

  const now = new Date();
  const next = new Date(now);

  // If before calling hours today, set to today's start
  if (now.getHours() < startHour) {
    next.setHours(startHour, 0, 0, 0);
  } else {
    // Set to tomorrow's start
    next.setDate(next.getDate() + 1);
    next.setHours(startHour, 0, 0, 0);
  }

  return next;
}
