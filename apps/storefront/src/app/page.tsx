import React from 'react'
import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@repo/supabase/server'
import {
  getStorefrontProducts,
  getCategories,
  getPromotionalBanners,
  getStorefrontConfig,
  DEFAULT_PRODUCTS,
  DEFAULT_CATEGORIES,
  DEFAULT_HOMEPAGE_SECTIONS,
  type Product,
  type Category,
  type PromotionalBanner,
} from '@repo/supabase/utils'
import { HeroSplitScreen, type HeroSlide } from '../components/HeroSplitScreen'
import { TrustServiceStrip } from '../components/TrustServiceStrip'
import { HomepageProductShowcase } from '../components/HomepageProductShowcase'
import { CuratedSpotlightGrid } from '../components/CuratedSpotlightGrid'
import { NewsletterStrip } from '../components/NewsletterStrip'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Maison TG | Online Shopping for Men & Women Apparel',
  description:
    'Discover premium apparel crafted from 480 GSM French Terry and 14oz Japanese raw selvedge denim. Free express shipping across India on orders over ₹1,999.',
}

const FABRIC_MARQUEE = [
  '480 GSM French Terry Loopback',
  '14oz Japanese Shuttle-Loomed Selvedge Denim',
  'Heavyweight Boxy Fits',
  '100% Organic Combed Cotton',
  'Complimentary Express Delivery on Orders Over ₹1,999',
  'Pure Belgian Flax Linen',
]

export default async function HomePage() {
  const supabase = await createServerSupabaseClient()
  let products: Product[] = []
  let categories: Category[] = []
  let banners: PromotionalBanner[] = []
  let homepageSections = DEFAULT_HOMEPAGE_SECTIONS

  try {
    const [fetchedProds, fetchedCats, fetchedBanners, fetchedConfig] = await Promise.all([
      getStorefrontProducts(supabase, 'all'),
      getCategories(supabase),
      getPromotionalBanners(supabase, true),
      getStorefrontConfig(supabase),
    ])
    products = fetchedProds && fetchedProds.length > 0 ? fetchedProds : DEFAULT_PRODUCTS
    categories = fetchedCats && fetchedCats.length > 0 ? fetchedCats : DEFAULT_CATEGORIES
    banners = fetchedBanners || []
    if (fetchedConfig?.homepage_sections && Array.isArray(fetchedConfig.homepage_sections)) {
      homepageSections = fetchedConfig.homepage_sections
    }
  } catch {
    products = DEFAULT_PRODUCTS
    categories = DEFAULT_CATEGORIES
  }

  const heroSlides: HeroSlide[] =
    banners.length > 0
      ? banners.map((b) => ({
          id: b.id,
          tagline: b.badge_text || 'ARCHIVE SELECTION',
          title: b.title,
          description: b.subtitle || '',
          image: b.image_url || 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1800&q=85',
          primaryCtaLabel: b.cta_label || 'Shop Now',
          primaryCtaHref: b.cta_link || '/shop',
          secondaryCtaLabel: (b as any).secondary_cta_label || 'Explore Lookbook',
          secondaryCtaHref: (b as any).secondary_cta_link || '/about',
        }))
      : []

  const sortedSections = [...homepageSections].sort((a: any, b: any) => (a.order || 0) - (b.order || 0))

  const sectionRenderer: Record<string, React.ReactNode> = {
    hero_carousel: <HeroSplitScreen key="hero_carousel" slides={heroSlides} />,
    trust_strip: <TrustServiceStrip key="trust_strip" />,
    marquee: (
      <div key="marquee" className="bg-[#f8f8f8] border-b border-[#d3d6db] py-3 overflow-hidden select-none text-xs tracking-wider uppercase font-semibold">
        <div className="flex whitespace-nowrap gap-10 animate-marquee" style={{ animationDuration: '28s' }}>
          {[...FABRIC_MARQUEE, ...FABRIC_MARQUEE, ...FABRIC_MARQUEE].map((text, idx) => (
            <div key={idx} className="flex items-center gap-3 shrink-0">
              <span className="text-[#b91c1c] text-xs">◆</span>
              <span className="text-[#14293a]">{text}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    product_showcase: <HomepageProductShowcase key="product_showcase" products={products} categories={categories} />,
    spotlight_grid: <CuratedSpotlightGrid key="spotlight_grid" />,
    newsletter: <NewsletterStrip key="newsletter" />,
  }

  return (
    <div className="bg-white text-[#14293a] overflow-hidden selection:bg-[#b91c1c] selection:text-white font-sans">
      {sortedSections.map((sec: any) => {
        if (sec.is_active === false) return null
        return sectionRenderer[sec.id] || null
      })}
    </div>
  )
}
