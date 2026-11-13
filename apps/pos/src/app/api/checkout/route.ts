import { NextRequest, NextResponse } from 'next/server'
import { prisma, LocationType } from '@repo/db'
import { getCheckoutQueue, type CheckoutJobData } from '@repo/queue'

export const dynamic = 'force-dynamic'

interface PosCheckoutItem {
  variantId?: string
  sku?: string
  quantity: number
  unitPrice?: number
}

interface PosCheckoutPayload {
  storeCode?: string
  storeId?: string
  orderNumber?: string
  idempotencyKey?: string
  cashierId?: string
  items: PosCheckoutItem[]
  paymentMethod?: string
  paymentDetails?: Record<string, any>
}

export async function POST(req: NextRequest) {
  try {
    const body: PosCheckoutPayload = await req.json()
    const storeCode = body.storeCode || req.headers.get('x-store-code') || 'STORE-BLR01'
    const storeId = body.storeId || req.headers.get('x-store-id')
    const {
      orderNumber = `POS-${Date.now().toString(36).toUpperCase()}`,
      idempotencyKey = req.headers.get('x-idempotency-key') || `IDEMP-POS-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      cashierId,
      items,
      paymentMethod = 'POS_CASH',
      paymentDetails,
    } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Invalid payload: non-empty items array required' },
        { status: 400 }
      )
    }

    // 1. Resolve and Validate Retail Store
    let store = null
    if (storeId) {
      store = await prisma.location.findUnique({ where: { id: storeId } })
    } else {
      store = await prisma.location.findUnique({ where: { code: storeCode } })
    }

    if (!store) {
      return NextResponse.json(
        { error: `Retail store location "${storeCode || storeId}" not found` },
        { status: 404 }
      )
    }

    if (store.type !== LocationType.RETAIL_STORE) {
      return NextResponse.json(
        { error: `Forbidden: POS checkout can only be fulfilled from RETAIL_STORE. Target location type is ${store.type}.` },
        { status: 403 }
      )
    }

    // 2. Resolve Customer Terminal Sink
    const customerLoc = await prisma.location.findFirst({
      where: { type: LocationType.CUSTOMER },
    })

    if (!customerLoc) {
      return NextResponse.json(
        { error: 'Global customer accounting sink not found' },
        { status: 500 }
      )
    }

    // 3. Resolve Items
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
          { error: `Garment variant (${it.variantId || it.sku}) does not exist` },
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

    // 4. Construct BullMQ Job Payload locked strictly to this Retail Store
    const jobPayload: CheckoutJobData = {
      orderNumber,
      idempotencyKey,
      channel: 'POS',
      sourceLocationId: store.id,
      destinationLocationId: customerLoc.id,
      userId: cashierId,
      items: verifiedItems,
      paymentMethod,
      paymentDetails,
    }

    // 5. Ingest into Checkout Processing Queue
    const queue = getCheckoutQueue()
    const job = await queue.add('process-pos-checkout', jobPayload, {
      jobId: idempotencyKey,
    })

    return NextResponse.json(
      {
        success: true,
        status: 'QUEUED',
        jobId: job.id,
        orderNumber,
        storeCode: store.code,
        storeName: store.name,
        totalItems: verifiedItems.reduce((acc, i) => acc + i.quantity, 0),
        totalAmount: verifiedItems.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0),
        message: 'POS sale accepted for atomic retail inventory deduction.',
      },
      { status: 202 }
    )
  } catch (err: any) {
    console.error('POS checkout error:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to submit POS checkout' },
      { status: 500 }
    )
  }
}

