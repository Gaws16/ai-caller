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
import { format } from 'date-fns'
import type { Database } from '@/lib/supabase/types'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type Payment = Database['public']['Tables']['payments']['Row']
type Order = Database['public']['Tables']['orders']['Row']

interface SubscriptionWithOrder extends Payment {
  orders: Order
}

const PAGE_SIZE = 10

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const supabase = createClient()

  // Helper function to deduplicate subscriptions by subscription_id
  // Prefers records with non-null subscription_status
  const deduplicateSubscriptions = (payments: unknown[]): SubscriptionWithOrder[] => {
    const subscriptionMap = new Map<string, SubscriptionWithOrder>()
    
    payments.forEach((payment) => {
      const p = payment as Payment & { orders?: Order | Order[] }
      if (p.stripe_subscription_id) {
        const subId = p.stripe_subscription_id
        const existing = subscriptionMap.get(subId)
        
        // If no existing record, add this one
        if (!existing) {
          subscriptionMap.set(subId, p as SubscriptionWithOrder)
        } else {
          // If existing record has null/unknown status, prefer the one with a status
          const existingStatus = (existing as Payment).subscription_status
          const currentStatus = p.subscription_status
          
          if (!existingStatus || existingStatus === 'unknown' || existingStatus === null) {
            if (currentStatus && currentStatus !== 'unknown') {
              subscriptionMap.set(subId, p as SubscriptionWithOrder)
            }
          }
          // If both have statuses, prefer the more recent one (already sorted by created_at desc)
          else if (currentStatus && currentStatus !== 'unknown') {
            const existingDate = new Date((existing as Payment).created_at)
            const currentDate = new Date(p.created_at)
            if (currentDate > existingDate) {
              subscriptionMap.set(subId, p as SubscriptionWithOrder)
            }
          }
        }
      }
    })
    
    return Array.from(subscriptionMap.values())
  }

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true)

    // Fetch all subscriptions (we need all to deduplicate properly)
    let query = supabase
      .from('payments')
      .select('*, orders!inner(*)')
      .not('stripe_subscription_id', 'is', null)
      .order('created_at', { ascending: false })

    if (statusFilter !== 'all') {
      query = query.eq('subscription_status', statusFilter)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching subscriptions:', error)
      setLoading(false)
      return
    }

    // Deduplicate subscriptions (this ensures we get the best record for each subscription)
    const uniqueSubscriptions = deduplicateSubscriptions(data || [])
    
    // Count unique subscriptions
    const uniqueCount = uniqueSubscriptions.length
    
    // Apply pagination to deduplicated results
    const from = (currentPage - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE
    const paginatedSubscriptions = uniqueSubscriptions.slice(from, to)
    
    setSubscriptions(paginatedSubscriptions)
    setTotalCount(uniqueCount)
    setLoading(false)
  }, [supabase, statusFilter, currentPage])

  useEffect(() => {
    fetchSubscriptions()

    const channel = supabase
      .channel('subscriptions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => fetchSubscriptions())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchSubscriptions())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, fetchSubscriptions])

  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter])

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const getStatusBadgeColor = (status: string | null) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'past_due':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'trialing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Subscriptions</h1>
          <p className="text-zinc-600 dark:text-zinc-400">Manage and track all subscriptions</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {['all', 'active', 'past_due', 'cancelled', 'trialing'].map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                onClick={() => setStatusFilter(status)}
                size="sm"
              >
                {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Subscriptions {totalCount > 0 && `(${totalCount})`}</CardTitle>
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
          ) : subscriptions.length === 0 ? (
            <p className="text-center py-8 text-zinc-600 dark:text-zinc-400">No subscriptions found</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subscription ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Billing Cycle</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((subscription) => {
                    const order = subscription.orders as Order
                    const items = Array.isArray(order.items)
                      ? (order.items as Array<{ name?: string; quantity?: number }>)
                      : []
                    const productName = items[0]?.name || 'N/A'
                    const amount = Number(order.total_amount).toFixed(2)

                    return (
                      <TableRow key={subscription.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                        <TableCell className="font-mono text-sm">
                          {subscription.stripe_subscription_id?.substring(0, 20)}...
                        </TableCell>
                        <TableCell className="font-medium">{order.customer_name}</TableCell>
                        <TableCell className="text-zinc-600 dark:text-zinc-400">
                          {order.customer_email || 'N/A'}
                        </TableCell>
                        <TableCell>{productName}</TableCell>
                        <TableCell className="text-right font-medium">${amount}</TableCell>
                        <TableCell className="text-zinc-600 dark:text-zinc-400">
                          {order.billing_cycle || subscription.subscription_interval || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeColor(
                              subscription.subscription_status
                            )}`}
                          >
                            {subscription.subscription_status || 'unknown'}
                          </span>
                        </TableCell>
                        <TableCell className="text-zinc-600 dark:text-zinc-400 text-sm">
                          {format(new Date(subscription.created_at), 'MMM d, yyyy HH:mm')}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Showing {((currentPage - 1) * PAGE_SIZE) + 1} to {Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount} subscriptions
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

