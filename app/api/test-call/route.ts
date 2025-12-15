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

    // Generate a simple TwiML URL for testing
    const twimlUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/test-call/twiml`

    // Make the test call
    const call = await client.calls.create({
      from: twilioPhoneNumber,
      to: phone,
      url: twimlUrl,
      method: 'POST',
    })

    return NextResponse.json({
      success: true,
      call_sid: call.sid,
      from: twilioPhoneNumber,
      to: phone,
      status: call.status,
      message: 'Test call initiated successfully',
    })
  } catch (error: unknown) {
    console.error('Test call error:', error)

    return NextResponse.json(
      {
        error: 'Failed to initiate test call',
        details: error instanceof Error ? error.message : 'Unknown error',
        code: error && typeof error === 'object' && 'code' in error ? error.code : undefined,
      },
      { status: 500 }
    )
  }
}