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

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  extractCallId,
  extractTranscript,
  extractRecordingUrl,
  getCallAndOrder,
  handleNoAnswer,
} from "@/lib/vapi/webhook-helpers";
import { dispatchToolCall } from "@/lib/vapi/webhook-tools";

// Use Edge Runtime for faster cold starts and longer timeout for streaming
export const runtime = "edge";

// Initialize Supabase client for Edge Runtime
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================
// Types
// ============================================

interface VapiWebhookBody {
  message?: {
    type?: string;
    toolCallList?: Array<{
      id: string;
      function: {
        name: string;
        arguments: string | Record<string, unknown>;
      };
    }>;
    endedReason?: string;
    summary?: string;
    status?: string;
    duration?: number;
    artifact?: {
      messages?: Array<{
        role: string;
        message?: string;
        content?: string;
      }>;
    };
  };
  call?: {
    id?: string;
    duration?: number;
  };
}

// ============================================
// Main Handler
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as VapiWebhookBody;
    const messageType = body.message?.type;
    const callId = extractCallId(body);

    console.log("Vapi webhook received:", messageType, "callId:", callId);

    switch (messageType) {
      case "tool-calls":
        return handleToolCalls(body, callId);

      case "end-of-call-report":
        return handleEndOfCall(body, callId);

      case "status-update":
        return handleStatusUpdate(body, callId);

      default:
        // Acknowledge other events
        console.log("Unhandled Vapi event type:", messageType);
        return NextResponse.json({ received: true });
    }
  } catch (error) {
    console.error("Webhook error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// ============================================
// Tool Call Handler
// ============================================

async function handleToolCalls(
  body: VapiWebhookBody,
  vapiCallId: string | null
): Promise<NextResponse> {
  const toolCalls = body.message?.toolCallList || [];
  const results: Array<{ toolCallId: string; result: string }> = [];

  if (!vapiCallId) {
    console.error("No call ID found in tool-calls webhook");
    // Return empty results - Vapi will continue the conversation
    return NextResponse.json({ results: [] });
  }

  // Save transcript from artifact.messages (updated on every tool call)
  const transcript = extractTranscript(body);
  if (transcript) {
    await supabase
      .from("calls")
      .update({ transcript })
      .eq("vapi_call_id", vapiCallId);
    console.log(`Transcript updated (${transcript.length} chars)`);
  }

  for (const toolCall of toolCalls) {
    // Vapi sends arguments as object (not JSON string) in toolCallList
    let args: Record<string, unknown>;
    if (typeof toolCall.function.arguments === "string") {
      args = JSON.parse(toolCall.function.arguments || "{}") as Record<
        string,
        unknown
      >;
    } else {
      args = (toolCall.function.arguments as Record<string, unknown>) || {};
    }

    let result: { success: boolean; message: string; data?: unknown };

    try {
      result = await dispatchToolCall(vapiCallId, toolCall.function.name, args);
    } catch (error) {
      console.error(`Error handling tool ${toolCall.function.name}:`, error);
      result = {
        success: false,
        message: "An error occurred processing your request.",
      };
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

async function handleEndOfCall(
  body: VapiWebhookBody,
  vapiCallId: string | null
): Promise<NextResponse> {
  const endedReason = body.message?.endedReason;

  if (!vapiCallId) {
    console.error("No call ID found in end-of-call-report webhook");
    return NextResponse.json({ received: true });
  }

  console.log(`Call ended: ${vapiCallId}, reason: ${endedReason}`);

  // Get call record
  let call;
  try {
    const result = await getCallAndOrder(vapiCallId);
    call = result.call;
  } catch (error) {
    console.error("Call not found:", error);
    return NextResponse.json({ received: true });
  }

  // Extract transcript and recording URL
  const transcript = extractTranscript(body);
  const summary = body.message?.summary;
  const recordingUrl = extractRecordingUrl(body);

  console.log(
    `Transcript length: ${transcript?.length || 0}, Summary: ${
      summary ? "yes" : "no"
    }, Recording: ${recordingUrl ? "yes" : "no"}`
  );

  // Update call record with end data
  await supabase
    .from("calls")
    .update({
      ended_at: new Date().toISOString(),
      duration_seconds: body.call?.duration || body.message?.duration,
      transcript: transcript || null,
      recording_url: recordingUrl,
    })
    .eq("id", call.id);

  // Only process payment if not already processed (we now capture on confirmation)
  if (!call.outcome) {
    if (
      endedReason === "customer-did-not-answer" ||
      endedReason === "customer-busy"
    ) {
      // Handle no-answer - schedule retry
      await handleNoAnswer(call.id);
    }
  }

  return NextResponse.json({ received: true });
}

// ============================================
// Status Update Handler
// ============================================

async function handleStatusUpdate(
  body: VapiWebhookBody,
  vapiCallId: string | null
): Promise<NextResponse> {
  const status = body.message?.status;

  if (!vapiCallId) {
    console.error("No call ID found in status-update webhook");
    return NextResponse.json({ received: true });
  }

  console.log(`Call status update: ${vapiCallId} -> ${status}`);

  // Update call status in database
  await supabase
    .from("calls")
    .update({
      current_step: `VAPI_${status?.toUpperCase()}`,
    })
    .eq("vapi_call_id", vapiCallId);

  return NextResponse.json({ received: true });
}
