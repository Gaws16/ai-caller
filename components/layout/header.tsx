'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { User, ShoppingBag, CreditCard, LogOut } from 'lucide-react'
import Image from 'next/image'
import type { User as SupabaseUser } from '@supabase/supabase-js'

export function Header() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
    }

    getUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg transition-all duration-300 hover:shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="group flex items-center gap-2 text-2xl font-bold transition-all duration-300"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 blur-lg opacity-0 group-hover:opacity-50 transition-opacity duration-300" />
              {/* Christmas Hat */}
              <svg
                className="absolute -top-4 -right-1 w-10 h-10 z-10 group-hover:scale-110 transition-transform duration-300"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Hat cone - curved to the right */}
                <path
                  d="M8 16 Q12 8 20 8 Q24 8 26 12 L26 20 Q24 24 20 24 Q16 24 12 20 Z"
                  fill="#DC2626"
                  className="drop-shadow-sm"
                />
                {/* White brim - curved */}
                <path
                  d="M10 20 Q16 18 22 20 Q24 20.5 24 22 Q22 23 20 22.5 Q16 22 12 22.5 Q10 22.5 10 20 Z"
                  fill="#FFFFFF"
                />
                {/* White pom-pom */}
                <circle
                  cx="24"
                  cy="10"
                  r="3"
                  fill="#FFFFFF"
                  className="drop-shadow-sm"
                />
              </svg>
              <span className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent group-hover:from-blue-500 group-hover:via-purple-500 group-hover:to-pink-500 transition-all duration-300">
                VoiceVerify
              </span>
            </div>
            <span className="text-xs bg-gradient-to-r from-blue-600 to-purple-600 text-white px-2 py-0.5 rounded-full font-semibold opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
              PRO
            </span>
          </Link>
          <nav className="flex items-center gap-4">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-300 hover:scale-105 flex items-center gap-2"
                  >
                    {user.user_metadata?.avatar_url ? (
                      <div className="relative w-8 h-8 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-800">
                        <Image
                          src={user.user_metadata.avatar_url}
                          alt="Profile"
                          fill
                          className="object-cover"
                          sizes="32px"
                        />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <span className="hidden sm:inline">{user.email || 'Account'}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="border-zinc-200 dark:border-zinc-800 w-56">
                  <Link href="/profile">
                    <DropdownMenuItem className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/my-purchases">
                    <DropdownMenuItem className="cursor-pointer">
                      <ShoppingBag className="mr-2 h-4 w-4" />
                      My Purchases
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/my-subscriptions">
                    <DropdownMenuItem className="cursor-pointer">
                      <CreditCard className="mr-2 h-4 w-4" />
                      My Subscriptions
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200 cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link href="/login">
                  <Button
                    variant="ghost"
                    className="hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-300 hover:scale-105"
                  >
                    Login
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/50">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}

