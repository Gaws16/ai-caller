'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import type { Product } from '@/lib/products'
import { Check } from 'lucide-react'

interface ProductCardProps {
  product: Product
  onProductClick?: (product: Product) => void
}

export function ProductCard({ product, onProductClick }: ProductCardProps) {
  return (
    <Card 
      className="group relative flex flex-col overflow-hidden border-zinc-200 dark:border-zinc-800 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-2 hover:border-blue-400/50 cursor-pointer"
      onClick={() => onProductClick?.(product)}
    >
      {/* Gradient overlay that appears on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-blue-500/10 group-hover:via-purple-500/10 group-hover:to-pink-500/10 transition-all duration-500 z-10 pointer-events-none" />

      {/* Category badge */}
      <div className="absolute top-3 right-3 z-20 bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-semibold border border-white/20 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
        {product.category}
      </div>

      {/* Image container with scale effect */}
      <div className="relative aspect-[4/3] w-full bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-900 dark:to-zinc-800 overflow-hidden">
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          className="object-cover transition-all duration-700 group-hover:scale-110 group-hover:rotate-2"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        {/* Shimmer effect overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      </div>

      <CardContent className="flex-1 p-6 relative z-20">
        {/* Title with gradient on hover */}
        <h3 className="font-bold text-xl mb-2 line-clamp-1 bg-gradient-to-r from-zinc-900 to-zinc-700 dark:from-white dark:to-zinc-300 bg-clip-text transition-all duration-300 group-hover:from-blue-600 group-hover:to-purple-600">
          {product.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 mb-4 transition-colors duration-300 group-hover:text-zinc-700 dark:group-hover:text-zinc-300">
          {product.description}
        </p>

        {/* Features list with staggered animation */}
        <div className="space-y-1.5 mb-4">
          {product.features.slice(0, 3).map((feature, index) => (
            <div
              key={index}
              className="flex items-center text-xs text-zinc-600 dark:text-zinc-400 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0"
              style={{ transitionDelay: `${index * 50}ms` }}
            >
              <Check className="w-3 h-3 mr-1.5 text-green-500 flex-shrink-0" />
              <span className="line-clamp-1">{feature}</span>
            </div>
          ))}
        </div>

        {/* Pricing with flip effect */}
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <div className="relative overflow-hidden">
              <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent transition-all duration-300">
                ${product.price}
              </p>
            </div>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">one-time</span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            or subscribe: ${product.monthlyPrice}/mo • ${product.yearlyPrice}/yr (save {Math.round((1 - product.yearlyPrice / (product.monthlyPrice * 12)) * 100)}%)
          </p>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2 p-6 pt-0 relative z-20">
        <Link 
          href={`/checkout?product=${product.id}&type=one_time`} 
          className="flex-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/50"
            variant="default"
          >
            Buy Now
          </Button>
        </Link>
        <Link 
          href={`/checkout?product=${product.id}&type=subscription&billing=monthly`} 
          className="flex-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            className="w-full border-2 border-zinc-300 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-400 transform transition-all duration-300 hover:scale-105 hover:bg-blue-50 dark:hover:bg-blue-950/30"
            variant="outline"
          >
            Subscribe
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}
