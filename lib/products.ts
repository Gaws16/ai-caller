export interface Book {
  id: string
  title: string
  author: string
  description: string
  price: number
  imageUrl: string
  available: boolean
}

export const books: Book[] = [
  {
    id: 'book-1',
    title: 'The Great Adventure',
    author: 'Jane Smith',
    description:
      'An epic tale of courage and discovery. Follow the journey of a young explorer as they navigate uncharted territories and face incredible challenges.',
    price: 19.99,
    imageUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=600&fit=crop',
    available: true,
  },
  {
    id: 'book-2',
    title: 'Science & Innovation',
    author: 'Dr. Robert Chen',
    description:
      'A comprehensive guide to modern scientific breakthroughs and technological innovations that are shaping our future.',
    price: 24.99,
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop',
    available: true,
  },
  {
    id: 'book-3',
    title: 'Mystery at Midnight',
    author: 'Sarah Johnson',
    description:
      'A gripping mystery novel that will keep you on the edge of your seat. Detective Miller must solve a series of puzzling crimes before it\'s too late.',
    price: 16.99,
    imageUrl: 'https://images.unsplash.com/photo-1512820790803-83ca434da1c7?w=400&h=600&fit=crop',
    available: true,
  },
  {
    id: 'book-4',
    title: 'The Art of Cooking',
    author: 'Chef Maria Garcia',
    description:
      'Master the culinary arts with this beautifully illustrated cookbook featuring recipes from around the world and expert cooking techniques.',
    price: 29.99,
    imageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&h=600&fit=crop',
    available: true,
  },
  {
    id: 'book-5',
    title: 'Digital Transformation',
    author: 'Michael Thompson',
    description:
      'Learn how businesses are adapting to the digital age. Essential strategies and insights for modern entrepreneurs and business leaders.',
    price: 22.99,
    imageUrl: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=600&fit=crop',
    available: true,
  },
]

export function getBookById(id: string): Book | undefined {
  return books.find((book) => book.id === id)
}

