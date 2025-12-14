import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  try {
    const formData = await req.formData()
    const callId = new URL(req.url).searchParams.get('call_id')
    const recordingSid = formData.get('RecordingSid') as string | null
    const recordingUrl = formData.get('RecordingUrl') as string | null

    if (!callId) {
      return new Response(JSON.stringify({ error: 'call_id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Store recording info
    await supabase
      .from('calls')
      .update({
        twilio_recording_sid: recordingSid,
        twilio_recording_url: recordingUrl,
      })
      .eq('id', callId)

    // Optionally: Download recording and generate transcript
    if (recordingUrl && Deno.env.get('OPENAI_API_KEY')) {
      try {
        await generateTranscript(callId, recordingUrl)
      } catch (error) {
        console.error('Error generating transcript:', error)
        // Don't fail the request if transcript generation fails
      }
    }

    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('Error in recording-status:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})

async function generateTranscript(callId: string, recordingUrl: string) {
  const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')!
  const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')!
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!

  // Download recording from Twilio
  const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`)
  const response = await fetch(`${recordingUrl}.mp3`, {
    headers: {
      Authorization: `Basic ${auth}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to download recording')
  }

  const audioBuffer = await response.arrayBuffer()

  // Send to Whisper API
  const formData = new FormData()
  formData.append('file', new Blob([audioBuffer]), 'recording.mp3')
  formData.append('model', 'whisper-1')

  const transcriptResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
    },
    body: formData,
  })

  if (!transcriptResponse.ok) {
    throw new Error('Failed to generate transcript')
  }

  const { text } = await transcriptResponse.json()

  // Store transcript
  await supabase.from('calls').update({ transcript: text }).eq('id', callId)
}

