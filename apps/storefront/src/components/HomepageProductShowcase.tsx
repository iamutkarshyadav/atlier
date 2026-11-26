'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { Product, Category, ProductVariant } from '@repo/supabase/utils'
import type { ProductPricingSummary } from '@repo/supabase/pricing'
import { CategoryStrip, type CategoryMetric } from './CategoryStrip'
import { ProductCard } from './ProductCard'

export interface HomepageProductShowcaseProps {
  products: Product[]
  categories?: Category[]
  categoryMetrics?: Record<string, CategoryMetric>
  variantsMap?: Record<string, ProductVariant[]>
  secondaryImagesMap?: Record<string, string>
  pricingMap?: Record<string, ProductPricingSummary>
}

export function HomepageProductShowcase({
  products,
  categories,
  categoryMetrics = {},
  variantsMap = {},
  secondaryImagesMap = {},
  pricingMap = {},
}: HomepageProductShowcaseProps) {
  const displayProducts = products.slice(0, 8)

  return (
    <div className="bg-white font-sans">
      {/* 1. Shop By Category Strip */}
      <CategoryStrip categories={categories} categoryMetrics={categoryMetrics} />

      {/* 2. New Arrivals & Core Releases Showcase */}
      <section className="py-14 sm:py-16 border-t border-[#e5e7eb]">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 mb-8 border-b border-[#d3d6db]">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#b91c1c] block mb-1">
                Featured Products
              </span>
              <h2 className="font-sans text-2xl sm:text-3xl font-bold tracking-tight text-[#14293a]">
                New Arrivals &amp; Core Releases
              </h2>
              <p className="text-xs text-[#6c7079] mt-0.5">
                Free Express Delivery across India on orders above ₹1,999
              </p>
            </div>

            <Link
              href="/shop?sort=newest"
              className="text-xs font-sans font-bold uppercase tracking-wider text-[#14293a] hover:text-[#b91c1c] transition-colors flex items-center gap-1.5 self-start sm:self-auto shrink-0 group"
            >
              <span>View All New Arrivals</span>
              <ArrowRight
                className="w-3.5 h-3.5 text-[#b91c1c] group-hover:translate-x-1 transition-transform"
                strokeWidth={1.75}
              />
            </Link>
          </div>

          {/* 4-Column Responsive Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {displayProducts.map((prod, idx) => {
              const pricing = pricingMap[prod.id]
              return (
                <ProductCard
                  key={prod.id}
                  product={prod}
                  variants={variantsMap[prod.id]}
                  secondaryImage={secondaryImagesMap[prod.id]}
                  pricing={pricing}
                  mrp={pricing?.mrp}
                  sellingPrice={pricing?.sellingPrice}
                  discountPercentage={pricing?.discountPercentage}
                  bestCouponCode={pricing?.bestCoupon?.code}
                  bestCouponPrice={pricing?.bestCouponPrice}
                  priority={idx < 4}
                />
              )
            })}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/shop?sort=newest"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#14293a] text-white text-xs font-sans font-bold uppercase tracking-wider rounded-sm hover:bg-[#b91c1c] transition-colors group"
            >
              <span>Explore All New Arrivals</span>
              <ArrowRight
                className="w-4 h-4 transition-transform group-hover:translate-x-1"
                strokeWidth={1.75}
              />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
