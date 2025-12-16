'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PaymentForm } from './payment-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { z } from 'zod'

const addressSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number'),
  email: z.string().email('Invalid email address'),
  address: z.string().min(1, 'Address is required'),
  instructions: z.string().optional(),
})

interface CheckoutFormProps {
  product: {
    id: string
    name: string
    price: number
  }
  paymentType: 'one_time' | 'subscription'
  onOrderCreated: (orderId: string) => void
}

export function CheckoutForm({ product, paymentType, onOrderCreated }: CheckoutFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    instructions: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Pre-fill email from user session
  useEffect(() => {
    const getUserEmail = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user?.email) {
        setFormData((prev) => ({ ...prev, email: user.email || '' }))
      }
    }
    getUserEmail()
  }, [supabase.auth])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const handlePaymentSubmit = async (paymentMethodId: string) => {
    setLoading(true)

    try {
      // Validate form data
      const validated = addressSchema.parse(formData)

      // Create order via API
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_name: validated.name,
          customer_phone: validated.phone,
          customer_email: validated.email,
          items: [
            {
              name: product.name,
              quantity: 1,
              price: product.price,
            },
          ],
          total_amount: product.price,
          currency: 'usd',
          delivery_address: validated.address,
          delivery_instructions: validated.instructions,
          payment_type: paymentType,
          payment_method_id: paymentMethodId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create order')
      }

      const data = await response.json()
      onOrderCreated(data.order.id)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {}
        error.issues.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message
          }
        })
        setErrors(fieldErrors)
      } else {
        setErrors({ submit: error instanceof Error ? error.message : 'An error occurred' })
      }
      setLoading(false)
    }
  }

  return (
    <Card className="border-zinc-200 dark:border-zinc-800 hover:shadow-xl transition-all duration-300">
      <CardHeader>
        <CardTitle className="bg-gradient-to-r from-zinc-900 to-zinc-700 dark:from-white dark:to-zinc-300 bg-clip-text text-transparent">
          {paymentType === 'one_time' ? 'Order Details' : 'Subscription Details'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            Full Name *
          </label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleInputChange}
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="John Doe"
          />
          {errors.name && (
            <p className="text-sm text-red-600 dark:text-red-400">{errors.name}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="phone" className="text-sm font-medium">
            Phone Number *
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleInputChange}
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="+1234567890"
          />
          {errors.phone && (
            <p className="text-sm text-red-600 dark:text-red-400">{errors.phone}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="john@example.com"
          />
          {errors.email && (
            <p className="text-sm text-red-600 dark:text-red-400">{errors.email}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="address" className="text-sm font-medium">
            Delivery Address *
          </label>
          <textarea
            id="address"
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            required
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="123 Main St, City, State 12345"
          />
          {errors.address && (
            <p className="text-sm text-red-600 dark:text-red-400">{errors.address}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="instructions" className="text-sm font-medium">
            Delivery Instructions (Optional)
          </label>
          <textarea
            id="instructions"
            name="instructions"
            value={formData.instructions}
            onChange={handleInputChange}
            rows={2}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Leave at front door, etc."
          />
        </div>

        {errors.submit && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
            {errors.submit}
          </div>
        )}

        <div className="border-t pt-4">
          <h3 className="font-semibold mb-4">Payment Information</h3>
          <PaymentForm onSubmit={handlePaymentSubmit} loading={loading} />
        </div>
      </CardContent>
    </Card>
  )
}

