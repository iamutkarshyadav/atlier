import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@repo/supabase'
import { createServerSupabaseClient } from '@repo/supabase/server'
import type { Database } from '@repo/supabase/types'

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

    const role = profile?.role || adminUser.app_metadata?.role
    if (role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Sovereign administrator privileges required' },
        { status: 403 }
      )
    }

    // 2. Parse request payload
    const body = await req.json()
    const { name, email, password } = body

    if (!email || !email.includes('@') || !name || !password) {
      return NextResponse.json(
        { error: 'Courier name, valid email, and initial password are required' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/"/g, '')
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/"/g, '')

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Server misconfiguration: missing service role key' },
        { status: 500 }
      )
    }

    // 3. Service role Supabase Admin client (does not touch caller's cookies)
    const adminClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 4. Provision courier in auth.users
    const { data: createdAuth, error: createAuthErr } =
      await adminClient.auth.admin.createUser({
        email: email.trim(),
        password,
        email_confirm: true,
        user_metadata: {
          name: name.trim(),
          role: 'delivery',
        },
        app_metadata: {
          role: 'delivery',
        },
      })

    if (createAuthErr || !createdAuth.user) {
      return NextResponse.json(
        { error: createAuthErr?.message || 'Failed to create courier user in auth' },
        { status: 400 }
      )
    }

    const courierId = createdAuth.user.id

    // 5. Upsert courier into public.users table
    await adminClient
      .from('users')
      .upsert(
        {
          id: courierId,
          email: email.trim(),
          name: name.trim(),
          role: 'delivery',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )

    return NextResponse.json({
      success: true,
      message: `Courier "${name.trim()}" successfully provisioned with role "delivery".`,
      userId: courierId,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Internal error creating courier' },
      { status: 500 }
    )
  }
}
