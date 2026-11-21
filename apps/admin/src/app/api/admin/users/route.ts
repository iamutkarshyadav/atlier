import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@repo/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const roleParam = searchParams.get('role')
    const supabase = createServiceRoleClient()

    // Query all users from the public.users table
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    let users = data || []

    // Filter in the application layer to avoid PostgreSQL enum cast errors
    // (e.g. 'delivery_partner' vs 'delivery')
    if (roleParam) {
      const allowedRoles = roleParam
        .split(',')
        .map((r) => r.trim().toLowerCase())
        .filter(Boolean)

      if (allowedRoles.length > 0) {
        users = users.filter((u: any) => {
          const userRole = (u.role || '').toLowerCase()
          return (
            allowedRoles.includes(userRole) ||
            (allowedRoles.includes('delivery') && userRole === 'delivery_partner') ||
            (allowedRoles.includes('delivery_partner') && userRole === 'delivery')
          )
        })
      }
    }

    return NextResponse.json({ users }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to list users' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, role } = body
    if (!userId || !role) {
      return NextResponse.json({ error: 'Missing userId or role' }, { status: 400 })
    }

    // Map delivery_partner to delivery for PostgreSQL enum compliance
    const sanitizedRole = role === 'delivery_partner' ? 'delivery' : role

    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from('users')
      .update({ role: sanitizedRole as any, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ success: true, user: data }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to update user' }, { status: 500 })
  }
}
