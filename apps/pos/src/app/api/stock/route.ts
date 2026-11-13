import { NextRequest, NextResponse } from 'next/server'
import { prisma, getStoreAvailableStock, LocationType } from '@repo/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const storeCode = searchParams.get('storeCode') || req.headers.get('x-store-code') || 'STORE-BLR01'
    const storeId = searchParams.get('storeId') || req.headers.get('x-store-id')
    const sku = searchParams.get('sku')
    const variantId = searchParams.get('variantId')

    if (!sku && !variantId) {
      return NextResponse.json(
        { error: 'A query parameter (?sku=... or ?variantId=...) is required' },
        { status: 400 }
      )
    }

    // 1. Resolve & Verify Retail Store Location
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

    // Strict Ringfencing Guard: POS can NEVER query non-retail or E-Com warehouse nodes
    if (store.type !== LocationType.RETAIL_STORE) {
      return NextResponse.json(
        { error: `Forbidden: POS cannot query location type "${store.type}". Must be RETAIL_STORE.` },
        { status: 403 }
      )
    }

    // 2. Resolve Variant
    let variant = null
    if (variantId) {
      variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
        include: { product: true },
      })
    } else if (sku) {
      variant = await prisma.productVariant.findUnique({
        where: { sku },
        include: { product: true },
      })
    }

    if (!variant) {
      return NextResponse.json(
        { error: `Product variant (${variantId || sku}) not found in catalog` },
        { status: 404 }
      )
    }

    // 3. Ringfenced Stock Query strictly for this Retail Store
    const availableStock = await getStoreAvailableStock(variant.id, store.id)

    return NextResponse.json({
      success: true,
      storeCode: store.code,
      storeName: store.name,
      locationId: store.id,
      locationType: store.type,
      variantId: variant.id,
      sku: variant.sku,
      productTitle: variant.product.title,
      size: variant.size,
      availableStock,
    })
  } catch (err: any) {
    console.error('POS stock query error:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to query retail store stock' },
      { status: 500 }
    )
  }
}

