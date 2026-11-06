import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@repo/supabase/server'
import { createOrderWithItems } from '@repo/supabase/utils'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required to view orders' },
        { status: 401 }
      )
    }

    // Force query to strictly filter by the authenticated user's ID
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*, order_items(*, product:products(id, title, image_url, price, material))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (ordersError) {
      return NextResponse.json(
        { error: ordersError.message || 'Failed to fetch orders' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, orders: orders || [] })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch orders' },
      { status: 500 }
    )
  }
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
        { error: 'Unauthorized: Authentication required to place an order' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { orderData, items } = body

    if (!orderData || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Invalid payload: orderData and non-empty items array required' },
        { status: 400 }
      )
    }

    // 1. Authoritative Server-Side Price Verification
    // Reject client-provided unitPrice and total fields; query database products table
    const productIds = Array.from(
      new Set(items.map((it: any) => it.productId || it.id).filter(Boolean))
    ) as string[]

    if (productIds.length === 0) {
      return NextResponse.json({ error: 'No valid product IDs in items' }, { status: 400 })
    }

    const { data: dbProducts, error: prodErr } = await supabase
      .from('products')
      .select('id, price, title')
      .in('id', productIds)

    if (prodErr || !dbProducts || dbProducts.length === 0) {
      return NextResponse.json(
        { error: 'Failed to retrieve authoritative product prices from database' },
        { status: 400 }
      )
    }

    const productPriceMap = new Map<string, number>()
    for (const p of dbProducts) {
      productPriceMap.set(p.id, Number(p.price))
    }

    // Check product_variants for size price overrides if applicable
    const { data: dbVariants } = await supabase
      .from('product_variants')
      .select('product_id, size, price_override')
      .in('product_id', productIds)

    const variantPriceMap = new Map<string, number>()
    if (dbVariants) {
      for (const v of dbVariants) {
        if (v.price_override !== null && v.price_override !== undefined) {
          variantPriceMap.set(`${v.product_id}-${v.size}`, Number(v.price_override))
        }
      }
    }

    // 2. Authoritative line items and subtotal computation server-side
    let calculatedSubtotal = 0
    const verifiedItems: Array<{
      productId: string
      quantity: number
      unitPrice: number
      size?: string
    }> = []

    for (const it of items) {
      const pid = it.productId || it.id
      const qty = Math.max(1, Math.floor(Number(it.quantity) || 1))

      let authoritativeUnitPrice = productPriceMap.get(pid)
      if (it.size && variantPriceMap.has(`${pid}-${it.size}`)) {
        authoritativeUnitPrice = variantPriceMap.get(`${pid}-${it.size}`)!
      }

      if (authoritativeUnitPrice === undefined) {
        return NextResponse.json(
          { error: `Product ID "${pid}" does not exist in catalog` },
          { status: 400 }
        )
      }

      calculatedSubtotal += authoritativeUnitPrice * qty
      verifiedItems.push({
        productId: pid,
        quantity: qty,
        unitPrice: authoritativeUnitPrice,
        size: it.size || undefined,
      })
    }

    // 3. Compute shipping fee, tax, and order totals server-side
    const isBolt = orderData.order_type === 'bolt_try_on' || orderData.delivery_mode === 'try_on'

    let shippingFee = 150.0 // Standard Indian White-Glove delivery (₹150)
    let taxAmount = Number((calculatedSubtotal * 0.08).toFixed(2))
    let calculatedTotal = Number((calculatedSubtotal + shippingFee + taxAmount).toFixed(2))
    let originalTotal = calculatedTotal

    if (isBolt) {
      // Bolt ⚡ Doorstep Try-On:
      // Authorize a nominal ₹99 convenience/booking fee upfront.
      // The full garment cart value is recorded in original_total ("Payable after Try-On").
      shippingFee = 99.0
      taxAmount = 0.0
      calculatedTotal = 99.0
      originalTotal = calculatedSubtotal
    }

    // 4. Construct secure, validated order record
    const secureOrderData = {
      ...orderData,
      user_id: user.id, // Strictly bind to authenticated user
      order_type: isBolt ? ('bolt_try_on' as const) : ('standard' as const),
      delivery_mode: isBolt ? ('try_on' as const) : ('direct' as const),
      bolt_session_status: isBolt ? ('scheduled' as const) : null,
      bolt_pincode: isBolt ? (orderData.bolt_pincode || null) : null,
      bolt_timeslot_id: isBolt ? (orderData.bolt_timeslot_id || null) : null,
      try_on_status: isBolt ? ('pending' as const) : null,
      tax_amount: taxAmount,
      shipping_fee: shippingFee,
      original_total: originalTotal,
      total: calculatedTotal,
    }

    const result = await createOrderWithItems(supabase, secureOrderData, verifiedItems)

    if (!result.data) {
      return NextResponse.json(
        { error: result.error || 'Could not place order' },
        { status: 422 }
      )
    }

    return NextResponse.json({
      success: true,
      order: result.data,
      orderNumber: result.data.order_number,
      invoiceNumber: result.data.invoice_number,
      trackingBarcode: result.data.tracking_barcode,
      total: result.data.total,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Internal order creation failure' },
      { status: 500 }
    )
  }
}
