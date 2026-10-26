import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/"/g, '')
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/"/g, '')

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Server misconfiguration: missing service role key' },
        { status: 500 }
      )
    }

    // 1. Search user by email via Supabase Admin REST API
    const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    })

    if (!listRes.ok) {
      const err = await listRes.text()
      return NextResponse.json({ error: 'Failed to list users', details: err }, { status: 500 })
    }

    const data = await listRes.json()
    const targetUser = data.users?.find(
      (u: any) => u.email?.toLowerCase() === email.toLowerCase()
    )

    if (targetUser) {
      // 2. Mark user confirmed immediately
      const updateRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${targetUser.id}`, {
        method: 'PUT',
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email_confirm: true }),
      })

      if (!updateRes.ok) {
        return NextResponse.json({ error: 'Failed to confirm user' }, { status: 500 })
      }

      return NextResponse.json({ success: true, userId: targetUser.id, confirmed: true })
    }

    return NextResponse.json({ error: 'User not found in auth directory' }, { status: 404 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
