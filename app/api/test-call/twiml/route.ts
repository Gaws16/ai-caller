import { NextRequest } from 'next/server'

export async function POST() {
  // Simple TwiML response for test calls
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">
    Hello! This is a test call from your AI Caller application.
    The Twilio integration is working correctly.
    Thank you for testing. This call will now end.
  </Say>
  <Pause length="1"/>
  <Say voice="Polly.Joanna">
    Goodbye!
  </Say>
  <Hangup/>
</Response>`

  return new Response(twiml, {
    headers: {
      'Content-Type': 'text/xml',
    },
  })
}

export async function GET() {
  // Handle GET requests as well for testing
  return POST()
}