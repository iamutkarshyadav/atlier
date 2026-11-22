import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@repo/supabase/server'
import { completeBoltTryOnReconciliation } from '@repo/supabase/utils'
import type { PosPaymentMethod } from '@repo/supabase/types'

export const dynamic = 'force-dynamic'

interface DecisionItem {
  itemId: string
  decision: 'kept' | 'rejected'
  rejectionReason?: string
}

interface CompleteSessionPayload {
  orderId: string
  decisions: DecisionItem[]
  collectedPaymentMode?: PosPaymentMethod
  paymentRef?: string
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    // Support authenticated couriers with local development fallback
    const courierId =
      user?.id ||
      (process.env.NODE_ENV !== 'production' ? 'd2000000-0000-0000-0000-000000000002' : null)

    if (!courierId) {
      return NextResponse.json(
        { error: 'Unauthorized: Courier authentication required to finalize session' },
        { status: 401 }
      )
    }

    const body: CompleteSessionPayload = await req.json()
    const { orderId, decisions, collectedPaymentMode = 'upi', paymentRef } = body

    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid orderId provided' },
        { status: 400 }
      )
    }

    if (!decisions || !Array.isArray(decisions) || decisions.length === 0) {
      return NextResponse.json(
        { error: 'Missing decisions array for try-on order items' },
        { status: 400 }
      )
    }

    // Call single authoritative PostgreSQL reconciliation RPC
    const serviceClient = createServiceRoleClient()
    const result = await completeBoltTryOnReconciliation(serviceClient, {
      orderId,
      decisions: decisions.map((d) => ({
        order_item_id: d.itemId,
        decision: d.decision === 'kept' ? 'kept' : 'rejected',
        rejection_reason:
          d.decision === 'rejected'
            ? d.rejectionReason || 'Customer rejected during doorstep fitting'
            : null,
      })),
      paymentMode: (collectedPaymentMode as PosPaymentMethod) || 'upi',
      paymentRef: paymentRef || null,
      courierId,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to complete reconciliation' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      orderId,
      ...result.data,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    console.error('Error completing Bolt session:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
