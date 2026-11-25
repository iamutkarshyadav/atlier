// Export types
export * from './types/database.types'
export * from './types/popups'

// Export Supabase JS client builder & types
export { createClient } from '@supabase/supabase-js'
export type { SupabaseClient, User, Session } from '@supabase/supabase-js'

// Export browser client
export { createClient as createBrowserClient } from './clients/browser'
export * from './clients/resilientFetch'

// Export query utilities
export * from './utils/index'
export * from './utils/popups'

// Export pricing & promotions engine
export * from './pricing/index'
