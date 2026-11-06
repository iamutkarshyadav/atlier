import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '../types/database.types'
import { createResilientFetch } from './resilientFetch'

/**
 * Creates a Supabase client for Server Components, Server Actions, and Route Handlers.
 * Configured with resilient fetch adapter to handle offline/disconnected development seamlessly.
 */
export async function createServerSupabaseClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = cookies()

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/"/g, '')
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.replace(/"/g, '')

  const supabaseUrl = rawUrl || 'http://127.0.0.1:54321'
  const supabaseKey = rawKey || 'dummy-anon-key'

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
      global: {
        fetch: createResilientFetch({ timeoutMs: 2000 }),
      },
    }
  ) as unknown as SupabaseClient<Database>
}
