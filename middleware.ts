import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Development bypass (ONLY in development mode)
  const isDevBypass = process.env.NODE_ENV === 'development' && process.env.DEV_BYPASS_AUTH === 'true'

  const pathname = request.nextUrl.pathname

  // Public routes (no auth required)
  const publicRoutes = ['/', '/login', '/signup', '/admin/login']
  const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith('/api/') || pathname.startsWith('/auth/')

  // Admin routes (dashboard)
  const isAdminRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/admin')

  // Customer routes (checkout)
  const isCustomerRoute = pathname.startsWith('/checkout')

  // Protect customer checkout routes (require customer auth)
  if (isCustomerRoute && !session && !isDevBypass) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Protect admin dashboard routes (require admin auth or bypass)
  if (isAdminRoute && !pathname.startsWith('/admin/login') && !session && !isDevBypass) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from login/signup pages
  if (pathname === '/login' && session) {
    const redirectTo = request.nextUrl.searchParams.get('redirect') || '/'
    const url = request.nextUrl.clone()
    url.pathname = redirectTo
    url.search = ''
    return NextResponse.redirect(url)
  }

  if (pathname === '/signup' && session) {
    const redirectTo = request.nextUrl.searchParams.get('redirect') || '/'
    const url = request.nextUrl.clone()
    url.pathname = redirectTo
    url.search = ''
    return NextResponse.redirect(url)
  }

  if (pathname === '/admin/login' && session) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

