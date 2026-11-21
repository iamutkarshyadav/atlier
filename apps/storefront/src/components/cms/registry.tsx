'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Zap,
  ArrowRight,
  Clock,
  ShieldCheck,
  Check,
  Star,
  Sparkles,
  Layers,
  ShoppingBag,
  ExternalLink,
} from 'lucide-react'
import type { LayoutNode, Product, ComponentType } from '@repo/supabase/utils'
import { ProductCard } from '../ProductCard'
import { CategoryStrip } from '../CategoryStrip'

export interface ComponentRenderContext {
  products?: Product[]
}

export interface BaseComponentProps {
  node: LayoutNode
  context?: ComponentRenderContext
  children?: React.ReactNode
}

// ==========================================
// 1. HERO BANNER
// ==========================================
export function HeroBannerBlock({ node }: BaseComponentProps) {
  const p = node.props || {}
  const bgImg = p.bgImageUrl || 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=2000&q=85'

  return (
    <section
      id={node.id}
      className={`relative min-h-[480px] sm:min-h-[580px] flex items-center justify-center bg-[#f8f8f8] text-[#14293a] px-4 sm:px-8 py-16 overflow-hidden ${node.className || ''}`}
      style={node.styles}
    >
      {/* Background Image with soft contrast */}
      {bgImg && (
        <div className="absolute inset-0">
          <Image
            src={bgImg}
            alt={p.titleLine1 || 'Hero Banner'}
            fill
            priority
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-black/45" />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 max-w-[1320px] mx-auto text-center space-y-6 text-white px-4">
        {p.pillText && (
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-sans font-bold uppercase tracking-wider rounded-sm">
            <Zap className="w-3.5 h-3.5 fill-[#b91c1c] text-[#b91c1c]" />
            <span>{p.pillText}</span>
          </div>
        )}

        <div className="space-y-3">
          {p.kicker && (
            <span className="text-xs font-sans tracking-[0.2em] uppercase text-neutral-200 block font-bold">
              {p.kicker}
            </span>
          )}

          <h2 className="font-sans text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-tight">
            <span>{p.titleLine1 || 'ARCHITECTURAL SILHOUETTES'}</span>{' '}
            {p.titleLine2 && <span className="block font-normal">{p.titleLine2}</span>}
          </h2>

          {p.description && (
            <p className="max-w-2xl mx-auto text-xs sm:text-sm text-neutral-200 font-sans leading-relaxed">
              {p.description}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3 text-xs font-sans uppercase font-bold tracking-wider">
          {p.primaryCtaLabel && (
            <Link
              href={p.primaryCtaLink || '/shop'}
              className="w-full sm:w-auto px-6 py-3 bg-[#b91c1c] text-white hover:bg-[#991b1b] transition-colors flex items-center justify-center gap-2 rounded-sm shadow"
            >
              <span>{p.primaryCtaLabel}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}

          {p.secondaryCtaLabel && (
            <Link
              href={p.secondaryCtaLink || '/about'}
              className="w-full sm:w-auto px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/40 text-white transition-colors flex items-center justify-center gap-2 rounded-sm backdrop-blur-sm"
            >
              <span>{p.secondaryCtaLabel}</span>
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}

// ==========================================
// 2. MARQUEE TICKER
// ==========================================
export function MarqueeTickerBlock({ node }: BaseComponentProps) {
  const p = node.props || {}
  const items: string[] = p.items || [
    '480 GSM French Terry Loopback',
    '14oz Japanese Shuttle-Loomed Selvedge Denim',
    'Bolt 45-Minute Doorstep Fitting Session',
    'Zero Synthetic Polyester Blending',
    'Free Shipping Across India Over ₹1,999',
  ]
  const speed = p.speedSeconds || 25

  return (
    <div
      id={node.id}
      className={`bg-[#f8f8f8] text-[#14293a] border-y border-[#d3d6db] py-3 overflow-hidden select-none font-sans text-xs tracking-wider uppercase font-semibold ${node.className || ''}`}
      style={node.styles}
    >
      <div className="flex whitespace-nowrap gap-10 animate-marquee" style={{ animationDuration: `${speed}s` }}>
        {[...items, ...items, ...items].map((text, idx) => (
          <div key={idx} className="flex items-center gap-3 shrink-0">
            <span className="text-[#b91c1c] text-xs">◆</span>
            <span className="text-[#14293a]">{text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ==========================================
// 3. EDITORIAL SPLIT
// ==========================================
export function EditorialSplitBlock({ node }: BaseComponentProps) {
  const p = node.props || {}
  const isImageRight = p.imagePosition !== 'left'

  return (
    <section
      id={node.id}
      className={`max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 font-sans ${node.className || ''}`}
      style={node.styles}
    >
      <div className={`grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center ${isImageRight ? '' : 'lg:flex-row-reverse'}`}>
        <div className={`lg:col-span-6 space-y-4 ${isImageRight ? 'lg:order-1' : 'lg:order-2'}`}>
          {p.kicker && (
            <span className="text-xs font-sans tracking-widest text-[#b91c1c] uppercase block font-bold">
              {p.kicker}
            </span>
          )}
          <h2 className="font-sans text-xl sm:text-2xl font-bold uppercase text-[#14293a] leading-tight tracking-tight">
            {p.headline || 'The Atelier Specification'}
          </h2>
          {p.bodyParagraph1 && (
            <p className="text-xs sm:text-sm text-[#6c7079] font-sans leading-relaxed">
              {p.bodyParagraph1}
            </p>
          )}
          {p.bodyParagraph2 && (
            <p className="text-xs sm:text-sm text-[#6c7079] font-sans leading-relaxed">
              {p.bodyParagraph2}
            </p>
          )}
          {p.ctaLabel && (
            <div className="pt-2">
              <Link
                href={p.ctaLink || '/about'}
                className="inline-flex items-center gap-2 rounded-sm px-6 py-3 bg-[#14293a] text-white hover:bg-[#b91c1c] text-xs font-sans uppercase tracking-wider font-bold transition-all shadow-sm"
              >
                <span>{p.ctaLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        <div className={`lg:col-span-6 relative aspect-[4/5] bg-[#e5e7eb] overflow-hidden border border-[#d3d6db] shadow-md rounded-sm ${isImageRight ? 'lg:order-2' : 'lg:order-1'}`}>
          {p.imageUrl && (
            <Image
              src={p.imageUrl}
              alt={p.headline || 'Editorial piece'}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          )}
        </div>
      </div>
    </section>
  )
}

// ==========================================
// 4. PRODUCT GRID (Fabindia 4-Column PLP / Showcase Pattern)
// ==========================================
export function ProductGridBlock({ node, context }: BaseComponentProps) {
  const p = node.props || {}
  const prods = (context?.products && context.products.length > 0) ? context.products : []
  const limit = p.limit || 8
  const displayProducts = prods.slice(0, limit)

  return (
    <section
      id={node.id}
      className={`max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-16 text-[#14293a] font-sans ${node.className || ''}`}
      style={node.styles}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 border-b border-[#d3d6db] pb-4 mb-8">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#b91c1c] block mb-1">
            {p.kicker || 'CURATED CATALOG'}
          </span>
          <h2 className="text-xl sm:text-2xl font-sans font-bold tracking-tight text-[#14293a]">
            {p.title || 'NEW ARRIVALS & RELEASES'}
          </h2>
        </div>

        <Link
          href="/shop"
          className="text-xs font-sans uppercase font-bold text-[#14293a] hover:text-[#b91c1c] flex items-center gap-1.5 transition-colors tracking-wider"
        >
          <span>View All Products</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#b91c1c]" />
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {displayProducts.map((prod, idx) => (
          <ProductCard
            key={prod.id}
            product={prod}
            priority={idx < 4}
          />
        ))}
      </div>
    </section>
  )
}

// ==========================================
// 4b. CATEGORY CAROUSEL / STRIP
// ==========================================
export function CategoryCarouselBlock({ node }: BaseComponentProps) {
  return (
    <div id={node.id} className={node.className} style={node.styles}>
      <CategoryStrip />
    </div>
  )
}

// ==========================================
// 5. CUSTOM DIV / HTML BLOCK
// ==========================================
export function CustomDivBlockComponent({ node }: BaseComponentProps) {
  const p = node.props || {}
  const htmlContent = p.htmlContent || ''

  return (
    <div
      id={node.id}
      className={node.className || ''}
      style={node.styles}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  )
}

// ==========================================
// 6. REVIEWS SHOWCASE
// ==========================================
const DEFAULT_REVIEWS = [
  {
    id: 'rev-1',
    author: 'Vikram Malhotra',
    role: 'Creative Director',
    city: 'Bengaluru',
    rating: 5,
    text: 'I ordered the 480 GSM French Terry Hoodie and two sizes of selvedge denim. The courier arrived right on time during the 10 AM slot. Trying both sizes at home changed apparel shopping forever.',
    garment: 'Heavyweight Boxy Hoodie',
  },
  {
    id: 'rev-2',
    author: 'Ananya Deshmukh',
    role: 'Editorial Stylist',
    city: 'Mumbai',
    rating: 5,
    text: 'The drape of the Raw Linen Smock is extraordinary. Zero synthetic blending makes a massive difference in structure. The ₹99 doorstep fitting was flawless.',
    garment: 'Architectural Raw Linen Smock',
  },
  {
    id: 'rev-3',
    author: 'Kabir Sen',
    role: 'Industrial Designer',
    city: 'New Delhi',
    rating: 5,
    text: 'You cannot understand 480 GSM loopback cotton until you wear it. Kept the hoodie and track pants, handed back the oversized jacket. Settled via UPI at the door.',
    garment: 'Flared Minimalist Track Pant',
  },
]

export function ReviewsShowcaseBlock({ node }: BaseComponentProps) {
  return (
    <section
      id={node.id}
      className={`bg-[#f8f8f8] border-t border-[#d3d6db] py-16 sm:py-20 px-4 sm:px-6 lg:px-8 text-[#14293a] font-sans ${node.className || ''}`}
      style={node.styles}
    >
      <div className="max-w-[1320px] mx-auto">
        <div className="text-center mb-10 space-y-1">
          <span className="text-xs font-bold uppercase tracking-widest text-[#b91c1c] block">
            PATRON TESTIMONIALS
          </span>
          <h2 className="text-xl sm:text-2xl font-sans font-bold tracking-tight text-[#14293a]">
            VERIFIED DOORSTEP REVIEWS
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {DEFAULT_REVIEWS.map((rev) => (
            <div
              key={rev.id}
              className="bg-white border border-[#e5e7eb] hover:border-[#14293a] p-6 sm:p-8 rounded-sm shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between space-y-6"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-amber-500">
                    {[...Array(rev.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-500 text-amber-500" />
                    ))}
                  </div>
                  <span className="text-[11px] font-sans font-semibold text-[#065f46] flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Verified Doorstep Order</span>
                  </span>
                </div>

                <p className="text-sm sm:text-[15px] text-[#14293a] font-sans leading-relaxed">
                  &ldquo;{rev.text}&rdquo;
                </p>
              </div>

              <div className="pt-4 border-t border-[#e5e7eb] flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#14293a] text-white flex items-center justify-center font-sans font-bold text-xs uppercase tracking-wider shrink-0">
                    {rev.author.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <span className="font-bold text-xs sm:text-sm uppercase tracking-wide text-[#14293a] block">
                      {rev.author}
                    </span>
                    <span className="text-[11px] text-[#6c7079] font-sans">
                      {rev.city}
                    </span>
                  </div>
                </div>

                <span className="text-[11px] font-sans font-medium text-[#14293a] bg-[#f8f8f8] border border-[#d3d6db] px-2.5 py-1 rounded-sm">
                  {rev.garment}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ==========================================
// 7. SPACER / CONTAINER / TEXT BANNER BLOCKS
// ==========================================
export function SpacerBlock({ node }: BaseComponentProps) {
  const height = node.props?.heightPx || 48
  return <div id={node.id} style={{ height: `${height}px`, ...node.styles }} className={node.className} />
}

export function TextBannerBlock({ node }: BaseComponentProps) {
  const p = node.props || {}
  return (
    <div
      id={node.id}
      className={`py-8 px-6 text-center max-w-[1320px] mx-auto ${node.className || ''}`}
      style={node.styles}
    >
      {p.kicker && <span className="text-xs font-sans uppercase text-[#b91c1c] font-bold tracking-widest block mb-1">{p.kicker}</span>}
      {p.title && <h3 className="font-sans text-xl font-bold text-[#14293a]">{p.title}</h3>}
      {p.text && <p className="text-xs text-[#6c7079] font-sans max-w-xl mx-auto mt-1 leading-relaxed">{p.text}</p>}
    </div>
  )
}

export function ContainerBlock({ node, context }: BaseComponentProps) {
  return (
    <div id={node.id} className={node.className || 'max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8'} style={node.styles}>
      {node.children?.map((child) => {
        const ChildComponent = COMPONENT_REGISTRY[child.type]
        if (!ChildComponent || child.isVisible === false) return null
        return <ChildComponent key={child.id} node={child} context={context} />
      })}
    </div>
  )
}

// ==========================================
// COMPONENT REGISTRY DICTIONARY
// ==========================================
export const COMPONENT_REGISTRY: Record<
  ComponentType,
  React.ComponentType<BaseComponentProps>
> = {
  HeroBanner: HeroBannerBlock,
  MarqueeTicker: MarqueeTickerBlock,
  EditorialSplit: EditorialSplitBlock,
  ProductGrid: ProductGridBlock,
  CategoryCarousel: CategoryCarouselBlock,
  ReviewsShowcase: ReviewsShowcaseBlock,
  CustomDivBlock: CustomDivBlockComponent,
  Spacer: SpacerBlock,
  TextBanner: TextBannerBlock,
  Container: ContainerBlock,
}
