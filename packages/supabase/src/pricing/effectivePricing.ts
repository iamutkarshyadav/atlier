import type { Product } from '../types/database.types'
import type { PromotionWithRules, PromotionCoupon, DiscountType, PromotionType } from './types'
import { roundCurrency } from './currency'

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
 * Checks whether a promotion's rules target a given product, its category, or its collections.
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

  const rawRules = promo.rules || []
  if (rawRules.length === 0) return true // No restrictive rules = storewide application

  // Normalize rules so that both camelCase (from API endpoints) and snake_case (from DB) work seamlessly
  const rules = rawRules.map((r: any) => ({
    target_type: r.target_type ?? r.targetType,
    target_id: r.target_id ?? r.targetId,
    match_operator: r.match_operator ?? r.matchOperator,
  }))

  // Check if any rule targets the entire order
  if (rules.some((r) => r.target_type === 'entire_order')) return true

  // Check product-specific targeting
  const productRule = rules.find(
    (r) => r.target_type === 'product' && r.target_id === product.id
  )
  if (productRule) return productRule.match_operator !== 'exclude'

  // Check category-specific targeting
  if (product.category_id || product.category) {
    const categoryRule = rules.find(
      (r) =>
        r.target_type === 'category' &&
        (r.target_id === product.category_id ||
          (product.category && r.target_id?.toLowerCase() === product.category.toLowerCase()))
    )
    if (categoryRule) return categoryRule.match_operator !== 'exclude'
  }

  // Check collection-specific targeting
  if (collectionIds.length > 0) {
    const collectionRule = rules.find(
      (r) => r.target_type === 'collection' && r.target_id && collectionIds.includes(r.target_id)
    )
    if (collectionRule) return collectionRule.match_operator !== 'exclude'
  }

  return false
}

/**
 * Resolves each product's live effective price by evaluating active price schedules,
 * compare_at_price, automatic promotions, and public coupon codes.
 */
export function getEffectiveProductPricing(
  product: Product,
  activePromotions: PromotionWithRules[] = [],
  priceSchedules: any[] = [],
  collectionIds: string[] = []
): ProductPricingSummary {
  const basePrice = Number(product.price) || 0
  const now = new Date().toISOString()

  let mrp = basePrice
  let sellingPrice = basePrice

  // 1. Check for Active Price Schedule override
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

  // 2. Filter applicable active promotions for this garment
  const matchingPromos = activePromotions.filter((promo) =>
    doesPromotionTargetProduct(promo, product, collectionIds)
  )

  const applicableOffers: ApplicableOfferSummary[] = []

  // Check for catalog promotions that directly discount the unit price
  const automaticPromos = matchingPromos.filter((p) => {
    const pType = String(p.promotion_type ?? (p as any).promotionType)
    return pType === 'automatic_cart' || pType === 'tiered_threshold' || pType === 'sale'
  })

  let bestPromoDiscount = 0
  let appliedPromo: PromotionWithRules | null = null

  for (const promo of automaticPromos) {
    const pType = promo.promotion_type ?? (promo as any).promotionType
    const dType = promo.discount_type ?? (promo as any).discountType
    const dValue = Number(promo.discount_value ?? (promo as any).discountValue ?? 0)
    const minSubtotal = promo.min_order_subtotal ?? (promo as any).minOrderSubtotal
    const maxDiscount = promo.max_discount_amount ?? (promo as any).maxDiscountAmount

    // Check if there is an unfulfilled cart subtotal threshold
    // If minSubtotal is null, 0, or <= basePrice, this product qualifies for the discount!
    const hasUnmetCartThreshold = minSubtotal !== null && minSubtotal !== undefined && Number(minSubtotal) > basePrice

    const isDirectCatalogMarkdown =
      !hasUnmetCartThreshold &&
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

      if (promoDiscount > bestPromoDiscount) {
        bestPromoDiscount = promoDiscount
        appliedPromo = promo
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

  // 3. Evaluate Public Coupons to compute Best Coupon Price
  let bestCouponPrice = sellingPrice
  let bestCoupon: BestCouponSummary | null = null

  const couponPromos = matchingPromos.filter(
    (p) =>
      p.promotion_type === 'coupon' ||
      (p as any).promotionType === 'coupon' ||
      (p.coupons && p.coupons.length > 0) ||
      ((p as any).publicCoupons && (p as any).publicCoupons.length > 0)
  )

  for (const promo of couponPromos) {
    const rawCoupons = promo.coupons || (promo as any).publicCoupons || []
    const publicCoupons = rawCoupons.filter(
      (c: any) =>
        (c.is_active ?? c.isActive ?? true) &&
        !c.is_single_use &&
        !c.assigned_customer_email
    )

    const dType = promo.discount_type ?? (promo as any).discountType
    const dValue = Number(promo.discount_value ?? (promo as any).discountValue ?? 0)
    const maxDiscount = promo.max_discount_amount ?? (promo as any).maxDiscountAmount
    const minSubtotal = promo.min_order_subtotal ?? (promo as any).minOrderSubtotal

    // Only consider coupon if cart subtotal threshold is met by this product
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
