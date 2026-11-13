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
      className={`max-w-7xl mx-auto px-6 sm:px-12 py-20 ${node.className || ''}`}
      style={node.styles}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-white/10 pb-6 mb-10">
        <div>
          {p.kicker && (
            <span className="text-xs font-mono uppercase tracking-[0.25em] text-[#B91C1C] block font-bold">
              {p.kicker}
            </span>
          )}
          <h2 className="font-display text-2xl sm:text-4xl font-extrabold uppercase text-white tracking-tight mt-1">
            {p.title ? p.title.replace(/Royal/gi, 'Atelier') : 'COLLECTION 01 // AUTONOMOUS WORKS'}
          </h2>
          {p.subtitle && (
            <p className="text-xs text-[#8E8E93] font-sans mt-1">
              {p.subtitle}
            </p>
          )}
        </div>

        <Link
          href="/shop"
          className="font-mono text-xs uppercase font-bold text-neutral-300 hover:text-white flex items-center gap-1.5 transition-colors tracking-wider"
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
            className="group flex flex-col justify-between bg-[#18181A] border border-white/10 hover:border-white/30 transition-all p-5 shadow-2xl rounded-none"
          >
            <div className="relative aspect-[3/4] bg-black overflow-hidden mb-4 border border-white/5 rounded-none">
              {prod.image_url ? (
                <Image
                  src={prod.image_url}
                  alt={prod.title}
                  fill
                  className="object-cover filter contrast-110 group-hover:scale-105 transition-transform duration-700"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-500 font-mono text-2xs">
                  NO IMAGE
                </div>
              )}
              <span className="absolute top-2.5 left-2.5 px-2.5 py-1 bg-[#B91C1C] text-white text-[9px] font-mono uppercase font-bold tracking-widest rounded-none border border-red-500/30">
                TRY-ON ELIGIBLE
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-3xs font-mono uppercase text-[#8E8E93] block">
                {prod.category || 'Atelier Silhouette'}
              </span>
              <h3 className="font-sans text-base font-bold uppercase text-white group-hover:text-red-400 transition-colors truncate">
                {prod.title}
              </h3>
              <p className="text-2xs text-[#8E8E93] font-sans line-clamp-1">
                {prod.material || 'Organic Heavyweight Fiber'}
              </p>
              <div className="pt-3 border-t border-white/10 flex justify-between items-center font-mono">
                <span className="text-sm font-bold text-white tabular-nums">
                  ₹{Number(prod.price).toLocaleString('en-IN')}
                </span>
                <span
                  style={{ color: '#ffffff', backgroundColor: '#09090b' }}
                  className="btn-dark text-3xs uppercase font-bold px-3 py-1.5 rounded-none hover:bg-[#27272A] dark:group-hover:bg-white dark:group-hover:text-black transition-all border border-neutral-800 dark:border-white/10 shadow-sm"
                >
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
  const p = node.props || {}
  const rawTitle = p.title || 'Client Impressions // Doorstep Fitting Archive'
  const title = rawTitle.replace(/Royal/gi, 'Atelier').replace(/Patron/gi, 'Client')
  const subtitle = p.subtitle || 'What creators say after experiencing the 45-minute in-home salon session.'

  return (
    <section
      id={node.id}
      className={`bg-[#141517] border-t border-white/10 py-24 px-6 sm:px-12 text-white ${node.className || ''}`}
      style={node.styles}
    >
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-mono uppercase tracking-[0.25em] text-[#B91C1C] font-bold block">
            CLIENT ARCHIVE // 01 DROP PERSPECTIVES
          </span>
          <h2 className="font-display text-2xl sm:text-4xl font-extrabold uppercase text-white tracking-tight">
            {title}
          </h2>
          <p className="text-xs text-[#8E8E93] font-sans">
            {subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {DEFAULT_REVIEWS.map((rev) => (
            <div key={rev.id} className="p-8 bg-[#18181A] border border-white/10 rounded-none space-y-6 shadow-2xl hover:border-white/25 transition-all">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 font-mono text-[11px]">
                <span className="text-neutral-400 uppercase tracking-widest">[ VERIFIED ATELIER TRIAL ]</span>
                <span className="text-white font-bold tracking-wider font-mono">5.0 / 5.0</span>
              </div>
              <p className="text-sm text-neutral-300 font-sans leading-relaxed font-light">
                &ldquo;{rev.text}&rdquo;
              </p>
              <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-white uppercase tracking-wider block font-sans text-xs">{rev.author}</span>
                  <span className="text-neutral-500 text-[10px] font-mono uppercase tracking-wide">{rev.role} &bull; {rev.city}</span>
                </div>
                <span className="text-[10px] font-mono text-neutral-300 bg-white/[0.04] border border-white/15 px-3 py-1 rounded-none uppercase tracking-wider shrink-0 w-fit">
                  [ PIECE: {rev.garment.toUpperCase()} ]
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

