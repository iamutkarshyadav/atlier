import { describe, it, expect } from 'vitest'
import { createClient } from './browser'

describe('Resilient Supabase Auth Client', () => {
  it('authenticates admin@atelier.internal without throwing', async () => {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin@atelier.internal',
      password: 'admin-secret-2026',
    })

    expect(error).toBeNull()
    expect(data.user).toBeDefined()
    expect(data.user?.email).toBe('admin@atelier.internal')
    expect(data.user?.app_metadata?.role).toBe('admin')
  })

  it('authenticates courier@atelier.internal without throwing', async () => {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'courier@atelier.internal',
      password: 'courier-secret-2026',
    })

    expect(error).toBeNull()
    expect(data.user).toBeDefined()
    expect(data.user?.email).toBe('courier@atelier.internal')
    expect(data.user?.app_metadata?.role).toBe('delivery')
  })

  it('authenticates patron eleanor.vance@salon.com without throwing', async () => {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'eleanor.vance@salon.com',
      password: 'atelier-secret-2026',
    })

    expect(error).toBeNull()
    expect(data.user).toBeDefined()
    expect(data.user?.email).toBe('eleanor.vance@salon.com')
    expect(data.user?.app_metadata?.role).toBe('customer')
  })

  it('queries role from users table correctly', async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', 'b0000000-0000-0000-0000-000000000001')
      .single()

    expect(error).toBeNull()
    expect((data as any)?.role).toBe('admin')
  })

  it('returns invalid login error for wrong credentials', async () => {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin@atelier.internal',
      password: 'wrong-password',
    })

    expect(error).not.toBeNull()
    expect(error?.message).toContain('Invalid login credentials')
    expect(data.session).toBeNull()
  })
})
