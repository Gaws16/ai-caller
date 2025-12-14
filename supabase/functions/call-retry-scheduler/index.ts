import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const webhookBaseUrl = Deno.env.get('TWILIO_WEBHOOK_BASE_URL') || supabaseUrl

serve(async (req) => {
  try {
    // Find calls pending retry
    const { data: pendingCalls, error } = await supabase
      .from('calls')
      .select('*, orders(*)')
      .eq('outcome', 'no-answer')
      .lt('retry_count', 1)
      .lte('next_retry_at', new Date().toISOString())

    if (error) {
      console.error('Error querying pending calls:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to query pending calls' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    if (!pendingCalls || pendingCalls.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending retries', count: 0 }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    let successCount = 0
    let errorCount = 0

    for (const call of pendingCalls) {
      try {
        console.log(`Retrying call ${call.id} for order ${call.order_id}`)

        // Increment retry count
        await supabase
          .from('calls')
          .update({ retry_count: call.retry_count + 1 })
          .eq('id', call.id)

        // Initiate new call
        const initiateCallUrl = `${webhookBaseUrl}/functions/v1/initiate-call`
        const response = await fetch(initiateCallUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ order_id: call.order_id }),
        })

        if (response.ok) {
          successCount++
        } else {
          errorCount++
          console.error(`Failed to retry call ${call.id}:`, await response.text())
        }
      } catch (error) {
        errorCount++
        console.error(`Error retrying call ${call.id}:`, error)
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Retry processing complete',
        total: pendingCalls.length,
        success: successCount,
        errors: errorCount,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in call-retry-scheduler:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})

