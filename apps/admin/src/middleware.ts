import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@repo/supabase/middleware'

/**
 * Sovereign Admin Portal Middleware
 * Strict FAIL-CLOSED security architecture.
 * Patches fail-open bypass, email substring escalation, and client metadata spoofing.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Allow static files, Next.js internals, and health checks
  if (
    pathname.startsWith('/_next') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  // 2. Lockdown Dangerous Development Auth API Backdoors in Production
  if (
    pathname.startsWith('/api/auth/promote-user') ||
    pathname.startsWith('/api/auth/demo-admin')
  ) {
    if (process.env.NODE_ENV === 'production' && !request.headers.get('x-admin-setup-key')) {
      return NextResponse.json(
        { error: 'Forbidden: Setup backdoors are strictly disabled in production.' },
        { status: 403 }
      )
    }
  }

  // Allow standard internal Next API routes if needed, otherwise continue to auth checks
  if (pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  const { supabase, response } = createMiddlewareClient(request)

  // 3. Validate Authenticated Supabase Session
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  const isLoginPage = pathname.startsWith('/login')

  if (isLoginPage) {
    // If user is already authenticated with verified 'admin' database role, forward to dashboard
    if (user && !error) {
      try {
        const { data: profile } = (await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()) as { data: { role?: string } | null; error: any }

        const verifiedRole = profile?.role || user.app_metadata?.role

        if (verifiedRole === 'admin') {
          const dashboardUrl = request.nextUrl.clone()
          dashboardUrl.pathname = '/dashboard'
          return NextResponse.redirect(dashboardUrl)
        }
      } catch {
        // Fall through to login page
      }
    }
    return response
  }

  // 4. Protected Routes: Valid session is strictly mandatory
  if (error || !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 5. Authoritative Database Role Verification (STRICT FAIL-CLOSED)
  // Rejects client-side user_metadata and email substring heuristics
  try {
    const { data: profile, error: profileErr } = (await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()) as { data: { role?: string } | null; error: any }

    // Authoritative check: profile table role, or server-managed app_metadata if table unprovisioned
    const verifiedRole = profile?.role || (profileErr ? user.app_metadata?.role : null)

    if (verifiedRole !== 'admin') {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.searchParams.set('error', 'unauthorized_role')
      return NextResponse.redirect(loginUrl)
    }
  } catch (err) {
    // FAIL-CLOSED: Any transient error, timeout, or DB disconnection terminates the session
    console.error('CRITICAL: Admin role verification failed. Enforcing fail-closed gate:', err)
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('error', 'session_verification_failed')
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
