'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Product } from '@/lib/products'
import type { Database } from '@/lib/supabase/types'
import { Check, Star, Users, Zap, Shield, Clock, CheckCircle2, X } from 'lucide-react'

type Payment = Database['public']['Tables']['payments']['Row']
type Order = Database['public']['Tables']['orders']['Row']

interface SubscriptionWithOrder extends Payment {
  orders: Order
}

interface ProductDetailsDialogProps {
  product: Product
  open: boolean
  onOpenChange: (open: boolean) => void
  subscription?: SubscriptionWithOrder
}

// Random details generator based on product
const getRandomDetails = (product: Product) => {
  const details = {
    rating: (4.2 + Math.random() * 0.8).toFixed(1),
    reviews: Math.floor(Math.random() * 5000) + 1000,
    users: Math.floor(Math.random() * 50000) + 10000,
    lastUpdated: ['2 days ago', '1 week ago', '3 days ago', '5 days ago'][Math.floor(Math.random() * 4)],
    version: `v${Math.floor(Math.random() * 5) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
    support: ['24/7 Email Support', 'Live Chat', 'Priority Support', 'Community Forum'][Math.floor(Math.random() * 4)],
    compatibility: ['Windows, Mac, Linux', 'Web-based', 'iOS & Android', 'All Platforms'][Math.floor(Math.random() * 4)],
    languages: Math.floor(Math.random() * 20) + 10,
    storage: ['5GB', '10GB', 'Unlimited', '50GB'][Math.floor(Math.random() * 4)],
    integrations: Math.floor(Math.random() * 15) + 5,
  }
  return details
}

export function ProductDetailsDialog({ product, open, onOpenChange, subscription }: ProductDetailsDialogProps) {
  const details = getRandomDetails(product)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [canceling, setCanceling] = useState(false)

  const isSubscribed = !!subscription

  const handleCancel = async () => {
    if (!subscription?.stripe_subscription_id) return

    setCanceling(true)
    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId: subscription.stripe_subscription_id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'Failed to cancel subscription')
        return
      }

      // Close dialogs and reload page to refresh subscription status
      setCancelDialogOpen(false)
      onOpenChange(false)
      window.location.reload()
    } catch (error) {
      console.error('Error canceling subscription:', error)
      alert('An error occurred while canceling the subscription')
    } finally {
      setCanceling(false)
    }
  }

  const order = subscription?.orders as Order | undefined
  const billingCycle = order?.billing_cycle || 'monthly'
  const subscriptionAmount = billingCycle === 'monthly' ? product.monthlyPrice : product.yearlyPrice

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {product.name}
                </DialogTitle>
                <DialogDescription className="text-base pt-2">
                  {product.description}
                </DialogDescription>
              </div>
              {isSubscribed && (
                <div className="ml-4 bg-green-500/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-sm font-semibold border border-green-400/50 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Subscribed
                </div>
              )}
            </div>
          </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Image - Full width at top */}
          <div className="relative w-full aspect-[16/9] bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-900 dark:to-zinc-800 rounded-xl overflow-hidden mx-auto">
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 100vw"
            />
          </div>

          {/* Quick Stats */}
          <div className="space-y-4">
              {/* Rating and Reviews */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="text-2xl font-bold">{details.rating}</span>
                </div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  ({details.reviews.toLocaleString()} reviews)
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-2 p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                {isSubscribed ? (
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                        ${subscriptionAmount}
                      </span>
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                    </div>
                    <div className="text-sm text-green-700 dark:text-green-400 font-medium mt-1">
                      Active Subscription
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        ${product.price}
                      </span>
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">one-time</span>
                    </div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      <div>Monthly: ${product.monthlyPrice}/mo</div>
                      <div>Yearly: ${product.yearlyPrice}/yr (save {Math.round((1 - product.yearlyPrice / (product.monthlyPrice * 12)) * 100)}%)</div>
                    </div>
                  </>
                )}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                  <Users className="w-4 h-4 text-blue-600" />
                  <div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400">Active Users</div>
                    <div className="font-semibold">{details.users.toLocaleString()}+</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                  <Zap className="w-4 h-4 text-purple-600" />
                  <div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400">Integrations</div>
                    <div className="font-semibold">{details.integrations}+</div>
                  </div>
                </div>
              </div>
          </div>

          {/* Features */}
          <div>
            <h3 className="text-xl font-semibold mb-3">Key Features</h3>
            <div className="grid md:grid-cols-2 gap-2">
              {product.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Details */}
          <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Product Information
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-600 dark:text-zinc-400">Version:</span>
                  <span className="font-medium">{details.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600 dark:text-zinc-400">Last Updated:</span>
                  <span className="font-medium">{details.lastUpdated}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600 dark:text-zinc-400">Compatibility:</span>
                  <span className="font-medium">{details.compatibility}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600 dark:text-zinc-400">Languages:</span>
                  <span className="font-medium">{details.languages}+</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Support & Storage
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-600 dark:text-zinc-400">Support:</span>
                  <span className="font-medium">{details.support}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600 dark:text-zinc-400">Storage:</span>
                  <span className="font-medium">{details.storage}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600 dark:text-zinc-400">Category:</span>
                  <span className="font-medium">{product.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600 dark:text-zinc-400">Availability:</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {product.available ? 'Available Now' : 'Coming Soon'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            {isSubscribed ? (
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setCancelDialogOpen(true)}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel Subscription
              </Button>
            ) : (
              <>
                <Link href={`/checkout?product=${product.id}&type=one_time`} className="flex-1">
                  <Button
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    onClick={() => onOpenChange(false)}
                  >
                    Buy Now - ${product.price}
                  </Button>
                </Link>
                <Link href={`/checkout?product=${product.id}&type=subscription&billing=monthly`} className="flex-1">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => onOpenChange(false)}
                  >
                    Subscribe - ${product.monthlyPrice}/mo
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Cancel Subscription Dialog */}
    <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Subscription</DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel your subscription to {product.name}? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setCancelDialogOpen(false)}
          >
            No, Keep It
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={canceling}
          >
            {canceling ? 'Canceling...' : 'Yes, Cancel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}

