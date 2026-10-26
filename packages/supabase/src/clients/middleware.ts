import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database, UserRole } from '../types/database.types'

/**
 * Initializes Supabase client in Next.js Edge Middleware and preserves cookie headers.
 */
export function createMiddlewareClient(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

  const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  return { supabase, response: supabaseResponse }
}

export interface ProtectRouteOptions {
  requiredRole?: UserRole
  loginPath?: string
  publicPaths?: string[]
}

/**
 * Protects an application's routes by validating Supabase session and user role.
 * Used directly in apps/admin/middleware.ts and apps/delivery/middleware.ts.
 */
export async function protectRoute(
  request: NextRequest,
  options: ProtectRouteOptions = {}
) {
  const {
    requiredRole,
    loginPath = '/login',
    publicPaths = ['/login', '/auth', '/_next', '/favicon.ico', '/api/health'],
  } = options

  const pathname = request.nextUrl.pathname
  const { supabase, response } = createMiddlewareClient(request)

  // Allow public static and auth paths
  const isPublic = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  )
  if (isPublic) {
    return response
  }

  // Validate the user's authentication session
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = loginPath
    redirectUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // If a specific role is required (e.g. 'admin' or 'delivery'), check role from users table
  if (requiredRole) {
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const profile = data as { role?: UserRole } | null
    if (!profile || profile.role !== requiredRole) {
      // Forbidden: redirect to login or show unauthorized
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = loginPath
      redirectUrl.searchParams.set('error', 'unauthorized_role')
      return NextResponse.redirect(redirectUrl)
    }
  }

  return response
}
