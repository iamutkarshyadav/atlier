// Export types
export * from './types/database.types'

// Export clients
export { createClient as createBrowserClient } from './clients/browser'
export { createServerSupabaseClient } from './clients/server'
export { createMiddlewareClient, protectRoute } from './clients/middleware'
export type { ProtectRouteOptions } from './clients/middleware'

// Export query utilities
export * from './utils/index'
