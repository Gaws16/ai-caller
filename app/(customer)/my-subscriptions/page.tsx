'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { format } from 'date-fns'
import type { Database } from '@/lib/supabase/types'
import type { User } from '@supabase/supabase-js'
import { CreditCard, X, RefreshCw } from 'lucide-react'

type Payment = Database['public']['Tables']['payments']['Row']
type Order = Database['public']['Tables']['orders']['Row']

interface SubscriptionWithOrder extends Payment {
  orders: Order
}

export default function MySubscriptionsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelingId, setCancelingId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false)
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionWithOrder | null>(null)
  const [newBillingCycle, setNewBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const router = useRouter()
  const supabase = createClient()

  // Helper function to deduplicate subscriptions by subscription_id
  const deduplicateSubscriptions = (payments: unknown[]): SubscriptionWithOrder[] => {
    const subscriptionMap = new Map<string, SubscriptionWithOrder>()
    
    payments.forEach((payment) => {
      const p = payment as Payment & { orders?: Order | Order[] }
      if (
        p.stripe_subscription_id &&
        p.subscription_status !== 'cancelled'
      ) {
        const subId = p.stripe_subscription_id
        // Keep the first payment record for each subscription (the initial one)
        if (!subscriptionMap.has(subId)) {
          subscriptionMap.set(subId, p as SubscriptionWithOrder)
        }
      }
    })
    
    return Array.from(subscriptionMap.values())
  }

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !currentUser || !currentUser.email) {
        router.push('/login?redirect=/my-subscriptions')
        return
      }

      setUser(currentUser)

      // Fetch subscriptions for this user
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*, orders!inner(*)')
        .not('stripe_subscription_id', 'is', null)
        .eq('orders.customer_email', currentUser.email)
        .order('created_at', { ascending: false })

      if (paymentsError) {
        console.error('Error fetching subscriptions:', paymentsError)
      } else {
        // Deduplicate subscriptions (one subscription can have multiple payment records from recurring invoices)
        const uniqueSubscriptions = deduplicateSubscriptions(paymentsData || [])
        setSubscriptions(uniqueSubscriptions)
      }

      setLoading(false)
    }

    getUser()
  }, [router, supabase])

  const handleCancel = async () => {
    if (!selectedSubscription?.stripe_subscription_id) return

    setCancelingId(selectedSubscription.stripe_subscription_id)
    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId: selectedSubscription.stripe_subscription_id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'Failed to cancel subscription')
        return
      }

      // Refresh subscriptions
      if (!user?.email) return
      
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*, orders!inner(*)')
        .not('stripe_subscription_id', 'is', null)
        .eq('orders.customer_email', user.email)
        .order('created_at', { ascending: false })

      if (paymentsData) {
        const uniqueSubscriptions = deduplicateSubscriptions(paymentsData)
        setSubscriptions(uniqueSubscriptions)
      }

      setCancelDialogOpen(false)
      setSelectedSubscription(null)
    } catch (error) {
      console.error('Error canceling subscription:', error)
      alert('An error occurred while canceling the subscription')
    } finally {
      setCancelingId(null)
    }
  }

  const handleUpdate = async () => {
    if (!selectedSubscription?.stripe_subscription_id) return

    setUpdatingId(selectedSubscription.stripe_subscription_id)
    try {
      const response = await fetch('/api/subscriptions/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId: selectedSubscription.stripe_subscription_id,
          billingCycle: newBillingCycle,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'Failed to update subscription')
        return
      }

      // Refresh subscriptions
      if (!user?.email) return
      
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*, orders!inner(*)')
        .not('stripe_subscription_id', 'is', null)
        .eq('orders.customer_email', user.email)
        .order('created_at', { ascending: false })

      if (paymentsData) {
        const uniqueSubscriptions = deduplicateSubscriptions(paymentsData)
        setSubscriptions(uniqueSubscriptions)
      }

      setUpdateDialogOpen(false)
      setSelectedSubscription(null)
    } catch (error) {
      console.error('Error updating subscription:', error)
      alert('An error occurred while updating the subscription')
    } finally {
      setUpdatingId(null)
    }
  }

  const openCancelDialog = (subscription: SubscriptionWithOrder) => {
    setSelectedSubscription(subscription)
    setCancelDialogOpen(true)
  }

  const openUpdateDialog = (subscription: SubscriptionWithOrder) => {
    setSelectedSubscription(subscription)
    const order = subscription.orders as Order
    setNewBillingCycle((order.billing_cycle as 'monthly' | 'yearly') || 'monthly')
    setUpdateDialogOpen(true)
  }

  const getStatusBadgeColor = (status: string | null) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'past_due':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-blue-50/30 to-purple-50/30 dark:from-black dark:via-blue-950/10 dark:to-purple-950/10">
        <Header />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="animate-pulse text-lg bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Loading...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-blue-50/30 to-purple-50/30 dark:from-black dark:via-blue-950/10 dark:to-purple-950/10">
      <Header />
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-zinc-900 to-zinc-700 dark:from-white dark:to-zinc-300 bg-clip-text text-transparent">
          My Subscriptions
        </h1>

        {subscriptions.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <CreditCard className="mx-auto h-12 w-12 text-zinc-400 mb-4" />
                <p className="text-zinc-600 dark:text-zinc-400">
                  No active subscriptions found
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {subscriptions.map((subscription) => {
              const order = subscription.orders as Order
              const items = Array.isArray(order.items)
                ? (order.items as Array<{ name?: string; quantity?: number }>)
                : []
              const itemsSummary = items
                .map((item) => `${item.name || 'Item'}${item.quantity ? ` (x${item.quantity})` : ''}`)
                .join(', ') || 'N/A'

              return (
                <Card key={subscription.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="mb-2">{itemsSummary}</CardTitle>
                        <CardDescription>
                          Subscription ID: {subscription.stripe_subscription_id?.substring(0, 20)}...
                        </CardDescription>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeColor(
                          subscription.subscription_status
                        )}`}
                      >
                        {subscription.subscription_status || 'active'}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-zinc-600 dark:text-zinc-400">Amount:</span>
                          <p className="font-semibold">
                            ${Number(order.total_amount).toFixed(2)} / {order.billing_cycle || subscription.subscription_interval || 'month'}
                          </p>
                        </div>
                        <div>
                          <span className="text-zinc-600 dark:text-zinc-400">Created:</span>
                          <p className="font-semibold">
                            {format(new Date(subscription.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-4 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openUpdateDialog(subscription)}
                          disabled={updatingId === subscription.stripe_subscription_id}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          {updatingId === subscription.stripe_subscription_id ? 'Updating...' : 'Change Billing'}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => openCancelDialog(subscription)}
                          disabled={cancelingId === subscription.stripe_subscription_id}
                        >
                          <X className="mr-2 h-4 w-4" />
                          {cancelingId === subscription.stripe_subscription_id ? 'Canceling...' : 'Cancel Subscription'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Cancel Dialog */}
        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel Subscription</DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel this subscription? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setCancelDialogOpen(false)
                  setSelectedSubscription(null)
                }}
              >
                No, Keep It
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={!!cancelingId}
              >
                {cancelingId ? 'Canceling...' : 'Yes, Cancel'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Update Dialog */}
        <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Billing Cycle</DialogTitle>
              <DialogDescription>
                Select a new billing cycle for your subscription.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Billing Cycle</label>
                <div className="flex gap-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      value="monthly"
                      checked={newBillingCycle === 'monthly'}
                      onChange={(e) => setNewBillingCycle(e.target.value as 'monthly' | 'yearly')}
                      className="w-4 h-4"
                    />
                    <span>Monthly</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      value="yearly"
                      checked={newBillingCycle === 'yearly'}
                      onChange={(e) => setNewBillingCycle(e.target.value as 'monthly' | 'yearly')}
                      className="w-4 h-4"
                    />
                    <span>Yearly</span>
                  </label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setUpdateDialogOpen(false)
                  setSelectedSubscription(null)
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={!!updatingId}
              >
                {updatingId ? 'Updating...' : 'Update Subscription'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

