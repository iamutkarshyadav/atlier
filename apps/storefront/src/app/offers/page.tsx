import React from 'react'
import type { Metadata } from 'next'
import { Sparkles, ArrowLeft, Tag } from 'lucide-react'
import Link from 'next/link'
import { createServerSupabaseClient } from '@repo/supabase/server'
import {
  getPromotions,
  getStorefrontProducts,
  DEFAULT_PRODUCTS,
  getEffectiveProductPricing,
  type Product,
  type PromotionWithRules,
} from '@repo/supabase'
import { OffersInteractiveZone } from './OffersInteractiveZone'

export const revalidate = 60 // On-demand ISR revalidation

export const metadata: Metadata = {
  title: 'Offers & Sale | Maison TG',
  description:
    'Shop seasonal discounts, active promo coupons, and promotional offers across Maison TG collections.',
}

interface OffersPageProps {
  searchParams: {
    minDiscount?: string
  }
}

export default async function OffersPage({ searchParams }: OffersPageProps) {
  const supabase = await createServerSupabaseClient()

  const [promotions, products, schedulesRes] = await Promise.all([
    getPromotions(supabase, { onlyActive: true }).catch(() => []),
    getStorefrontProducts(supabase, 'all').catch(() => DEFAULT_PRODUCTS),
    Promise.resolve(
      supabase
        .from('price_schedules')
        .select('*')
        .eq('is_active', true)
        .lte('starts_at', new Date().toISOString())
        .gte('ends_at', new Date().toISOString())
    ).catch(() => ({ data: [] })),
  ])

  const safeProducts: Product[] =
    Array.isArray(products) && products.length > 0 ? products : DEFAULT_PRODUCTS
  const safePromotions: PromotionWithRules[] = Array.isArray(promotions) ? promotions : []
  const priceSchedules: any[] = schedulesRes?.data || []

  // Compute pricing across all products
  const pricingList = safeProducts.map((p) =>
    getEffectiveProductPricing(p, safePromotions, priceSchedules)
  )

  // Extract public coupons
  const publicCoupons = safePromotions
    .filter((p) => p.is_active)
    .flatMap((camp) =>
      (camp.coupons || [])
        .filter((c) => c.is_active && !c.is_single_use && !c.assigned_customer_email)
        .map((c) => ({
          code: c.code,
          promotionName: camp.name,
          description: camp.description,
          discountType: camp.discount_type,
          discountValue: Number(camp.discount_value),
          minOrderSubtotal: camp.min_order_subtotal ? Number(camp.min_order_subtotal) : null,
          maxDiscountAmount: camp.max_discount_amount ? Number(camp.max_discount_amount) : null,
          endsAt: camp.ends_at,
          badgeText:
            camp.discount_type === 'percentage'
              ? `${Math.round(Number(camp.discount_value))}% OFF`
              : camp.discount_type === 'free_shipping'
                ? 'FREE SHIPPING'
                : `₹${Math.round(Number(camp.discount_value))} OFF`,
        }))
    )

  const initialDiscountFilter = searchParams.minDiscount
    ? parseInt(searchParams.minDiscount, 10) || 0
    : 0

  return (
    <div className="min-h-screen bg-white text-[#14293a] selection:bg-[#b91c1c] selection:text-white pb-16 font-sans">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        {/* Row 1: Breadcrumb */}
        <nav className="text-xs text-[#6c7079] mb-2 font-sans" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-[#14293a] transition-colors">
            Home
          </Link>
          <span> / </span>
          <span className="text-[#14293a]">Offers</span>
        </nav>

        {/* Row 2: Single Flex Bar */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#e5e7eb] pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#14293a] tracking-tight flex items-baseline">
              Offers & Sale
              <span className="text-sm font-normal text-[#6c7079] ml-2">
                ({safeProducts.length} {safeProducts.length === 1 ? 'item' : 'items'})
              </span>
            </h1>
            <div className="text-xs text-[#6c7079] mt-1 flex items-center gap-2">
              <span>Seasonal markdowns, coupons, and discounts</span>
              <span>·</span>
              <span>45-min doorstep try-on available</span>
            </div>
          </div>
        </div>

        {/* Interactive Discovery Body */}
        <OffersInteractiveZone
          products={safeProducts}
          pricingList={pricingList}
          coupons={publicCoupons}
          initialDiscountFilter={initialDiscountFilter}
        />
      </div>
    </div>
  )
}
