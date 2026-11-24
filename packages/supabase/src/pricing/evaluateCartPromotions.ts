import { roundCurrency, allocateProRataDiscounts, type AllocatableItem } from './currency'
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

/**
 * Checks whether an individual cart item matches the targeting rules of a promotion.
 */
function isItemEligibleForRules(item: CartItemPricingInput, rules?: PromotionRule[]): boolean {
  if (!rules || rules.length === 0) return true

  const includeRules = rules.filter((r) => r.match_operator !== 'exclude')
  const excludeRules = rules.filter((r) => r.match_operator === 'exclude')

  // 1. Check exclusions first
  for (const ex of excludeRules) {
    if (ex.target_type === 'product' && ex.target_id === item.productId) return false
    if (ex.target_type === 'variant' && ex.target_id === item.variantId) return false
    if (ex.target_type === 'category' && ex.target_id === item.categoryId) return false
    if (ex.target_type === 'collection' && item.collectionIds?.includes(ex.target_id || '')) return false
  }

  // 2. If no include rules specified, entire order is included
  if (includeRules.length === 0) return true

  // 3. Check inclusions
  for (const inc of includeRules) {
    if (inc.target_type === 'entire_order') return true
    if (inc.target_type === 'product' && inc.target_id === item.productId) return true
    if (inc.target_type === 'variant' && inc.target_id === item.variantId) return true
    if (inc.target_type === 'category' && inc.target_id === item.categoryId) return true
    if (inc.target_type === 'collection' && item.collectionIds?.includes(inc.target_id || '')) return true
  }

  return false
}

