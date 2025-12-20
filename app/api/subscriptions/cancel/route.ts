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

    // Verify the subscription belongs to the user
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*, orders!inner(customer_email)')
      .eq('stripe_subscription_id', subscriptionId)
      .single()

    if (paymentError || !payment) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      )
    }

    const order = payment.orders as { customer_email: string | null }
    if (order.customer_email !== user.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Cancel the subscription in Stripe
    const subscription = await stripe.subscriptions.cancel(subscriptionId)

    // Update the payment record
    await supabase
      .from('payments')
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

