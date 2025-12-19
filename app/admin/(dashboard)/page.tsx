import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { Database } from '@/lib/supabase/types'

type Order = Database['public']['Tables']['orders']['Row']
type Call = Database['public']['Tables']['calls']['Row']

export default async function DashboardPage() {
  const supabase = await createClient()

  // Get today's date range
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  // Get orders today
  const { data: ordersToday, count: ordersTodayCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact' })
    .gte('created_at', todayStart.toISOString())
    .lte('created_at', todayEnd.toISOString())

  // Get active calls (calls in progress)
  const { data: activeCalls, count: activeCallsCount } = await supabase
    .from('calls')
    .select('*', { count: 'exact' })
    .is('outcome', null)
    .not('current_step', 'is', null)

  // Get successful confirmations today
  const { data: confirmedToday, count: confirmedTodayCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact' })
    .eq('status', 'confirmed')
    .gte('confirmed_at', todayStart.toISOString())
    .lte('confirmed_at', todayEnd.toISOString())

  // Calculate success rate
  const successRate =
    ordersTodayCount && ordersTodayCount > 0
      ? ((confirmedTodayCount || 0) / ordersTodayCount) * 100
      : 0

  // Get recent activity (last 10 orders)
  const { data: recentOrders } = await supabase
    .from('orders')
    .select('*, calls(outcome)')
    .order('created_at', { ascending: false })
    .limit(10)

  type OrderWithCalls = Order & {
    calls: Call[] | Call | null
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-zinc-600 dark:text-zinc-400">Welcome back!</p>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Orders Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{ordersTodayCount || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeCallsCount || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{successRate.toFixed(1)}%</div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {confirmedTodayCount || 0} confirmed today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentOrders && recentOrders.length > 0 ? (
              recentOrders.map((order) => {
                const orderData = order as OrderWithCalls
                const calls = Array.isArray(orderData.calls) ? orderData.calls : orderData.calls ? [orderData.calls] : []
                const latestCall = calls[0]
                return (
                  <div
                    key={orderData.id}
                    className="flex items-center justify-between border-b pb-4 last:border-0"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/orders/${orderData.id}`}
                          className="font-medium hover:underline"
                        >
                          Order {orderData.id.substring(0, 8)}
                        </Link>
                        <span
                          className={`rounded-full px-2 py-1 text-xs ${
                            orderData.status === 'confirmed'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : orderData.status === 'cancelled'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          }`}
                        >
                          {orderData.status}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {orderData.customer_name} • ${orderData.total_amount} •{' '}
                        {format(new Date(orderData.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                      {latestCall && (
                        <p className="text-xs text-zinc-500">
                          Call: {latestCall.outcome || 'in progress'}
                        </p>
                      )}
                    </div>
                    <Link href={`/admin/orders/${orderData.id}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
                )
              })
            ) : (
              <p className="text-center text-zinc-600 dark:text-zinc-400">No recent orders</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

