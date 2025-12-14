'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getBookById, type Book } from '@/lib/products'
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
  const [book, setBook] = useState<Book | null>(null)
  const [paymentType, setPaymentType] = useState<'one_time' | 'subscription'>('one_time')
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        const bookId = searchParams.get('book')
        const type = searchParams.get('type')
        const redirectUrl = `/checkout?book=${bookId}&type=${type || 'one_time'}`
        router.push(`/login?redirect=${encodeURIComponent(redirectUrl)}`)
        return
      }

      setAuthenticated(true)

      // Get book from URL params
      const bookId = searchParams.get('book')
      const type = searchParams.get('type') as 'one_time' | 'subscription' | null

      if (!bookId) {
        router.push('/')
        return
      }

      const foundBook = getBookById(bookId)
      if (!foundBook) {
        router.push('/')
        return
      }

      setBook(foundBook)
      setPaymentType(type || 'one_time')
      setLoading(false)
    }

    checkAuth()
  }, [router, searchParams, supabase.auth])

  const handleOrderCreated = (orderId: string) => {
    router.push(`/checkout/success?order=${orderId}`)
  }

  if (loading || !authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  if (!book) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="mb-4">Book not found</p>
            <Link href="/">
              <Button>Return to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <header className="border-b bg-white dark:bg-zinc-900">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="text-2xl font-bold">
            BookStore
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Checkout</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Complete your order below. You'll receive a confirmation call shortly after.
          </p>
        </div>

        {/* Payment Type Selector */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <Button
                variant={paymentType === 'one_time' ? 'default' : 'outline'}
                onClick={() => setPaymentType('one_time')}
              >
                One-time Purchase
              </Button>
              <Button
                variant={paymentType === 'subscription' ? 'default' : 'outline'}
                onClick={() => setPaymentType('subscription')}
              >
                Monthly Subscription
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Elements
            stripe={getStripe()}
            options={{
              mode: 'payment',
              currency: 'usd',
              amount: Math.round(book.price * 100),
              paymentMethodCreation: 'manual',
              appearance: {
                theme: 'stripe',
              },
              loader: 'auto',
            }}
          >
            <CheckoutForm
              book={{ id: book.id, title: book.title, price: book.price }}
              paymentType={paymentType}
              onOrderCreated={handleOrderCreated}
            />
          </Elements>
          <div className="lg:sticky lg:top-8 lg:h-fit">
            <OrderSummary book={book} paymentType={paymentType} />
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

