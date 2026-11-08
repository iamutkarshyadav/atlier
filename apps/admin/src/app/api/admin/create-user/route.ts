import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@repo/supabase'
import { createServerSupabaseClient } from '@repo/supabase/server'
import type { Database, UserRole } from '@repo/supabase/types'
import { SEEDED_ACCOUNTS } from '@repo/supabase'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    // 1. Authoritative admin session verification
    const serverSupabase = await createServerSupabaseClient()
    const {
      data: { user: adminUser },
      error: authErr,
    } = await serverSupabase.auth.getUser()

    if (authErr || !adminUser) {
      return NextResponse.json(
        { error: 'Unauthorized: Valid administrator session required' },
        { status: 401 }
      )
    }

    const { data: profile } = await serverSupabase
      .from('users')
      .select('role')
      .eq('id', adminUser.id)
      .single()

    const callerRole = profile?.role || adminUser.app_metadata?.role
    if (callerRole !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Sovereign administrator privileges required' },
        { status: 403 }
      )
    }

    // 2. Parse request payload
    const body = await req.json()
    const { name, email, password, role = 'admin' } = body

    if (!email || !email.includes('@') || !name || !password) {
      return NextResponse.json(
        { error: 'Name, valid email, and initial password are required' },
        { status: 400 }
      )
    }

    const validRoles: UserRole[] = ['admin', 'delivery', 'customer']
    const assignedRole: UserRole = validRoles.includes(role) ? role : 'customer'

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/"/g, '')
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/"/g, '')

    // If Supabase credentials are live, attempt live creation
    if (supabaseUrl && serviceRoleKey && !supabaseUrl.includes('placeholder')) {
      try {
        const adminClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })

        const { data: createdAuth, error: createAuthErr } =
          await adminClient.auth.admin.createUser({
            email: email.trim(),
            password,
            email_confirm: true,
            user_metadata: {
              name: name.trim(),
              role: assignedRole,
            },
            app_metadata: {
              role: assignedRole,
            },
          })

        if (!createAuthErr && createdAuth?.user) {
          const newUserId = createdAuth.user.id

          await adminClient.from('users').upsert(
            {
              id: newUserId,
              email: email.trim(),
              name: name.trim(),
              role: assignedRole,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          )

          return NextResponse.json({
            success: true,
            message: `User "${name.trim()}" (${email.trim()}) successfully provisioned as ${assignedRole.toUpperCase()}.`,
            userId: newUserId,
            role: assignedRole,
          })
        }
      } catch {
        // Fallback to local in-memory registry
      }
    }

    // 3. Fallback / Local Offline Registration
    const existing = SEEDED_ACCOUNTS.find((a) => a.email.toLowerCase() === email.trim().toLowerCase())
    if (existing) {
      existing.role = assignedRole
      existing.name = name.trim()
      existing.password = password
    } else {
      SEEDED_ACCOUNTS.push({
        id: `user-${Date.now()}`,
        email: email.trim().toLowerCase(),
        name: name.trim(),
        role: assignedRole,
        password,
      })
    }

    return NextResponse.json({
      success: true,
      message: `User "${name.trim()}" (${email.trim()}) successfully provisioned as ${assignedRole.toUpperCase()}.`,
      userId: `user-${Date.now()}`,
      role: assignedRole,
      offline: true,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Internal error creating user' },
      { status: 500 }
    )
  }
}

