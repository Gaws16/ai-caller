import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { type Product } from '@/lib/products'
import { Check, Sparkles } from 'lucide-react'

interface OrderSummaryProps {
  product: Product
  paymentType: 'one_time' | 'subscription'
  billingCycle: 'monthly' | 'yearly'
}

export function OrderSummary({ product, paymentType, billingCycle }: OrderSummaryProps) {
  const price = paymentType === 'one_time'
    ? product.price
    : (billingCycle === 'monthly' ? product.monthlyPrice : product.yearlyPrice)
  const savings = billingCycle === 'yearly'
    ? Math.round((1 - product.yearlyPrice / (product.monthlyPrice * 12)) * 100)
    : 0

  return (
    <Card className="border-zinc-200 dark:border-zinc-800 hover:shadow-xl transition-all duration-300 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {paymentType === 'one_time' ? 'Order Summary' : 'Subscription Summary'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="flex gap-4">
          <div className="relative w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-xl overflow-hidden flex-shrink-0 group hover:scale-105 transition-transform duration-300">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg bg-gradient-to-r from-zinc-900 to-zinc-700 dark:from-white dark:to-zinc-300 bg-clip-text text-transparent">
              {product.name}
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{product.category}</p>
            <div className="mt-2 inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-full">
              {paymentType === 'one_time'
                ? 'One-Time Purchase'
                : (billingCycle === 'monthly' ? 'Monthly Plan' : 'Annual Plan')}
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="border-t pt-4 space-y-2">
          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
            What's included:
          </p>
          {product.features.map((feature, index) => (
            <div
              key={index}
              className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
            >
              <Check className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
              <span>{feature}</span>
            </div>
          ))}
        </div>

        {/* Pricing */}
        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>{paymentType === 'one_time' ? 'Product Price' : 'Subscription Price'}</span>
            <span>${price.toFixed(2)}</span>
          </div>
          {paymentType === 'subscription' && billingCycle === 'yearly' && (
            <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
              <span>Annual Savings</span>
              <span>-${((product.monthlyPrice * 12) - product.yearlyPrice).toFixed(2)} ({savings}%)</span>
            </div>
          )}
          {paymentType === 'subscription' && (
            <div className="flex justify-between text-sm text-zinc-600 dark:text-zinc-400">
              <span>14-Day Free Trial</span>
              <span className="text-green-600 dark:text-green-400 font-semibold">$0.00</span>
            </div>
          )}
          <div className="border-t pt-2 flex justify-between font-bold text-lg">
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Due Today
            </span>
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {paymentType === 'one_time' ? `$${price.toFixed(2)}` : '$0.00'}
            </span>
          </div>
        </div>

        {/* Trial/Purchase Info */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 p-4 rounded-xl text-sm border border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all duration-300">
          {paymentType === 'subscription' ? (
            <>
              <p className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                🎉 Free Trial Included
              </p>
              <p className="text-blue-700 dark:text-blue-300 text-xs leading-relaxed">
                Start your 14-day free trial now. After the trial, you'll be charged ${price.toFixed(2)} {billingCycle === 'monthly' ? 'per month' : 'per year'}. Cancel anytime during the trial at no cost.
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                ✓ One-Time Payment
              </p>
              <p className="text-blue-700 dark:text-blue-300 text-xs leading-relaxed">
                Pay once and own it forever. Instant access after payment. You'll receive a confirmation call to verify your order.
              </p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

