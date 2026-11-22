'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import type { CollectionWithRelations } from '@repo/supabase/utils'

interface ShopByOccasionProps {
  collections?: CollectionWithRelations[]
}

export function ShopByOccasion({ collections = [] }: ShopByOccasionProps) {
  const activeCollections = collections.filter((c) => c.is_active && c.show_on_home)

  if (activeCollections.length === 0) return null

  return (
    <section className="bg-white border-b border-[#e5e7eb] py-16">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 bg-[#b91c1c]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#b91c1c]">
                Curated Merchandising
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#14293a] tracking-tight">
              Shop by Occasion
            </h2>
          </div>

          <Link
            href="/shop"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#14293a] hover:text-[#b91c1c] transition-colors group"
          >
            <span>Explore All Occasions</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Occasion Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {activeCollections.map((col) => {
            const itemCount = col.product_count ?? col.product_ids?.length ?? 0

            return (
              <Link
                key={col.id}
                href={`/shop?collection=${encodeURIComponent(col.slug)}`}
                className="group flex flex-col bg-[#fbfbfb] border border-[#e5e7eb] hover:border-[#14293a] transition-all duration-300 overflow-hidden"
              >
                {/* 4:5 Portrait Photography */}
                <div className="relative aspect-[4/5] bg-[#f0f0f0] overflow-hidden">
                  {col.image_url ? (
                    <Image
                      src={col.image_url}
                      alt={col.name}
                      fill
                      unoptimized
                      className="object-cover group-hover:scale-104 transition-transform duration-500 ease-out"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-[#8a909a]">
                      No Image
                    </div>
                  )}

                  {/* Surface Badge */}
                  <span className="absolute top-3 left-3 bg-[#14293a]/90 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5">
                    {col.group_type}
                  </span>
                </div>

                {/* Card Meta Content */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-[#14293a] group-hover:text-[#b91c1c] transition-colors leading-snug line-clamp-1">
                      {col.name}
                    </h3>
                    {col.description && (
                      <p className="text-xs text-[#6c7079] mt-1 line-clamp-2 leading-relaxed">
                        {col.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 mt-3 border-t border-[#e5e7eb] flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#8a909a]">
                      {itemCount > 0 ? `${itemCount} Items` : 'Shop Collection'}
                    </span>
                    <span className="font-bold text-[#b91c1c] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      <span>Shop Now</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
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
