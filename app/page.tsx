import { BookGrid } from "@/components/products/book-grid";
import { books } from "@/lib/products";
import { Header } from "@/components/layout/header";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Header */}
      <Header />

      {/* Hero Section */}
      <section className="bg-white dark:bg-zinc-900 border-b">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-4">Welcome to BookStore</h2>
            <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
              Discover amazing books. Buy once or subscribe for monthly
              deliveries.
            </p>
          </div>
        </div>
      </section>

      {/* Book Catalog */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold mb-8">Featured Books</h2>
        <BookGrid books={books} />
      </section>
    </div>
  );
}
