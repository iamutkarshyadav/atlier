import { createServerClient } from '@supabase/ssr'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '../types/database.types'
import { createResilientFetch } from './resilientFetch'

/**
 * Creates a Supabase client for Server Components, Server Actions, and Route Handlers.
 * Configured with resilient fetch adapter to handle offline/disconnected development seamlessly.
 */
export async function createServerSupabaseClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = cookies()

  const rawUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)?.replace(/"/g, '')
  const rawKey = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY
  )?.replace(/"/g, '')

  const supabaseUrl = rawUrl || 'http://127.0.0.1:54321'
  const supabaseKey = rawKey || 'dummy-anon-key'
  const cookieName = (
    process.env.NEXT_PUBLIC_COOKIE_NAME ||
    process.env.COOKIE_NAME
  )?.replace(/"/g, '')

  return createServerClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
          }
        },
      },
      ...(cookieName ? { cookieOptions: { name: cookieName } } : {}),
      global: {
        fetch: createResilientFetch({ timeoutMs: 2000 }),
      },
    }
  ) as unknown as SupabaseClient<Database>
}

/**
 * Creates an elevated Supabase service role client bypassing RLS.
 * Used for secure administrative and background operations (e.g. order updates, inventory mutations).
 */
export function createServiceRoleClient(): SupabaseClient<Database> {
  const rawUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)?.replace(/"/g, '')
  const rawKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.replace(/"/g, '')

  const supabaseUrl = rawUrl || 'http://127.0.0.1:54321'
  const serviceRoleKey = rawKey || 'dummy-service-key'

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: createResilientFetch({ timeoutMs: 3000 }),
    },
  })
}
