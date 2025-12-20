'use client'

import { useState } from 'react'
import { ProductCard } from './product-card'
import { ProductDetailsDialog } from './product-details-dialog'
import type { Product } from '@/lib/products'
import type { Database } from '@/lib/supabase/types'

type Payment = Database['public']['Tables']['payments']['Row']
type Order = Database['public']['Tables']['orders']['Row']

interface SubscriptionWithOrder extends Payment {
  orders: Order
}

interface ProductGridProps {
  products: Product[]
  userSubscriptions?: Map<string, SubscriptionWithOrder>
}

export function ProductGrid({ products, userSubscriptions = new Map() }: ProductGridProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 perspective-1000">
        {products.map((product, index) => {
          const subscription = userSubscriptions.get(product.name)
          return (
            <div
              key={product.id}
              className="animate-in fade-in slide-in-from-bottom-4"
              style={{
                animationDelay: `${index * 100}ms`,
                animationFillMode: 'backwards'
              }}
            >
              <ProductCard 
                product={product} 
                onProductClick={setSelectedProduct}
                subscription={subscription}
              />
            </div>
          )
        })}
      </div>
      {selectedProduct && (
        <ProductDetailsDialog
          product={selectedProduct}
          open={!!selectedProduct}
          onOpenChange={(open) => !open && setSelectedProduct(null)}
        />
      )}
    </>
  )
}
