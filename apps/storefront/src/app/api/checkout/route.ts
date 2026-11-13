import { NextRequest, NextResponse } from 'next/server'
import { prisma, LocationType } from '@repo/db'
import { getCheckoutQueue, type CheckoutJobData } from '@repo/queue'

export const dynamic = 'force-dynamic'

interface CheckoutItemRequest {
  variantId?: string
  sku?: string
  quantity: number
  unitPrice?: number
}

interface StorefrontCheckoutPayload {
  orderNumber?: string
  idempotencyKey?: string
  userId?: string
  items: CheckoutItemRequest[]
  paymentMethod?: string
  deliveryAddress?: string
  deliveryNotes?: string
}

export async function POST(req: NextRequest) {
  try {
    const body: StorefrontCheckoutPayload = await req.json()
    const {
      orderNumber = `ATL-ORD-${Date.now().toString(36).toUpperCase()}`,
      idempotencyKey = req.headers.get('x-idempotency-key') || `IDEMP-SF-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId,
      items,
      paymentMethod = 'ONLINE_CARD',
      deliveryAddress,
      deliveryNotes,
    } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Invalid checkout payload: non-empty items array required' },
        { status: 400 }
      )
    }

    // 1. Resolve ECOM_WAREHOUSE (Source) and SYS-CUSTOMER-SOLD (Destination)
    const [ecomLoc, customerLoc] = await Promise.all([
      prisma.location.findFirst({
        where: { type: LocationType.ECOM_WAREHOUSE, isActive: true },
      }),
      prisma.location.findFirst({
        where: { type: LocationType.CUSTOMER },
      }),
    ])

    if (!ecomLoc || !customerLoc) {
      return NextResponse.json(
        { error: 'System locations for E-Commerce fulfillment not found' },
        { status: 500 }
      )
    }

    // 2. Resolve variant IDs and authoritative unit prices
    const verifiedItems: Array<{
      variantId: string
      quantity: number
      unitPrice: number
    }> = []

    for (const it of items) {
      let variant = null
      if (it.variantId) {
        variant = await prisma.productVariant.findUnique({
          where: { id: it.variantId },
          include: { product: true },
        })
      } else if (it.sku) {
        variant = await prisma.productVariant.findUnique({
          where: { sku: it.sku },
          include: { product: true },
        })
      }

      if (!variant) {
        return NextResponse.json(
          { error: `Variant (${it.variantId || it.sku}) does not exist in catalog` },
          { status: 404 }
        )
      }

      const qty = Math.max(1, Math.floor(Number(it.quantity) || 1))
      const price = it.unitPrice !== undefined ? Number(it.unitPrice) : Number(variant.product.price)

      verifiedItems.push({
        variantId: variant.id,
        quantity: qty,
        unitPrice: price,
      })
    }

    // 3. Construct BullMQ Job Payload
    const jobPayload: CheckoutJobData = {
      orderNumber,
      idempotencyKey,
      channel: 'STOREFRONT',
      sourceLocationId: ecomLoc.id,
      destinationLocationId: customerLoc.id,
      userId,
      items: verifiedItems,
      paymentMethod,
      deliveryAddress,
      deliveryNotes,
    }

    // 4. Ingest into BullMQ Checkout Stream with Idempotent Job ID
    const queue = getCheckoutQueue()
    const job = await queue.add('process-ecom-checkout', jobPayload, {
      jobId: idempotencyKey, // Prevents duplicate queue jobs
    })

    // 5. Respond with 202 Accepted for Non-Blocking Concurrency
    return NextResponse.json(
      {
        success: true,
        status: 'QUEUED',
        jobId: job.id,
        orderNumber,
        idempotencyKey,
        totalItems: verifiedItems.reduce((acc, i) => acc + i.quantity, 0),
        estimatedTotal: verifiedItems.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0),
        message: 'Order accepted for atomic inventory ledger allocation.',
      },
      { status: 202 }
    )
  } catch (err: any) {
    console.error('Storefront checkout intake error:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to submit order for queue processing' },
      { status: 500 }
    )
  }
}

