'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { createBrowserClient } from '@repo/supabase/browser'
import { getCollections, type CollectionWithRelations } from '@repo/supabase/utils'
import { ProductImage } from './ui/ProductImage'

interface ShopByOccasionProps {
  collections?: CollectionWithRelations[]
}

export function ShopByOccasion({ collections: initialCollections = [] }: ShopByOccasionProps) {
  const [collections, setCollections] = useState<CollectionWithRelations[]>(initialCollections)

  useEffect(() => {
    setCollections(initialCollections)
  }, [initialCollections])

  useEffect(() => {
    const supabase = createBrowserClient()
    const fetchOccasions = async () => {
      try {
        const res = await fetch('/api/collections?showOnHome=true', { cache: 'no-store' })
        const json = await res.json()
        if (json.success && Array.isArray(json.collections)) {
          setCollections(json.collections)
          return
        }
      } catch {}
      try {
        const cols = await getCollections(supabase, { showOnHome: true, onlyActive: true })
        if (Array.isArray(cols)) {
          setCollections(cols)
        }
      } catch {}
    }

    const channel = supabase
      .channel('home_occasions_realtime_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collections' }, () => {
        fetchOccasions()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'storefront_config' }, () => {
        fetchOccasions()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const activeCollections = collections.filter((c) => c.is_active && c.show_on_home)

  if (activeCollections.length === 0) return null

  return (
    <section className="bg-white border-b border-[#e5e7eb] py-16 font-sans">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pb-4 border-b border-[#d3d6db]">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#b91c1c] block mb-1">
              Curated Edits
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#14293a] tracking-tight">
              Shop by Occasion
            </h2>
          </div>

          <Link
            href="/shop"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#14293a] hover:text-[#b91c1c] transition-colors group"
          >
            <span>Explore All Occasions</span>
            <ArrowRight
              className="w-3.5 h-3.5 text-[#b91c1c] group-hover:translate-x-1 transition-transform"
              strokeWidth={1.75}
            />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {activeCollections.map((col) => {
            const itemCount = col.product_count ?? col.product_ids?.length ?? 0

            return (
              <Link
                key={col.id}
                href={`/shop?collection=${encodeURIComponent(col.slug)}`}
                className="group flex flex-col bg-white border border-[#e5e7eb] hover:border-[#14293a] rounded-sm transition-colors duration-300 overflow-hidden"
              >
                {/* 3:4 Portrait Photography */}
                <div className="relative aspect-[3/4] bg-[#f5f5f4] overflow-hidden">
                  <ProductImage
                    src={col.image_url}
                    alt={col.name}
                    fill
                    unoptimized
                    className="group-hover:scale-105 transition-transform duration-500 ease-out"
                  />

                  {itemCount > 0 && (
                    <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-[#14293a] text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-sm border border-white/60">
                      {itemCount} {itemCount === 1 ? 'Piece' : 'Pieces'}
                    </span>
                  )}
                </div>

                {/* Single Clean Bottom Cue */}
                <div className="p-4 flex items-center justify-between gap-2 bg-white border-t border-[#e5e7eb]">
                  <h3 className="text-sm font-bold text-[#14293a] group-hover:text-[#b91c1c] transition-colors truncate">
                    {col.name}
                  </h3>
                  <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-[#b91c1c] shrink-0">
                    <span>Explore Edit</span>
                    <ArrowRight
                      className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1"
                      strokeWidth={1.75}
                    />
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
