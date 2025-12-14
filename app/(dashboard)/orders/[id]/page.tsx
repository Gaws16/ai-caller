import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import Link from 'next/link'
import type { Database } from '@/lib/supabase/types'

type Order = Database['public']['Tables']['orders']['Row']
type Call = Database['public']['Tables']['calls']['Row']
type Payment = Database['public']['Tables']['payments']['Row']

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()
  const { data: order, error } = await supabase
    .from('orders')
    .select('*, calls(*), payments(*)')
    .eq('id', params.id)
    .single()

  if (error || !order) {
    notFound()
  }

  // Type assertion for joined data
  const orderData = order as Order & {
    calls: Call[] | Call | null
    payments: Payment[] | Payment | null
  }

  const calls = Array.isArray(orderData.calls) ? orderData.calls : orderData.calls ? [orderData.calls] : []
  const payments = Array.isArray(orderData.payments)
    ? orderData.payments
    : orderData.payments
    ? [orderData.payments]
    : []
  const latestPayment = payments[0]
  const items = Array.isArray(orderData.items) ? orderData.items : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Order {orderData.id.substring(0, 8)}</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Created {format(new Date(orderData.created_at), 'MMM d, yyyy h:mm a')}
          </p>
        </div>
        <Link href="/orders">
          <Button variant="outline">Back to Orders</Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Order Information */}
        <Card>
          <CardHeader>
            <CardTitle>Order Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Items</h3>
              <ul className="space-y-1">
                {items.map((item: any, index: number) => (
                  <li key={index} className="text-sm">
                    {item.quantity}x {item.name} - ${item.price}
                  </li>
                ))}
              </ul>
              <p className="mt-2 font-semibold">
                Total: ${orderData.total_amount} {orderData.currency.toUpperCase()}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Delivery Address</h3>
              <p className="text-sm">{orderData.delivery_address}</p>
              {orderData.delivery_instructions && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                  Instructions: {orderData.delivery_instructions}
                </p>
              )}
              {orderData.delivery_time_preference && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                  Preferred time: {orderData.delivery_time_preference}
                </p>
              )}
            </div>
            <div>
              <h3 className="font-semibold mb-2">Status</h3>
              <span
                className={`inline-block rounded-full px-3 py-1 text-sm ${
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
          </CardContent>
        </Card>

        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Name</p>
              <p className="font-medium">{orderData.customer_name}</p>
            </div>
            <div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Phone</p>
              <p className="font-medium">{orderData.customer_phone}</p>
            </div>
            {orderData.customer_email && (
              <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Email</p>
                <p className="font-medium">{orderData.customer_email}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Information */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Payment Type</p>
              <p className="font-medium capitalize">{orderData.payment_type}</p>
            </div>
            <div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Payment Status</p>
              <span
                className={`inline-block rounded-full px-3 py-1 text-sm ${
                  orderData.payment_status === 'paid'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : orderData.payment_status === 'authorized'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}
              >
                {orderData.payment_status}
              </span>
            </div>
            {orderData.payment_method_brand && orderData.payment_method_last4 && (
              <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Payment Method</p>
                <p className="font-medium">
                  {orderData.payment_method_brand.toUpperCase()} ending in {orderData.payment_method_last4}
                </p>
              </div>
            )}
            {latestPayment?.stripe_payment_intent_id && (
              <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Stripe Payment Intent</p>
                <a
                  href={`https://dashboard.stripe.com/payments/${latestPayment.stripe_payment_intent_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm"
                >
                  {latestPayment.stripe_payment_intent_id}
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Call History */}
        <Card>
          <CardHeader>
            <CardTitle>Call History</CardTitle>
          </CardHeader>
          <CardContent>
            {calls.length === 0 ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">No calls yet</p>
            ) : (
              <div className="space-y-4">
                {calls.map((call: Call) => (
                  <div key={call.id} className="border-b pb-4 last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Call {call.id.substring(0, 8)}</span>
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          call.outcome === 'confirmed'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : call.outcome === 'cancelled'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}
                      >
                        {call.outcome || 'In progress'}
                      </span>
                    </div>
                    {call.started_at && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Started: {format(new Date(call.started_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    )}
                    {call.duration_seconds && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Duration: {Math.floor(call.duration_seconds / 60)}m {call.duration_seconds % 60}s
                      </p>
                    )}
                    {call.current_step && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Current step: {call.current_step}
                      </p>
                    )}
                    {call.transcript && (
                      <details className="mt-2">
                        <summary className="text-sm cursor-pointer text-blue-600 hover:underline">
                          View Transcript
                        </summary>
                        <p className="mt-2 text-sm whitespace-pre-wrap">{call.transcript}</p>
                      </details>
                    )}
                    {call.twilio_recording_url && (
                      <div className="mt-2">
                        <audio controls className="w-full">
                          <source src={`${call.twilio_recording_url}.mp3`} type="audio/mpeg" />
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                    )}
                    {call.responses && typeof call.responses === 'object' && (
                      <details className="mt-2">
                        <summary className="text-sm cursor-pointer text-blue-600 hover:underline">
                          View Responses
                        </summary>
                        <pre className="mt-2 text-xs bg-zinc-100 dark:bg-zinc-800 p-2 rounded overflow-auto">
                          {JSON.stringify(call.responses, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

