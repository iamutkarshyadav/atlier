import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@repo/supabase/server'
import type { UserRole } from '@repo/supabase/types'

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

    const validRoles: UserRole[] = ['admin', 'delivery_partner', 'delivery', 'customer']
    const assignedRole: UserRole = validRoles.includes(role)
      ? (role === 'delivery' ? 'delivery_partner' : role)
      : 'customer'

    const adminClient = createServiceRoleClient()

    // 3. Create or update user in Supabase Auth via Service Role Client
    const trimmedEmail = email.trim().toLowerCase()
    const trimmedName = name.trim()

    const { data: createdAuth, error: createAuthErr } =
      await adminClient.auth.admin.createUser({
        email: trimmedEmail,
        password,
        email_confirm: true,
        user_metadata: {
          name: trimmedName,
          role: assignedRole,
        },
        app_metadata: {
          role: assignedRole,
        },
      })

    let userId = createdAuth?.user?.id

    if (createAuthErr) {
      // If user already exists in auth, find user ID
      const { data: listData } = await adminClient.auth.admin.listUsers()
      const existingAuth = listData?.users?.find(
        (u) => u.email?.toLowerCase() === trimmedEmail
      )
      if (existingAuth) {
        userId = existingAuth.id
        await adminClient.auth.admin.updateUserById(userId, {
          password,
          user_metadata: { name: trimmedName, role: assignedRole },
          app_metadata: { role: assignedRole },
        })
      } else {
        return NextResponse.json(
          { error: `Auth creation failed: ${createAuthErr.message}` },
          { status: 400 }
        )
      }
    }

    if (userId) {
      const { error: dbErr } = await adminClient.from('users').upsert(
        {
          id: userId,
          email: trimmedEmail,
          name: trimmedName,
          role: assignedRole,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )

      if (dbErr) {
        return NextResponse.json(
          { error: `Database user record upsert failed: ${dbErr.message}` },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: `User "${trimmedName}" (${trimmedEmail}) successfully provisioned as ${assignedRole.toUpperCase()} in Supabase.`,
      userId,
      role: assignedRole,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Internal error creating user' },
      { status: 500 }
    )
  }
}
