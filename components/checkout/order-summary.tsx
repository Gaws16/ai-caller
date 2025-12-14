import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getBookById, type Book } from '@/lib/products'

interface OrderSummaryProps {
  book: Book
  paymentType: 'one_time' | 'subscription'
}

export function OrderSummary({ book, paymentType }: OrderSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <div className="relative w-20 h-32 bg-zinc-100 dark:bg-zinc-800 rounded overflow-hidden flex-shrink-0">
            <img
              src={book.imageUrl}
              alt={book.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">{book.title}</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">by {book.author}</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">Quantity: 1</p>
          </div>
        </div>

        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>${book.price.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Shipping</span>
            <span>Free</span>
          </div>
          <div className="border-t pt-2 flex justify-between font-semibold">
            <span>Total</span>
            <span>${book.price.toFixed(2)}</span>
          </div>
        </div>

        {paymentType === 'subscription' && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md text-sm">
            <p className="font-semibold text-blue-900 dark:text-blue-100">
              Monthly Subscription
            </p>
            <p className="text-blue-700 dark:text-blue-300 mt-1">
              You'll be charged ${book.price.toFixed(2)} monthly and receive this book each month.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

