import { describe, it, expect } from 'vitest'
import {
  roundCurrency,
  allocateProRataDiscounts,
  evaluateCartPromotions,
  recalculateTryOnSettlement,
  getEffectiveProductPricing,
  calculateDiscountBuckets,
  type CartItemPricingInput,
  type PromotionWithRules,
} from './index'

describe('Exact Currency & Pro-Rata Allocation', () => {
  it('correctly rounds currency to 2 decimal places without float drift', () => {
    expect(roundCurrency(10.005)).toBe(10.01)
    expect(roundCurrency(10.004)).toBe(10)
    expect(roundCurrency(1234.5678)).toBe(1234.57)
    expect(roundCurrency(NaN)).toBe(0)
  })

  it('allocates pro-rata discount across 3 items summing exactly to total with 1-paise remainder', () => {
    // 3 items with prices 3000, 2000, 1000 = 6000 total. Discount = 1000.
    // Proportions: 50%, 33.333%, 16.666%
    // Raw discounts: 500.00, 333.33, 166.67 => sum = 1000.00
    const items = [
      { key: 'v1', amount: 3000, maxDiscount: 2000 },
      { key: 'v2', amount: 2000, maxDiscount: 1500 },
      { key: 'v3', amount: 1000, maxDiscount: 800 },
    ]

    const allocation = allocateProRataDiscounts(items, 1000)
    const sum = Object.values(allocation).reduce((a, b) => roundCurrency(a + b), 0)

    expect(sum).toBe(1000)
    expect(allocation['v1']).toBe(500)
    expect(allocation['v2']).toBe(333.33)
    expect(allocation['v3']).toBe(166.67)
  })

  it('assigns 1-paise rounding variance to the highest-value eligible item', () => {
    // 3 items with price 100 each = 300. Discount = 100.
    // 100/3 = 33.333... First pass gives 33.33 each = 99.99. Remainder = 0.01.
    // Highest amount gets the 0.01 extra, so first item should get 33.34.
    const items = [
      { key: 'v1', amount: 100, maxDiscount: 90 },
      { key: 'v2', amount: 100, maxDiscount: 90 },
      { key: 'v3', amount: 100, maxDiscount: 90 },
    ]

    const allocation = allocateProRataDiscounts(items, 100)
    const sum = Object.values(allocation).reduce((a, b) => roundCurrency(a + b), 0)

    expect(sum).toBe(100)
    expect(allocation['v1'] + allocation['v2'] + allocation['v3']).toBe(100)
    expect([allocation['v1'], allocation['v2'], allocation['v3']]).toContain(33.34)
  })

  it('clamps individual discount to maxDiscount (margin headroom)', () => {
    const items = [
      { key: 'v1', amount: 5000, maxDiscount: 200 }, // only ₹200 headroom
      { key: 'v2', amount: 5000, maxDiscount: 3000 },
    ]

    const allocation = allocateProRataDiscounts(items, 1000)
    expect(allocation['v1']).toBeLessThanOrEqual(200)
  })
})

