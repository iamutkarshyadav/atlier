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
  const bgImg = p.bgImageUrl || 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=2000&q=85'
  const overlayOpacity = p.overlayOpacity !== undefined ? p.overlayOpacity : 0.4

  return (
    <section
      id={node.id}
      className={`relative min-h-[92vh] flex items-center justify-center bg-[#080808] text-white px-6 sm:px-12 py-20 overflow-hidden ${node.className || ''}`}
      style={node.styles}
    >
      {/* Background Image */}
      {bgImg && (
        <div
          className="absolute inset-0 mix-blend-luminosity scale-105 transition-transform duration-1000 ease-out"
          style={{ opacity: overlayOpacity }}
        >
          <Image
            src={bgImg}
            alt={p.titleLine1 || 'Hero Background'}
            fill
            priority
            className="object-cover object-center filter grayscale contrast-125 brightness-90"
          />
        </div>
      )}

      {/* Gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-transparent to-[#080808]/70" />

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto text-center space-y-8">
        {p.pillText && (
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-mono uppercase tracking-[0.25em] backdrop-blur-md">
            <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400 animate-pulse" />
            <span>{p.pillText}</span>
          </div>
        )}

        <div className="space-y-4">
          {p.kicker && (
            <span className="text-2xs sm:text-xs font-mono tracking-[0.3em] uppercase text-neutral-400 block font-medium">
              {p.kicker}
            </span>
          )}

          <h1 className="font-serif text-5xl sm:text-7xl md:text-8xl font-light tracking-tight leading-[0.95]">
            <span className="block font-normal">{p.titleLine1 || 'ARCHITECTURAL'}</span>
            <span className="italic font-light text-neutral-300 block">{p.titleLine2 || 'SILHOUETTES'}</span>
          </h1>

          {p.description && (
            <p className="max-w-2xl mx-auto text-sm sm:text-base text-neutral-300 font-sans font-light leading-relaxed pt-2">
              {p.description}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 font-mono text-xs uppercase tracking-wider">
          {p.primaryCtaLabel && (
            <Link
              href={p.primaryCtaLink || '/shop'}
              className="w-full sm:w-auto px-8 py-4 bg-amber-400 text-black font-semibold hover:bg-amber-300 transition-colors flex items-center justify-center gap-2 group shadow-xl"
            >
              <span>{p.primaryCtaLabel}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}

          {p.secondaryCtaLabel && (
            <Link
              href={p.secondaryCtaLink || '/about'}
              className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/20 text-white transition-colors flex items-center justify-center gap-2"
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
    'Bolt ⚡ 45-Minute Doorstep Fitting Session',
    'Zero Synthetic Polyester Blending',
  ]
  const speed = p.speedSeconds || 25

  return (
    <div
      id={node.id}
      className={`bg-[#1A1B1D] text-white border-y border-white/10 py-3.5 overflow-hidden select-none font-mono text-2xs uppercase tracking-widest ${node.className || ''}`}
      style={node.styles}
    >
      <div className="flex whitespace-nowrap gap-12 animate-marquee" style={{ animationDuration: `${speed}s` }}>
        {[...items, ...items, ...items].map((text, idx) => (
          <div key={idx} className="flex items-center gap-4 shrink-0">
            <span className="text-[#B91C1C] text-[10px]">♦</span>
            <span className="text-neutral-300">{text}</span>
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
      className={`max-w-7xl mx-auto px-6 sm:px-12 py-24 ${node.className || ''}`}
      style={node.styles}
    >
      <div className={`grid grid-cols-1 lg:grid-cols-12 gap-12 items-center ${isImageRight ? '' : 'lg:flex-row-reverse'}`}>
        <div className={`lg:col-span-6 space-y-6 ${isImageRight ? 'lg:order-1' : 'lg:order-2'}`}>
          {p.kicker && (
            <span className="text-xs font-mono tracking-widest text-[#B91C1C] uppercase block font-bold">
              {p.kicker}
            </span>
          )}
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold uppercase text-neutral-950 dark:text-white leading-tight tracking-tight">
            {p.headline || 'The Atelier Specification'}
          </h2>
          {p.bodyParagraph1 && (
            <p className="text-sm text-[#8E8E93] font-sans leading-relaxed">
              {p.bodyParagraph1}
            </p>
          )}
          {p.bodyParagraph2 && (
            <p className="text-sm text-[#8E8E93] font-sans leading-relaxed">
              {p.bodyParagraph2}
            </p>
          )}
          {p.ctaLabel && (
            <div className="pt-3">
              <Link
                href={p.ctaLink || '/about'}
                style={{ color: '#ffffff', backgroundColor: '#09090b' }}
                className="btn-dark inline-flex items-center gap-2 rounded-none px-8 py-3.5 hover:bg-[#27272A] dark:hover:bg-white dark:hover:text-black font-mono text-xs uppercase tracking-widest font-bold border border-neutral-800 dark:border-white/15 transition-all shadow-md cursor-pointer"
              >
                <span style={{ color: '#ffffff' }}>{p.ctaLabel}</span>
                <ArrowRight style={{ color: '#ffffff' }} className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        <div className={`lg:col-span-6 relative aspect-[4/5] bg-[#262629] overflow-hidden border border-white/10 shadow-2xl rounded-none ${isImageRight ? 'lg:order-2' : 'lg:order-1'}`}>
          {p.imageUrl && (
            <Image
              src={p.imageUrl}
              alt={p.headline || 'Editorial piece'}
              fill
              className="object-cover filter contrast-110 brightness-95"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          )}
        </div>
      </div>
    </section>
  )
}

// ==========================================
// 4. PRODUCT GRID
// ==========================================
export function ProductGridBlock({ node, context }: BaseComponentProps) {
  const p = node.props || {}
  const prods = (context?.products && context.products.length > 0) ? context.products : []
  const limit = p.limit || 6
  const displayProducts = prods.slice(0, limit)
  const columns = p.columns || 3

  const gridColsClass =
    columns === 4
      ? 'sm:grid-cols-2 lg:grid-cols-4'
      : columns === 2
      ? 'sm:grid-cols-2'
      : 'sm:grid-cols-2 lg:grid-cols-3'

  return (
    <section
      id={node.id}
      className={`max-w-7xl mx-auto px-6 sm:px-12 py-20 text-[#09090B] ${node.className || ''}`}
      style={node.styles}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-[#E5E0D8] pb-6 mb-10">
        <div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-[#09090B] font-sans">
            SELECTED <span className="text-[#B91C1C]">WORKS</span>
          </h2>
        </div>

        <Link
          href="/shop"
          className="font-mono text-xs uppercase font-bold text-[#09090B] hover:text-[#B91C1C] flex items-center gap-1.5 transition-colors tracking-wider"
        >
          <span>View All Works</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#B91C1C]" />
        </Link>
      </div>

      <div className={`grid grid-cols-1 ${gridColsClass} gap-8`}>
        {displayProducts.map((prod) => (
          <Link
            key={prod.id}
            href={`/product/${prod.id}`}
            className="group flex flex-col justify-between bg-[#FAF8F2] border border-[#E5E0D8] hover:border-[#09090B] transition-all p-5 shadow-sm hover:shadow-[0_12px_32px_rgba(0,0,0,0.06)] rounded-none"
          >
            <div className="relative aspect-[3/4] bg-[#F4F1EA] overflow-hidden mb-4 border border-[#E5E0D8] rounded-none">
              {prod.image_url ? (
                <Image
                  src={prod.image_url}
                  alt={prod.title}
                  fill
                  className="object-cover filter contrast-105 group-hover:scale-105 transition-transform duration-700"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-500 font-mono text-2xs">
                  NO IMAGE
                </div>
              )}
              <span className="absolute top-2.5 left-2.5 px-2.5 py-1 bg-[#FDF2F2] text-[#B91C1C] text-[10px] font-mono uppercase font-bold tracking-widest rounded-none border border-[#FCA5A5]/50">
                TRY-ON ELIGIBLE
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase text-[#71717A] tracking-wider block">
                {prod.category || 'Atelier Silhouette'}
              </span>
              <h3 className="font-sans text-base font-bold uppercase text-[#09090B] group-hover:text-[#B91C1C] transition-colors truncate">
                {prod.title}
              </h3>
              <p className="text-xs text-[#71717A] font-sans line-clamp-1">
                {prod.material || 'Organic Heavyweight Fiber'}
              </p>
              <div className="pt-3 border-t border-[#E5E0D8] flex justify-between items-center font-mono">
                <span className="text-base font-bold text-[#09090B] tabular-nums">
                  ₹{Number(prod.price).toLocaleString('en-IN')}
                </span>
                <span className="bg-[#09090B] text-white hover:bg-[#1A1A1A] hover:shadow-[0_4px_24px_rgba(185,28,28,0.35)] text-xs uppercase font-bold px-4 py-2 font-mono transition-all rounded-none cursor-pointer">
                  Book Fitting &rarr;
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
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
    text: 'The drape of the Raw Linen Smock is extraordinary. Zero synthetic polyester blending makes a massive difference in structure. The ₹99 doorstep fitting was flawless.',
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
  const sanitizedClassName = (node.className || '')
    .replace(/bg-\[#141517\]/g, '')
    .replace(/bg-neutral-900/g, '')
    .replace(/text-white/g, '')
    .trim()

  return (
    <section
      id={node.id}
      className={`bg-[#FDFCF7] border-t border-[#E5E0D8] py-20 sm:py-28 px-6 sm:px-12 text-[#09090B] ${sanitizedClassName}`}
      style={node.styles}
    >
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-[#09090B] font-sans mb-12 sm:mb-16">
          USER <span className="text-[#B91C1C]">REVIEWS</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-14">
          {DEFAULT_REVIEWS.map((rev) => (
            <div
              key={rev.id}
              className="border-t border-[#E5E0D8] pt-6 flex flex-col justify-between space-y-6"
            >
              <p className="text-sm sm:text-base text-[#18181B] font-sans font-light leading-relaxed">
                &ldquo;{rev.text}&rdquo;
              </p>
              <div className="pt-2">
                <span className="font-bold text-xs uppercase tracking-wide text-[#09090B] block">
                  {rev.author} <span className="text-[#71717A] font-normal">&bull; {rev.city}</span>
                </span>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#B91C1C] block mt-1">
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
      className={`py-8 px-6 text-center ${node.className || ''}`}
      style={node.styles}
    >
      {p.kicker && <span className="text-2xs font-mono uppercase text-neutral-500 tracking-widest block mb-1">{p.kicker}</span>}
      {p.title && <h3 className="font-serif text-2xl font-normal text-neutral-900">{p.title}</h3>}
      {p.text && <p className="text-xs text-neutral-600 font-sans max-w-xl mx-auto mt-1">{p.text}</p>}
    </div>
  )
}

export function ContainerBlock({ node, context }: BaseComponentProps) {
  return (
    <div id={node.id} className={node.className || 'max-w-7xl mx-auto px-6'} style={node.styles}>
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
  CategoryCarousel: ProductGridBlock, // Fallback to ProductGrid for carousel
  ReviewsShowcase: ReviewsShowcaseBlock,
  CustomDivBlock: CustomDivBlockComponent,
  Spacer: SpacerBlock,
  TextBanner: TextBannerBlock,
  Container: ContainerBlock,
}

