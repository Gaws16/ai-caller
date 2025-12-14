import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import twilio from 'npm:twilio@^5.10.7'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')!
const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')!
const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER')!
const webhookBaseUrl = Deno.env.get('TWILIO_WEBHOOK_BASE_URL') || supabaseUrl

const client = twilio(twilioAccountSid, twilioAuthToken)

const CALL_HOURS_START = parseInt(Deno.env.get('CALL_HOURS_START') || '9')
const CALL_HOURS_END = parseInt(Deno.env.get('CALL_HOURS_END') || '21')

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { order_id } = await req.json()

    if (!order_id) {
      return new Response(JSON.stringify({ error: 'order_id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: 'Order not found', details: orderError }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Check calling hours (9 AM - 9 PM local time)
    const now = new Date()
    const hour = now.getHours()

    if (hour < CALL_HOURS_START || hour >= CALL_HOURS_END) {
      console.log('Outside calling hours, scheduling for later')
      // Schedule for next morning
      const nextCall = new Date(now)
      nextCall.setDate(nextCall.getDate() + 1)
      nextCall.setHours(CALL_HOURS_START, 0, 0, 0)

      await supabase.from('calls').insert({
        order_id: order_id,
        next_retry_at: nextCall.toISOString(),
        current_step: null,
        retry_count: 0,
        outcome: 'no-answer',
      })

      return new Response(
        JSON.stringify({
          message: 'Call scheduled for next calling hours',
          scheduled_at: nextCall.toISOString(),
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Create call record
    const { data: call, error: callError } = await supabase
      .from('calls')
      .insert({
        order_id: order_id,
        current_step: null,
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (callError || !call) {
      return new Response(
        JSON.stringify({ error: 'Failed to create call record', details: callError }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Initiate Twilio call
    try {
      const twilioCall = await client.calls.create({
        from: twilioPhoneNumber,
        to: order.customer_phone,
        url: `${webhookBaseUrl}/functions/v1/call-handler?call_id=${call.id}`,
        statusCallback: `${webhookBaseUrl}/functions/v1/call-status?call_id=${call.id}`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        record: true,
        recordingStatusCallback: `${webhookBaseUrl}/functions/v1/recording-status?call_id=${call.id}`,
      })

      // Update call with Twilio SID
      await supabase
        .from('calls')
        .update({ twilio_call_sid: twilioCall.sid })
        .eq('id', call.id)

      return new Response(
        JSON.stringify({
          message: 'Call initiated',
          call_id: call.id,
          twilio_call_sid: twilioCall.sid,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    } catch (error) {
      console.error('Failed to initiate call:', error)
      await supabase
        .from('calls')
        .update({ outcome: 'failed' })
        .eq('id', call.id)

      return new Response(
        JSON.stringify({ error: 'Failed to initiate call', details: error.message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  } catch (error) {
    console.error('Error in initiate-call:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})

