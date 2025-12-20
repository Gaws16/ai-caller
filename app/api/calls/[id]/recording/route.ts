/**
 * API Route to fetch call recording from VAPI
 * 
 * This endpoint:
 * 1. Checks if recording URL exists in database
 * 2. If not, fetches it from VAPI API
 * 3. Updates the database with the recording URL
 * 4. Returns the recording URL
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getVapiCall } from "@/lib/vapi/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: callId } = await params;
    const supabase = await createServiceClient();

    // Get call record from database
    const { data: call, error: callError } = await supabase
      .from("calls")
      .select("id, vapi_call_id, recording_url")
      .eq("id", callId)
      .single();

    if (callError || !call) {
      return NextResponse.json(
        { error: "Call not found" },
        { status: 404 }
      );
    }

    // If recording URL already exists in database, return it
    if (call.recording_url) {
      return NextResponse.json({ recordingUrl: call.recording_url });
    }

    // If no VAPI call ID, can't fetch from VAPI
    if (!call.vapi_call_id) {
      return NextResponse.json(
        { error: "No VAPI call ID found" },
        { status: 404 }
      );
    }

    // Fetch call details from VAPI
    try {
      const vapiCall = await getVapiCall(call.vapi_call_id);
      
      // VAPI might return recording URL in different places
      // Check the response structure - recording URL is typically in the end-of-call-report webhook
      // But we can also check if it's in the call object or message object
      // The actual API response might have it nested differently
      const recordingUrl = 
        (vapiCall as any).recordingUrl ||
        (vapiCall as any).message?.recordingUrl ||
        (vapiCall as any).stereoRecordingUrl ||
        (vapiCall as any).message?.stereoRecordingUrl ||
        (vapiCall as any).recording?.url ||
        (vapiCall as any).message?.recording?.url ||
        null;

      if (recordingUrl) {
        // Update database with recording URL for future requests
        await supabase
          .from("calls")
          .update({ recording_url: recordingUrl })
          .eq("id", callId);

        return NextResponse.json({ recordingUrl });
      } else {
        // Recording might not be available yet (VAPI typically sends it via webhook)
        // Return a message indicating it's not available yet
        return NextResponse.json(
          { error: "Recording not available yet. It will be available once the call ends and the webhook processes it." },
          { status: 404 }
        );
      }
    } catch (vapiError: any) {
      console.error("Error fetching from VAPI:", vapiError);
      return NextResponse.json(
        { error: "Failed to fetch recording from VAPI", details: vapiError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error in recording route:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

