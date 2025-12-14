import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient as createBrowserClient } from '@/lib/supabase/client'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Development bypass (ONLY in development mode)
  const isDevBypass = process.env.NODE_ENV === 'development' && process.env.DEV_BYPASS_AUTH === 'true'

  if (!session && !isDevBypass) {
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
              href="/"
              className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-800"
            >
              Dashboard
            </Link>
            <Link
              href="/orders"
              className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-800"
            >
              Orders
            </Link>
            <Link
              href="/calls"
              className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-800"
            >
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
    redirect('/login')
  }

  return (
    <form action={handleLogout}>
      <Button type="submit" variant="outline" className="w-full">
        Sign Out
      </Button>
    </form>
  )
}

