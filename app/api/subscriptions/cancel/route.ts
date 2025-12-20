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

    const body = await request.json() as { subscriptionId?: string }
    const { subscriptionId } = body

    if (!subscriptionId || typeof subscriptionId !== 'string') {
      return NextResponse.json(
        { error: 'Subscription ID is required' },
        { status: 400 }
      )
    }

    console.log('Canceling subscription:', subscriptionId, 'for user:', user.email)

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
      orders?: { customer_email: string | null } | Array<{ customer_email: string | null }>
      [key: string]: unknown
    }
    
    const payment = (payments as PaymentWithOrder[]).find((p) => {
      const order = Array.isArray(p.orders) ? p.orders[0] : p.orders
      return order && order.customer_email === user.email
    })

    if (!payment) {
      console.error('Payment found but does not belong to user:', {
        subscriptionId,
        userEmail: user.email,
        foundPayments: payments.length,
      })
      return NextResponse.json(
        { error: 'Subscription not found or does not belong to you' },
        { status: 404 }
      )
    }

    console.log('Found payment record:', (payment as { id: string }).id, 'for subscription:', subscriptionId)

    // Cancel the subscription in Stripe
    const subscription = await stripe.subscriptions.cancel(subscriptionId)

    // Update the payment record
    await (supabase.from('payments') as any)
      .update({
        subscription_status: 'cancelled',
      })
      .eq('stripe_subscription_id', subscriptionId)

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
      },
    })
  } catch (error: unknown) {
    console.error('Error canceling subscription:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

