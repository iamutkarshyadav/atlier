import fs from 'fs'
import path from 'path'
import type {
  ProductReview,
  ProductReviewWithMedia,
  ReviewStatus,
  FashionFitIndicator,
  Promotion,
  PromotionWithRules,
} from '../types/database.types'

const REVIEWS_FILE = path.join(__dirname, '.local_reviews.json')
const PROMOTIONS_FILE = path.join(__dirname, '.local_promotions.json')

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8')
      return JSON.parse(content) as T
    }
  } catch {}
  return fallback
}

function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.warn(`Warning: failed writing fallback store to ${filePath}:`, err)
  }
}

// =============================================================================
// Local Reviews Fallback Store
// =============================================================================

export interface LocalReviewRecord extends ProductReview {
  media?: { id: string; review_id: string; image_url: string; display_order: number; created_at: string }[]
  user?: { id: string; full_name: string | null; email?: string | null } | null
  order?: { id?: string; order_number?: string; created_at?: string } | null
  product?: { id: string; title: string; image_url: string | null } | null
}

export function saveLocalReview(params: {
  productId: string
  orderId: string
  orderItemId: string
  userId: string
  rating: number
  title: string
  comment: string
  fitIndicator?: FashionFitIndicator
  sizePurchased?: string | null
  isBoltTryOn?: boolean
  mediaUrls?: string[]
}): ProductReview {
  const reviews = readJsonFile<LocalReviewRecord[]>(REVIEWS_FILE, [])

  const reviewId = `rev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
  const now = new Date().toISOString()

  const newReview: LocalReviewRecord = {
    id: reviewId,
    product_id: params.productId,
    order_id: params.orderId,
    order_item_id: params.orderItemId,
    user_id: params.userId,
    rating: Math.max(1, Math.min(5, Math.round(params.rating))),
    title: params.title.trim().slice(0, 150),
    comment: params.comment.trim(),
    fit_indicator: params.fitIndicator || 'true_to_size',
    size_purchased: params.sizePurchased || null,
    is_bolt_try_on: params.isBoltTryOn ?? false,
    verified_purchase: true,
    status: 'pending',
    moderated_by: null,
    moderated_at: null,
    rejection_reason: null,
    admin_reply: null,
    admin_replied_at: null,
    admin_replied_by: null,
    created_at: now,
    updated_at: now,
    media: (params.mediaUrls || []).map((url, idx) => ({
      id: `med-${Date.now()}-${idx}`,
      review_id: reviewId,
      image_url: url,
      display_order: idx,
      created_at: now,
    })),
    user: {
      id: params.userId,
      full_name: 'Verified Patron',
      email: null,
    },
    order: {
      id: params.orderId,
      order_number: params.orderId.slice(0, 8).toUpperCase(),
      created_at: now,
    },
    product: {
      id: params.productId,
      title: 'Garment Piece',
      image_url: null,
    },
  }

  // Remove existing review for order_item_id if any, then prepend
  const filtered = reviews.filter((r) => r.order_item_id !== params.orderItemId)
  filtered.unshift(newReview)
  writeJsonFile(REVIEWS_FILE, filtered)

  return newReview
}

export function getLocalReviews(productId?: string, status?: ReviewStatus): LocalReviewRecord[] {
  const reviews = readJsonFile<LocalReviewRecord[]>(REVIEWS_FILE, [])
  return reviews.filter((r) => {
    if (productId && r.product_id !== productId) return false
    if (status && r.status !== status) return false
    return true
  })
}

export function hasLocalReview(orderItemId: string): boolean {
  const reviews = readJsonFile<LocalReviewRecord[]>(REVIEWS_FILE, [])
  return reviews.some((r) => r.order_item_id === orderItemId)
}

export function updateLocalReview(
  reviewId: string,
  updates: Partial<LocalReviewRecord>
): LocalReviewRecord | null {
  const reviews = readJsonFile<LocalReviewRecord[]>(REVIEWS_FILE, [])
  const idx = reviews.findIndex((r) => r.id === reviewId)
  if (idx === -1) return null

  reviews[idx] = {
    ...reviews[idx]!,
    ...updates,
    updated_at: new Date().toISOString(),
  }
  writeJsonFile(REVIEWS_FILE, reviews)
  return reviews[idx]!
}

// =============================================================================
// Local Promotions Fallback Store
// =============================================================================

export interface LocalPromotionRecord extends PromotionWithRules {}

export function saveLocalPromotion(params: {
  promotion: Partial<Promotion> | any
  rules?: any[]
  coupons?: any[]
}): PromotionWithRules {
  const promotions = readJsonFile<LocalPromotionRecord[]>(PROMOTIONS_FILE, [])
  const promoId = `promo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
  const now = new Date().toISOString()

  const newPromo: LocalPromotionRecord = {
    id: promoId,
    name: params.promotion.name || 'Untitled Privilege',
    slug: params.promotion.slug || `privilege-${Date.now()}`,
    description: params.promotion.description || null,
    promotion_type: params.promotion.promotion_type || 'coupon',
    discount_type: params.promotion.discount_type || 'percentage',
    discount_value: params.promotion.discount_value ?? 10,
    min_order_subtotal: params.promotion.min_order_subtotal ?? params.promotion.min_order_value ?? 0,
    max_discount_amount: params.promotion.max_discount_amount ?? params.promotion.max_discount_cap ?? null,
    is_stackable: params.promotion.is_stackable ?? false,
    priority: params.promotion.priority ?? 0,
    starts_at: params.promotion.starts_at || now,
    ends_at: params.promotion.ends_at || null,
    usage_limit_total: params.promotion.usage_limit_total ?? params.promotion.total_usage_limit ?? null,
    usage_limit_per_customer: params.promotion.usage_limit_per_customer ?? params.promotion.per_customer_usage_limit ?? 1,
    total_redemptions_count: 0,
    enforce_margin_floor: params.promotion.enforce_margin_floor ?? true,
    is_active: params.promotion.is_active ?? true,
    created_at: now,
    updated_at: now,
    rules: (params.rules || []).map((r, idx) => ({
      id: `rule-${Date.now()}-${idx}`,
      promotion_id: promoId,
      target_type: r.target_type || r.rule_target || 'entire_order',
      match_operator: r.match_operator || 'equals',
      target_id: r.target_id || null,
      min_quantity: r.min_quantity ?? null,
      created_at: now,
    })),
    coupons: (params.coupons || []).map((c, idx) => ({
      id: `coupon-${Date.now()}-${idx}`,
      promotion_id: promoId,
      code: String(c.code).trim().toUpperCase(),
      is_single_use: c.is_single_use ?? false,
      max_uses: c.max_uses ?? null,
      times_used: 0,
      assigned_customer_email: c.assigned_customer_email || null,
      is_active: true,
      created_at: now,
    })),
  }

  promotions.unshift(newPromo)
  writeJsonFile(PROMOTIONS_FILE, promotions)
  return newPromo
}

export function getLocalPromotions(activeOnly = false): LocalPromotionRecord[] {
  const promotions = readJsonFile<LocalPromotionRecord[]>(PROMOTIONS_FILE, [])
  if (activeOnly) {
    return promotions.filter((p) => p.is_active)
  }
  return promotions
}