describe('Evaluate Cart Promotions Engine', () => {
  const sampleItems: CartItemPricingInput[] = [
    {
      productId: 'p-silk-blazer',
      variantId: 'v-blazer-38',
      title: 'Silk Velvet Evening Blazer',
      categoryId: 'cat-jackets',
      collectionIds: ['col-autumn-soiree'],
      quantity: 1,
      unitPrice: 28000,
      costPrice: 12000,
    },
    {
      productId: 'p-trousers',
      variantId: 'v-trousers-32',
      title: 'Tailored Pleated Trousers',
      categoryId: 'cat-trousers',
      collectionIds: ['col-autumn-soiree'],
      quantity: 1,
      unitPrice: 14000,
      costPrice: 6000,
    },
  ]

  const samplePromo: PromotionWithRules = {
    id: 'promo-welcome10',
    name: 'Private Client Welcome Privilege',
    slug: 'welcome-10',
    description: '10% privilege on inaugural order up to ₹5,000',
    promotion_type: 'coupon',
    discount_type: 'percentage',
    discount_value: 10,
    max_discount_amount: 5000,
    min_order_subtotal: 10000,
    usage_limit_total: null,
    usage_limit_per_customer: 1,
    total_redemptions_count: 0,
    priority: 10,
    is_stackable: false,
    enforce_margin_floor: true,
    starts_at: '2020-01-01T00:00:00Z',
    ends_at: null,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    rules: [
      {
        id: 'r1',
        promotion_id: 'promo-welcome10',
        target_type: 'entire_order',
        target_id: null,
        match_operator: 'include',
        min_quantity: null,
        created_at: '2026-01-01T00:00:00Z',
      },
    ],
  }

  it('evaluates valid 10% coupon with max discount cap', () => {
    // Subtotal: 28000 + 14000 = 42000. 10% = 4200 (less than 5000 cap).
    const result = evaluateCartPromotions({
      items: sampleItems,
      deliveryMode: 'direct',
      shippingFee: 0,
      couponCode: 'WELCOME10',
      activePromotions: [samplePromo],
      activeCoupon: {
        id: 'c1',
        promotion_id: samplePromo.id,
        code: 'WELCOME10',
        is_single_use: false,
        max_uses: null,
        times_used: 0,
        assigned_customer_email: null,
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
      },
    })

    expect(result.isValid).toBe(true)
    expect(result.subtotal).toBe(42000)
    expect(result.totalDiscount).toBe(4200)
    expect(result.discountedSubtotal).toBe(37800)
    expect(result.taxAmount).toBe(roundCurrency(37800 * 0.12)) // 4536
    expect(result.totalAmount).toBe(roundCurrency(37800 + 4536))
    expect(result.appliedPromotions).toHaveLength(1)
    expect(result.appliedPromotions[0].name).toBe('Private Client Welcome Privilege')
  })

  it('enforces max_discount_amount cap when discount exceeds ceiling', () => {
    const highValueItems: CartItemPricingInput[] = [
      {
        productId: 'p-gown',
        variantId: 'v-gown-40',
        quantity: 1,
        unitPrice: 80000,
        costPrice: 30000,
      },
    ]

    // 10% of 80000 = 8000, but cap is 5000
    const result = evaluateCartPromotions({
      items: highValueItems,
      deliveryMode: 'direct',
      shippingFee: 0,
      couponCode: 'WELCOME10',
      activePromotions: [samplePromo],
      activeCoupon: {
        id: 'c1',
        promotion_id: samplePromo.id,
        code: 'WELCOME10',
        is_single_use: false,
        max_uses: null,
        times_used: 0,
        assigned_customer_email: null,
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
      },
    })

    expect(result.isValid).toBe(true)
    expect(result.totalDiscount).toBe(5000)
    expect(result.discountedSubtotal).toBe(75000)
  })

  it('rejects coupon if minimum order subtotal is not met', () => {
    const smallOrder: CartItemPricingInput[] = [
      {
        productId: 'p-pocket-square',
        variantId: 'v-ps-silk',
        quantity: 1,
        unitPrice: 4500,
        costPrice: 1500,
      },
    ]

    const result = evaluateCartPromotions({
      items: smallOrder,
      deliveryMode: 'direct',
      shippingFee: 250,
      couponCode: 'WELCOME10',
      activePromotions: [samplePromo],
      activeCoupon: {
        id: 'c1',
        promotion_id: samplePromo.id,
        code: 'WELCOME10',
        is_single_use: false,
        max_uses: null,
        times_used: 0,
        assigned_customer_email: null,
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
      },
    })

    expect(result.isValid).toBe(false)
    expect(result.errorCode).toBe('MINIMUM_ORDER_NOT_MET')
    expect(result.error).toContain('Add ₹5,500 more')
    expect(result.totalDiscount).toBe(0)
  })

  it('strictly enforces margin-floor lock so final price never falls below cost price', () => {
    // Garment priced at 10000, cost is 9000. Margin headroom is 1000.
    // If a 50% discount (₹5,000) is attempted, it must be clamped to ₹1,000.
    const lowMarginItem: CartItemPricingInput[] = [
      {
        productId: 'p-rare-tweed',
        variantId: 'v-tweed-42',
        quantity: 1,
        unitPrice: 10000,
        costPrice: 9000,
      },
    ]

    const heavyPromo: PromotionWithRules = {
      id: 'promo-heavy50',
      name: 'Private Markdown 50%',
      slug: 'heavy-50',
      description: '50% off',
      promotion_type: 'automatic_cart',
      discount_type: 'percentage',
      discount_value: 50,
      max_discount_amount: null,
      min_order_subtotal: null,
      usage_limit_total: null,
      usage_limit_per_customer: null,
      total_redemptions_count: 0,
      priority: 10,
      is_stackable: false,
      enforce_margin_floor: true,
      starts_at: '2020-01-01T00:00:00Z',
      ends_at: null,
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      rules: [],
    }

    const result = evaluateCartPromotions({
      items: lowMarginItem,
      deliveryMode: 'direct',
      shippingFee: 0,
      activePromotions: [heavyPromo],
    })

    expect(result.isValid).toBe(true)
    expect(result.totalDiscount).toBe(1000) // Clamped to headroom!
    expect(result.marginProtected).toBe(true)
    expect(result.lineItems[0].finalUnitPrice).toBe(9000)
    expect(result.lineItems[0].marginFloorHit).toBe(true)
  })

  it('calculates luxury tier progress metrics towards next tier unlock', () => {
    const tieredPromo: PromotionWithRules = {
      id: 'promo-tier-vip',
      name: 'Curator Tier Privilege (₹2,500 Gift)',
      slug: 'tier-vip',
      description: '₹2,500 privilege on collections exceeding ₹25,000',
      promotion_type: 'tiered_threshold',
      discount_type: 'fixed_amount',
      discount_value: 2500,
      max_discount_amount: null,
      min_order_subtotal: 25000,
      usage_limit_total: null,
      usage_limit_per_customer: null,
      total_redemptions_count: 0,
      priority: 10,
      is_stackable: false,
      enforce_margin_floor: true,
      starts_at: '2020-01-01T00:00:00Z',
      ends_at: null,
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      rules: [],
    }

    const cartAt20k: CartItemPricingInput[] = [
      {
        productId: 'p-jacket',
        variantId: 'v-jacket-40',
        quantity: 1,
        unitPrice: 20000,
        costPrice: 8000,
      },
    ]

    const result = evaluateCartPromotions({
      items: cartAt20k,
      deliveryMode: 'direct',
      shippingFee: 0,
      activePromotions: [tieredPromo],
    })

    expect(result.tierProgress).toBeDefined()
    expect(result.tierProgress?.currentSpend).toBe(20000)
    expect(result.tierProgress?.nextTierSpend).toBe(25000)
    expect(result.tierProgress?.amountNeeded).toBe(5000)
    expect(result.tierProgress?.progressPercentage).toBe(80)
    expect(result.tierProgress?.unlockedBenefit).toBe('Curator Tier Privilege (₹2,500 Gift)')
  })

  it('correctly stacks Bolt Try-On shipping waiver with garment discount', () => {
    const autoGarmentDiscount: PromotionWithRules = {
      id: 'promo-garment-auto',
      name: 'Autumn Capsule 5% Privilege',
      slug: 'autumn-5',
      description: '5% auto privilege',
      promotion_type: 'automatic_cart',
      discount_type: 'percentage',
      discount_value: 5,
      max_discount_amount: null,
      min_order_subtotal: null,
      usage_limit_total: null,
      usage_limit_per_customer: null,
      total_redemptions_count: 0,
      priority: 10,
      is_stackable: true,
      enforce_margin_floor: true,
      starts_at: '2020-01-01T00:00:00Z',
      ends_at: null,
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      rules: [],
    }

    const boltFreeWaiver: PromotionWithRules = {
      id: 'promo-bolt-free',
      name: 'Complimentary Bolt 45m Concierge Try-On',
      slug: 'bolt-free',
      description: 'Waives ₹99 doorstep hold fee',
      promotion_type: 'shipping_waiver',
      discount_type: 'fixed_amount',
      discount_value: 99,
      max_discount_amount: null,
      min_order_subtotal: null,
      usage_limit_total: null,
      usage_limit_per_customer: null,
      total_redemptions_count: 0,
      priority: 10,
      is_stackable: true,
      enforce_margin_floor: false,
      starts_at: '2020-01-01T00:00:00Z',
      ends_at: null,
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      rules: [],
    }

    const result = evaluateCartPromotions({
      items: [
        {
          productId: 'p-coat',
          variantId: 'v-coat-l',
          quantity: 1,
          unitPrice: 20000,
          costPrice: 8000,
        },
      ],
      deliveryMode: 'try_on',
      shippingFee: 99,
      activePromotions: [autoGarmentDiscount, boltFreeWaiver],
    })

    expect(result.shippingDiscount).toBe(99)
    expect(result.finalShippingFee).toBe(0)
    expect(result.totalDiscount).toBe(1000) // 5% of 20000
    expect(result.payableImmediate).toBe(0) // Doorstep booking fee waived!
    expect(result.payablePostFitting).toBe(roundCurrency(19000 + 19000 * 0.12)) // Settles after fitting
  })
})

