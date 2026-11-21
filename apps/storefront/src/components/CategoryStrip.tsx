'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { DEFAULT_CATEGORIES, type Category } from '@repo/supabase/utils'

export interface CategoryStripProps {
  categories?: Category[]
}

export function CategoryStrip({ categories }: CategoryStripProps) {
  const activeCategories = (categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES)
    .filter((c) => !c.parent_id)
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))

  return (
    <section className="bg-white py-14 sm:py-16 font-sans">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8 pb-4 border-b border-[#d3d6db]">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#b91c1c] block mb-1">
              SHOP BY CATEGORY
            </span>
            <h2 className="font-sans text-2xl sm:text-3xl font-bold tracking-tight text-[#14293a]">
              Popular Categories
            </h2>
          </div>
          <Link
            href="/shop"
            className="text-xs font-sans font-bold uppercase tracking-wider text-[#14293a] hover:text-[#b91c1c] transition-colors flex items-center gap-1.5"
          >
            <span>View All Categories</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#b91c1c]" />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {activeCategories.map((cat) => {
            const fallbackImg =
              cat.image_url ||
              'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80'

            return (
              <Link
                key={cat.id}
                href={`/shop?category=${encodeURIComponent(cat.slug || cat.name)}`}
                className="group relative flex flex-col aspect-[3/4] sm:aspect-[4/5] bg-neutral-100 rounded-xs overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300"
              >
                {/* Full Bleed Image with Zoom */}
                <Image
                  src={fallbackImg}
                  alt={cat.name}
                  fill
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-108"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
                />

                {/* Gradient Scrim */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent transition-opacity duration-300 group-hover:from-black/90" />

                {/* Top Tag Pill */}
                <div className="absolute top-3 left-3 z-10">
                  <span className="px-2.5 py-1 bg-white/90 backdrop-blur-md text-[#14293a] text-[10px] font-sans font-bold uppercase tracking-wider rounded-full shadow-xs border border-white/60">
                    Category
                  </span>
                </div>

                {/* Bottom Content Box */}
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 z-10 flex flex-col justify-end space-y-1.5 text-white">
                  <h3 className="font-sans text-base sm:text-lg md:text-xl font-bold tracking-tight text-white group-hover:text-[#fca5a5] transition-colors leading-tight">
                    {cat.name}
                  </h3>
                  {cat.description && (
                    <p className="text-[11px] sm:text-xs text-neutral-300 line-clamp-1 font-sans">
                      {cat.description}
                    </p>
                  )}

                  {/* Animated Pill CTA */}
                  <div className="pt-2 flex items-center gap-1 text-[11px] font-sans font-bold uppercase tracking-wider text-white group-hover:translate-x-1 transition-transform duration-200">
                    <span>Shop Collection</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#fca5a5]" />
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
