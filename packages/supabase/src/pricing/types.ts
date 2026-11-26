import type {
  Promotion,
  PromotionRule,
  PromotionCoupon,
  PromotionType,
  DiscountType,
  RuleTargetType,
  PromotionWithRules,
} from '../types/database.types'

export type {
  Promotion,
  PromotionRule,
  PromotionCoupon,
  PromotionType,
  DiscountType,
  RuleTargetType,
  PromotionWithRules,
}

export interface CartItemPricingInput {
  productId: string
  variantId: string
  title?: string
  categoryId?: string
  subcategoryId?: string
  collectionIds?: string[]
  isTryOnEligible?: boolean
  sku?: string
  quantity: number
  unitPrice: number
  costPrice?: number | null // Guardrail 1: Optional, strictly server-side
}

export interface PricingEvaluationContext {
  items: CartItemPricingInput[]
  deliveryMode: 'direct' | 'try_on'
  shippingFee: number
  customerEmail?: string
  customerTotalOrders?: number
  couponCode?: string
  activePromotions: PromotionWithRules[]
  activeCoupon?: PromotionCoupon | null
  customerRedemptionsCount?: number
}

export interface LineItemDiscount {
  variantId: string
  productId: string
  quantity: number
  originalUnitPrice: number
  unitDiscountAmount: number
  totalDiscountAmount: number
  finalUnitPrice: number
  costPrice?: number // Guardrail 1: Stripped before client serialization
  marginFloorHit: boolean
  appliedPromotionId?: string
}

export interface AppliedPromotionSummary {
  id: string
  name: string
  slug: string
  code?: string
  discountAmount: number
  promotionType: PromotionType
  discountType: DiscountType
  isShippingWaiver: boolean
}

export interface TierProgress {
  currentSpend: number
  nextTierSpend: number
  amountNeeded: number
  unlockedBenefit: string
  progressPercentage: number
}

export interface PromotionEvaluationResult {
  isValid: boolean
  error?: string
  errorCode?:
    | 'INVALID_COUPON'
    | 'COUPON_EXHAUSTED'
    | 'PROMOTION_EXPIRED'
    | 'MINIMUM_ORDER_NOT_MET'
    | 'USAGE_LIMIT_EXCEEDED'
    | 'UNAUTHORIZED_COUPON'
    | 'MARGIN_FLOOR_PROTECTED'
  subtotal: number
  totalDiscount: number
  discountedSubtotal: number
  shippingFee: number
  shippingDiscount: number
  finalShippingFee: number
  taxAmount: number
  totalAmount: number
  payableImmediate: number
  payablePostFitting: number
  appliedPromotions: AppliedPromotionSummary[]
  lineItems: LineItemDiscount[]
  tierProgress?: TierProgress
  marginProtected: boolean
  couponCode?: string
  promotionId?: string
}

export interface TryOnReconciliationParams {
  originalSubtotal: number
  originalAppliedPromotion?: PromotionWithRules | null
  originalCouponCode?: string
  keptItems: CartItemPricingInput[]
  rejectedItems: CartItemPricingInput[]
  holdFeePaid: number
}

export interface TryOnReconciliationResult {
  keptSubtotal: number
  rejectedSubtotal: number
  recalculatedDiscount: number
  thresholdMaintained: boolean
  recalculatedTax: number
  finalPayable: number
  refundDue: number
  lineItems: LineItemDiscount[]
  reconciliationNotes: string
}