describe('Bolt Try-On Doorstep Reconciliation Engine', () => {
  const keptItem: CartItemPricingInput = {
    productId: 'p-cashmere-coat',
    variantId: 'v-coat-m',
    quantity: 1,
    unitPrice: 35000,
    costPrice: 15000,
  }

  const rejectedItem: CartItemPricingInput = {
    productId: 'p-silk-shirt',
    variantId: 'v-shirt-40',
    quantity: 1,
    unitPrice: 12000,
    costPrice: 5000,
  }

  const promoWithThreshold: PromotionWithRules = {
    id: 'promo-tiered',
    name: 'Curator Privilege (15% on ₹40,000+)',
    slug: 'curator-15',
    description: '15% privilege on ₹40k spend',
    promotion_type: 'tiered_threshold',
    discount_type: 'percentage',
    discount_value: 15,
    max_discount_amount: null,
    min_order_subtotal: 40000,
    usage_limit_total: null,
    usage_limit_per_customer: null,
    total_redemptions_count: 0,
    priority: 10,
    is_stackable: false,
    enforce_margin_floor: true,
    starts_at: '2020-01-01T00:00:00Z',
    ends_at: null,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    rules: [],
  }

  it('reconciles when all garments are returned on doorstep', () => {
    const result = recalculateTryOnSettlement({
      originalSubtotal: 47000,
      originalAppliedPromotion: promoWithThreshold,
      keptItems: [],
      rejectedItems: [keptItem, rejectedItem],
      holdFeePaid: 99,
    })

    expect(result.keptSubtotal).toBe(0)
    expect(result.finalPayable).toBe(0)
    expect(result.thresholdMaintained).toBe(false)
  })

  it('disqualifies discount when kept garments fall below original minimum threshold', () => {
    // Kept is ₹35,000, below ₹40,000 threshold.
    // Result: 15% discount is forfeited, customer charged standard retail rate ₹35,000 + 12% GST = ₹39,200.
    const result = recalculateTryOnSettlement({
      originalSubtotal: 47000,
      originalAppliedPromotion: promoWithThreshold,
      keptItems: [keptItem],
      rejectedItems: [rejectedItem],
      holdFeePaid: 99,
    })

    expect(result.keptSubtotal).toBe(35000)
    expect(result.recalculatedDiscount).toBe(0)
    expect(result.thresholdMaintained).toBe(false)
    expect(result.recalculatedTax).toBe(roundCurrency(35000 * 0.12)) // 4200
    expect(result.finalPayable).toBe(39200)
    expect(result.reconciliationNotes).toContain('fell below minimum privilege threshold')
  })

  it('preserves and recalculates pro-rata discount when retained items meet threshold', () => {
    const highValItem: CartItemPricingInput = {
      productId: 'p-gown',
      variantId: 'v-gown-m',
      quantity: 1,
      unitPrice: 50000,
      costPrice: 20000,
    }

    // Kept is ₹50,000, which is >= ₹40,000 min threshold!
    // 15% of 50000 = 7500. Discounted subtotal = 42500. Tax = 5100. Final = 47600.
    const result = recalculateTryOnSettlement({
      originalSubtotal: 62000,
      originalAppliedPromotion: promoWithThreshold,
      keptItems: [highValItem],
      rejectedItems: [rejectedItem],
      holdFeePaid: 99,
    })

    expect(result.keptSubtotal).toBe(50000)
    expect(result.thresholdMaintained).toBe(true)
    expect(result.recalculatedDiscount).toBe(7500)
    expect(result.recalculatedTax).toBe(roundCurrency(42500 * 0.12)) // 5100
    expect(result.finalPayable).toBe(47600)
    expect(result.reconciliationNotes).toContain('Privilege maintained')
  })
})

