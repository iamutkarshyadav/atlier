import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight,
  Sparkles,
  Scissors,
  Layers,
  ShieldCheck,
  Check,
} from 'lucide-react'
import { Button } from '@repo/ui'
import { createServerSupabaseClient } from '@repo/supabase/server'
import {
  getStorefrontConfig,
  getPromotionalBanners,
  getStorefrontProducts,
  getProductVariants,
  getCategories,
  DEFAULT_HERO_CONFIG,
  DEFAULT_ETHOS_CONFIG,
  type Product,
  type ProductVariant,
} from '@repo/supabase/utils'

export const revalidate = 60 // On-demand ISR revalidation

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createServerSupabaseClient()
  const config = await getStorefrontConfig(supabase)
  const hero = config.hero || DEFAULT_HERO_CONFIG

  return {
    title: `${hero.headline} ${hero.headlineItalic || ''} | Creator Apparel`,
    description: hero.description,
    openGraph: {
      title: `${hero.headline} — Creator Apparel Drop 01`,
      description: hero.description,
      type: 'website',
    },
  }
}

export default async function CreatorClothingStorefrontPage({
  searchParams,
}: {
  searchParams?: { category?: string }
}) {
  const supabase = await createServerSupabaseClient()
  const selectedCategory = searchParams?.category || 'all'

  // Fetch CMS config, promotional banners, apparel catalog, and categories in parallel
  const [cmsConfig, activeBanners, products, categories] = await Promise.all([
    getStorefrontConfig(supabase),
    getPromotionalBanners(supabase, true),
    getStorefrontProducts(supabase, selectedCategory),
    getCategories(supabase),
  ])

  const hero = cmsConfig.hero || DEFAULT_HERO_CONFIG
  const ethos = cmsConfig.ethos || DEFAULT_ETHOS_CONFIG

  // Resolve Hero Featured Garment: Either bound in CMS or default to first product
  const heroProduct =
    (hero.featuredProductId
      ? products.find((p) => p.id === hero.featuredProductId)
      : null) || (products.length > 0 ? products[0]! : null)

  // Fetch variant sizes for each product to display live size chips
  const productVariantsMap: Record<string, ProductVariant[]> = {}
  await Promise.all(
    products.slice(0, 9).map(async (p) => {
      const vars = await getProductVariants(supabase, p.id)
      productVariantsMap[p.id] = vars
    })
  )

  // Dynamic Category Navigation Tabs from Database
  const categoryTabs = [
    { label: 'ALL SILHOUETTES', slug: 'all' },
    ...categories.map((c) => ({
      label: c.name.toUpperCase(),
      slug: c.slug,
    })),
  ]

  // Primary active promotional banner from dynamic CMS
  const primaryBanner = activeBanners.length > 0 ? activeBanners[0]! : null

  return (
    <div className="w-full flex flex-col">
      {/* ========================================================= */}
      {/* 1. DYNAMIC EDITORIAL HERO SECTION */}
      {/* ========================================================= */}
      <section className="relative px-4 sm:px-8 lg:px-12 py-8 lg:py-12 max-w-7xl mx-auto w-full min-h-[calc(100vh-5rem)] flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center w-full">
          {/* Left Column: Dynamic Headline, Story & Primary Actions */}
          <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase tracking-[0.25em] text-neutral-400 font-mono font-semibold">
                {hero.kicker || 'COLLECTION 01'}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#166534]" />
              <span className="text-xs uppercase tracking-[0.2em] text-[#166534] font-mono font-semibold">
                LIMITED RUN
              </span>
            </div>

            {/* Dynamic Headline configured from Admin CMS */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl xl:text-[5.25rem] font-black text-black tracking-tight leading-[0.95] uppercase">
              {hero.headline || 'AUTONOMOUS'}{' '}
              {hero.headlineItalic && (
                <span className="text-[#166534] font-serif italic font-normal lowercase">
                  {hero.headlineItalic}
                </span>
              )}
              <br />
              FOR THE CREATOR
            </h1>

            {/* Dynamic Description configured from Admin CMS */}
            <p className="max-w-xl text-sm sm:text-base text-neutral-600 font-light leading-relaxed">
              {hero.description ||
                'Engineered heavyweight silhouettes cut from custom 480 GSM French Terry, 14oz Japanese selvedge denim, and technical outerwear. Made exclusively for the clothing creator.'}
            </p>

            {/* Dynamic Hero CTA Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 max-w-lg">
              <Link href={hero.ctaLink || '#collection'} className="flex-1">
                <Button
                  size="xl"
                  className="w-full h-14 sm:h-16 bg-black hover:bg-neutral-800 text-white font-mono font-bold text-xs sm:text-sm tracking-[0.2em] uppercase rounded-none border border-black shadow-md flex items-center justify-center gap-3 group transition-all"
                >
                  <span>{hero.ctaLabel || 'SHOP DROP 01'}</span>
                  <span className="w-2 h-2 rounded-full bg-[#166534]" />
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform text-[#166534]" />
                </Button>
              </Link>
              <Link href="/?category=hoodies#collection">
                <Button
                  variant="outline"
                  size="xl"
                  className="w-full sm:w-auto h-14 sm:h-16 px-6 sm:px-8 border-2 border-neutral-300 hover:border-black text-black font-mono font-bold text-xs uppercase tracking-wider rounded-none transition-colors flex items-center justify-center gap-2"
                >
                  {hero.secondaryCategory ? `${hero.secondaryCategory.toUpperCase()} →` : 'HOODIES →'}
                </Button>
              </Link>
            </div>

            {/* Quality Specs Row */}
            <div className="pt-4 flex flex-wrap items-center gap-4 sm:gap-6 text-[11px] font-mono text-neutral-500 uppercase tracking-wider border-t border-neutral-200">
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-[#166534]" />
                480 GSM French Terry
              </span>
              <span className="text-neutral-300">•</span>
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-[#166534]" />
                14oz Selvedge Denim
              </span>
              <span className="text-neutral-300">•</span>
              <span>45m Doorstep Try-On</span>
            </div>
          </div>

          {/* Right Column: Featured Garment Showcase Card */}
          <div className="lg:col-span-5 w-full flex justify-center lg:justify-end">
            {heroProduct && (
              <Link href={`/product/${heroProduct.id}`} className="block w-full max-w-md group">
                <div className="relative aspect-[4/5] max-h-[500px] lg:max-h-[540px] w-full overflow-hidden bg-neutral-100 border border-neutral-300 shadow-md">
                  <Image
                    src={heroProduct.image_url || '/images/prod1-primary.jpg'}
                    alt={heroProduct.title}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 42vw"
                    className="object-cover object-center transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                  />
                  <div className="absolute top-3 left-3 bg-black text-white text-[10px] font-mono font-bold px-2.5 py-1 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#166534]" />
                    <span>FEATURED SILHOUETTE</span>
                  </div>
                </div>

                <div className="mt-3 flex justify-between items-baseline text-xs font-mono">
                  <span className="text-sm font-bold uppercase text-black group-hover:text-[#166534] transition-colors block">
                    {heroProduct.title}
                  </span>
                  <span className="text-neutral-900 font-bold text-sm">
                    ${Number(heroProduct.price).toFixed(2)} USD
                  </span>
                </div>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 2. DYNAMIC PROMOTIONAL ANNOUNCEMENT BANNER */}
      {/* ========================================================= */}
      <section className="px-4 sm:px-8 lg:px-12 py-16 sm:py-24 max-w-7xl mx-auto w-full">
        {primaryBanner ? (
          <div className="relative overflow-hidden bg-black text-white p-8 sm:p-14 border border-neutral-800 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <span className="text-xs uppercase tracking-[0.25em] text-[#166534] font-mono font-bold block">
                {primaryBanner.badge_text || 'ATELIER ANNOUNCEMENT'}
              </span>
              <h2 className="text-2xl sm:text-4xl font-bold uppercase text-white leading-tight tracking-tight">
                {primaryBanner.title}
              </h2>
              {primaryBanner.subtitle && (
                <p className="text-xs sm:text-sm text-neutral-400 font-light max-w-2xl leading-relaxed">
                  {primaryBanner.subtitle}
                </p>
              )}
              <div className="pt-2">
                <Link href={primaryBanner.cta_link || '#collection'}>
                  <Button
                    variant="outline"
                    size="default"
                    className="text-white border-neutral-700 hover:border-[#166534] hover:text-[#166534] hover:bg-neutral-950 text-xs tracking-wider uppercase rounded-none"
                  >
                    {primaryBanner.cta_label || 'Explore Collection'} →
                  </Button>
                </Link>
              </div>
            </div>

            {primaryBanner.image_url && (
              <div className="lg:col-span-4 relative h-48 lg:h-56 w-full overflow-hidden border border-neutral-800 hidden sm:block">
                <Image
                  src={primaryBanner.image_url}
                  alt={primaryBanner.title}
                  fill
                  className="object-cover object-center grayscale hover:grayscale-0 transition-all duration-700"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="relative overflow-hidden bg-black text-white p-8 sm:p-14 border border-neutral-800 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <span className="text-xs uppercase tracking-[0.25em] text-[#166534] font-mono font-bold block">
                FABRIC & TEXTILE LAB
              </span>
              <h2 className="text-2xl sm:text-4xl font-bold uppercase text-white leading-tight tracking-tight">
                ZERO POLYESTER BLENDS.{' '}
                <span className="text-[#166534] font-serif italic font-normal lowercase">
                  architectural
                </span>{' '}
                DRAPE.
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400 font-light max-w-2xl leading-relaxed">
                Every garment is milled from 100% natural organic cotton, heavy Japanese selvedge denim,
                and vintage enzymatic wash treatments. Strict unit runs per size ensure unrepeatable rarity.
              </p>
              <div className="pt-2">
                <Link href="#collection">
                  <Button
                    variant="outline"
                    size="default"
                    className="text-white border-neutral-700 hover:border-[#166534] hover:text-[#166534] hover:bg-neutral-950 text-xs tracking-wider uppercase rounded-none"
                  >
                    DISCOVER APPAREL SPECIFICATIONS →
                  </Button>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-4 relative h-48 lg:h-56 w-full overflow-hidden border border-neutral-800 hidden sm:block">
              <Image
                src="/images/prod3-front.jpg"
                alt="Raw Selvedge Linen Smock"
                fill
                className="object-cover object-center grayscale hover:grayscale-0 transition-all duration-700"
              />
            </div>
          </div>
        )}
      </section>

      {/* ========================================================= */}
      {/* 3. DYNAMIC CLOTHING COLLECTION & SIZE RUNS */}
      {/* ========================================================= */}
      <section id="collection" className="px-4 sm:px-8 lg:px-12 py-12 sm:py-16 max-w-7xl mx-auto w-full space-y-8 sm:space-y-10 scroll-mt-24">
        {/* Header with Heading & Category Pills */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-black pb-6">
          <div>
            <span className="text-xs uppercase tracking-[0.25em] text-neutral-400 font-mono block font-semibold">
              CATALOGUE
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase text-black tracking-tight mt-1">
              CURRENT <span className="text-[#166534] font-serif italic font-normal lowercase">apparel</span> EDITIONS
            </h2>
          </div>

          {/* Dynamic Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {categoryTabs.map((tab) => {
              const isActive = selectedCategory === tab.slug
              return (
                <Link
                  key={tab.slug}
                  href={tab.slug === 'all' ? '/#collection' : `/?category=${tab.slug}#collection`}
                  className={`px-3 py-1.5 text-xs font-mono font-medium tracking-wider uppercase transition-all border ${
                    isActive
                      ? 'bg-[#166534] text-white border-[#166534] shadow-sm'
                      : 'bg-white text-neutral-600 border-neutral-300 hover:border-black hover:text-black'
                  }`}
                >
                  {tab.label}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Apparel Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {products.map((item) => {
            const variants = productVariantsMap[item.id] || []
            const activeSizes = variants.filter((v) => v.stock > 0).map((v) => v.size)

            return (
              <Link
                key={item.id}
                href={`/product/${item.id}`}
                className="group flex flex-col justify-between h-full border border-neutral-200/80 hover:border-black p-4 bg-white transition-all duration-300 shadow-sm hover:shadow-md"
              >
                {/* Product Image */}
                <div className="relative aspect-[4/5] w-full overflow-hidden bg-neutral-100 border border-neutral-200/60">
                  <Image
                    src={item.image_url || '/images/prod1-primary.jpg'}
                    alt={item.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 33vw"
                    className="object-cover object-center transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                  />
                </div>

                {/* Details */}
                <div className="space-y-2 pt-3">
                  <div className="flex justify-between items-baseline gap-2">
                    <h3 className="text-sm sm:text-base font-bold uppercase text-black group-hover:text-[#166534] transition-colors truncate">
                      {item.title}
                    </h3>
                    <span className="font-mono text-sm text-neutral-900 font-bold shrink-0">
                      ${Number(item.price).toFixed(2)}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-500 font-light truncate">
                    {item.material || item.category}
                  </p>

                  {/* Size Matrix Availability Chips */}
                  <div className="pt-2 flex items-center justify-between border-t border-neutral-100 text-[10px] font-mono">
                    <span className="text-neutral-400 uppercase">Available Sizes:</span>
                    <div className="flex items-center gap-1 font-semibold text-neutral-800">
                      {activeSizes.length > 0 ? (
                        activeSizes.slice(0, 5).map((s) => (
                          <span
                            key={s}
                            className="px-1.5 py-0.5 bg-neutral-100 border border-neutral-300/80 group-hover:border-black transition-colors"
                          >
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-rose-500 font-bold">SOLD OUT</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. DYNAMIC BRAND ETHOS STATEMENT */}
      {/* ========================================================= */}
      <section className="px-4 sm:px-8 lg:px-12 py-20 sm:py-28 max-w-4xl mx-auto text-center space-y-6 w-full">
        <span className="text-xs uppercase tracking-[0.3em] text-neutral-400 font-mono block font-semibold">
          {ethos.pretitle || 'ATELIER SPECIFICATION'}
        </span>
        <blockquote className="text-3xl sm:text-5xl lg:text-6xl font-black text-black leading-tight uppercase tracking-tight">
          &ldquo;{ethos.statement || 'ENGINEERED PROPORTION & SUBSTANTIAL WEIGHT.'}&rdquo;
        </blockquote>
        {ethos.subtext && (
          <p className="text-xs sm:text-sm text-neutral-600 font-light max-w-2xl mx-auto leading-relaxed">
            {ethos.subtext}
          </p>
        )}
      </section>
    </div>
  )
}
