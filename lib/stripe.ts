import Stripe from 'stripe'
import type { Database } from './supabase/types'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-11-17.clover',
  typescript: true,
})

export interface CreatePaymentIntentParams {
  amount: number // in cents
  currency: string
  paymentMethodId: string
  orderId: string
  returnUrl: string // URL to redirect after payment confirmation
  metadata?: Record<string, string>
}

/**
 * Create a Payment Intent with manual capture
 * This authorizes the payment but doesn't charge it yet
 */
export async function createPaymentIntent({
  amount,
  currency,
  paymentMethodId,
  orderId,
  returnUrl,
  metadata = {},
}: CreatePaymentIntentParams): Promise<Stripe.PaymentIntent> {
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency,
    payment_method: paymentMethodId,
    capture_method: 'manual', // KEY: Don't capture yet!
    confirmation_method: 'manual',
    confirm: true,
    return_url: returnUrl, // Required by Stripe for payment confirmation
    metadata: {
      order_id: orderId,
      ...metadata,
    },
  })

  return paymentIntent
}

/**
 * Capture a Payment Intent after order confirmation
 */
export async function capturePaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId)
  return paymentIntent
}

/**
 * Cancel a Payment Intent (releases funds)
 */
export async function cancelPaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId)
  return paymentIntent
}

/**
 * Get payment method details from a Payment Intent
 */
export function getPaymentMethodDetails(
  paymentIntent: Stripe.PaymentIntent
): {
  brand: string | null
  last4: string | null
  expMonth: number | null
  expYear: number | null
} {
  const paymentMethod = paymentIntent.payment_method

  if (typeof paymentMethod === 'string') {
    return {
      brand: null,
      last4: null,
      expMonth: null,
      expYear: null,
    }
  }

  const card = paymentMethod?.card

  return {
    brand: card?.brand || null,
    last4: card?.last4 || null,
    expMonth: card?.exp_month || null,
    expYear: card?.exp_year || null,
  }
}

