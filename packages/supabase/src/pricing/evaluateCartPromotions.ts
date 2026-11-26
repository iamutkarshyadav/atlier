import { roundCurrency, allocateProRataDiscounts, type AllocatableItem } from './currency'
import { GST_RATE } from './constants'
import type {
  CartItemPricingInput,
  PricingEvaluationContext,
  PromotionEvaluationResult,
  AppliedPromotionSummary,
  LineItemDiscount,
  TierProgress,
  PromotionWithRules,
  PromotionRule,
} from './types'
import { evaluatePromotionRules } from './ruleMatcher'

/**
 * Checks whether an individual cart item matches the targeting rules of a promotion.
 * Uses the Boolean Rule Matcher (AND across rule types, OR within rule type, exclude overrides).
 */
export function isItemEligibleForRules(item: CartItemPricingInput, rules?: PromotionRule[]): boolean {
  return evaluatePromotionRules(rules, {
    productId: item.productId,
    variantId: item.variantId,
    categoryId: item.categoryId,
    subcategoryId: item.subcategoryId,
    collectionIds: item.collectionIds,
    isTryOnEligible: item.isTryOnEligible ?? true,
    sku: item.sku,
  })
}

interface ItemWaterfallState {
  item: CartItemPricingInput
  mrp: number
  tier1DiscountUnit: number
  sellingUnitPrice: number
  tier2DiscountUnit: number
  tier3DiscountUnit: number
}

/**
 * Core Isomorphic 3-Tier Pricing Waterfall & Promotions Engine
 *
 * Tier 1 (Catalog Markdown): Direct markdowns against original MRP -> establishes sellingUnitPrice.
 * Tier 2 (Item/Category Coupon): Coupon discounts applied against post-Tier 1 sellingUnitPrice.
 * Tier 3 (Cart/Checkout Threshold): Order-level threshold discounts applied against post-Tier 2 subtotal.
 *
 * Guardrail 1: Enforces server-side margin floor clamping (NetItemPrice >= cost_price) safely without exposing cost_price.
 * If cost_price is null or unset, floor clamping is safely skipped.
 */
