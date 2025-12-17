'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getProductById, type Product } from '@/lib/products'
import { Elements } from '@stripe/react-stripe-js'
import { getStripe } from '@/lib/stripe-client'
import { CheckoutForm } from '@/components/checkout/checkout-form'
import { OrderSummary } from '@/components/checkout/order-summary'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [product, setProduct] = useState<Product | null>(null)
  const [paymentType, setPaymentType] = useState<'one_time' | 'subscription'>('one_time')
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        const productId = searchParams.get('product')
        const type = searchParams.get('type')
        const billing = searchParams.get('billing')
        const redirectUrl = `/checkout?product=${productId}&type=${type || 'one_time'}&billing=${billing || 'monthly'}`
        router.push(`/login?redirect=${encodeURIComponent(redirectUrl)}`)
        return
      }

      setAuthenticated(true)

      // Get product from URL params
      const productId = searchParams.get('product')
      const type = searchParams.get('type') as 'one_time' | 'subscription' | null
      const billing = searchParams.get('billing') as 'monthly' | 'yearly' | null

      if (!productId) {
        router.push('/')
        return
      }

      const foundProduct = getProductById(productId)
      if (!foundProduct) {
        router.push('/')
        return
      }

      setProduct(foundProduct)
      setPaymentType(type || 'one_time')
      setBillingCycle(billing || 'monthly')
      setLoading(false)
    }

    checkAuth()
  }, [router, searchParams, supabase.auth])

  const handleOrderCreated = (orderId: string) => {
    router.push(`/checkout/success?order=${orderId}`)
  }

  if (loading || !authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 via-blue-50/30 to-purple-50/30 dark:from-black dark:via-blue-950/10 dark:to-purple-950/10">
        <div className="animate-pulse text-lg bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Loading...
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 via-blue-50/30 to-purple-50/30 dark:from-black dark:via-blue-950/10 dark:to-purple-950/10">
        <Card className="hover:shadow-xl transition-shadow duration-300">
          <CardContent className="p-6 text-center">
            <p className="mb-4">Product not found</p>
            <Link href="/">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:scale-105 transition-all duration-300">
                Return to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const unitPrice = paymentType === 'one_time'
    ? product.price
    : (billingCycle === 'monthly' ? product.monthlyPrice : product.yearlyPrice)
  const totalPrice = unitPrice * quantity

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-blue-50/30 to-purple-50/30 dark:from-black dark:via-blue-950/10 dark:to-purple-950/10">
      <header className="sticky top-0 z-50 border-b bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg transition-all duration-300 hover:shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="group flex items-center gap-2 text-2xl font-bold transition-all duration-300">
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent group-hover:from-blue-500 group-hover:via-purple-500 group-hover:to-pink-500 transition-all duration-300">
              AppHub
            </span>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-zinc-900 to-zinc-700 dark:from-white dark:to-zinc-300 bg-clip-text text-transparent">
            {paymentType === 'one_time' ? 'Complete Your Purchase' : 'Complete Your Subscription'}
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            {paymentType === 'one_time'
              ? 'One-time payment. Instant access to your product.'
              : 'Start your 14-day free trial. No credit card charged until trial ends.'}
          </p>
        </div>

        {/* Payment Type Selector */}
        <Card className="mb-6 overflow-hidden border-zinc-200 dark:border-zinc-800 hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <Button
                variant={paymentType === 'one_time' ? 'default' : 'outline'}
                onClick={() => setPaymentType('one_time')}
                className={paymentType === 'one_time'
                  ? "flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transform transition-all duration-300 hover:scale-105"
                  : "flex-1 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all duration-300"}
              >
                <div className="text-center w-full">
                  <div className="font-semibold">Buy Once</div>
                  <div className="text-sm opacity-90">${product.price}</div>
                </div>
              </Button>
              <Button
                variant={paymentType === 'subscription' ? 'default' : 'outline'}
                onClick={() => setPaymentType('subscription')}
                className={paymentType === 'subscription'
                  ? "flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transform transition-all duration-300 hover:scale-105"
                  : "flex-1 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all duration-300"}
              >
                <div className="text-center w-full">
                  <div className="font-semibold">Subscribe</div>
                  <div className="text-sm opacity-90">From ${product.monthlyPrice}/mo</div>
                </div>
              </Button>
            </div>

            {/* Billing Cycle Selector - Only show for subscriptions */}
            {paymentType === 'subscription' && (
              <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t">
                <Button
                  variant={billingCycle === 'monthly' ? 'default' : 'outline'}
                  onClick={() => setBillingCycle('monthly')}
                  className={billingCycle === 'monthly'
                    ? "flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transform transition-all duration-300 hover:scale-105"
                    : "flex-1 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all duration-300"}
                >
                  <div className="text-center w-full">
                    <div className="font-semibold">Monthly</div>
                    <div className="text-sm opacity-90">${product.monthlyPrice}/month</div>
                  </div>
                </Button>
                <Button
                  variant={billingCycle === 'yearly' ? 'default' : 'outline'}
                  onClick={() => setBillingCycle('yearly')}
                  className={billingCycle === 'yearly'
                    ? "flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transform transition-all duration-300 hover:scale-105 relative"
                    : "flex-1 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all duration-300 relative"}
                >
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                    Save {Math.round((1 - product.yearlyPrice / (product.monthlyPrice * 12)) * 100)}%
                  </div>
                  <div className="text-center w-full">
                    <div className="font-semibold">Yearly</div>
                    <div className="text-sm opacity-90">${product.yearlyPrice}/year</div>
                  </div>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Elements
            stripe={getStripe()}
            options={{
              mode: 'payment',
              currency: 'usd',
              amount: Math.round(totalPrice * 100),
              paymentMethodCreation: 'manual',
              appearance: {
                theme: 'stripe',
              },
            }}
          >
            <CheckoutForm
              product={{ id: product.id, name: product.name, price: unitPrice }}
              paymentType={paymentType}
              quantity={quantity}
              onQuantityChange={setQuantity}
              onOrderCreated={handleOrderCreated}
            />
          </Elements>
          <div className="lg:sticky lg:top-24 lg:h-fit">
            <OrderSummary
              product={product}
              paymentType={paymentType}
              billingCycle={billingCycle}
              quantity={quantity}
              onQuantityChange={setQuantity}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}

