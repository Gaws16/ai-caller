import Stripe from 'stripe'
import type { Database } from './supabase/types'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-11-17.clover',
  typescript: true,
})

export interface CreateSetupIntentParams {
  paymentMethodId: string
  orderId: string
  returnUrl: string
  customerId: string // Required for off-session payments
  metadata?: Record<string, string>
  ipAddress?: string // Optional: IP address for mandate_data (required for Link)
  userAgent?: string // Optional: User agent for mandate_data (required for Link)
}

/**
 * Create a Stripe Customer for storing payment methods
 */
export async function createCustomer({
  email,
  name,
  phone,
  metadata = {},
}: {
  email?: string
  name: string
  phone?: string
  metadata?: Record<string, string>
}): Promise<Stripe.Customer> {
  const customer = await stripe.customers.create({
    email,
    name,
    phone,
    metadata,
  })
  return customer
}

/**
 * Create a Setup Intent to save the payment method without charging
 * This is used for the "confirm before charging" flow
 * The payment method is automatically attached to the customer on success
 */
export async function createSetupIntent({
  paymentMethodId,
  orderId,
  returnUrl,
  customerId,
  metadata = {},
  ipAddress,
  userAgent,
}: CreateSetupIntentParams): Promise<Stripe.SetupIntent> {
  // Retrieve payment method to check its type
  const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId)
  
  // Build setup intent parameters
  const setupIntentParams: Stripe.SetupIntentCreateParams = {
    customer: customerId, // Required for off-session reuse
    payment_method: paymentMethodId,
    confirm: true, // Confirm immediately to validate the card
    usage: 'off_session', // Allow charging later without customer present
    return_url: returnUrl, // Required for 3D Secure authentication
    metadata: {
      order_id: orderId,
      ...metadata,
    },
  }

  // For Link payment methods with off_session usage, mandate_data is required
  if (paymentMethod.type === 'link' && setupIntentParams.usage === 'off_session') {
    setupIntentParams.mandate_data = {
      customer_acceptance: {
        type: 'online',
        online: {
          ip_address: ipAddress || '0.0.0.0', // Use provided IP or placeholder
          user_agent: userAgent || 'Stripe SetupIntent', // Use provided UA or placeholder
        },
      },
    }
  }

  const setupIntent = await stripe.setupIntents.create(setupIntentParams)

  return setupIntent
}

export interface CreatePaymentIntentParams {
  amount: number // in cents
  currency: string
  paymentMethodId: string
  orderId: string
  returnUrl?: string
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
    return_url: returnUrl,
    metadata: {
      order_id: orderId,
      ...metadata,
    },
  })

  return paymentIntent
}

/**
 * Create and immediately capture a Payment Intent
 * Used after call confirmation when we know the final amount
 */
export async function createAndCapturePaymentIntent({
  amount,
  currency,
  paymentMethodId,
  orderId,
  metadata = {},
}: Omit<CreatePaymentIntentParams, 'returnUrl'>): Promise<Stripe.PaymentIntent> {
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency,
    payment_method: paymentMethodId,
    confirm: true,
    off_session: true, // Customer is not present
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

/**
 * Create a Stripe Product dynamically
 */
export async function createProduct({
  name,
  description,
  metadata = {},
}: {
  name: string
  description?: string
  metadata?: Record<string, string>
}): Promise<Stripe.Product> {
  const product = await stripe.products.create({
    name,
    description,
    metadata,
  })
  return product
}

/**
 * Create a Stripe Price for a product dynamically
 */
export async function createPrice({
  productId,
  amount, // in cents
  currency = 'usd',
  interval, // 'month' or 'year'
  metadata = {},
}: {
  productId: string
  amount: number
  currency?: string
  interval: 'month' | 'year'
  metadata?: Record<string, string>
}): Promise<Stripe.Price> {
  const price = await stripe.prices.create({
    product: productId,
    unit_amount: amount,
    currency,
    recurring: {
      interval,
    },
    metadata,
  })
  return price
}

/**
 * Create or get a Stripe Product and Price for a subscription
 * Uses product name as a key to avoid duplicates
 */
export async function getOrCreateSubscriptionProduct({
  productName,
  amount, // in cents
  currency = 'usd',
  interval, // 'month' or 'year'
  orderId,
  metadata = {},
}: {
  productName: string
  amount: number
  currency?: string
  interval: 'month' | 'year'
  orderId: string
  metadata?: Record<string, string>
}): Promise<{ product: Stripe.Product; price: Stripe.Price }> {
  // Search for existing product by name
  const existingProducts = await stripe.products.search({
    query: `name:'${productName}' AND metadata['order_id']:'${orderId}'`,
    limit: 1,
  })

  let product: Stripe.Product
  if (existingProducts.data.length > 0) {
    product = existingProducts.data[0]
  } else {
    // Create new product
    product = await createProduct({
      name: productName,
      metadata: {
        order_id: orderId,
        ...metadata,
      },
    })
  }

  // Search for existing price for this product and interval
  const existingPrices = await stripe.prices.list({
    product: product.id,
    active: true,
    limit: 10,
  })

  // Find price with matching amount and interval
  let price = existingPrices.data.find(
    (p) =>
      p.recurring?.interval === interval &&
      p.unit_amount === amount &&
      p.currency === currency
  )

  if (!price) {
    // Create new price
    price = await createPrice({
      productId: product.id,
      amount,
      currency,
      interval,
      metadata: {
        order_id: orderId,
        ...metadata,
      },
    })
  }

  return { product, price }
}

/**
 * Create a Stripe Subscription
 */
export async function createSubscription({
  customerId,
  priceId,
  paymentMethodId,
  orderId,
  metadata = {},
}: {
  customerId: string
  priceId: string
  paymentMethodId: string
  orderId: string
  metadata?: Record<string, string>
}): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    default_payment_method: paymentMethodId,
    metadata: {
      order_id: orderId,
      ...metadata,
    },
    expand: ['latest_invoice.payment_intent'],
  })

  return subscription
}