export function evaluateCartPromotions(context: PricingEvaluationContext): PromotionEvaluationResult {
  const {
    items,
    deliveryMode,
    shippingFee,
    customerEmail,
    couponCode,
    activePromotions,
    activeCoupon,
    customerRedemptionsCount = 0,
  } = context

  const rawSubtotal = items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0)
  const subtotal = roundCurrency(rawSubtotal)

  const emptyResult: PromotionEvaluationResult = {
    isValid: true,
    subtotal,
    totalDiscount: 0,
    discountedSubtotal: subtotal,
    shippingFee: roundCurrency(shippingFee),
    shippingDiscount: 0,
    finalShippingFee: roundCurrency(shippingFee),
    taxAmount: roundCurrency(subtotal * GST_RATE),
    totalAmount: roundCurrency(subtotal + shippingFee + roundCurrency(subtotal * GST_RATE)),
    payableImmediate: deliveryMode === 'try_on' ? roundCurrency(shippingFee) : roundCurrency(subtotal + shippingFee + roundCurrency(subtotal * GST_RATE)),
    payablePostFitting: deliveryMode === 'try_on' ? roundCurrency(subtotal + roundCurrency(subtotal * GST_RATE)) : 0,
    appliedPromotions: [],
    lineItems: items.map((it) => ({
      variantId: it.variantId,
      productId: it.productId,
      quantity: it.quantity,
      originalUnitPrice: roundCurrency(it.unitPrice),
      unitDiscountAmount: 0,
      totalDiscountAmount: 0,
      finalUnitPrice: roundCurrency(it.unitPrice),
      marginFloorHit: false,
    })),
    marginProtected: false,
  }

  if (items.length === 0) {
    return emptyResult
  }

  // ---------------------------------------------------------------------------
  // 1. Coupon Code Validation (If entered)
  // ---------------------------------------------------------------------------
  let targetCouponPromo: PromotionWithRules | null = null
  const cleanCode = couponCode ? couponCode.trim().toUpperCase() : undefined

  if (cleanCode) {
    if (!activeCoupon || activeCoupon.code.toUpperCase() !== cleanCode) {
      return {
        ...emptyResult,
        isValid: false,
        error: `Invitation code "${cleanCode}" is unrecognized or inactive.`,
        errorCode: 'INVALID_COUPON',
      }
    }

    if (activeCoupon.max_uses !== null && activeCoupon.times_used >= activeCoupon.max_uses) {
      return {
        ...emptyResult,
        isValid: false,
        error: `Invitation code "${cleanCode}" has reached its maximum quota.`,
        errorCode: 'COUPON_EXHAUSTED',
      }
    }

    if (
      activeCoupon.assigned_customer_email &&
      customerEmail &&
      activeCoupon.assigned_customer_email.toLowerCase() !== customerEmail.toLowerCase()
    ) {
      return {
        ...emptyResult,
        isValid: false,
        error: `Invitation code "${cleanCode}" is reserved for an exclusive private client.`,
        errorCode: 'UNAUTHORIZED_COUPON',
      }
    }

    const linkedPromo = activePromotions.find((p) => p.id === activeCoupon.promotion_id)
    if (!linkedPromo || !linkedPromo.is_active) {
      return {
        ...emptyResult,
        isValid: false,
        error: `The privilege associated with code "${cleanCode}" is no longer active.`,
        errorCode: 'INVALID_PROMOTION' as any,
      }
    }

    const now = new Date().toISOString()
    if (linkedPromo.starts_at > now || (linkedPromo.ends_at && linkedPromo.ends_at < now)) {
      return {
        ...emptyResult,
        isValid: false,
        error: `Invitation code "${cleanCode}" has concluded its scheduled window.`,
        errorCode: 'PROMOTION_EXPIRED',
      }
    }

    if (linkedPromo.usage_limit_total !== null && linkedPromo.total_redemptions_count >= linkedPromo.usage_limit_total) {
      return {
        ...emptyResult,
        isValid: false,
        error: `The global quota for code "${cleanCode}" has been exhausted.`,
        errorCode: 'PROMOTION_EXPIRED',
      }
    }

    if (
      linkedPromo.usage_limit_per_customer !== null &&
      customerRedemptionsCount >= linkedPromo.usage_limit_per_customer
    ) {
      return {
        ...emptyResult,
        isValid: false,
        error: `You have already redeemed invitation code "${cleanCode}" the maximum allowed times.`,
        errorCode: 'USAGE_LIMIT_EXCEEDED',
      }
    }

    if (linkedPromo.min_order_subtotal && subtotal < linkedPromo.min_order_subtotal) {
      const diff = roundCurrency(linkedPromo.min_order_subtotal - subtotal)
      return {
        ...emptyResult,
        isValid: false,
        error: `Add ₹${diff.toLocaleString('en-IN')} more to activate invitation code "${cleanCode}".`,
        errorCode: 'MINIMUM_ORDER_NOT_MET',
      }
    }

    targetCouponPromo = linkedPromo
  }

  // ---------------------------------------------------------------------------
  // 2. Initialize Waterfall State per Item
  // ---------------------------------------------------------------------------
  const waterfallStates: ItemWaterfallState[] = items.map((it) => ({
    item: it,
    mrp: roundCurrency(it.unitPrice),
    tier1DiscountUnit: 0,
    sellingUnitPrice: roundCurrency(it.unitPrice),
    tier2DiscountUnit: 0,
    tier3DiscountUnit: 0,
  }))

  const appliedPromotions: AppliedPromotionSummary[] = []
  let anyMarginClamped = false

  // ---------------------------------------------------------------------------
  // Tier 1: Direct Catalog Markdowns (MRP -> Selling Price)
  // ---------------------------------------------------------------------------
  const tier1Promos = activePromotions
    .filter((p) => p.is_active && (p.tier === 1 || (p.promotion_type as any) === 'sale'))
    .filter((p) => p.promotion_type !== 'coupon' && p.promotion_type !== 'shipping_waiver')

  const appliedTier1PromoIds = new Set<string>()

  for (const state of waterfallStates) {
    const matchingTier1 = tier1Promos.filter((p) => isItemEligibleForRules(state.item, p.rules))
    let bestUnitDiscount = 0
    let bestPromo: PromotionWithRules | null = null

    for (const promo of matchingTier1) {
      let unitDiscount = 0
      if (promo.discount_type === 'percentage') {
        unitDiscount = (state.mrp * promo.discount_value) / 100
        if (promo.max_discount_amount) {
          unitDiscount = Math.min(unitDiscount, Number(promo.max_discount_amount))
        }
      } else if (promo.discount_type === 'fixed_amount') {
        unitDiscount = Math.min(state.mrp - 1, promo.discount_value)
      }

      unitDiscount = roundCurrency(unitDiscount)

      // Margin floor clamp: NetItemPrice >= cost_price
      if (state.item.costPrice != null && state.item.costPrice > 0 && promo.enforce_margin_floor !== false) {
        const headroom = Math.max(0, state.mrp - state.item.costPrice)
        if (unitDiscount > headroom) {
          unitDiscount = headroom
          anyMarginClamped = true
        }
      }

      if (unitDiscount > bestUnitDiscount) {
        bestUnitDiscount = unitDiscount
        bestPromo = promo
      }
    }

    if (bestUnitDiscount > 0 && bestPromo) {
      state.tier1DiscountUnit = bestUnitDiscount
      state.sellingUnitPrice = roundCurrency(state.mrp - bestUnitDiscount)
      appliedTier1PromoIds.add(bestPromo.id)
    }
  }

  // Record Tier 1 applied promotions summary
  Array.from(appliedTier1PromoIds).forEach((promoId) => {
    const promo = tier1Promos.find((p) => p.id === promoId)
    if (promo) {
      const promoTotal = waterfallStates
        .filter((s) => isItemEligibleForRules(s.item, promo.rules))
        .reduce((sum, s) => sum + s.tier1DiscountUnit * s.item.quantity, 0)

      appliedPromotions.push({
        id: promo.id,
        name: promo.name,
        slug: promo.slug,
        discountAmount: roundCurrency(promoTotal),
        promotionType: promo.promotion_type,
        discountType: promo.discount_type,
        isShippingWaiver: false,
      })
    }
  })

  // ---------------------------------------------------------------------------
  // Tier 2: Item/Category Coupon (Evaluated against Selling Price)
  // ---------------------------------------------------------------------------
  const postTier1Subtotal = roundCurrency(
    waterfallStates.reduce((sum, s) => sum + s.sellingUnitPrice * s.item.quantity, 0)
  )

  const isTier2Coupon =
    targetCouponPromo &&
    (targetCouponPromo.tier === 2 ||
      targetCouponPromo.promotion_type === 'coupon' ||
      (!targetCouponPromo.tier && targetCouponPromo.promotion_type !== 'tiered_threshold'))

  if (isTier2Coupon && targetCouponPromo) {
    // Verify min order subtotal against post-Tier 1 subtotal
    if (targetCouponPromo.min_order_subtotal && postTier1Subtotal < targetCouponPromo.min_order_subtotal) {
      const diff = roundCurrency(targetCouponPromo.min_order_subtotal - postTier1Subtotal)
      return {
        ...emptyResult,
        isValid: false,
        error: `Add ₹${diff.toLocaleString('en-IN')} more to activate invitation code "${cleanCode}".`,
        errorCode: 'MINIMUM_ORDER_NOT_MET',
      }
    }

    const eligibleStates = waterfallStates.filter((s) => isItemEligibleForRules(s.item, targetCouponPromo!.rules))
    const eligibleSellingSubtotal = eligibleStates.reduce((sum, s) => sum + s.sellingUnitPrice * s.item.quantity, 0)

    if (eligibleSellingSubtotal > 0) {
      if (targetCouponPromo.discount_type === 'percentage') {
        let totalCouponSavings = 0
        for (const s of eligibleStates) {
          let unitDiscount = roundCurrency((s.sellingUnitPrice * targetCouponPromo.discount_value) / 100)
          if (targetCouponPromo.max_discount_amount) {
            unitDiscount = Math.min(unitDiscount, Number(targetCouponPromo.max_discount_amount))
          }

          if (s.item.costPrice != null && s.item.costPrice > 0 && targetCouponPromo.enforce_margin_floor !== false) {
            const headroom = Math.max(0, s.sellingUnitPrice - s.item.costPrice)
            if (unitDiscount > headroom) {
              unitDiscount = headroom
              anyMarginClamped = true
            }
          }

          s.tier2DiscountUnit = unitDiscount
          totalCouponSavings = roundCurrency(totalCouponSavings + unitDiscount * s.item.quantity)
        }

        appliedPromotions.push({
          id: targetCouponPromo.id,
          name: targetCouponPromo.name,
          slug: targetCouponPromo.slug,
          code: cleanCode,
          discountAmount: totalCouponSavings,
          promotionType: targetCouponPromo.promotion_type,
          discountType: targetCouponPromo.discount_type,
          isShippingWaiver: false,
        })
      } else if (targetCouponPromo.discount_type === 'fixed_amount') {
        const allocatableList: AllocatableItem[] = eligibleStates.map((s) => {
          const lineTotal = roundCurrency(s.sellingUnitPrice * s.item.quantity)
          const costTotal = s.item.costPrice != null && s.item.costPrice > 0
            ? roundCurrency(s.item.costPrice * s.item.quantity)
            : 0
          const maxDiscount = targetCouponPromo!.enforce_margin_floor !== false && s.item.costPrice != null && s.item.costPrice > 0
            ? Math.max(0, roundCurrency(lineTotal - costTotal))
            : lineTotal

          return {
            key: s.item.variantId,
            amount: lineTotal,
            maxDiscount,
          }
        })

        const couponVal = Math.min(roundCurrency(targetCouponPromo.discount_value), eligibleSellingSubtotal)
        const totalHeadroom = allocatableList.reduce((acc, it) => acc + it.maxDiscount, 0)
        let finalCouponVal = couponVal
        if (targetCouponPromo.enforce_margin_floor !== false && couponVal > totalHeadroom) {
          finalCouponVal = totalHeadroom
          anyMarginClamped = true
        }

        const distributed = allocateProRataDiscounts(allocatableList, finalCouponVal)
        let actualSum = 0

        for (const s of eligibleStates) {
          const lineDisc = distributed[s.item.variantId] || 0
          s.tier2DiscountUnit = roundCurrency(lineDisc / s.item.quantity)
          actualSum = roundCurrency(actualSum + lineDisc)
        }

        appliedPromotions.push({
          id: targetCouponPromo.id,
          name: targetCouponPromo.name,
          slug: targetCouponPromo.slug,
          code: cleanCode,
          discountAmount: actualSum,
          promotionType: targetCouponPromo.promotion_type,
          discountType: targetCouponPromo.discount_type,
          isShippingWaiver: false,
        })
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Tier 3: Cart / Checkout Threshold Offers (Applied to Post-Tier 2 Subtotal)
  // ---------------------------------------------------------------------------
  const postTier2Subtotal = roundCurrency(
    waterfallStates.reduce(
      (sum, s) => sum + (s.sellingUnitPrice - s.tier2DiscountUnit) * s.item.quantity,
      0
    )
  )

  const candidateTier3Promos = activePromotions
    .filter((p) => p.is_active && p.promotion_type !== 'shipping_waiver')
    .filter((p) => {
      if (p.tier === 3) return true
      if (p.promotion_type === 'tiered_threshold') return true
      if (p.promotion_type === 'automatic_cart' && p.tier !== 1 && p.tier !== 2) return true
      if (targetCouponPromo && targetCouponPromo.id === p.id && targetCouponPromo.tier === 3) return true
      return false
    })
    .filter((p) => !p.min_order_subtotal || postTier2Subtotal >= p.min_order_subtotal || subtotal >= p.min_order_subtotal)
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))

  // Pick winner Tier 3 promo (or stackable)
  let winnerTier3: PromotionWithRules | null = null
  let bestTier3Savings = 0

  for (const promo of candidateTier3Promos) {
    const eligibleStates = waterfallStates.filter((s) => isItemEligibleForRules(s.item, promo.rules))
    const eligibleSub = eligibleStates.reduce(
      (sum, s) => sum + (s.sellingUnitPrice - s.tier2DiscountUnit) * s.item.quantity,
      0
    )

    if (eligibleSub <= 0) continue

    let estimatedSavings = 0
    if (promo.discount_type === 'percentage') {
      estimatedSavings = roundCurrency((eligibleSub * promo.discount_value) / 100)
      if (promo.max_discount_amount) {
        estimatedSavings = Math.min(estimatedSavings, Number(promo.max_discount_amount))
      }
    } else if (promo.discount_type === 'fixed_amount') {
      estimatedSavings = Math.min(roundCurrency(promo.discount_value), eligibleSub)
    }

    if (estimatedSavings > bestTier3Savings) {
      bestTier3Savings = estimatedSavings
      winnerTier3 = promo
    }
  }

  if (winnerTier3 && bestTier3Savings > 0) {
    const eligibleStates = waterfallStates.filter((s) => isItemEligibleForRules(s.item, winnerTier3!.rules))
    const allocatableList: AllocatableItem[] = eligibleStates.map((s) => {
      const lineBase = roundCurrency((s.sellingUnitPrice - s.tier2DiscountUnit) * s.item.quantity)
      const costTotal = s.item.costPrice != null && s.item.costPrice > 0
        ? roundCurrency(s.item.costPrice * s.item.quantity)
        : 0
      const currentNetLine = roundCurrency((s.mrp - s.tier1DiscountUnit - s.tier2DiscountUnit) * s.item.quantity)
      const maxDiscount = winnerTier3!.enforce_margin_floor !== false && s.item.costPrice != null && s.item.costPrice > 0
        ? Math.max(0, roundCurrency(currentNetLine - costTotal))
        : lineBase

      return {
        key: s.item.variantId,
        amount: lineBase,
        maxDiscount,
      }
    })

    const totalHeadroom = allocatableList.reduce((acc, it) => acc + it.maxDiscount, 0)
    let actualDiscountToDistribute = bestTier3Savings
    if (winnerTier3.enforce_margin_floor !== false && bestTier3Savings > totalHeadroom) {
      actualDiscountToDistribute = totalHeadroom
      anyMarginClamped = true
    }

    const distributed = allocateProRataDiscounts(allocatableList, actualDiscountToDistribute)
    let actualSum = 0

    for (const s of eligibleStates) {
      const lineDisc = distributed[s.item.variantId] || 0
      s.tier3DiscountUnit = roundCurrency(lineDisc / s.item.quantity)
      actualSum = roundCurrency(actualSum + lineDisc)
    }

    appliedPromotions.push({
      id: winnerTier3.id,
      name: winnerTier3.name,
      slug: winnerTier3.slug,
      code: targetCouponPromo?.id === winnerTier3.id ? cleanCode : undefined,
      discountAmount: actualSum,
      promotionType: winnerTier3.promotion_type,
      discountType: winnerTier3.discount_type,
      isShippingWaiver: false,
    })
  }

  // ---------------------------------------------------------------------------
  // Shipping Waiver Privilege
  // ---------------------------------------------------------------------------
  let shippingDiscount = 0
  const shippingPromo =
    targetCouponPromo?.promotion_type === 'shipping_waiver' || targetCouponPromo?.discount_type === 'free_shipping'
      ? targetCouponPromo
      : activePromotions.find(
          (r) =>
            r.is_active &&
            (r.promotion_type === 'shipping_waiver' || r.discount_type === 'free_shipping') &&
            (!r.min_order_subtotal || subtotal >= r.min_order_subtotal)
        )

  if (shippingPromo) {
    shippingDiscount = roundCurrency(shippingFee)
    appliedPromotions.push({
      id: shippingPromo.id,
      name: shippingPromo.name,
      slug: shippingPromo.slug,
      code: targetCouponPromo?.id === shippingPromo.id ? cleanCode : undefined,
      discountAmount: shippingDiscount,
      promotionType: shippingPromo.promotion_type,
      discountType: shippingPromo.discount_type,
      isShippingWaiver: true,
    })
  }

  // ---------------------------------------------------------------------------
  // Construct Final Line Items with Unit Pricing (Guardrail 1: Zero cost_price client exposure)
  // ---------------------------------------------------------------------------
  const lineItems: LineItemDiscount[] = waterfallStates.map((s) => {
    const totalUnitDiscount = roundCurrency(s.tier1DiscountUnit + s.tier2DiscountUnit + s.tier3DiscountUnit)
    const totalLineDiscount = roundCurrency(totalUnitDiscount * s.item.quantity)
    const finalUnitPrice = roundCurrency(s.mrp - totalUnitDiscount)
    const marginFloorHit = Boolean(
      s.item.costPrice != null &&
        s.item.costPrice > 0 &&
        roundCurrency(finalUnitPrice) <= roundCurrency(s.item.costPrice) &&
        totalUnitDiscount > 0
    )

    return {
      variantId: s.item.variantId,
      productId: s.item.productId,
      quantity: s.item.quantity,
      originalUnitPrice: s.mrp,
      unitDiscountAmount: totalUnitDiscount,
      totalDiscountAmount: totalLineDiscount,
      finalUnitPrice,
      marginFloorHit,
      appliedPromotionId: appliedPromotions.find((ap) => !ap.isShippingWaiver)?.id,
    }
  })

  // ---------------------------------------------------------------------------
  // Tiered Threshold Progress Calculation (For Luxury Progress Bar)
  // ---------------------------------------------------------------------------
  let tierProgress: TierProgress | undefined = undefined

  const tieredPromos = activePromotions
    .filter((p) => p.promotion_type === 'tiered_threshold' && p.is_active && (p.min_order_subtotal || 0) > 0)
    .sort((a, b) => (a.min_order_subtotal || 0) - (b.min_order_subtotal || 0))

  const nextTier = tieredPromos.find((p) => (p.min_order_subtotal || 0) > subtotal)

  if (nextTier && nextTier.min_order_subtotal) {
    const amountNeeded = roundCurrency(nextTier.min_order_subtotal - subtotal)
    const progressPercentage = Math.min(100, Math.round((subtotal / nextTier.min_order_subtotal) * 100))

    tierProgress = {
      currentSpend: subtotal,
      nextTierSpend: nextTier.min_order_subtotal,
      amountNeeded,
      unlockedBenefit: nextTier.name,
      progressPercentage,
    }
  }

  // ---------------------------------------------------------------------------
  // Final Financial Balances
  // ---------------------------------------------------------------------------
  const totalGarmentDiscount = roundCurrency(lineItems.reduce((acc, it) => acc + it.totalDiscountAmount, 0))
  const discountedSubtotal = roundCurrency(subtotal - totalGarmentDiscount)
  const finalShippingFee = roundCurrency(shippingFee - shippingDiscount)
  const taxAmount = roundCurrency(discountedSubtotal * GST_RATE)
  const totalAmount = roundCurrency(discountedSubtotal + finalShippingFee + taxAmount)

  const payableImmediate = deliveryMode === 'try_on' ? finalShippingFee : totalAmount
  const payablePostFitting = deliveryMode === 'try_on' ? roundCurrency(discountedSubtotal + taxAmount) : 0

  return {
    isValid: true,
    subtotal,
    totalDiscount: totalGarmentDiscount,
    discountedSubtotal,
    shippingFee: roundCurrency(shippingFee),
    shippingDiscount,
    finalShippingFee,
    taxAmount,
    totalAmount,
    payableImmediate,
    payablePostFitting,
    appliedPromotions,
    lineItems,
    tierProgress,
    marginProtected: anyMarginClamped,
    couponCode: cleanCode,
    promotionId: appliedPromotions[0]?.id,
  }
}
