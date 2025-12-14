import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import type { Book } from '@/lib/products'

interface BookCardProps {
  book: Book
}

export function BookCard({ book }: BookCardProps) {
  return (
    <Card className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative aspect-[2/3] w-full bg-zinc-100 dark:bg-zinc-800">
        <Image
          src={book.imageUrl}
          alt={book.title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>
      <CardContent className="flex-1 p-4">
        <h3 className="font-semibold text-lg mb-1 line-clamp-1">{book.title}</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">by {book.author}</p>
        <p className="text-sm text-zinc-700 dark:text-zinc-300 line-clamp-3 mb-4">
          {book.description}
        </p>
        <p className="text-2xl font-bold">${book.price.toFixed(2)}</p>
      </CardContent>
      <CardFooter className="flex gap-2 p-4 pt-0">
        <Link href={`/checkout?book=${book.id}&type=one_time`} className="flex-1">
          <Button className="w-full" variant="default">
            Buy Now
          </Button>
        </Link>
        <Link href={`/checkout?book=${book.id}&type=subscription`} className="flex-1">
          <Button className="w-full" variant="outline">
            Subscribe
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}

