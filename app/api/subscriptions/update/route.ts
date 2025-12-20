import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as { subscriptionId?: string; billingCycle?: string }
    const { subscriptionId, billingCycle } = body

    if (!subscriptionId || typeof subscriptionId !== 'string') {
      return NextResponse.json(
        { error: 'Subscription ID is required' },
        { status: 400 }
      )
    }

    if (!billingCycle || typeof billingCycle !== 'string' || !['monthly', 'yearly'].includes(billingCycle)) {
      return NextResponse.json(
        { error: 'Billing cycle must be monthly or yearly' },
        { status: 400 }
      )
    }

    // First, find the payment record with this subscription ID
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*, orders(*)')
      .eq('stripe_subscription_id', subscriptionId)

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError)
      return NextResponse.json(
        { error: `Database error: ${paymentsError.message}` },
        { status: 500 }
      )
    }

    if (!payments || payments.length === 0) {
      console.error('No payment found for subscription:', subscriptionId)
      return NextResponse.json(
        { error: 'Subscription not found in database' },
        { status: 404 }
      )
    }

    // Find the payment with matching user email
    type PaymentWithOrder = {
      orders?: { customer_email: string | null; total_amount: number; items: unknown } | Array<{ customer_email: string | null; total_amount: number; items: unknown }>
      order_id: string
      [key: string]: unknown
    }
    
    const payment = (payments as PaymentWithOrder[]).find((p) => {
      const order = Array.isArray(p.orders) ? p.orders[0] : p.orders
      return order && order.customer_email === user.email
    })

    if (!payment) {
      console.error('Payment found but does not belong to user')
      return NextResponse.json(
        { error: 'Subscription not found or does not belong to you' },
        { status: 404 }
      )
    }

    const order = (Array.isArray(payment.orders) ? payment.orders[0] : payment.orders)!

    // Get the subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)

    // Calculate new price based on billing cycle
    // This is a simplified version - you might want to get prices from your products
    const interval = billingCycle === 'monthly' ? 'month' : 'year'
    const currentPriceId = subscription.items.data[0]?.price.id

    if (!currentPriceId) {
      return NextResponse.json(
        { error: 'Could not find current price' },
        { status: 400 }
      )
    }

    // Get current price to calculate new amount
    const currentPrice = await stripe.prices.retrieve(currentPriceId)
    const currentAmount = currentPrice.unit_amount || 0

    // Calculate new amount (simplified - adjust based on your pricing logic)
    let newAmount = currentAmount
    if (billingCycle === 'yearly' && currentPrice.recurring?.interval === 'month') {
      // Convert monthly to yearly (multiply by 12, then apply discount if any)
      newAmount = Math.round(currentAmount * 12 * 0.9) // 10% discount for yearly
    } else if (billingCycle === 'monthly' && currentPrice.recurring?.interval === 'year') {
      // Convert yearly to monthly
      newAmount = Math.round(currentAmount / 12)
    }

    // Create new price with the new interval
    const newPrice = await stripe.prices.create({
      product: currentPrice.product as string,
      unit_amount: newAmount,
      currency: currentPrice.currency,
      recurring: {
        interval,
      },
    })

    // Update the subscription
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0]?.id,
          price: newPrice.id,
        },
      ],
      proration_behavior: 'always_invoice',
    })

    // Update the payment record
    await (supabase.from('payments') as any)
      .update({
        subscription_interval: interval,
      })
      .eq('stripe_subscription_id', subscriptionId)

    // Update the order billing cycle
    await (supabase.from('orders') as any)
      .update({
        billing_cycle: billingCycle,
      })
      .eq('id', payment.order_id)

    return NextResponse.json({
      success: true,
      subscription: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        current_period_end: 'current_period_end' in updatedSubscription ? updatedSubscription.current_period_end : null,
      },
    })
  } catch (error: unknown) {
    console.error('Error updating subscription:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

