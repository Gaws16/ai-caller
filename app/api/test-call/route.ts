import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    // Check Supabase env vars first
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        {
          error: 'Missing Supabase configuration',
          missing: {
            NEXT_PUBLIC_SUPABASE_URL: !supabaseUrl,
            SUPABASE_SERVICE_ROLE_KEY: !supabaseServiceKey,
          },
        },
        { status: 500 }
      )
    }

    // Create Supabase client inside the function
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

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
    const webhookBaseUrl = process.env.TWILIO_WEBHOOK_BASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL

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

    if (!webhookBaseUrl) {
      return NextResponse.json(
        { error: 'Missing TWILIO_WEBHOOK_BASE_URL or NEXT_PUBLIC_SUPABASE_URL' },
        { status: 500 }
      )
    }

    // Step 1: Create a test order in the database
    const testOrder = {
      customer_name: 'Test Customer',
      customer_phone: phone,
      customer_email: 'test@example.com',
      items: [
        { name: 'Test Product', quantity: 2, price: 29.99 },
        { name: 'Sample Item', quantity: 1, price: 15.00 }
      ],
      total_amount: 74.98,
      currency: 'usd',
      delivery_address: '123 Test Street, City, State 12345',
      delivery_instructions: 'Leave at door',
      payment_type: 'one_time',
      payment_status: 'authorized', // Simulating authorized payment
      payment_method_brand: 'visa',
      payment_method_last4: '4242',
      status: 'pending'
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(testOrder)
      .select()
      .single()

    if (orderError || !order) {
      console.error('Failed to create test order:', orderError)
      return NextResponse.json(
        { error: 'Failed to create test order', details: orderError?.message },
        { status: 500 }
      )
    }

    // Step 2: Create a call record linked to the order
    const { data: callRecord, error: callError } = await supabase
      .from('calls')
      .insert({
        order_id: order.id,
        current_step: 'ORDER_CONFIRMATION',
        retry_count: 0,
        responses: {}
      })
      .select()
      .single()

    if (callError || !callRecord) {
      console.error('Failed to create call record:', callError)
      // Clean up the order we just created
      await supabase.from('orders').delete().eq('id', order.id)
      return NextResponse.json(
        { error: 'Failed to create call record', details: callError?.message },
        { status: 500 }
      )
    }

    // Step 3: Initialize Twilio client and make the call
    const client = twilio(accountSid, authToken)

    // Use the Supabase edge function for the voice handler
    const voiceUrl = `${webhookBaseUrl}/functions/v1/call-handler?call_id=${callRecord.id}`
    const statusCallbackUrl = `${webhookBaseUrl}/functions/v1/call-status?call_id=${callRecord.id}`
    const recordingCallbackUrl = `${webhookBaseUrl}/functions/v1/recording-status?call_id=${callRecord.id}`

    const call = await client.calls.create({
      from: twilioPhoneNumber,
      to: phone,
      url: voiceUrl,
      method: 'POST',
      statusCallback: statusCallbackUrl,
      statusCallbackMethod: 'POST',
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      record: true,
      recordingStatusCallback: recordingCallbackUrl,
      recordingStatusCallbackMethod: 'POST',
    })

    // Step 4: Update call record with Twilio call SID
    await supabase
      .from('calls')
      .update({
        twilio_call_sid: call.sid,
        started_at: new Date().toISOString()
      })
      .eq('id', callRecord.id)

    return NextResponse.json({
      success: true,
      message: 'Full AI test call initiated successfully',
      call_sid: call.sid,
      call_id: callRecord.id,
      order_id: order.id,
      from: twilioPhoneNumber,
      to: phone,
      status: call.status,
      webhook_urls: {
        voice: voiceUrl,
        status: statusCallbackUrl,
        recording: recordingCallbackUrl
      },
      test_order: {
        items: testOrder.items,
        total: testOrder.total_amount,
        address: testOrder.delivery_address
      }
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