/**
 * Core Isomorphic Promotions & Pricing Engine
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
    taxAmount: roundCurrency(subtotal * 0.12),
    totalAmount: roundCurrency(subtotal + shippingFee + roundCurrency(subtotal * 0.12)),
    payableImmediate: deliveryMode === 'try_on' ? roundCurrency(shippingFee) : roundCurrency(subtotal + shippingFee + roundCurrency(subtotal * 0.12)),
    payablePostFitting: deliveryMode === 'try_on' ? roundCurrency(subtotal + roundCurrency(subtotal * 0.12)) : 0,
    appliedPromotions: [],
    lineItems: items.map((it) => ({
      variantId: it.variantId,
      productId: it.productId,
      quantity: it.quantity,
      originalUnitPrice: roundCurrency(it.unitPrice),
      unitDiscountAmount: 0,
      totalDiscountAmount: 0,
      finalUnitPrice: roundCurrency(it.unitPrice),
      costPrice: roundCurrency(it.costPrice),
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
  // 2. Resolve Promotions Pool & Stacking
  // ---------------------------------------------------------------------------
  const appliedPromotions: AppliedPromotionSummary[] = []
  let totalGarmentDiscount = 0
  let shippingDiscount = 0
  let anyMarginClamped = false

  // Candidate Automatic Rules
  const autoRules = activePromotions
    .filter((p) => p.promotion_type !== 'coupon' && p.is_active)
    .filter((p) => !p.min_order_subtotal || subtotal >= p.min_order_subtotal)
    .sort((a, b) => b.priority - a.priority)

  // Determine Garment Discount Promotion
  // If coupon is entered and valid, coupon takes precedence unless auto rule is stackable
  const garmentPromotionsToApply: PromotionWithRules[] = []

  if (targetCouponPromo) {
    garmentPromotionsToApply.push(targetCouponPromo)

    if (targetCouponPromo.is_stackable) {
      // Allow stackable auto rules
      autoRules.forEach((ar) => {
        if (ar.is_stackable && ar.promotion_type !== 'shipping_waiver') {
          garmentPromotionsToApply.push(ar)
        }
      })
    }
  } else if (autoRules.length > 0) {
    // Select highest priority or stackable auto rules
    const firstRule = autoRules.find((r) => r.promotion_type !== 'shipping_waiver')
    if (firstRule) {
      garmentPromotionsToApply.push(firstRule)
      if (firstRule.is_stackable) {
        autoRules.forEach((ar) => {
          if (ar.id !== firstRule.id && ar.is_stackable && ar.promotion_type !== 'shipping_waiver') {
            garmentPromotionsToApply.push(ar)
          }
        })
      }
    }
  }

  // Determine Shipping Waiver Promotion
  const shippingPromo =
    targetCouponPromo?.promotion_type === 'shipping_waiver'
      ? targetCouponPromo
      : autoRules.find((r) => r.promotion_type === 'shipping_waiver')

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
  // 3. Compute Garment Discounts & Margin Floors
  // ---------------------------------------------------------------------------
  // Prepare allocatable items with individual margin limits
  const allocatableItems: AllocatableItem[] = items.map((it) => {
    const lineTotal = roundCurrency(it.unitPrice * it.quantity)
    const costTotal = roundCurrency(it.costPrice * it.quantity)
    const marginHeadroom = Math.max(0, roundCurrency(lineTotal - costTotal))

    return {
      key: it.variantId,
      amount: lineTotal,
      maxDiscount: marginHeadroom, // Maximum allowable discount before hitting cost_price
    }
  })

  // Map to hold aggregated discounts per variant
  const variantDiscounts: Record<string, number> = {}
  items.forEach((it) => {
    variantDiscounts[it.variantId] = 0
  })

  for (const promo of garmentPromotionsToApply) {
    // Filter items matching rules
    const eligibleAllocatables = allocatableItems.filter((it) => {
      const originalItem = items.find((orig) => orig.variantId === it.key)!
      return isItemEligibleForRules(originalItem, promo.rules)
    })

    const eligibleSubtotal = eligibleAllocatables.reduce((acc, it) => acc + it.amount, 0)
    if (eligibleSubtotal <= 0) continue

    let calculatedDiscount = 0

    if (promo.discount_type === 'percentage') {
      const rawPct = (eligibleSubtotal * promo.discount_value) / 100
      calculatedDiscount = roundCurrency(rawPct)
      if (promo.max_discount_amount && calculatedDiscount > promo.max_discount_amount) {
        calculatedDiscount = roundCurrency(promo.max_discount_amount)
      }
    } else if (promo.discount_type === 'fixed_amount') {
      calculatedDiscount = Math.min(roundCurrency(promo.discount_value), eligibleSubtotal)
    } else if (promo.promotion_type === 'buy_x_get_y') {
      // Find eligible items for BXGY
      const totalEligibleQty = items
        .filter((it) => isItemEligibleForRules(it, promo.rules))
        .reduce((sum, it) => sum + it.quantity, 0)

      const ruleMinQty = promo.rules?.find((r) => r.min_quantity)?.min_quantity || 2
      if (totalEligibleQty >= ruleMinQty) {
        // Discount the lowest-priced eligible single item
        const eligibleSorted = [...items]
          .filter((it) => isItemEligibleForRules(it, promo.rules))
          .sort((a, b) => a.unitPrice - b.unitPrice)

        const lowest = eligibleSorted[0]
        if (lowest) {
          calculatedDiscount = roundCurrency((lowest.unitPrice * promo.discount_value) / 100)
        }
      }
    }

    if (calculatedDiscount > 0) {
      // Check margin floor cap across eligible items
      const totalMarginHeadroom = eligibleAllocatables.reduce((acc, it) => acc + it.maxDiscount, 0)
      if (promo.enforce_margin_floor && calculatedDiscount > totalMarginHeadroom) {
        calculatedDiscount = totalMarginHeadroom
        anyMarginClamped = true
      }

      // Pro-rata allocate across eligible items with 1-paise exact precision
      const distributed = allocateProRataDiscounts(eligibleAllocatables, calculatedDiscount)
      let actualDistributedSum = 0

      for (const [vId, disc] of Object.entries(distributed)) {
        variantDiscounts[vId] = roundCurrency((variantDiscounts[vId] || 0) + disc)
        actualDistributedSum = roundCurrency(actualDistributedSum + disc)
      }

      totalGarmentDiscount = roundCurrency(totalGarmentDiscount + actualDistributedSum)

      appliedPromotions.push({
        id: promo.id,
        name: promo.name,
        slug: promo.slug,
        code: targetCouponPromo?.id === promo.id ? cleanCode : undefined,
        discountAmount: actualDistributedSum,
        promotionType: promo.promotion_type,
        discountType: promo.discount_type,
        isShippingWaiver: false,
      })
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Construct Final Line Items with Unit Pricing
  // ---------------------------------------------------------------------------
  const lineItems: LineItemDiscount[] = items.map((it) => {
    const totalLineDiscount = variantDiscounts[it.variantId] || 0
    const unitDiscount = roundCurrency(totalLineDiscount / it.quantity)
    const finalUnitPrice = roundCurrency(it.unitPrice - unitDiscount)
    const marginFloorHit = roundCurrency(finalUnitPrice) <= roundCurrency(it.costPrice) && totalLineDiscount > 0

    return {
      variantId: it.variantId,
      productId: it.productId,
      quantity: it.quantity,
      originalUnitPrice: roundCurrency(it.unitPrice),
      unitDiscountAmount: unitDiscount,
      totalDiscountAmount: totalLineDiscount,
      finalUnitPrice,
      costPrice: roundCurrency(it.costPrice),
      marginFloorHit,
      appliedPromotionId: appliedPromotions.find((ap) => !ap.isShippingWaiver)?.id,
    }
  })

  // ---------------------------------------------------------------------------
  // 5. Tiered Threshold Progress Calculation (For Luxury Progress Bar)
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
  // 6. Final Financial Balances
  // ---------------------------------------------------------------------------
  const discountedSubtotal = roundCurrency(subtotal - totalGarmentDiscount)
  const finalShippingFee = roundCurrency(shippingFee - shippingDiscount)
  // Indian GST 12% computed strictly on discounted apparel subtotal
  const taxAmount = roundCurrency(discountedSubtotal * 0.12)
  const totalAmount = roundCurrency(discountedSubtotal + finalShippingFee + taxAmount)

  // Bolt Doorstep Try-On Splits:
  // Immediate payable is only the delivery/hold fee (e.g. ₹99 or ₹0 if waived)
  // Garment balance settles after in-home trial
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
