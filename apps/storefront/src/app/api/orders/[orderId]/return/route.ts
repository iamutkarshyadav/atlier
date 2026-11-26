import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@repo/supabase/server'
import {
  buildOrderReferenceOrFilter,
  saveLocalReturnRequest,
} from '@repo/supabase/utils'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const rawRef = decodeURIComponent(params.orderId || '').trim()
    if (!rawRef) {
      return NextResponse.json(
        { success: false, error: 'Order reference is required' },
        { status: 400 }
      )
    }

    const body = await req.json()
    const {
      orderItemId,
      requestType,
      replacementSize,
      reason,
      notes,
    } = body as {
      orderItemId?: string
      requestType?: 'exchange' | 'return'
      replacementSize?: string
      reason?: string
      notes?: string
    }

    if (!orderItemId || !requestType || !reason?.trim()) {
      return NextResponse.json(
        { success: false, error: 'orderItemId, requestType, and reason are required' },
        { status: 400 }
      )
    }

    if (requestType !== 'exchange' && requestType !== 'return') {
      return NextResponse.json(
        { success: false, error: 'requestType must be "exchange" or "return"' },
        { status: 400 }
      )
    }

    if (requestType === 'exchange' && !replacementSize?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Please select a replacement size for an exchange.' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const adminClient = createServiceRoleClient()

    let user: { id: string } | null = null
    try {
      const {
        data: { user: cookieUser },
      } = await supabase.auth.getUser()
      user = cookieUser
    } catch {
      user = null
    }

    const { data: matchedOrders } = await adminClient
      .from('orders')
      .select('id, status, delivery_mode, order_type, user_id, order_items(id, is_kept, try_on_decision)')
      .or(buildOrderReferenceOrFilter(rawRef))
      .order('created_at', { ascending: false })
      .limit(1)

    const order = matchedOrders && matchedOrders[0]
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    if (order.status !== 'delivered') {
      return NextResponse.json(
        {
          success: false,
          error: `Returns and exchanges are available once delivered (current status: ${order.status}).`,
        },
        { status: 400 }
      )
    }

    const items = (order.order_items || []) as Array<{
      id: string
      is_kept?: boolean | null
      try_on_decision?: string | null
    }>
    const targetItem = items.find((it) => it.id === orderItemId)
    if (!targetItem) {
      return NextResponse.json(
        { success: false, error: 'Order item not found on this order' },
        { status: 404 }
      )
    }

    const isBolt = order.order_type === 'bolt_try_on' || order.delivery_mode === 'try_on'
    if (isBolt && (targetItem.is_kept === false || targetItem.try_on_decision === 'rejected')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Garments already returned on the spot during Bolt fitting are not eligible.',
        },
        { status: 400 }
      )
    }

    const { data: inserted, error: insertError } = await adminClient
      .from('return_requests')
      .insert({
        order_id: order.id,
        order_item_id: orderItemId,
        user_id: user?.id || order.user_id || null,
        request_type: requestType,
        replacement_size: requestType === 'exchange' ? replacementSize!.trim() : null,
        reason: reason.trim(),
        notes: notes?.trim() || null,
        status: 'requested',
      })
      .select()
      .single()

    if (insertError) {
      if (
        insertError.code === 'PGRST205' ||
        insertError.code === '42P01' ||
        insertError.message?.includes('schema cache')
      ) {
        const local = saveLocalReturnRequest({
          orderId: order.id,
          orderItemId,
          userId: user?.id || order.user_id || null,
          requestType,
          replacementSize: requestType === 'exchange' ? replacementSize!.trim() : null,
          reason: reason.trim(),
          notes: notes?.trim() || null,
        })
        return NextResponse.json({ success: true, returnRequest: local })
      }
      if (insertError.code === '23505') {
        return NextResponse.json(
          {
            success: false,
            error: 'A return or exchange request already exists for this garment.',
          },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { success: false, error: insertError.message || 'Failed to record return request' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      returnRequest: inserted,
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error creating return request' },
      { status: 500 }
    )
  }
}