describe('Effective Product Pricing & Storefront Offer Resolution', () => {
  const dummyProduct: any = {
    id: 'prod-001',
    title: 'Architectural Heavyweight Boxy Hoodie',
    price: 10000,
    category_id: 'cat-hoodies',
    category: 'Hoodies & Fleece',
    stock: 50,
  }

  const publicCouponPromo: PromotionWithRules = {
    id: 'promo-101',
    name: 'Private Client Welcome Privilege',
    slug: 'welcome-10',
    description: '10% off entire order with code WELCOME10',
    promotion_type: 'coupon',
    discount_type: 'percentage',
    discount_value: 10,
    min_order_subtotal: 0,
    max_discount_amount: 2500,
    is_stackable: false,
    priority: 10,
    starts_at: '2026-01-01T00:00:00.000Z',
    ends_at: null,
    is_active: true,
    total_redemptions_count: 0,
    usage_limit_total: null,
    usage_limit_per_customer: 1,
    enforce_margin_floor: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    rules: [
      {
        id: 'r1',
        promotion_id: 'promo-101',
        target_type: 'entire_order',
        match_operator: 'include',
        target_id: null,
        min_quantity: null,
        created_at: new Date().toISOString(),
      },
    ],
    coupons: [
      {
        id: 'c1',
        promotion_id: 'promo-101',
        code: 'WELCOME10',
        is_single_use: false,
        max_uses: null,
        times_used: 0,
        assigned_customer_email: null,
        is_active: true,
        created_at: new Date().toISOString(),
      },
    ],
  }

  it('resolves compare_at_price and computes accurate discount percentage', () => {
    const discountedProduct = {
      ...dummyProduct,
      compare_at_price: 15000,
      price: 10000,
    }

    const pricing = getEffectiveProductPricing(discountedProduct, [publicCouponPromo])

    expect(pricing.mrp).toBe(15000)
    expect(pricing.sellingPrice).toBe(10000)
    expect(pricing.discountPercentage).toBe(33) // (15000 - 10000)/15000 = 33.33% => 33
    expect(pricing.hasDiscount).toBe(true)
  })

  it('calculates bestCouponPrice and attaches applicable public coupons', () => {
    const pricing = getEffectiveProductPricing(dummyProduct, [publicCouponPromo])

    expect(pricing.sellingPrice).toBe(10000)
    // 10% coupon off ₹10,000 = ₹1,000 off => Best price = ₹9,000
    expect(pricing.bestCouponPrice).toBe(9000)
    expect(pricing.bestCoupon?.code).toBe('WELCOME10')
    expect(pricing.bestCoupon?.savingsAmount).toBe(1000)
    expect(pricing.applicableOffers.length).toBeGreaterThanOrEqual(1)
    expect(pricing.applicableOffers[0].code).toBe('WELCOME10')
  })

  it('evaluates active price schedules taking precedence over base price', () => {
    const now = new Date().toISOString()
    const future = new Date(Date.now() + 86400000).toISOString()
    const past = new Date(Date.now() - 86400000).toISOString()

    const activeSchedule = {
      id: 'sched-1',
      product_id: dummyProduct.id,
      original_price: 12000,
      scheduled_price: 8000,
      starts_at: past,
      ends_at: future,
      is_active: true,
    }

    const pricing = getEffectiveProductPricing(dummyProduct, [publicCouponPromo], [activeSchedule])

    expect(pricing.mrp).toBe(12000)
    expect(pricing.sellingPrice).toBe(8000)
    expect(pricing.discountPercentage).toBe(33) // (12000 - 8000)/12000 = 33%
    // Best coupon: 10% off ₹8000 = ₹800 => ₹7200
    expect(pricing.bestCouponPrice).toBe(7200)
  })

  it('accurately tallies discount bucket counts across products', () => {
    const prods = [
      { id: 'p1' },
      { id: 'p2' },
      { id: 'p3' },
      { id: 'p4' },
    ] as any[]

    const pricingList = [
      { productId: 'p1', discountPercentage: 15 },
      { productId: 'p2', discountPercentage: 35 },
      { productId: 'p3', discountPercentage: 55 },
      { productId: 'p4', discountPercentage: 0 },
    ] as any[]

    const buckets = calculateDiscountBuckets(prods, pricingList)
    expect(buckets.onSaleTotal).toBe(3)
    expect(buckets.min10).toBe(3) // 15, 35, 55
    expect(buckets.min20).toBe(2) // 35, 55
    expect(buckets.min30).toBe(2) // 35, 55
    expect(buckets.min50).toBe(1) // 55
  })

  it('correctly discounts test garment with storewide fixed-amount promotion (Curator Sovereign Wardrobe Tier)', () => {
    const testGarment: any = {
      id: '013f7fda-210d-43d8-894f-97126fe5bf6f',
      title: 'test garmemt',
      price: 12345,
      category: 'test category 1',
    }

    const sovereignTierPromo: PromotionWithRules = {
      id: 'ed95c0bd-4a1e-4c7c-93d5-3dc6e1829cf9',
      name: 'Curator Sovereign Wardrobe Tier',
      slug: 'sovereign-wardrobe-tier',
      description: 'Complimentary ₹2,500 private client courtesy on royal curations.',
      promotion_type: 'tiered_threshold',
      discount_type: 'fixed_amount',
      discount_value: 2500,
      min_order_subtotal: null,
      max_discount_amount: 2500,
      is_stackable: false,
      priority: 2,
      is_active: true,
      rules: [],
      coupons: [
        {
          id: 'c-curator',
          promotion_id: 'ed95c0bd-4a1e-4c7c-93d5-3dc6e1829cf9',
          code: 'CURATOR26',
          is_active: true,
          is_single_use: false,
          max_uses: 500,
          times_used: 0,
          assigned_customer_email: null,
          created_at: new Date().toISOString(),
        },
      ],
      starts_at: '2026-01-01T00:00:00Z',
      ends_at: null,
      total_redemptions_count: 0,
      usage_limit_total: null,
      usage_limit_per_customer: 1,
      enforce_margin_floor: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const pricing = getEffectiveProductPricing(testGarment, [sovereignTierPromo])

    expect(pricing.mrp).toBe(12345)
    expect(pricing.sellingPrice).toBe(9845) // 12345 - 2500
    expect(pricing.discountPercentage).toBe(20) // (12345 - 9845)/12345 = 20.25% => 20
    expect(pricing.hasDiscount).toBe(true)
    expect(pricing.applicableOffers.length).toBeGreaterThan(0)
  })

  it('handles camelCase promotion payloads returned from JSON API routes', () => {
    const testGarment: any = {
      id: '013f7fda-210d-43d8-894f-97126fe5bf6f',
      title: 'test garmemt',
      price: 12345,
    }

    const camelPromo: any = {
      id: 'promo-camel',
      name: 'Spring Clearance',
      slug: 'spring-clearance',
      promotionType: 'automatic_cart',
      discountType: 'percentage',
      discountValue: 20,
      minOrderSubtotal: null,
      isActive: true,
      rules: [{ targetType: 'entire_order' }],
    }

    const pricing = getEffectiveProductPricing(testGarment, [camelPromo])

    expect(pricing.mrp).toBe(12345)
    expect(pricing.sellingPrice).toBe(9876) // 12345 - 20% (2469) = 9876
    expect(pricing.discountPercentage).toBe(20)
    expect(pricing.hasDiscount).toBe(true)
  })
})
