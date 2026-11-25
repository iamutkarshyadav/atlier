import React from 'react'
import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@repo/supabase/server'
import {
  getStorefrontProducts,
  getCategories,
  getPromotionalBanners,
  getStorefrontConfig,
  getCollections,
  getPromotions,
  DEFAULT_PRODUCTS,
  DEFAULT_CATEGORIES,
  DEFAULT_COLLECTIONS,
  DEFAULT_HOMEPAGE_SECTIONS,
  type Product,
  type Category,
  type PromotionalBanner,
  type CollectionWithRelations,
  type PromotionWithRules,
} from '@repo/supabase/utils'
import {
  getEffectiveProductPricing,
  type ProductPricingSummary,
} from '@repo/supabase/pricing'
import { HeroSplitScreen, type HeroSlide } from '../components/HeroSplitScreen'
import { TrustServiceStrip } from '../components/TrustServiceStrip'
import { HomepageProductShowcase } from '../components/HomepageProductShowcase'
import { CuratedSpotlightGrid } from '../components/CuratedSpotlightGrid'
import { ShopByOccasion } from '../components/ShopByOccasion'
import { NewsletterStrip } from '../components/NewsletterStrip'
import { OffersDealsSection } from '../components/OffersDealsSection'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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
  let collections: CollectionWithRelations[] = []
  let promotions: PromotionWithRules[] = []
  let priceSchedules: any[] = []
  let homepageSections = DEFAULT_HOMEPAGE_SECTIONS

  try {
    const [fetchedProds, fetchedCats, fetchedBanners, fetchedConfig, fetchedCollections, fetchedPromos, schedulesRes] = await Promise.all([
      getStorefrontProducts(supabase, 'all'),
      getCategories(supabase),
      getPromotionalBanners(supabase, true),
      getStorefrontConfig(supabase),
      getCollections(supabase, { showOnHome: true, onlyActive: true }),
      getPromotions(supabase, { onlyActive: true }).catch(() => []),
      Promise.resolve(
        supabase
          .from('price_schedules')
          .select('*')
          .eq('is_active', true)
          .lte('starts_at', new Date().toISOString())
          .gte('ends_at', new Date().toISOString())
      ).catch(() => ({ data: [] })),
    ])
    products = fetchedProds && fetchedProds.length > 0 ? fetchedProds : DEFAULT_PRODUCTS
    categories = Array.isArray(fetchedCats) && fetchedCats.length > 0 ? fetchedCats : DEFAULT_CATEGORIES
    banners = fetchedBanners || []
    collections = Array.isArray(fetchedCollections) ? fetchedCollections : DEFAULT_COLLECTIONS
    promotions = Array.isArray(fetchedPromos) ? fetchedPromos : []
    priceSchedules = schedulesRes?.data || []
    if (fetchedConfig?.homepage_sections && Array.isArray(fetchedConfig.homepage_sections)) {
      homepageSections = fetchedConfig.homepage_sections
    }
  } catch {
    products = DEFAULT_PRODUCTS
    categories = DEFAULT_CATEGORIES
    collections = DEFAULT_COLLECTIONS
  }

  // Precompute live effective pricing (strikethrough MRP, selling price, discounts)
  const pricingMap: Record<string, ProductPricingSummary> = {}
  products.forEach((p) => {
    pricingMap[p.id] = getEffectiveProductPricing(p, promotions, priceSchedules)
  })

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

  // Ensure Shop by Occasion and Offers & Deals are part of the flow
  let effectiveSections = [...homepageSections]
  if (!effectiveSections.some((s: any) => s.id === 'offers_deals')) {
    effectiveSections.push({
      id: 'offers_deals',
      name: 'Curated Offers & Privileges',
      order: 2.2,
      is_active: true,
    })
  }
  if (!effectiveSections.some((s: any) => s.id === 'shop_by_occasion')) {
    effectiveSections.push({
      id: 'shop_by_occasion',
      name: 'Shop By Occasion',
      order: 4.5,
      is_active: true,
    })
  }

  const sortedSections = effectiveSections.sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
  const nonNewsletterSections = sortedSections.filter((s: any) => s.id !== 'newsletter')
  const newsletterSection = sortedSections.find((s: any) => s.id === 'newsletter')
  const showNewsletter = newsletterSection ? newsletterSection.is_active !== false : true

  const sectionRenderer: Record<string, React.ReactNode> = {
    hero_carousel: <HeroSplitScreen key="hero_carousel" slides={heroSlides} />,
    offers_deals: <OffersDealsSection key="offers_deals" />,
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
    product_showcase: (
      <HomepageProductShowcase
        key="product_showcase"
        products={products}
        categories={categories}
        pricingMap={pricingMap}
      />
    ),
    shop_by_occasion: <ShopByOccasion key="shop_by_occasion" collections={collections} />,
    spotlight_grid: <CuratedSpotlightGrid key="spotlight_grid" />,
  }

  return (
    <div className="bg-white text-[#14293a] overflow-hidden selection:bg-[#b91c1c] selection:text-white font-sans">
      {nonNewsletterSections.map((sec: any) => {
        if (sec.is_active === false) return null
        return sectionRenderer[sec.id] || null
      })}
      {/* Newsletter Section always anchored at the very bottom of the page */}
      {showNewsletter && <NewsletterStrip key="newsletter" />}
    </div>
  )
}
