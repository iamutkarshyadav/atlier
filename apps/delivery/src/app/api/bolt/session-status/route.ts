import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@repo/supabase/server'
import type { BoltSessionStatus } from '@repo/supabase/types'

export const dynamic = 'force-dynamic'

interface UpdateStatusPayload {
  orderId: string
  status: BoltSessionStatus
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Courier authentication required' },
        { status: 401 }
      )
    }

    const body: UpdateStatusPayload = await req.json()
    const { orderId, status } = body

    if (!orderId || !status) {
      return NextResponse.json(
        { error: 'orderId and status are required' },
        { status: 400 }
      )
    }

    const validStatuses: BoltSessionStatus[] = [
      'scheduled',
      'en_route',
      'at_doorstep',
      'completed',
      'cancelled',
    ]

    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    const updates: {
      bolt_session_status: BoltSessionStatus
      fitting_started_at?: string
      updated_at: string
    } = {
      bolt_session_status: status,
      updated_at: new Date().toISOString(),
    }

    if (status === 'at_doorstep') {
      updates.fitting_started_at = new Date().toISOString()
    }

    const { error: updateErr } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId)

    if (updateErr) {
      return NextResponse.json(
        { error: updateErr.message || 'Failed to update session status' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      orderId,
      bolt_session_status: status,
      fitting_started_at: updates.fitting_started_at,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

