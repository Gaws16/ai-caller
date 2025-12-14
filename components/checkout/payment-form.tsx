'use client'

import { useState, useEffect } from 'react'
import {
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'

interface PaymentFormProps {
  onSubmit: (paymentMethodId: string) => Promise<void>
  loading: boolean
}

export function PaymentForm({ onSubmit, loading }: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [error, setError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)

  // Check if elements are ready
  useEffect(() => {
    if (elements) {
      const paymentElement = elements.getElement('payment')
      if (paymentElement) {
        setIsReady(true)
      }
    }
  }, [elements])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      setError('Stripe is not loaded. Please refresh the page.')
      return
    }

    setError(null)

    try {
      // Step 1: Submit the elements form first (validates the form)
      const { error: submitError } = await elements.submit()

      if (submitError) {
        setError(submitError.message || 'Payment form validation failed')
        return
      }

      // Step 2: Create payment method after elements are submitted
      const { error: paymentMethodError, paymentMethod } = await stripe.createPaymentMethod({
        elements,
      })

      if (paymentMethodError) {
        setError(paymentMethodError.message || 'Payment failed')
        return
      }

      if (!paymentMethod) {
        setError('Failed to create payment method')
        return
      }

      await onSubmit(paymentMethod.id)
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
    }
  }

  if (!stripe) {
    return (
      <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
        Loading payment form...
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        options={{
          layout: 'tabs',
        }}
      />
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}
      <Button type="submit" className="w-full" disabled={!stripe || !isReady || loading}>
        {loading ? 'Processing...' : 'Complete Order'}
      </Button>
    </form>
  )
}

