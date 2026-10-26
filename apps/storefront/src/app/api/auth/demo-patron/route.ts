import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/"/g, '')
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/"/g, '')

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Missing service role key' }, { status: 500 })
    }

    const email = 'eleanor.vance@salon.com'
    const password = 'atelier-secret-2026'

    // 1. Check if user exists
    const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    })

    const data = await listRes.json()
    const existing = data.users?.find(
      (u: any) => u.email?.toLowerCase() === email.toLowerCase()
    )

    if (existing) {
      // Ensure user is confirmed, metadata is set, and password is valid
      await fetch(`${supabaseUrl}/auth/v1/admin/users/${existing.id}`, {
        method: 'PUT',
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password,
          email_confirm: true,
          user_metadata: { name: 'Eleanor Vance', role: 'customer' },
        }),
      })

      return NextResponse.json({ success: true, email, password })
    }

    // 2. Create user with email_confirm: true
    const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: 'Eleanor Vance', role: 'customer' },
      }),
    })

    if (!createRes.ok) {
      const err = await createRes.text()
      return NextResponse.json({ error: 'Failed to create demo patron', details: err }, { status: 500 })
    }

    return NextResponse.json({ success: true, email, password })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
