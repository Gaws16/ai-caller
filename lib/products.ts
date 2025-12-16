export interface Product {
  id: string
  name: string
  category: string
  description: string
  price: number // one-time purchase price
  monthlyPrice: number
  yearlyPrice: number
  imageUrl: string
  features: string[]
  available: boolean
}

export const products: Product[] = [
  {
    id: 'app-1',
    name: 'FocusFlow Pro',
    category: 'Productivity',
    description:
      'AI-powered focus timer and task manager that adapts to your workflow. Boost productivity with smart breaks, distraction blocking, and deep work analytics.',
    price: 49.99,
    monthlyPrice: 9.99,
    yearlyPrice: 99.99,
    imageUrl: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=400&h=600&fit=crop',
    features: ['AI Task Prioritization', 'Focus Analytics', 'Team Collaboration', 'Pomodoro Timer'],
    available: true,
  },
  {
    id: 'app-2',
    name: 'DesignKit Studio',
    category: 'Design',
    description:
      'Professional design toolkit with AI-powered image editing, vector graphics, and unlimited cloud storage. Perfect for creators and design teams.',
    price: 79.99,
    monthlyPrice: 14.99,
    yearlyPrice: 149.99,
    imageUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=600&fit=crop',
    features: ['AI Image Generation', 'Vector Editor', 'Unlimited Storage', 'Brand Kit'],
    available: true,
  },
  {
    id: 'app-3',
    name: 'DevTools Plus',
    category: 'Development',
    description:
      'Complete developer environment with AI code completion, debugging tools, and integrated deployment pipeline. Ship code faster with confidence.',
    price: 99.99,
    monthlyPrice: 19.99,
    yearlyPrice: 199.99,
    imageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=600&fit=crop',
    features: ['AI Code Assistant', 'Smart Debugging', 'CI/CD Pipeline', 'Team Workspace'],
    available: true,
  },
  {
    id: 'app-4',
    name: 'ContentCraft AI',
    category: 'Content Creation',
    description:
      'Transform your content creation with AI writing, video editing, and social media scheduling. Create engaging content 10x faster.',
    price: 129.99,
    monthlyPrice: 24.99,
    yearlyPrice: 249.99,
    imageUrl: 'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?w=400&h=600&fit=crop',
    features: ['AI Writing Assistant', 'Video Editor', 'Social Scheduler', 'SEO Optimizer'],
    available: true,
  },
  {
    id: 'app-5',
    name: 'DataViz Pro',
    category: 'Analytics',
    description:
      'Enterprise-grade data visualization and analytics platform. Turn complex data into actionable insights with beautiful interactive dashboards.',
    price: 149.99,
    monthlyPrice: 29.99,
    yearlyPrice: 299.99,
    imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=600&fit=crop',
    features: ['Real-time Dashboards', 'Custom Reports', 'API Integration', 'Advanced Analytics'],
    available: true,
  },
  {
    id: 'app-6',
    name: 'MindFlow Meditation',
    category: 'Wellness',
    description:
      'Personalized meditation and mindfulness app with AI-guided sessions, sleep stories, and stress tracking. Find your inner peace daily.',
    price: 59.99,
    monthlyPrice: 12.99,
    yearlyPrice: 129.99,
    imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=600&fit=crop',
    features: ['AI Personalization', 'Sleep Programs', 'Stress Tracker', 'Breathing Exercises'],
    available: true,
  },
]

export function getProductById(id: string): Product | undefined {
  return products.find((product) => product.id === id)
}

