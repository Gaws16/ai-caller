import { ProductCard } from './product-card'
import type { Product } from '@/lib/products'

interface ProductGridProps {
  products: Product[]
}

export function ProductGrid({ products }: ProductGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 perspective-1000">
      {products.map((product, index) => (
        <div
          key={product.id}
          className="animate-in fade-in slide-in-from-bottom-4"
          style={{
            animationDelay: `${index * 100}ms`,
            animationFillMode: 'backwards'
          }}
        >
          <ProductCard product={product} />
        </div>
      ))}
    </div>
  )
}
