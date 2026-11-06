import { createBrowserClient as createSsrBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'
import { createResilientFetch } from './resilientFetch'

let browserClient: SupabaseClient<Database> | null = null

const inMemoryCookies = new Map<string, string>()

/**
 * Creates or returns a singleton Supabase client for client-side components.
 * Configured with resilient fetch adapter to gracefully handle offline/disconnected development.
 */
export function createClient() {
  if (browserClient) return browserClient

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/"/g, '')
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.replace(/"/g, '')

  const supabaseUrl = rawUrl || 'http://127.0.0.1:54321'
  const supabaseKey = rawKey || 'dummy-anon-key'

  const cookieOptions =
    typeof document === 'undefined'
      ? {
          cookies: {
            getAll() {
              return Array.from(inMemoryCookies.entries()).map(([name, value]) => ({ name, value }))
            },
            setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
              cookiesToSet.forEach(({ name, value }) => {
                inMemoryCookies.set(name, value)
              })
            },
          },
        }
      : {}

  browserClient = createSsrBrowserClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      ...cookieOptions,
      global: {
        fetch: createResilientFetch({ timeoutMs: 2000 }),
      },
    }
  ) as unknown as SupabaseClient<Database>

  return browserClient
}

export { createClient as createBrowserClient }
