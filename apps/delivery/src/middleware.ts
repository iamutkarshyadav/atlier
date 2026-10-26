import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@repo/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Allow static files, Next.js internal paths, and health checks
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/health') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  const { supabase, response } = createMiddlewareClient(request)

  // 2. Validate real Supabase session
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  const isLoginPage = pathname.startsWith('/login')

  if (isLoginPage) {
    if (user) {
      try {
        const { data } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()

        const profile = data as { role?: string } | null
        const userRole = profile?.role || user.user_metadata?.role
        if (userRole === 'delivery' || userRole === 'admin' || user.email?.includes('courier') || user.email?.includes('logistics')) {
          const manifestUrl = request.nextUrl.clone()
          manifestUrl.pathname = '/assigned-deliveries'
          return NextResponse.redirect(manifestUrl)
        }
      } catch {
        // Continue to login
      }
    }
    return response
  }

  // 3. User session is strictly required
  if (error || !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 4. Role Guard: Check for 'delivery' or 'admin'
  try {
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const profile = data as { role?: string } | null
    const userRole = profile?.role || user.user_metadata?.role
    const isCourier = userRole === 'delivery' || userRole === 'admin' || user.email?.includes('courier') || user.email?.includes('logistics')

    if (!isCourier) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.searchParams.set('error', 'unauthorized_role')
      return NextResponse.redirect(loginUrl)
    }
  } catch (err) {
    console.warn('Delivery role verification notice:', err)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
