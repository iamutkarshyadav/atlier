import { NextRequest, NextResponse } from 'next/server'
import { prisma, executeStoreTransfer } from '@repo/db'

export const dynamic = 'force-dynamic'

interface TransferItemRequest {
  variantId?: string
  sku?: string
  quantity: number
}

interface TransferPayload {
  fromLocationCode?: string
  fromLocationId?: string
  toLocationCode?: string
  toLocationId?: string
  items: TransferItemRequest[]
  referenceId?: string
  notes?: string
}

export async function POST(req: NextRequest) {
  try {
    const body: TransferPayload = await req.json()
    const {
      fromLocationCode,
      fromLocationId,
      toLocationCode,
      toLocationId,
      items,
      referenceId = `TRF-${Date.now()}`,
      notes,
    } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Invalid payload: non-empty items array required' },
        { status: 400 }
      )
    }

    // 1. Resolve Source Location
    let fromLoc = null
    if (fromLocationId) {
      fromLoc = await prisma.location.findUnique({ where: { id: fromLocationId } })
    } else if (fromLocationCode) {
      fromLoc = await prisma.location.findUnique({ where: { code: fromLocationCode } })
    }

    if (!fromLoc) {
      return NextResponse.json(
        { error: `Source location (${fromLocationCode || fromLocationId}) not found` },
        { status: 404 }
      )
    }

    // 2. Resolve Destination Location
    let toLoc = null
    if (toLocationId) {
      toLoc = await prisma.location.findUnique({ where: { id: toLocationId } })
    } else if (toLocationCode) {
      toLoc = await prisma.location.findUnique({ where: { code: toLocationCode } })
    }

    if (!toLoc) {
      return NextResponse.json(
        { error: `Destination location (${toLocationCode || toLocationId}) not found` },
        { status: 404 }
      )
    }

    if (fromLoc.id === toLoc.id) {
      return NextResponse.json(
        { error: 'Source and destination locations must be distinct' },
        { status: 400 }
      )
    }

    // 3. Resolve variant IDs
    const resolvedItems: Array<{ variantId: string; quantity: number }> = []

    for (const it of items) {
      let vId = it.variantId
      if (!vId && it.sku) {
        const variant = await prisma.productVariant.findUnique({
          where: { sku: it.sku },
          select: { id: true },
        })
        if (!variant) {
          return NextResponse.json(
            { error: `Product variant with SKU "${it.sku}" not found` },
            { status: 404 }
          )
        }
        vId = variant.id
      }

      if (!vId) {
        return NextResponse.json(
          { error: 'Each item must specify either variantId or sku' },
          { status: 400 }
        )
      }

      const qty = Math.max(1, Math.floor(Number(it.quantity) || 1))
      resolvedItems.push({ variantId: vId, quantity: qty })
    }

    // 4. Execute Atomic Double-Entry Inventory Transfer
    const records = await executeStoreTransfer({
      fromLocationId: fromLoc.id,
      toLocationId: toLoc.id,
      items: resolvedItems,
      referenceId,
      notes: notes || `Transfer from ${fromLoc.code} to ${toLoc.code}`,
    })

    return NextResponse.json({
      success: true,
      referenceId,
      fromLocation: fromLoc.code,
      toLocation: toLoc.code,
      itemsCount: records.length,
      totalQuantity: resolvedItems.reduce((acc, curr) => acc + curr.quantity, 0),
      records,
    })
  } catch (err: any) {
    console.error('Inventory transfer error:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to process inventory transfer' },
      { status: 500 }
    )
  }
}

