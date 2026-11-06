import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@repo/supabase/server'
import type { TryOnDecision } from '@repo/supabase/types'

export const dynamic = 'force-dynamic'

interface DecisionItem {
  itemId: string
  decision: TryOnDecision
}

interface CompleteSessionPayload {
  orderId: string
  decisions: DecisionItem[]
  collectedPaymentMode?: 'upi' | 'cash' | 'pos'
}

const BOLT_BOOKING_FEE = 99.0

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Courier authentication required to finalize session' },
        { status: 401 }
      )
    }

    const body: CompleteSessionPayload = await req.json()
    const { orderId, decisions, collectedPaymentMode = 'upi' } = body

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

    // 1. Fetch current order from DB to verify existence
    const { data: order, error: orderFetchErr } = await supabase
      .from('orders')
      .select('id, order_number, total, bolt_session_status, status')
      .eq('id', orderId)
      .maybeSingle()

    if (orderFetchErr || !order) {
      return NextResponse.json(
        { error: 'Order not found in Atelier registry' },
        { status: 404 }
      )
    }

    // 2. Fetch authoritative items from DB to prevent client-controlled pricing injection
    const { data: dbItems, error: itemsFetchErr } = await supabase
      .from('order_items')
      .select('id, unit_price, quantity, is_kept, try_on_decision')
      .eq('order_id', orderId)

    if (itemsFetchErr || !dbItems || dbItems.length === 0) {
      return NextResponse.json(
        { error: 'No order items found for this try-on package' },
        { status: 404 }
      )
    }

    // 3. Map decisions and calculate authoritative final payable amount
    const decisionMap = new Map<string, TryOnDecision>(
      decisions.map((d) => [d.itemId, d.decision])
    )

    let keptCount = 0
    let rejectedCount = 0
    let keptSubtotal = 0

    // Update each order_item in DB with the final try-on decision
    for (const item of dbItems) {
      const decision = decisionMap.get(item.id) || 'rejected'
      const isKept = decision === 'kept'

      if (isKept) {
        keptCount++
        keptSubtotal += Number(item.unit_price) * (Number(item.quantity) || 1)
      } else {
        rejectedCount++
      }

      const { error: itemUpdateErr } = await supabase
        .from('order_items')
        .update({
          try_on_decision: decision,
          is_kept: isKept,
        })
        .eq('id', item.id)

      if (itemUpdateErr) {
        console.error(`Error updating item ${item.id}:`, itemUpdateErr)
      }
    }

    // Subtract the ₹99 booking fee already paid at checkout (cannot go below 0)
    const finalCalculatedAmount = Math.max(0, keptSubtotal - BOLT_BOOKING_FEE)
    const creditApplied = Math.min(BOLT_BOOKING_FEE, keptSubtotal)
    const nowIso = new Date().toISOString()

    // 4. Update order status: delivered, bolt_session_status: completed, reconciled_at, total
    const { error: orderUpdateErr } = await supabase
      .from('orders')
      .update({
        bolt_session_status: 'completed',
        status: 'delivered',
        try_on_status: 'reconciled',
        total: finalCalculatedAmount,
        reconciled_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', orderId)

    if (orderUpdateErr) {
      return NextResponse.json(
        { error: orderUpdateErr.message || 'Failed to update final order status' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      orderId,
      finalPayable: finalCalculatedAmount,
      keptCount,
      rejectedCount,
      keptSubtotal,
      creditApplied,
      collectedPaymentMode,
      reconciledAt: nowIso,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    console.error('Error completing Bolt session:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

