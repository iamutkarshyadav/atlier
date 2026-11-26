'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { ProductImage } from './ui/ProductImage'

export interface SpotlightTile {
  title: string
  tag: string
  description: string
  image: string
  href: string
  ctaText: string
}

export const SPOTLIGHT_TILES: SpotlightTile[] = [
  {
    title: '480 GSM Loopback French Terry',
    tag: 'PERMANENT ARCHIVE',
    description:
      'Custom-milled organic cotton engineered with architectural dropped shoulders and double-layered hoods.',
    image:
      'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85',
    href: '/shop?category=Hoodies%20%26%20Fleece',
    ctaText: 'Shop Fleece Archive',
  },
  {
    title: '14oz Okayama Raw Selvedge Denim',
    tag: 'SHUTTLE LOOMED',
    description:
      'Woven on vintage wooden shuttle looms in Kojima, Japan. Finished with distinctive pink selvedge line ID.',
    image:
      'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1200&q=85',
    href: '/shop?category=Pants%20%26%20Denim',
    ctaText: 'Explore Denim',
  },
  {
    title: 'Weatherproof Flight Bombers',
    tag: 'ARCHIVE SPECIFICATION',
    description:
      'High-density technical nylon shell insulated with Primaloft. Strict numbered edition of 60 pieces worldwide.',
    image:
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1200&q=85',
    href: '/shop?category=Outerwear%20%26%20Jackets',
    ctaText: 'View Outerwear',
  },
]

export function CuratedSpotlightGrid() {
  return (
    <section className="bg-white py-16 sm:py-20 font-sans text-[#14293a]">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-[#b91c1c] block">
            Featured Craft
          </span>
          <h2 className="font-sans text-2xl sm:text-4xl font-bold tracking-tight text-[#14293a]">
            Curated Material Disciplines
          </h2>
          <p className="text-xs text-[#6c7079]">
            Explore our signature heavyweight fabrications and tailored garments
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          {SPOTLIGHT_TILES.map((tile) => (
            <div
              key={tile.title}
              className="group h-full flex flex-col bg-white rounded-sm overflow-hidden transition-colors duration-300 border border-neutral-200 hover:border-[#14293a]"
            >
              <div className="relative aspect-[16/10] bg-[#f5f5f4] overflow-hidden shrink-0">
                <ProductImage
                  src={tile.image}
                  alt={tile.title}
                  fill
                  className="transition-transform duration-500 ease-out group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <span className="absolute top-3 left-3 px-2.5 py-1 bg-white/95 backdrop-blur-sm text-[#14293a] text-[10px] font-sans font-bold uppercase tracking-wider rounded-sm border border-neutral-200/60">
                  {tile.tag}
                </span>
              </div>

              <div className="p-6 sm:p-7 flex flex-col flex-1 bg-white">
                <div className="space-y-2">
                  <h3 className="font-sans text-lg sm:text-xl font-bold text-[#14293a] group-hover:text-[#b91c1c] transition-colors leading-snug">
                    {tile.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#6c7079] leading-relaxed font-sans">
                    {tile.description}
                  </p>
                </div>

                <div className="mt-auto pt-5">
                  <Link
                    href={tile.href}
                    className="inline-flex items-center gap-1.5 text-xs font-sans font-bold uppercase tracking-wider text-[#14293a] group-hover:text-[#b91c1c] transition-colors"
                  >
                    <span>{tile.ctaText}</span>
                    <ArrowRight
                      className="w-3.5 h-3.5 text-[#b91c1c] transition-transform duration-200 group-hover:translate-x-1"
                      strokeWidth={1.75}
                    />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
