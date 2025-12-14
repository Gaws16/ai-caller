'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { format } from 'date-fns'
import Link from 'next/link'
import type { Database } from '@/lib/supabase/types'

type Call = Database['public']['Tables']['calls']['Row']
type Order = Database['public']['Tables']['orders']['Row']

export default function CallsPage() {
  const [calls, setCalls] = useState<(Call & { orders: Order })[]>([])
  const [loading, setLoading] = useState(true)
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all')
  const [selectedCall, setSelectedCall] = useState<Call | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchCalls = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('calls')
        .select('*, orders(*)')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        console.error('Error fetching calls:', error)
      } else {
        setCalls(data || [])
      }
      setLoading(false)
    }

    fetchCalls()

    // Subscribe to real-time updates
    const channel = supabase
      .channel('calls-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calls' },
        () => {
          fetchCalls()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const filteredCalls =
    outcomeFilter === 'all'
      ? calls
      : calls.filter((call) => call.outcome === outcomeFilter)

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A'
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}m ${secs}s`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Call History</h1>
        <p className="text-zinc-600 dark:text-zinc-400">View all call records</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={outcomeFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setOutcomeFilter('all')}
            >
              All
            </Button>
            <Button
              variant={outcomeFilter === 'confirmed' ? 'default' : 'outline'}
              onClick={() => setOutcomeFilter('confirmed')}
            >
              Confirmed
            </Button>
            <Button
              variant={outcomeFilter === 'cancelled' ? 'default' : 'outline'}
              onClick={() => setOutcomeFilter('cancelled')}
            >
              Cancelled
            </Button>
            <Button
              variant={outcomeFilter === 'no-answer' ? 'default' : 'outline'}
              onClick={() => setOutcomeFilter('no-answer')}
            >
              No Answer
            </Button>
            <Button
              variant={outcomeFilter === 'failed' ? 'default' : 'outline'}
              onClick={() => setOutcomeFilter('failed')}
            >
              Failed
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Calls Table */}
      <Card>
        <CardHeader>
          <CardTitle>Calls ({filteredCalls.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading...</p>
          ) : filteredCalls.length === 0 ? (
            <p className="text-center text-zinc-600 dark:text-zinc-400">No calls found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Call ID</TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCalls.map((call) => {
                  const order = Array.isArray(call.orders)
                    ? call.orders[0]
                    : call.orders

                  return (
                    <TableRow key={call.id}>
                      <TableCell className="font-mono text-sm">
                        {call.id.substring(0, 8)}
                      </TableCell>
                      <TableCell>
                        {order ? (
                          <Link
                            href={`/orders/${order.id}`}
                            className="font-mono text-sm text-blue-600 hover:underline"
                          >
                            {order.id.substring(0, 8)}
                          </Link>
                        ) : (
                          <span className="text-sm text-zinc-400">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>{order?.customer_name || 'N/A'}</TableCell>
                      <TableCell>{order?.customer_phone || 'N/A'}</TableCell>
                      <TableCell>{formatDuration(call.duration_seconds)}</TableCell>
                      <TableCell>
                        <span
                          className={`rounded-full px-2 py-1 text-xs ${
                            call.outcome === 'confirmed'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : call.outcome === 'cancelled'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : call.outcome === 'no-answer' || call.outcome === 'failed'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                          }`}
                        >
                          {call.outcome || 'In progress'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {call.started_at
                          ? format(new Date(call.started_at), 'MMM d, yyyy h:mm a')
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedCall(call)}
                            >
                              View Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Call Details</DialogTitle>
                              <DialogDescription>
                                Call ID: {call.id.substring(0, 8)}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              {call.transcript && (
                                <div>
                                  <h3 className="font-semibold mb-2">Transcript</h3>
                                  <p className="text-sm whitespace-pre-wrap">{call.transcript}</p>
                                </div>
                              )}
                              {call.twilio_recording_url && (
                                <div>
                                  <h3 className="font-semibold mb-2">Recording</h3>
                                  <audio controls className="w-full">
                                    <source
                                      src={`${call.twilio_recording_url}.mp3`}
                                      type="audio/mpeg"
                                    />
                                    Your browser does not support the audio element.
                                  </audio>
                                </div>
                              )}
                              {call.responses && typeof call.responses === 'object' && (
                                <div>
                                  <h3 className="font-semibold mb-2">Responses</h3>
                                  <pre className="text-xs bg-zinc-100 dark:bg-zinc-800 p-2 rounded overflow-auto">
                                    {JSON.stringify(call.responses, null, 2)}
                                  </pre>
                                </div>
                              )}
                              <div>
                                <h3 className="font-semibold mb-2">Call Information</h3>
                                <div className="text-sm space-y-1">
                                  <p>Current Step: {call.current_step || 'N/A'}</p>
                                  <p>Outcome: {call.outcome || 'N/A'}</p>
                                  <p>Retry Count: {call.retry_count}</p>
                                  {call.started_at && (
                                    <p>
                                      Started: {format(new Date(call.started_at), 'MMM d, yyyy h:mm a')}
                                    </p>
                                  )}
                                  {call.ended_at && (
                                    <p>
                                      Ended: {format(new Date(call.ended_at), 'MMM d, yyyy h:mm a')}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

