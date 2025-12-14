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
import Link from 'next/link'
import { format } from 'date-fns'
import type { Database } from '@/lib/supabase/types'

type Order = Database['public']['Tables']['orders']['Row']
type Call = Database['public']['Tables']['calls']['Row']

export default function OrdersPage() {
  const [orders, setOrders] = useState<(Order & { calls: Call[] })[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const supabase = createClient()

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('orders')
        .select('*, calls(*)')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        console.error('Error fetching orders:', error)
      } else {
        setOrders(data || [])
      }
      setLoading(false)
    }

    fetchOrders()

    // Subscribe to real-time updates
    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchOrders()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calls' },
        () => {
          fetchOrders()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const filteredOrders =
    statusFilter === 'all'
      ? orders
      : orders.filter((order) => order.status === statusFilter)

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'changed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'no-answer':
      case 'callback-required':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getPaymentStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'authorized':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'failed':
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Manage and track all orders
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('all')}
            >
              All
            </Button>
            <Button
              variant={statusFilter === 'pending' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('pending')}
            >
              Pending
            </Button>
            <Button
              variant={statusFilter === 'confirmed' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('confirmed')}
            >
              Confirmed
            </Button>
            <Button
              variant={statusFilter === 'cancelled' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('cancelled')}
            >
              Cancelled
            </Button>
            <Button
              variant={statusFilter === 'no-answer' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('no-answer')}
            >
              No Answer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Orders ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading...</p>
          ) : filteredOrders.length === 0 ? (
            <p className="text-center text-zinc-600 dark:text-zinc-400">
              No orders found
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead>Order Status</TableHead>
                  <TableHead>Call Outcome</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => {
                  const calls = Array.isArray(order.calls)
                    ? order.calls
                    : order.calls
                    ? [order.calls]
                    : []
                  const latestCall = calls[0]

                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-sm">
                        {order.id.substring(0, 8)}
                      </TableCell>
                      <TableCell>{order.customer_name}</TableCell>
                      <TableCell>{order.customer_phone}</TableCell>
                      <TableCell>${order.total_amount}</TableCell>
                      <TableCell>
                        <span
                          className={`rounded-full px-2 py-1 text-xs ${getPaymentStatusBadgeColor(
                            order.payment_status
                          )}`}
                        >
                          {order.payment_status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`rounded-full px-2 py-1 text-xs ${getStatusBadgeColor(
                            order.status
                          )}`}
                        >
                          {order.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {latestCall?.outcome ? (
                          <span className="text-sm">{latestCall.outcome}</span>
                        ) : latestCall ? (
                          <span className="text-sm text-zinc-500">In progress</span>
                        ) : (
                          <span className="text-sm text-zinc-400">No call</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(order.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Link href={`/orders/${order.id}`}>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </Link>
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

