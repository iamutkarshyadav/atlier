import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@repo/supabase'
import type { Database, UserRole } from '@repo/supabase/types'

export const dynamic = 'force-dynamic'

const DEMO_STAFF_ACCOUNTS = [
  {
    email: 'horizonlord1@gmail.com',
    password: 'asdfghjkl',
    name: 'Horizon Lord',
    role: 'admin' as UserRole,
  },
  {
    email: 'iamutkarshyadav1@gmail.com',
    password: 'asdfghjkl',
    name: 'Utkarsh Yadav',
    role: 'admin' as UserRole,
  },
  {
    email: 'warehouse@atelier.internal',
    password: 'atelier-master-password',
    name: 'Warehouse Operations Manager',
    role: 'warehouse_manager' as UserRole,
  },
  {
    email: 'store.manager@atelier.internal',
    password: 'atelier-master-password',
    name: 'Indiranagar Boutique Manager',
    role: 'store_manager' as UserRole,
  },
  {
    email: 'cashier@atelier.internal',
    password: 'atelier-master-password',
    name: 'POS Terminal Cashier',
    role: 'pos_cashier' as UserRole,
  },
]

export async function POST() {
  return handleBootstrap()
}

export async function GET() {
  return handleBootstrap()
}

async function handleBootstrap() {
  try {
    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const rawKey =
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const supabaseUrl = rawUrl?.replace(/"/g, '')
    const serviceRoleKey = rawKey?.replace(/"/g, '')

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Supabase URL or Service Role Key missing in environment' },
        { status: 500 }
      )
    }

    const adminClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const results = []

    for (const staff of DEMO_STAFF_ACCOUNTS) {
      let userId: string | null = null

      // 1. Try to create user in auth.users
      const { data: createData, error: createErr } =
        await adminClient.auth.admin.createUser({
          email: staff.email,
          password: staff.password,
          email_confirm: true,
          user_metadata: { name: staff.name, role: staff.role },
          app_metadata: { role: staff.role },
        })

      if (createData?.user) {
        userId = createData.user.id
      } else if (createErr?.message?.toLowerCase().includes('already registered')) {
        // User already exists, update their password and metadata
        const { data: listData } = await adminClient.auth.admin.listUsers({
          perPage: 100,
        })
        const existing = listData?.users.find(
          (u: any) => u.email?.toLowerCase() === staff.email.toLowerCase()
        )
        if (existing) {
          userId = existing.id
          await adminClient.auth.admin.updateUserById(userId, {
            password: staff.password,
            email_confirm: true,
            user_metadata: { name: staff.name, role: staff.role },
            app_metadata: { role: staff.role },
          })
        }
      }

      if (userId) {
        // 2. Synchronize to public.users table with authoritative role
        const { error: upsertErr } = await adminClient.from('users').upsert({
          id: userId,
          email: staff.email,
          name: staff.name,
          role: staff.role,
          updated_at: new Date().toISOString(),
        })

        results.push({
          email: staff.email,
          role: staff.role,
          status: 'ready',
          userId,
          upsertError: upsertErr?.message || null,
        })
      } else {
        results.push({
          email: staff.email,
          role: staff.role,
          status: 'failed',
          error: createErr?.message || 'Unknown creation error',
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Staff authentication bootstrap completed.',
      accounts: results,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to bootstrap accounts' },
      { status: 500 }
    )
  }
}
