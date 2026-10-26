import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    const SOVEREIGN_OWNER_EMAIL = 'iamutkarshyadav1@gmail.com'
    if (email.toLowerCase().trim() !== SOVEREIGN_OWNER_EMAIL) {
      return NextResponse.json(
        { error: 'Unauthorized: Only the sovereign shop owner is authorized to access administrative roles.' },
        { status: 403 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/"/g, '')
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/"/g, '')

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL' },
        { status: 500 }
      )
    }

    // 1. Search for user in auth.users
    const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    })

    if (!listRes.ok) {
      const err = await listRes.text()
      return NextResponse.json({ error: 'Failed to query auth directory', details: err }, { status: 500 })
    }

    const listData = await listRes.json()
    const existingUser = listData.users?.find(
      (u: any) => u.email?.toLowerCase() === email.toLowerCase().trim()
    )

    let activeUserId: string
    let userEmail: string = email.trim()

    if (existingUser) {
      activeUserId = existingUser.id
      // Update user metadata in auth.users and confirm email if needed
      const updateBody: Record<string, any> = {
        email_confirm: true,
        user_metadata: {
          ...(existingUser.user_metadata || {}),
          role: 'admin',
        },
      }
      if (password) {
        updateBody.password = password
      }

      await fetch(`${supabaseUrl}/auth/v1/admin/users/${existingUser.id}`, {
        method: 'PUT',
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateBody),
      })
    } else {
      // Create user directly via Supabase Auth Admin API
      const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          password: password || 'asdfghjkl',
          email_confirm: true,
          user_metadata: { name: userEmail.split('@')[0], role: 'admin' },
        }),
      })

      if (!createRes.ok) {
        const err = await createRes.text()
        return NextResponse.json({ error: 'Failed to create admin user', details: err }, { status: 500 })
      }

      const created = await createRes.json()
      activeUserId = created.id
    }

    // 3. Update public.users table setting role = 'admin'
    const patchRes = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${activeUserId}`, {
      method: 'PATCH',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        role: 'admin',
        updated_at: new Date().toISOString(),
      }),
    })

    if (!patchRes.ok) {
      // If user wasn't in public.users yet, upsert them
      await fetch(`${supabaseUrl}/rest/v1/users`, {
        method: 'POST',
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify({
          id: activeUserId,
          role: 'admin',
          email: userEmail,
          name: existingUser?.user_metadata?.name || userEmail.split('@')[0] || 'Admin',
          updated_at: new Date().toISOString(),
        }),
      })
    }

    return NextResponse.json({
      success: true,
      message: `Account "${email}" is now an Admin! You can sign in immediately.`,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error promoting user' }, { status: 500 })
  }
}
