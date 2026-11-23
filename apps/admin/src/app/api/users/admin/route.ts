import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@repo/supabase/server'

export const dynamic = 'force-dynamic'

interface CreateAdminPayload {
  email?: string
  name?: string
  password?: string
}

export async function POST(req: NextRequest) {
  try {
    let body: CreateAdminPayload
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON request body' },
        { status: 400 }
      )
    }

    const { email, name, password = 'asdfghjkl' } = body

    if (!email || typeof email !== 'string' || !name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name and a valid email address are required' },
        { status: 400 }
      )
    }

    const trimmedEmail = email.trim().toLowerCase()
    const trimmedName = name.trim()

    if (!trimmedName) {
      return NextResponse.json(
        { error: 'Name cannot be empty' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json(
        { error: `Invalid email format: "${email}"` },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // 1. Check or create in Supabase Auth
    let userId: string | null = null
    let isNew = false

    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email: trimmedEmail,
      password,
      email_confirm: true,
      user_metadata: { name: trimmedName, role: 'admin' },
      app_metadata: { role: 'admin' },
    })

    if (createData?.user) {
      userId = createData.user.id
      isNew = true
    } else {
      // Find existing user in auth
      const { data: listData } = await supabase.auth.admin.listUsers()
      const existingUser = listData?.users?.find(
        (u) => u.email?.toLowerCase() === trimmedEmail
      )
      if (existingUser) {
        userId = existingUser.id
        await supabase.auth.admin.updateUserById(userId, {
          password,
          user_metadata: { name: trimmedName, role: 'admin' },
          app_metadata: { role: 'admin' },
        })
      } else {
        return NextResponse.json(
          { error: `Failed to provision admin in Supabase: ${createError?.message || 'Unknown'}` },
          { status: 500 }
        )
      }
    }

    // 2. Persist to public.users table in Supabase
    const { data: upsertedUser, error: dbErr } = await supabase
      .from('users')
      .upsert(
        {
          id: userId,
          email: trimmedEmail,
          name: trimmedName,
          role: 'admin',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      .select()
      .maybeSingle()

    if (dbErr) {
      return NextResponse.json(
        { error: `Database user record upsert failed: ${dbErr.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        isNew,
        user: {
          id: userId,
          email: trimmedEmail,
          name: trimmedName,
          role: 'ADMIN',
          createdAt: upsertedUser?.created_at || new Date().toISOString(),
          updatedAt: upsertedUser?.updated_at || new Date().toISOString(),
        },
        message: isNew
          ? `Administrator "${trimmedName}" (${trimmedEmail}) successfully created in Supabase.`
          : `User "${trimmedName}" (${trimmedEmail}) updated and elevated to ADMIN role in Supabase.`,
        credentials: {
          email: trimmedEmail,
          role: 'ADMIN',
        },
      },
      { status: isNew ? 201 : 200 }
    )
  } catch (error: any) {
    console.error('Error in /api/users/admin route:', error)
    return NextResponse.json(
      {
        error: 'Internal Server Error while provisioning admin user',
        details: error?.message || String(error),
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'admin')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ admins: data || [] }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error fetching admins' }, { status: 500 })
  }
}
