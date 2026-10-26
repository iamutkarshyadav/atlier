import { createBrowserClient as createSsrBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

let browserClient: SupabaseClient<Database> | null = null

/**
 * Creates or returns a singleton Supabase client for client-side components.
 */
export function createClient() {
  if (browserClient) return browserClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.warn(
      '[@repo/supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.'
    )
  }

  browserClient = createSsrBrowserClient<Database>(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseKey || 'placeholder-anon-key'
  ) as unknown as SupabaseClient<Database>

  return browserClient
}

export { createClient as createBrowserClient }
