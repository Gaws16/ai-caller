'use client'

import { useEffect, useState, useCallback } from 'react'
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
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react'
import { CallRecording } from '@/components/call-recording'

type Call = Database['public']['Tables']['calls']['Row']
type Order = Database['public']['Tables']['orders']['Row']

const PAGE_SIZE = 10

const formatDuration = (seconds: number | null) => {
  if (!seconds) return '—'
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes}m ${secs}s`
}

// Separate component for call details dialog to control when recording is fetched
function CallDetailsDialog({ call }: { call: Call & { orders: Order } }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Eye className="h-4 w-4" />
          <span className="sr-only">View call details</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Call Details</DialogTitle>
          <DialogDescription>
            Call ID: {call.id}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-zinc-600 dark:text-zinc-400">Outcome</p>
              <p className="font-medium">{call.outcome || 'In progress'}</p>
            </div>
            <div>
              <p className="text-zinc-600 dark:text-zinc-400">Duration</p>
              <p className="font-medium">{formatDuration(call.duration_seconds)}</p>
            </div>
            <div>
              <p className="text-zinc-600 dark:text-zinc-400">Current Step</p>
              <p className="font-medium">{call.current_step || '—'}</p>
            </div>
            <div>
              <p className="text-zinc-600 dark:text-zinc-400">Retry Count</p>
              <p className="font-medium">{call.retry_count}</p>
            </div>
            {call.started_at && (
              <div>
                <p className="text-zinc-600 dark:text-zinc-400">Started</p>
                <p className="font-medium">{format(new Date(call.started_at), 'MMM d, yyyy h:mm a')}</p>
              </div>
            )}
            {call.ended_at && (
              <div>
                <p className="text-zinc-600 dark:text-zinc-400">Ended</p>
                <p className="font-medium">{format(new Date(call.ended_at), 'MMM d, yyyy h:mm a')}</p>
              </div>
            )}
          </div>

          {call.transcript && (
            <div>
              <h3 className="font-semibold mb-2">Transcript</h3>
              <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3 max-h-64 overflow-y-auto">
                <p className="text-sm whitespace-pre-wrap font-mono leading-relaxed">{call.transcript}</p>
              </div>
            </div>
          )}

          <CallRecording
            callId={call.id}
            recordingUrl={call.recording_url}
            twilioRecordingUrl={call.twilio_recording_url}
            vapiCallId={call.vapi_call_id}
            shouldFetch={isOpen} // Only fetch when dialog is open
          />

          {call.responses && typeof call.responses === 'object' && (
            <details>
              <summary className="text-sm cursor-pointer text-blue-600 hover:underline font-medium">
                View Responses
              </summary>
              <pre className="mt-2 text-xs bg-zinc-100 dark:bg-zinc-800 p-2 rounded overflow-auto">
                {JSON.stringify(call.responses, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function CallsPage() {
  const [calls, setCalls] = useState<(Call & { orders: Order })[]>([])
  const [loading, setLoading] = useState(true)
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const supabase = createClient()

  const fetchCalls = useCallback(async () => {
    setLoading(true)

    let query = supabase
      .from('calls')
      .select('*, orders(*)', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (outcomeFilter !== 'all') {
      if (outcomeFilter === 'in-progress') {
        query = query.is('outcome', null)
      } else {
        query = query.eq('outcome', outcomeFilter)
      }
    }

    const from = (currentPage - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching calls:', error)
    } else {
      setCalls(data || [])
      setTotalCount(count || 0)
    }
    setLoading(false)
  }, [supabase, outcomeFilter, currentPage])

  useEffect(() => {
    fetchCalls()

    const channel = supabase
      .channel('calls-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, () => fetchCalls())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, fetchCalls])

  useEffect(() => {
    setCurrentPage(1)
  }, [outcomeFilter])

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '—'
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}m ${secs}s`
  }

  const getOutcomeBadgeColor = (outcome: string | null) => {
    switch (outcome) {
      case 'confirmed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'no-answer':
      case 'failed': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Call History</h1>
        <p className="text-zinc-600 dark:text-zinc-400">View and manage all call records</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {['all', 'in-progress', 'confirmed', 'cancelled', 'no-answer', 'failed'].map((outcome) => (
              <Button
                key={outcome}
                variant={outcomeFilter === outcome ? 'default' : 'outline'}
                onClick={() => setOutcomeFilter(outcome)}
                size="sm"
              >
                {outcome === 'in-progress' ? 'In Progress' : outcome.charAt(0).toUpperCase() + outcome.slice(1).replace('-', ' ')}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Calls {totalCount > 0 && `(${totalCount})`}</CardTitle>
          {totalPages > 1 && (
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              Page {currentPage} of {totalPages}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 dark:border-zinc-100"></div>
            </div>
          ) : calls.length === 0 ? (
            <p className="text-center py-8 text-zinc-600 dark:text-zinc-400">No calls found</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Call ID</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calls.map((call) => {
                    const order = Array.isArray(call.orders) ? call.orders[0] : call.orders

                    return (
                      <TableRow key={call.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                        <TableCell className="font-mono text-sm">{call.id.substring(0, 8)}...</TableCell>
                        <TableCell>
                          {order ? (
                            <Link
                              href={`/admin/orders/${order.id}`}
                              className="font-mono text-sm text-blue-600 hover:underline"
                            >
                              {order.id.substring(0, 8)}...
                            </Link>
                          ) : (
                            <span className="text-sm text-zinc-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{order?.customer_name || '—'}</TableCell>
                        <TableCell className="text-zinc-600 dark:text-zinc-400">{order?.customer_phone || '—'}</TableCell>
                        <TableCell>{formatDuration(call.duration_seconds)}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getOutcomeBadgeColor(call.outcome)}`}>
                            {call.outcome || 'In progress'}
                          </span>
                        </TableCell>
                        <TableCell className="text-zinc-600 dark:text-zinc-400 text-sm">
                          {call.started_at ? format(new Date(call.started_at), 'MMM d, HH:mm') : '—'}
                        </TableCell>
                        <TableCell className="text-center">
                          <CallDetailsDialog call={call} />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Showing {((currentPage - 1) * PAGE_SIZE) + 1} to {Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount} calls
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                      <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number
                        if (totalPages <= 5) pageNum = i + 1
                        else if (currentPage <= 3) pageNum = i + 1
                        else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i
                        else pageNum = currentPage - 2 + i
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? 'default' : 'outline'}
                            size="sm"
                            className="w-8 h-8 p-0"
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                      Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
