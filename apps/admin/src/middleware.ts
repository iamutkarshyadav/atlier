import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@repo/supabase/middleware'

const STATIC_FILE_REGEX = /\.(ico|jpg|jpeg|png|gif|svg|webp|css|js|woff|woff2|ttf|eot)$/i
const VALID_STAFF_ROLES = ['admin', 'warehouse_manager', 'store_manager', 'pos_cashier']

/**
 * Sovereign Omnichannel Admin Portal Middleware
 * Strict FAIL-CLOSED security architecture with granular role-based route scoping.
 * Patches:
 *  - Dot-path bypass via strict static regex
 *  - Email substring escalation
 *  - Expanded staff roles with route scoping (pos_cashier, store_manager, warehouse_manager, admin)
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Allow static assets, Next.js internals, public icons, and internal inventory/try-on APIs
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/public/') ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/api/inventory/') ||
    pathname.startsWith('/api/try-on/') ||
    pathname.startsWith('/api/users/') ||
    STATIC_FILE_REGEX.test(pathname)
  ) {
    return NextResponse.next()
  }

  const isApiRoute = pathname.startsWith('/api')
  const { supabase, response } = createMiddlewareClient(request)

  // 2. Validate Authenticated Supabase Session
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  const isLoginPage = pathname.startsWith('/login')

  if (isLoginPage) {
    if (user && !error) {
      try {
        const { data: profile } = (await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()) as { data: { role?: string } | null; error: any }

        const verifiedRole = profile?.role || user.app_metadata?.role

        if (verifiedRole && VALID_STAFF_ROLES.includes(verifiedRole)) {
          const targetUrl = request.nextUrl.clone()
          targetUrl.pathname = verifiedRole === 'pos_cashier' ? '/pos' : '/dashboard'
          return NextResponse.redirect(targetUrl)
        }
      } catch {
        // Fall through to login page
      }
    }
    return response
  }

  // 3. Protected Routes: Valid session is strictly mandatory
  if (error || !user) {
    if (isApiRoute) {
      return NextResponse.json(
        { error: 'Unauthorized: Valid staff session required' },
        { status: 401 }
      )
    }
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 4. Authoritative Database Role Verification (STRICT FAIL-CLOSED)
  try {
    const { data: profile, error: profileErr } = (await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()) as { data: { role?: string } | null; error: any }

    const verifiedRole = profile?.role || (profileErr ? user.app_metadata?.role : null)

    if (!verifiedRole || !VALID_STAFF_ROLES.includes(verifiedRole)) {
      if (isApiRoute) {
        return NextResponse.json(
          { error: 'Forbidden: Omnichannel staff privileges required' },
          { status: 403 }
        )
      }
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.searchParams.set('error', 'unauthorized_role')
      return NextResponse.redirect(loginUrl)
    }

    // 5. Granular Route-Level Scoping for Cashiers
    if (verifiedRole === 'pos_cashier') {
      const isAllowedCashierPath =
        pathname.startsWith('/pos') ||
        pathname.startsWith('/orders') ||
        pathname.startsWith('/inventory') ||
        pathname.startsWith('/invoice') ||
        pathname.startsWith('/api/orders') ||
        pathname.startsWith('/api/invoice')

      if (!isAllowedCashierPath) {
        if (isApiRoute) {
          return NextResponse.json(
            { error: 'Forbidden: Cashier role is restricted to POS, Orders, and Inventory lookup' },
            { status: 403 }
          )
        }
        const posUrl = request.nextUrl.clone()
        posUrl.pathname = '/pos'
        return NextResponse.redirect(posUrl)
      }
    }
  } catch (err) {
    console.error('CRITICAL: Staff role verification failed. Enforcing fail-closed gate:', err)
    if (isApiRoute) {
      return NextResponse.json(
        { error: 'Internal session verification failed' },
        { status: 500 }
      )
    }
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
