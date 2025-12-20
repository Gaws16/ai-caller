/**
 * Vapi Webhook Helper Functions
 *
 * Utility functions for processing Vapi webhook events.
 * These functions are designed to work with Edge Runtime.
 */

import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client for Edge Runtime
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface VapiMessage {
  role: string;
  message?: string;
  content?: string;
}

interface VapiWebhookBody {
  message?: {
    transcript?: string;
    artifact?: {
      messages?: VapiMessage[];
    };
    recordingUrl?: string;
    recording?: {
      url?: string;
    };
    stereoRecordingUrl?: string;
    call?: {
      id?: string;
    };
    callId?: string;
  };
  call?: {
    id?: string;
    recordingUrl?: string;
  };
  callId?: string;
}

/**
 * Extract call ID from Vapi payload (handles different payload structures)
 */
export function extractCallId(body: VapiWebhookBody): string | null {
  return (
    body?.call?.id ||
    body?.message?.call?.id ||
    body?.callId ||
    body?.message?.callId ||
    null
  );
}

/**
 * Build transcript from Vapi artifact messages
 */
export function buildTranscriptFromMessages(
  messages: VapiMessage[]
): string | null {
  if (!messages || !Array.isArray(messages)) {
    return null;
  }

  const transcript = messages
    .filter(
      (msg) =>
        msg.role === "bot" || msg.role === "user" || msg.role === "assistant"
    )
    .map((msg) => {
      const role =
        msg.role === "bot" || msg.role === "assistant"
          ? "Assistant"
          : "Customer";
      const content = msg.message || msg.content || "";
      return content ? `${role}: ${content}` : null;
    })
    .filter(Boolean)
    .join("\n");

  return transcript || null;
}

/**
 * Extract transcript from Vapi webhook body
 */
export function extractTranscript(body: VapiWebhookBody): string | null {
  // Try direct transcript first
  let transcript = body.message?.transcript;

  // If no direct transcript, build from artifact messages
  if (!transcript && body.message?.artifact?.messages) {
    transcript = buildTranscriptFromMessages(body.message.artifact.messages) || undefined;
    
    // Filter out empty role lines
    if (transcript) {
      transcript = transcript
        .split("\n")
        .filter(
          (line: string) =>
            line.trim() !== "Assistant:" && line.trim() !== "Customer:"
        )
        .join("\n");
    }
  }

  return transcript || null;
}

/**
 * Extract recording URL from Vapi webhook body
 */
export function extractRecordingUrl(body: VapiWebhookBody): string | null {
  return (
    body.message?.recordingUrl ||
    body.message?.recording?.url ||
    body.message?.stereoRecordingUrl ||
    body.call?.recordingUrl ||
    null
  );
}

/**
 * Get call and order from database using Vapi call ID
 */
export async function getCallAndOrder(vapiCallId: string) {
  const { data: call, error } = await supabase
    .from("calls")
    .select("*, orders(*)")
    .eq("vapi_call_id", vapiCallId)
    .single();

  if (error || !call) {
    throw new Error(`Call not found: ${vapiCallId}`);
  }

  const order = Array.isArray(call.orders) ? call.orders[0] : call.orders;
  return { call, order };
}

/**
 * Update call transcript in database
 */
export async function updateCallTranscript(
  vapiCallId: string,
  transcript: string
): Promise<void> {
  if (!transcript) return;

  await supabase
    .from("calls")
    .update({ transcript })
    .eq("vapi_call_id", vapiCallId);
}

/**
 * End Vapi call programmatically
 */
export async function endVapiCall(vapiCallId: string): Promise<void> {
  try {
    const response = await fetch(`https://api.vapi.ai/call/${vapiCallId}/end`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("Failed to end Vapi call:", await response.text());
    } else {
      console.log(`Vapi call ${vapiCallId} ended programmatically`);
    }
  } catch (error) {
    console.error("Error ending Vapi call:", error);
  }
}

/**
 * Handle no-answer scenario - schedule retry
 */
export async function handleNoAnswer(callId: string): Promise<void> {
  const retryDelayMinutes = parseInt(
    process.env.RETRY_DELAY_MINUTES || "120",
    10
  );
  const nextRetry = new Date(Date.now() + retryDelayMinutes * 60 * 1000);

  const { data: call } = await supabase
    .from("calls")
    .select("retry_count")
    .eq("id", callId)
    .single();

  if (call && (call.retry_count || 0) < 1) {
    await supabase
      .from("calls")
      .update({
        outcome: "no-answer",
        next_retry_at: nextRetry.toISOString(),
      })
      .eq("id", callId);
    console.log(`Retry scheduled for: ${nextRetry.toISOString()}`);
  } else {
    await supabase
      .from("calls")
      .update({ outcome: "no-answer" })
      .eq("id", callId);
    console.log("Max retries reached");
  }
}

