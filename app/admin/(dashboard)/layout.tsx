import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, Package, Phone, LogOut } from 'lucide-react'

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Require authentication for admin routes (no bypass in production)
  if (!session) {
    redirect('/admin/login')
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-zinc-50 dark:bg-zinc-900">
        <div className="flex h-full flex-col">
          <div className="border-b p-4">
            <h1 className="text-xl font-bold">VoiceVerify</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Admin Dashboard</p>
          </div>
          <nav className="flex-1 space-y-1 p-4">
            <Link
              href="/admin"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-800"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
            <Link
              href="/admin/orders"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-800"
            >
              <Package className="h-4 w-4" />
              Orders
            </Link>
            <Link
              href="/admin/calls"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-800"
            >
              <Phone className="h-4 w-4" />
              Calls
            </Link>
          </nav>
          <div className="border-t p-4">
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-6">{children}</div>
      </main>
    </div>
  )
}

function LogoutButton() {
  async function handleLogout() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/admin/login')
  }

  return (
    <form action={handleLogout}>
      <Button type="submit" variant="outline" className="w-full">
        <LogOut className="h-4 w-4 mr-2" />
        Sign Out
      </Button>
    </form>
  )
}
