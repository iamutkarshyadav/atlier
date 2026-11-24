import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@repo/supabase/server'
import { roundCurrency } from '@repo/supabase'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      discount_type = 'percentage',
      discount_value = 0,
      max_discount_amount = null,
      enforce_margin_floor = true,
      category_id,
      collection_id,
      min_order_subtotal = 0,
    } = body

    const supabase = createServiceRoleClient()

    // Query catalog products with variants and costs using service role
    let query = supabase
      .from('products')
      .select(`
        id,
        title,
        price,
        cost_price,
        category_id,
        variants:product_variants(id, sku, size, cost_price)
      `)
      .order('price', { ascending: false })
      .limit(60)

    if (category_id) {
      query = query.eq('category_id', category_id)
    }

    const { data: products, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!products || products.length === 0) {
      return NextResponse.json({
        totalAnalyzed: 0,
        marginFloorHits: 0,
        averageMarginBeforePct: 0,
        averageMarginAfterPct: 0,
        sampleItems: [],
      })
    }

    let totalMarginFloorHits = 0
    let totalMarginBeforeSum = 0
    let totalMarginAfterSum = 0
    let analyzedCount = 0

    const sampleItems = []

    for (const prod of products) {
      const price = prod.price || 0
      if (price <= 0) continue

      // Variant cost override or base product cost
      const baseCost = prod.cost_price || 0
      const variant = prod.variants?.[0]
      const effectiveCost = variant?.cost_price || baseCost

      // Calculate candidate discount
      let discountAmount = 0
      if (discount_type === 'percentage') {
        discountAmount = roundCurrency((price * discount_value) / 100)
        if (max_discount_amount && discountAmount > max_discount_amount) {
          discountAmount = max_discount_amount
        }
      } else {
        discountAmount = Math.min(price, roundCurrency(discount_value))
      }

      const initialMarginRupees = roundCurrency(price - effectiveCost)
      const initialMarginPct = price > 0 ? roundCurrency((initialMarginRupees / price) * 100) : 0

      let finalPrice = roundCurrency(price - discountAmount)
      let clamped = false

      if (enforce_margin_floor && finalPrice < effectiveCost) {
        clamped = true
        totalMarginFloorHits++
        finalPrice = effectiveCost
        discountAmount = Math.max(0, roundCurrency(price - effectiveCost))
      } else if (finalPrice <= effectiveCost && discountAmount > 0) {
        totalMarginFloorHits++
        clamped = true
      }

      const finalMarginRupees = roundCurrency(finalPrice - effectiveCost)
      const finalMarginPct = finalPrice > 0 ? roundCurrency((finalMarginRupees / finalPrice) * 100) : 0

      totalMarginBeforeSum += initialMarginPct
      totalMarginAfterSum += finalMarginPct
      analyzedCount++

      if (sampleItems.length < 8) {
        sampleItems.push({
          productId: prod.id,
          title: prod.title,
          sku: variant?.sku || 'SKU-GEN',
          retailPrice: price,
          costPrice: effectiveCost,
          proposedDiscount: discountAmount,
          finalSellingPrice: finalPrice,
          marginFloorHit: clamped,
          marginPctBefore: initialMarginPct,
          marginPctAfter: finalMarginPct,
        })
      }
    }

    const averageMarginBeforePct = analyzedCount > 0 ? roundCurrency(totalMarginBeforeSum / analyzedCount) : 0
    const averageMarginAfterPct = analyzedCount > 0 ? roundCurrency(totalMarginAfterSum / analyzedCount) : 0

    return NextResponse.json({
      totalAnalyzed: analyzedCount,
      marginFloorHits: totalMarginFloorHits,
      floorHitPercentage: analyzedCount > 0 ? roundCurrency((totalMarginFloorHits / analyzedCount) * 100) : 0,
      averageMarginBeforePct,
      averageMarginAfterPct,
      marginCompressionPct: roundCurrency(averageMarginBeforePct - averageMarginAfterPct),
      sampleItems,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to simulate margin impact' },
      { status: 500 }
    )
  }
}
