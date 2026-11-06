// Export types
export * from './types/database.types'

// Export Supabase JS client builder & types
export { createClient } from '@supabase/supabase-js'
export type { SupabaseClient, User, Session } from '@supabase/supabase-js'

// Export clients
export { createClient as createBrowserClient } from './clients/browser'
export { createServerSupabaseClient } from './clients/server'
export { createMiddlewareClient, protectRoute } from './clients/middleware'
export type { ProtectRouteOptions } from './clients/middleware'
export * from './clients/resilientFetch'

// Export query utilities
export * from './utils/index'
