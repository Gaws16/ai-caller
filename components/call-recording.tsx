'use client'

import { useState, useEffect, useCallback } from 'react'
import { AudioPlayer } from './audio-player'
import { Loader2 } from 'lucide-react'

interface CallRecordingProps {
  callId: string
  recordingUrl?: string | null
  twilioRecordingUrl?: string | null
  vapiCallId?: string | null
  shouldFetch?: boolean // Only fetch when explicitly requested (e.g., when dialog opens)
}

export function CallRecording({ 
  callId, 
  recordingUrl: initialRecordingUrl, 
  twilioRecordingUrl,
  vapiCallId,
  shouldFetch = false
}: CallRecordingProps) {
  const [recordingUrl, setRecordingUrl] = useState<string | null>(initialRecordingUrl || null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasTriedFetch, setHasTriedFetch] = useState(false)

  const fetchRecording = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/calls/${callId}/recording`)
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch recording')
      }

      const data = await response.json()
      if (data.recordingUrl) {
        setRecordingUrl(data.recordingUrl)
      } else {
        setError('Recording not available')
      }
    } catch (err: any) {
      console.error('Error fetching recording:', err)
      setError(err.message || 'Failed to load recording')
    } finally {
      setIsLoading(false)
    }
  }, [callId])

  // Use useEffect to handle the fetch when shouldFetch becomes true
  // This ensures we only fetch when the dialog opens
  useEffect(() => {
    if (shouldFetch && !hasTriedFetch && !recordingUrl && !twilioRecordingUrl && vapiCallId) {
      setHasTriedFetch(true)
      fetchRecording()
    }
  }, [shouldFetch, hasTriedFetch, recordingUrl, twilioRecordingUrl, vapiCallId, fetchRecording])

  // Determine the final recording URL to use
  const finalRecordingUrl = recordingUrl || (twilioRecordingUrl ? `${twilioRecordingUrl}.mp3` : null)

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading recording...</span>
      </div>
    )
  }

  if (error && !finalRecordingUrl) {
    return (
      <div className="text-sm text-zinc-600 dark:text-zinc-400">
        <p>{error}</p>
        {vapiCallId && (
          <button
            onClick={fetchRecording}
            className="mt-2 text-blue-600 hover:underline text-xs"
          >
            Try again
          </button>
        )}
      </div>
    )
  }

  if (!finalRecordingUrl) {
    return (
      <div className="text-sm text-zinc-600 dark:text-zinc-400">
        No recording available
      </div>
    )
  }

  return (
    <div>
      <h3 className="font-semibold mb-2">Recording</h3>
      <AudioPlayer src={finalRecordingUrl} />
    </div>
  )
}

