import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json()

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    // Check for required environment variables
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER

    if (!accountSid || !authToken || !twilioPhoneNumber) {
      return NextResponse.json(
        {
          error: 'Missing Twilio configuration',
          missing: {
            TWILIO_ACCOUNT_SID: !accountSid,
            TWILIO_AUTH_TOKEN: !authToken,
            TWILIO_PHONE_NUMBER: !twilioPhoneNumber,
          },
        },
        { status: 500 }
      )
    }

    // Initialize Twilio client
    const client = twilio(accountSid, authToken)

    // Create a simple call with static TwiML (no webhook needed)
    const call = await client.calls.create({
      from: twilioPhoneNumber,
      to: phone,
      // Use Twilio's TwiML Bins or direct TwiML instead of webhook
      twiml: `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">
    Hello! This is a test call from your AI Caller application.
    Your Twilio integration is working correctly.
    This test does not require webhooks.
    Thank you for testing. Goodbye!
  </Say>
  <Hangup/>
</Response>`,
    })

    return NextResponse.json({
      success: true,
      call_sid: call.sid,
      from: twilioPhoneNumber,
      to: phone,
      status: call.status,
      message: 'Simple test call initiated successfully (no webhooks required)',
      note: 'This test uses inline TwiML instead of webhook URLs',
    })
  } catch (error: unknown) {
    console.error('Simple test call error:', error)

    return NextResponse.json(
      {
        error: 'Failed to initiate simple test call',
        details: error instanceof Error ? error.message : 'Unknown error',
        code: error && typeof error === 'object' && 'code' in error ? error.code : undefined,
      },
      { status: 500 }
    )
  }
}