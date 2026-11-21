'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { Product, Category } from '@repo/supabase/utils'
import { CategoryStrip } from './CategoryStrip'
import { ProductCard } from './ProductCard'

export interface HomepageProductShowcaseProps {
  products: Product[]
  categories?: Category[]
}

export function HomepageProductShowcase({ products, categories }: HomepageProductShowcaseProps) {
  const displayProducts = products.slice(0, 8)

  return (
    <div className="bg-white font-sans">
      {/* 1. Shop By Category Strip */}
      <CategoryStrip categories={categories} />

      {/* 2. New Arrivals & Core Releases Showcase */}
      <section className="py-14 sm:py-16 border-t border-[#e5e7eb]">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Row matching reference styling */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 mb-8 border-b border-[#d3d6db]">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#b91c1c] block mb-1">
                FEATURED PRODUCTS
              </span>
              <h2 className="font-sans text-2xl sm:text-3xl font-bold tracking-tight text-[#14293a]">
                New Arrivals & Core Releases
              </h2>
              <p className="text-xs text-[#6c7079] mt-0.5">
                Complimentary express delivery across India on orders over ₹1,999
              </p>
            </div>

            <Link
              href="/shop?sort=newest"
              className="text-xs font-sans font-bold uppercase tracking-wider text-[#14293a] hover:text-[#b91c1c] transition-colors flex items-center gap-1.5 self-start sm:self-auto shrink-0"
            >
              <span>View All New Arrivals</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#b91c1c]" />
            </Link>
          </div>

          {/* 4-Column Responsive Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {displayProducts.map((prod, idx) => (
              <ProductCard
                key={prod.id}
                product={prod}
                priority={idx < 4}
                showTryOnBadge={false}
              />
            ))}
          </div>

          {/* Bottom Explore Button */}
          <div className="mt-12 text-center">
            <Link
              href="/shop?sort=newest"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#14293a] text-white text-xs font-sans font-bold uppercase tracking-wider rounded-sm hover:bg-[#b91c1c] transition-all shadow-sm group"
            >
              <span>Explore All New Arrivals</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
