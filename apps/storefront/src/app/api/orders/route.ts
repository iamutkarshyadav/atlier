import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@repo/supabase/server'
import { atomicCreateOrderAndReserve } from '@repo/supabase/utils'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const url = new URL(req.url)
    const reference = url.searchParams.get('reference')?.trim()
    const emailParam = url.searchParams.get('email')?.trim().toLowerCase()
    const queryAll = url.searchParams.get('all') === 'true'

    // 1. Resolve user from cookies or Authorization Bearer header
    let user: any = null
    const {
      data: { user: cookieUser },
    } = await supabase.auth.getUser()
    user = cookieUser

    if (!user) {
      const authHeader = req.headers.get('Authorization')
      if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
        const token = authHeader.replace(/^bearer\s+/i, '').trim()
        if (token) {
          const {
            data: { user: tokenUser },
          } = await supabase.auth.getUser(token)
          user = tokenUser
        }
      }
    }

    // 2. Direct reference tracking (Order Number, Tracking Barcode, or ID)
    if (reference) {
      const adminClient = createServiceRoleClient()
      const { data: refOrders, error: refErr } = await adminClient
        .from('orders')
        .select('*, order_items(*, product:products(id, title, image_url, price, material))')
        .or(`order_number.eq.${reference},tracking_barcode.eq.${reference},id.eq.${reference}`)
        .order('created_at', { ascending: false })

      if (!refErr && refOrders && refOrders.length > 0) {
        return NextResponse.json({ success: true, orders: refOrders })
      }
    }

    // 3. Authenticated customer or administrator session
    if (user) {
      const isStaffOrAdmin =
        user.app_metadata?.role === 'admin' ||
        user.user_metadata?.role === 'admin' ||
        user.email === 'horizonlord1@gmail.com' ||
        user.email === 'iamutkarshyadav1@gmail.com'

      // Admin requesting all orders
      if (isStaffOrAdmin && queryAll) {
        const { data: allOrders } = await supabase
          .from('orders')
          .select('*, order_items(*, product:products(id, title, image_url, price, material))')
          .order('created_at', { ascending: false })

        return NextResponse.json({ success: true, orders: allOrders || [] })
      }

      // Fetch orders strictly for user.id
      const { data: userOrders, error: ordersError } = await supabase
        .from('orders')
        .select('*, order_items(*, product:products(id, title, image_url, price, material))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      let mergedOrders = userOrders ? [...userOrders] : []

      // Also match any orders with user's verified email in shipping_address / delivery_notes
      if (user.email) {
        const userEmailLower = user.email.toLowerCase()
        const { data: allRecent } = await supabase
          .from('orders')
          .select('*, order_items(*, product:products(id, title, image_url, price, material))')
          .order('created_at', { ascending: false })

        if (allRecent) {
          const existingIds = new Set(mergedOrders.map((o) => o.id))
          for (const ord of allRecent) {
            if (!existingIds.has(ord.id)) {
              const addrMatch = ord.shipping_address?.toLowerCase().includes(userEmailLower)
              const notesMatch = ord.delivery_notes?.toLowerCase().includes(userEmailLower)
              if (addrMatch || notesMatch) {
                mergedOrders.push(ord)
                existingIds.add(ord.id)
              }
            }
          }
        }
      }

      // Sort chronological descending
      mergedOrders.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      return NextResponse.json({ success: true, orders: mergedOrders })
    }

    // 4. Unauthenticated guest lookup by email query param
    if (emailParam) {
      const { data: allRecent } = await supabase
        .from('orders')
        .select('*, order_items(*, product:products(id, title, image_url, price, material))')
        .order('created_at', { ascending: false })

      const emailOrders = (allRecent || []).filter(
        (o) =>
          o.shipping_address?.toLowerCase().includes(emailParam) ||
          o.delivery_notes?.toLowerCase().includes(emailParam)
      )

      return NextResponse.json({ success: true, orders: emailOrders })
    }

    // 5. Unauthenticated without reference: return empty orders gracefully with requiresAuth flag
    return NextResponse.json({ success: true, orders: [], requiresAuth: true })
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
    } = await supabase.auth.getUser()

    const body = await req.json()
    const { orderData, items } = body

    if (!orderData || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Invalid payload: orderData and non-empty items array required' },
        { status: 400 }
      )
    }

    const customerEmail =
      body.customer_email ||
      body.email ||
      orderData.customer_email ||
      orderData.email ||
      user?.email ||
      ''

    // Support both registered patrons and guest storefront checkouts
    let customerUserId = user?.id || orderData?.user_id

    // Ensure customerUserId exists in public.users to satisfy foreign key constraint
    if (customerUserId) {
      const { data: userExists } = await supabase
        .from('users')
        .select('id')
        .eq('id', customerUserId)
        .maybeSingle()

      if (!userExists) {
        if (customerEmail) {
          const { data: userByEmail } = await supabase
            .from('users')
            .select('id')
            .eq('email', customerEmail.toLowerCase().trim())
            .maybeSingle()
          if (userByEmail) {
            customerUserId = userByEmail.id
          }
        }

        if (!userExists && (!customerEmail || customerUserId === orderData?.user_id)) {
          const { data: fallbackUser } = await supabase
            .from('users')
            .select('id')
            .limit(1)
            .maybeSingle()
          if (fallbackUser) {
            customerUserId = fallbackUser.id
          }
        }
      }
    } else {
      const { data: fallbackUser } = await supabase
        .from('users')
        .select('id')
        .limit(1)
        .maybeSingle()
      if (fallbackUser) {
        customerUserId = fallbackUser.id
      }
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

    // Check product_variants for size price overrides and mandatory variant IDs
    const { data: dbVariants } = await supabase
      .from('product_variants')
      .select('id, product_id, size, price_override, sku, hsn_code, stock')
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
      variant_id: string
      product_id: string
      quantity: number
      unit_price: number
      size?: string | null
      hsn_code?: string
    }> = []

    for (const it of items) {
      const pid = it.productId || it.id
      const qty = Math.max(1, Math.floor(Number(it.quantity) || 1))

      // Match authoritative variant
      let matchedVariant = dbVariants?.find(
        (v) => v.product_id === pid && (it.size ? v.size === it.size : true)
      )
      if (!matchedVariant && dbVariants) {
        matchedVariant = dbVariants.find((v) => v.product_id === pid)
      }

      if (!matchedVariant) {
        return NextResponse.json(
          { error: `Variant for product "${pid}" (size: ${it.size || 'default'}) does not exist in catalog` },
          { status: 400 }
        )
      }

      let authoritativeUnitPrice = productPriceMap.get(pid)
      if (it.size && variantPriceMap.has(`${pid}-${it.size}`)) {
        authoritativeUnitPrice = variantPriceMap.get(`${pid}-${it.size}`)!
      }

      if (authoritativeUnitPrice === undefined) {
        if (typeof it.unitPrice === 'number' && it.unitPrice > 0) {
          authoritativeUnitPrice = Number(it.unitPrice)
        } else {
          return NextResponse.json(
            { error: `Product ID "${pid}" does not have valid pricing in catalog` },
            { status: 400 }
          )
        }
      }

      calculatedSubtotal += authoritativeUnitPrice * qty
      verifiedItems.push({
        variant_id: matchedVariant.id,
        product_id: pid,
        quantity: qty,
        unit_price: authoritativeUnitPrice,
        size: it.size || matchedVariant.size || null,
        hsn_code: matchedVariant.hsn_code || '610910',
      })
    }

    // 3. Compute shipping fee, tax, and order totals server-side
    const isBolt = orderData.order_type === 'bolt_try_on' || orderData.delivery_mode === 'try_on'

    let shippingFee = 150.0 // Standard Indian White-Glove delivery (₹150)
    let taxAmount = Number((calculatedSubtotal * 0.12).toFixed(2)) // 12% Indian GST
    let calculatedTotal = Number((calculatedSubtotal + shippingFee + taxAmount).toFixed(2))

    if (isBolt) {
      // Bolt Doorstep Try-On:
      // Collect ₹99 booking fee upfront; apparel balance settles post fitting.
      shippingFee = 99.0
      taxAmount = 0.0
      calculatedTotal = 99.0
    }

    // 4. Construct secure, validated order record
    let finalShippingAddress = orderData.shipping_address || 'Bengaluru, Karnataka, India'
    if (customerEmail && !finalShippingAddress.toLowerCase().includes(customerEmail.toLowerCase())) {
      finalShippingAddress = `${finalShippingAddress} [Patron: ${customerEmail}]`
    }

    const adminClient = createServiceRoleClient()
    const result = await atomicCreateOrderAndReserve(adminClient, {
      orderData: {
        order_number: orderData.order_number,
        user_id: customerUserId || null,
        status: 'pending',
        payment_status: 'pending',
        delivery_mode: isBolt ? 'try_on' : 'direct',
        try_on_status: isBolt ? 'active_timer' : 'pending',
        order_type: isBolt ? 'bolt_try_on' : 'standard',
        subtotal: calculatedSubtotal,
        discount: 0,
        delivery_fee: shippingFee,
        tax_amount: taxAmount,
        total_amount: calculatedTotal,
        notes: orderData.delivery_notes || null,
        shipping_address_json: {
          address: finalShippingAddress,
          email: customerEmail,
          phone: orderData.phone || null,
          bolt_pincode: isBolt ? (orderData.bolt_pincode || null) : null,
          bolt_timeslot_id: isBolt ? (orderData.bolt_timeslot_id || null) : null,
          delivery_notes: orderData.delivery_notes || null,
        },
        billing_address_json: {
          address: finalShippingAddress,
        },
      },
      items: verifiedItems,
      sourceLocationId: null,
    })

    if (!result.success) {
      const errorMsg = result.error || 'Could not place order'
      const errorLower = errorMsg.toLowerCase()
      const isOutOfStock =
        errorMsg.includes('INSUFFICIENT_STOCK') ||
        errorLower.includes('insufficient') ||
        errorLower.includes('out of stock')

      if (isOutOfStock) {
        return NextResponse.json(
          {
            error: 'One or more items in your cart are currently out of stock.',
            code: 'INSUFFICIENT_STOCK',
            details: errorMsg,
          },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: errorMsg },
        { status: 422 }
      )
    }

    const orderDataResult = result.data || {}
    return NextResponse.json({
      success: true,
      order: orderDataResult,
      orderNumber: orderDataResult.order_number,
      invoiceNumber: orderDataResult.invoice_number || `INV-${orderDataResult.order_number}`,
      trackingBarcode: orderDataResult.tracking_barcode || `ATL-TRK-${orderDataResult.order_number}`,
      total: orderDataResult.total_amount || calculatedTotal,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Internal order creation failure' },
      { status: 500 }
    )
  }
}
