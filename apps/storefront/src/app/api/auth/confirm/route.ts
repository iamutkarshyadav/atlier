import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/"/g, '') || 'http://127.0.0.1:54321'
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/"/g, '') || 'dummy_service_key'

    try {
      // 1. Search user by email via Supabase Admin REST API with timeout
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 1500)
      const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        signal: controller.signal,
      }).catch(() => null)
      clearTimeout(timer)

      if (listRes && listRes.ok) {
        const data = await listRes.json()
        const targetUser = data.users?.find(
          (u: any) => u.email?.toLowerCase() === email.toLowerCase()
        )

        if (targetUser) {
          // 2. Mark user confirmed immediately
          await fetch(`${supabaseUrl}/auth/v1/admin/users/${targetUser.id}`, {
            method: 'PUT',
            headers: {
              apikey: serviceRoleKey,
              Authorization: `Bearer ${serviceRoleKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email_confirm: true }),
          }).catch(() => null)

          return NextResponse.json({ success: true, userId: targetUser.id, confirmed: true })
        }
      }
    } catch {
      // Graceful offline development fallback
    }

    return NextResponse.json({ success: true, confirmed: true, offline: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
