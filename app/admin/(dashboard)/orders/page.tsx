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
import Link from 'next/link'
import { format } from 'date-fns'
import type { Database } from '@/lib/supabase/types'
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react'

type Order = Database['public']['Tables']['orders']['Row']
type Call = Database['public']['Tables']['calls']['Row']

const PAGE_SIZE = 10

export default function OrdersPage() {
  const [orders, setOrders] = useState<(Order & { calls: Call[] })[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const supabase = createClient()

  const fetchOrders = useCallback(async () => {
    setLoading(true)

    let query = supabase
      .from('orders')
      .select('*, calls(*)', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    const from = (currentPage - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching orders:', error)
    } else {
      setOrders(data || [])
      setTotalCount(count || 0)
    }
    setLoading(false)
  }, [supabase, statusFilter, currentPage])

  useEffect(() => {
    fetchOrders()

    const channel = supabase
      .channel('orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, () => fetchOrders())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, fetchOrders])

  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter])

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'changed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'no-answer':
      case 'callback-required': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getPaymentStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'authorized': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'failed':
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-zinc-600 dark:text-zinc-400">Manage and track all orders</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {['all', 'pending', 'confirmed', 'cancelled', 'no-answer'].map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                onClick={() => setStatusFilter(status)}
                size="sm"
              >
                {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Orders {totalCount > 0 && `(${totalCount})`}</CardTitle>
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
          ) : orders.length === 0 ? (
            <p className="text-center py-8 text-zinc-600 dark:text-zinc-400">No orders found</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Call</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const calls = Array.isArray(order.calls) ? order.calls : order.calls ? [order.calls] : []
                    const latestCall = calls.sort((a, b) =>
                      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    )[0]

                    return (
                      <TableRow key={order.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                        <TableCell className="font-mono text-sm">{order.id.substring(0, 8)}...</TableCell>
                        <TableCell className="font-medium">{order.customer_name}</TableCell>
                        <TableCell className="text-zinc-600 dark:text-zinc-400">{order.customer_phone}</TableCell>
                        <TableCell className="text-right font-medium">${Number(order.total_amount).toFixed(2)}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getPaymentStatusBadgeColor(order.payment_status)}`}>
                            {order.payment_status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeColor(order.status)}`}>
                            {order.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          {latestCall?.outcome ? (
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeColor(latestCall.outcome)}`}>
                              {latestCall.outcome}
                            </span>
                          ) : latestCall ? (
                            <span className="text-xs text-zinc-500 italic">In progress</span>
                          ) : (
                            <span className="text-xs text-zinc-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-zinc-600 dark:text-zinc-400 text-sm">
                          {format(new Date(order.created_at), 'MMM d, HH:mm')}
                        </TableCell>
                        <TableCell className="text-center">
                          <Link href={`/admin/orders/${order.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">View order</span>
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Showing {((currentPage - 1) * PAGE_SIZE) + 1} to {Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount} orders
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
