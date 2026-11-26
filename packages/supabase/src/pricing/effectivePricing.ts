import type { Product } from '../types/database.types'
import type { PromotionWithRules, PromotionCoupon, DiscountType, PromotionType } from './types'
import { roundCurrency } from './currency'
import { evaluatePromotionRules } from './ruleMatcher'

export interface ApplicableOfferSummary {
  id: string
  name: string
  slug: string
  promotionType: PromotionType
  discountType: DiscountType
  discountValue: number
  description: string | null
  code?: string
  minOrderSubtotal?: number | null
  maxDiscountAmount?: number | null
  endsAt?: string | null
  badgeText: string
}

export interface BestCouponSummary {
  code: string
  savingsAmount: number
  label: string
  promotionName: string
}

export interface ProductPricingSummary {
  productId: string
  mrp: number
  sellingPrice: number
  discountPercentage: number
  hasDiscount: boolean
  bestCouponPrice: number
  bestCoupon: BestCouponSummary | null
  applicableOffers: ApplicableOfferSummary[]
}

export interface DiscountBucketCounts {
  min10: number
  min20: number
  min30: number
  min50: number
  onSaleTotal: number
}

/**
 * Checks whether a promotion's rules target a given product, its category, subcategory, or its collections.
 * Uses the Boolean Rule Matcher: AND across distinct rule types, OR within the same rule type, exclude overrides.
 */
export function doesPromotionTargetProduct(
  promo: PromotionWithRules,
  product: Product,
  collectionIds: string[] = []
): boolean {
  const isActive = promo.is_active ?? (promo as any).isActive ?? true
  if (!isActive) return false
  const now = new Date().toISOString()
  const startsAt = promo.starts_at ?? (promo as any).startsAt
  if (startsAt && startsAt > now) return false
  const endsAt = promo.ends_at ?? (promo as any).endsAt
  if (endsAt && endsAt < now) return false

  return evaluatePromotionRules(promo.rules, {
    productId: product.id,
    categoryId: product.category_id,
    category: product.category,
    subcategoryId: (product as any).subcategory_id,
    collectionIds,
    isTryOnEligible: product.is_try_on_eligible ?? (product as any).isTryOnEligible ?? true,
    sku: (product as any).sku,
  })
}

/**
 * Resolves each product's live effective price using the 3-Tier Discount Waterfall:
 * - Tier 1: Catalog Markdown on MRP (price schedule or direct catalog promo) -> establishes sellingPrice.
 * - Tier 2: Public-Only Item/Category Coupon -> establishes bestCouponPrice.
 * - Tier 3: Cart Threshold Offers -> surfaced in applicableOffers without lowering single-item price.
 * Enforces server-side margin floor clamping (NetItemPrice >= cost_price) safely without exposing cost_price.
 */
