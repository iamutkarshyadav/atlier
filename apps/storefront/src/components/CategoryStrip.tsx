'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { DEFAULT_CATEGORIES, type Category } from '@repo/supabase/utils'
import { ProductImage } from './ui/ProductImage'

export interface CategoryMetric {
  count: number
  minPrice: number | null
}

export interface CategoryStripProps {
  categories?: Category[]
  categoryMetrics?: Record<string, CategoryMetric>
}

function toTitleCase(label: string): string {
  const minor = new Set(['&', 'and', 'of', 'in', 'for', 'the'])
  return label
    .trim()
    .split(/\s+/)
    .map((word, idx) => {
      const lower = word.toLowerCase()
      if (idx > 0 && minor.has(lower)) return lower
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(' ')
}

export function CategoryStrip({ categories, categoryMetrics = {} }: CategoryStripProps) {
  const activeCategories = (categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES)
    .filter((c) => !c.parent_id)
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))

  return (
    <section className="bg-white py-14 sm:py-16 font-sans">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8 pb-4 border-b border-[#d3d6db]">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#b91c1c] block mb-1">
              Shop by Category
            </span>
            <h2 className="font-sans text-2xl sm:text-3xl font-bold tracking-tight text-[#14293a]">
              Popular Categories
            </h2>
          </div>
          <Link
            href="/shop"
            className="text-xs font-sans font-bold uppercase tracking-wider text-[#14293a] hover:text-[#b91c1c] transition-colors flex items-center gap-1.5 group"
          >
            <span>View All Categories</span>
            <ArrowRight
              className="w-3.5 h-3.5 text-[#b91c1c] group-hover:translate-x-1 transition-transform"
              strokeWidth={1.75}
            />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {activeCategories.map((cat) => {
            const fallbackImg =
              cat.image_url ||
              'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80'
            const metric = categoryMetrics[cat.id]
            const pillLabel =
              metric && metric.count > 0
                ? `${metric.count} ${metric.count === 1 ? 'Piece' : 'Pieces'}`
                : metric?.minPrice
                  ? `From ₹${Math.round(metric.minPrice).toLocaleString('en-IN')}`
                  : null

            return (
              <Link
                key={cat.id}
                href={`/shop?category=${encodeURIComponent(cat.slug || cat.name)}`}
                className="group relative flex flex-col aspect-[3/4] sm:aspect-[4/5] bg-neutral-100 rounded-sm overflow-hidden border border-neutral-200 hover:border-[#14293a] transition-colors duration-300"
              >
                <ProductImage
                  src={fallbackImg}
                  alt={cat.name}
                  fill
                  className="transition-transform duration-500 ease-out group-hover:scale-105"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent transition-opacity duration-300" />

                {pillLabel && (
                  <div className="absolute top-3 left-3 z-10">
                    <span className="px-2.5 py-1 bg-white/90 backdrop-blur-sm text-[#14293a] text-[10px] font-sans font-bold uppercase tracking-wider rounded-sm border border-white/60">
                      {pillLabel}
                    </span>
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 z-10 flex flex-col justify-end space-y-1.5 text-white">
                  <h3 className="font-sans text-base sm:text-lg font-bold tracking-tight text-white leading-tight truncate">
                    {toTitleCase(cat.name)}
                  </h3>

                  <div className="pt-1 flex items-center gap-1.5 text-[11px] font-sans font-bold uppercase tracking-wider text-white/90">
                    <span>Explore Edit</span>
                    <ArrowRight
                      className="w-3.5 h-3.5 text-[#fca5a5] transition-transform duration-200 group-hover:translate-x-1"
                      strokeWidth={1.75}
                    />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