export function getEffectiveProductPricing(
  product: Product,
  activePromotions: PromotionWithRules[] = [],
  priceSchedules: any[] = [],
  collectionIds: string[] = []
): ProductPricingSummary {
  const basePrice = Number(product.price) || 0
  const costPrice = (product as any).cost_price != null ? Number((product as any).cost_price) : null
  const now = new Date().toISOString()

  let mrp = basePrice
  let sellingPrice = basePrice

  // 1. Check for Active Price Schedule override or compare_at_price
  const activeSchedule = priceSchedules.find(
    (ps) =>
      ps.product_id === product.id &&
      ps.is_active &&
      ps.starts_at <= now &&
      (!ps.ends_at || ps.ends_at >= now)
  )

  if (activeSchedule) {
    mrp = Number(activeSchedule.original_price) || basePrice
    sellingPrice = Number(activeSchedule.scheduled_price) || basePrice
  } else if ((product as any).compare_at_price && Number((product as any).compare_at_price) > basePrice) {
    mrp = Number((product as any).compare_at_price)
    sellingPrice = basePrice
  }

  // 2. Filter applicable active promotions matching this garment
  const matchingPromos = activePromotions.filter((promo) =>
    doesPromotionTargetProduct(promo, product, collectionIds)
  )

  const applicableOffers: ApplicableOfferSummary[] = []

  // ---------------------------------------------------------------------------
  // Tier 1: Direct Catalog Markdowns
  // ---------------------------------------------------------------------------
  const tier1Promos = matchingPromos.filter((p) => {
    const pType = String(p.promotion_type ?? (p as any).promotionType)
    const tier = (p as any).tier ?? (pType === 'sale' ? 1 : undefined)
    if (tier === 1) return true
    if (tier === 2 || tier === 3) return false
    // Fallback for legacy automatic markdowns without unfulfilled min_order_subtotal
    const minSubtotal = p.min_order_subtotal ?? (p as any).minOrderSubtotal
    const hasUnmetCartThreshold = minSubtotal !== null && minSubtotal !== undefined && Number(minSubtotal) > basePrice
    return !hasUnmetCartThreshold && (pType === 'automatic_cart' || pType === 'sale' || pType === 'tiered_threshold')
  })

  let bestPromoDiscount = 0

  for (const promo of tier1Promos) {
    const pType = promo.promotion_type ?? (promo as any).promotionType
    const dType = promo.discount_type ?? (promo as any).discountType
    const dValue = Number(promo.discount_value ?? (promo as any).discountValue ?? 0)
    const minSubtotal = promo.min_order_subtotal ?? (promo as any).minOrderSubtotal
    const maxDiscount = promo.max_discount_amount ?? (promo as any).maxDiscountAmount

    const isDirectCatalogMarkdown =
      (!minSubtotal || Number(minSubtotal) <= basePrice) &&
      (dType === 'percentage' || dType === 'fixed_amount')

    if (isDirectCatalogMarkdown && !activeSchedule) {
      let promoDiscount = 0
      if (dType === 'percentage') {
        const pct = Math.min(90, Math.max(1, dValue))
        promoDiscount = (basePrice * pct) / 100
      } else if (dType === 'fixed_amount') {
        promoDiscount = Math.min(basePrice - 1, dValue)
      }

      if (maxDiscount) {
        promoDiscount = Math.min(promoDiscount, Number(maxDiscount))
      }

      // Enforce margin floor clamp if costPrice is set
      if (costPrice != null && costPrice > 0 && promo.enforce_margin_floor !== false) {
        const marginHeadroom = Math.max(0, basePrice - costPrice)
        promoDiscount = Math.min(promoDiscount, marginHeadroom)
      }

      if (promoDiscount > bestPromoDiscount) {
        bestPromoDiscount = promoDiscount
      }
    }

    applicableOffers.push({
      id: promo.id,
      name: promo.name,
      slug: promo.slug,
      promotionType: pType,
      discountType: dType,
      discountValue: dValue,
      description: promo.description,
      minOrderSubtotal: minSubtotal ? Number(minSubtotal) : null,
      maxDiscountAmount: maxDiscount ? Number(maxDiscount) : null,
      endsAt: promo.ends_at ?? (promo as any).endsAt,
      badgeText:
        dType === 'percentage'
          ? `${Math.round(dValue)}% OFF`
          : dType === 'free_shipping'
            ? 'FREE SHIPPING'
            : `₹${Math.round(dValue)} OFF`,
    })
  }

  if (bestPromoDiscount > 0 && !activeSchedule) {
    if (mrp === basePrice && !(product as any).compare_at_price) {
      mrp = basePrice
    }
    sellingPrice = roundCurrency(Math.max(1, basePrice - bestPromoDiscount))
  }

  // ---------------------------------------------------------------------------
  // Tier 2: Public-Only Item / Category Coupon Auto-Discovery (Guardrail 2)
  // ---------------------------------------------------------------------------
  let bestCouponPrice = sellingPrice
  let bestCoupon: BestCouponSummary | null = null

  const tier2Promos = matchingPromos.filter((p) => {
    const pType = String(p.promotion_type ?? (p as any).promotionType)
    const tier = (p as any).tier
    if (tier === 2) return true
    if (tier === 1 || tier === 3) return false
    return (
      pType === 'coupon' ||
      (p.coupons && p.coupons.length > 0) ||
      ((p as any).publicCoupons && (p as any).publicCoupons.length > 0)
    )
  })

  for (const promo of tier2Promos) {
    const rawCoupons = promo.coupons || (promo as any).publicCoupons || []
    // Public-Only Auto-Discovery: strictly surface active, public, unassigned coupons
    const publicCoupons = rawCoupons.filter((c: any) => {
      const isActive = c.is_active ?? c.isActive ?? true
      const isPublic = c.is_public ?? (c as any).isPublic ?? (!c.assigned_customer_email && !c.is_single_use)
      return isActive && isPublic && !c.is_single_use && !c.assigned_customer_email
    })

    const dType = promo.discount_type ?? (promo as any).discountType
    const dValue = Number(promo.discount_value ?? (promo as any).discountValue ?? 0)
    const maxDiscount = promo.max_discount_amount ?? (promo as any).maxDiscountAmount
    const minSubtotal = promo.min_order_subtotal ?? (promo as any).minOrderSubtotal

    if (minSubtotal && Number(minSubtotal) > sellingPrice) {
      continue
    }

    for (const coupon of publicCoupons) {
      let discountAmount = 0
      if (dType === 'percentage') {
        discountAmount = (sellingPrice * dValue) / 100
        if (maxDiscount) {
          discountAmount = Math.min(discountAmount, Number(maxDiscount))
        }
      } else if (dType === 'fixed_amount') {
        discountAmount = Math.min(sellingPrice - 1, dValue)
      }

      discountAmount = roundCurrency(discountAmount)

      // Enforce margin floor clamp if costPrice is set
      if (costPrice != null && costPrice > 0 && promo.enforce_margin_floor !== false) {
        const headroom = Math.max(0, sellingPrice - costPrice)
        discountAmount = Math.min(discountAmount, headroom)
      }

      const potentialPrice = roundCurrency(Math.max(1, sellingPrice - discountAmount))

      if (discountAmount > 0) {
        applicableOffers.push({
          id: promo.id,
          name: promo.name,
          slug: promo.slug,
          promotionType: promo.promotion_type ?? (promo as any).promotionType,
          discountType: dType,
          discountValue: dValue,
          description: promo.description,
          code: coupon.code,
          minOrderSubtotal: minSubtotal ? Number(minSubtotal) : null,
          maxDiscountAmount: maxDiscount ? Number(maxDiscount) : null,
          endsAt: promo.ends_at ?? (promo as any).endsAt,
          badgeText: `Extra ${
            dType === 'percentage'
              ? `${Math.round(dValue)}% OFF`
              : `₹${Math.round(dValue)} OFF`
          } with ${coupon.code}`,
        })

        if (potentialPrice < bestCouponPrice) {
          bestCouponPrice = potentialPrice
          bestCoupon = {
            code: coupon.code,
            savingsAmount: discountAmount,
            label: `Save ₹${discountAmount.toLocaleString('en-IN')} with ${coupon.code}`,
            promotionName: promo.name,
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Tier 3: Cart Threshold / Order-Level Offers
  // Surface in applicableOffers without lowering single-item card price
  // ---------------------------------------------------------------------------
  const tier3Promos = matchingPromos.filter((p) => {
    const pType = String(p.promotion_type ?? (p as any).promotionType)
    const tier = (p as any).tier
    if (tier === 3) return true
    const minSubtotal = p.min_order_subtotal ?? (p as any).minOrderSubtotal
    return (
      (pType === 'tiered_threshold' || (minSubtotal && Number(minSubtotal) > sellingPrice)) &&
      !tier1Promos.some((t1) => t1.id === p.id) &&
      !tier2Promos.some((t2) => t2.id === p.id)
    )
  })

  for (const promo of tier3Promos) {
    if (!applicableOffers.some((ao) => ao.id === promo.id)) {
      const pType = promo.promotion_type ?? (promo as any).promotionType
      const dType = promo.discount_type ?? (promo as any).discountType
      const dValue = Number(promo.discount_value ?? (promo as any).discountValue ?? 0)
      const minSubtotal = promo.min_order_subtotal ?? (promo as any).minOrderSubtotal
      const maxDiscount = promo.max_discount_amount ?? (promo as any).maxDiscountAmount

      applicableOffers.push({
        id: promo.id,
        name: promo.name,
        slug: promo.slug,
        promotionType: pType,
        discountType: dType,
        discountValue: dValue,
        description: promo.description,
        minOrderSubtotal: minSubtotal ? Number(minSubtotal) : null,
        maxDiscountAmount: maxDiscount ? Number(maxDiscount) : null,
        endsAt: promo.ends_at ?? (promo as any).endsAt,
        badgeText:
          dType === 'percentage'
            ? `${Math.round(dValue)}% OFF on orders over ₹${Number(minSubtotal || 0).toLocaleString('en-IN')}`
            : `₹${Math.round(dValue)} OFF on orders over ₹${Number(minSubtotal || 0).toLocaleString('en-IN')}`,
      })
    }
  }

  // 4. Calculate Final Rounded Discount Percentage
  let discountPercentage = 0
  if (mrp > sellingPrice && mrp > 0) {
    discountPercentage = Math.min(99, Math.round(((mrp - sellingPrice) / mrp) * 100))
  }

  return {
    productId: product.id,
    mrp: roundCurrency(mrp),
    sellingPrice: roundCurrency(sellingPrice),
    discountPercentage,
    hasDiscount: discountPercentage > 0,
    bestCouponPrice: roundCurrency(bestCouponPrice),
    bestCoupon,
    applicableOffers,
  }
}

/**
 * Calculates discount bucket counts across a set of products.
 */
export function calculateDiscountBuckets(
  products: Product[],
  pricingList: ProductPricingSummary[]
): DiscountBucketCounts {
  let min10 = 0
  let min20 = 0
  let min30 = 0
  let min50 = 0
  let onSaleTotal = 0

  const pricingMap = new Map<string, ProductPricingSummary>()
  pricingList.forEach((p) => pricingMap.set(p.productId, p))

  for (const product of products) {
    const pricing = pricingMap.get(product.id)
    const pct = pricing?.discountPercentage || 0

    if (pct > 0) {
      onSaleTotal++
      if (pct >= 10) min10++
      if (pct >= 20) min20++
      if (pct >= 30) min30++
      if (pct >= 50) min50++
    }
  }

  return { min10, min20, min30, min50, onSaleTotal }
}
