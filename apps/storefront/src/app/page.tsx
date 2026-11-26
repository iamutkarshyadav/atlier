import React from 'react'
import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@repo/supabase/server'
import {
  getCategories,
  getPromotionalBanners,
  getStorefrontConfig,
  getCollections,
  getPromotions,
  DEFAULT_PRODUCTS,
  DEFAULT_PRODUCT_VARIANTS,
  DEFAULT_CATEGORIES,
  DEFAULT_COLLECTIONS,
  DEFAULT_HOMEPAGE_SECTIONS,
  type Product,
  type ProductVariant,
  type Category,
  type PromotionalBanner,
  type CollectionWithRelations,
  type PromotionWithRules,
} from '@repo/supabase/utils'
import {
  getEffectiveProductPricing,
  calculateDiscountBuckets,
  type ProductPricingSummary,
} from '@repo/supabase/pricing'
import { HeroSplitScreen, type HeroSlide } from '../components/HeroSplitScreen'
import { TrustServiceStrip } from '../components/TrustServiceStrip'
import { HomepageProductShowcase } from '../components/HomepageProductShowcase'
import { CuratedSpotlightGrid } from '../components/CuratedSpotlightGrid'
import { ShopByOccasion } from '../components/ShopByOccasion'
import { NewsletterStrip } from '../components/NewsletterStrip'
import { OffersDealsSection, type PublicCampaign } from '../components/OffersDealsSection'
import type { CategoryMetric } from '../components/CategoryStrip'

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
  'Free Express Delivery on Orders Above ₹1,999',
  'Pure Belgian Flax Linen',
]

export default async function HomePage() {
  const supabase = await createServerSupabaseClient()
  let products: Product[] = []
  const variantsMap: Record<string, ProductVariant[]> = {}
  const secondaryImagesMap: Record<string, string> = {}
  let categories: Category[] = []
  let banners: PromotionalBanner[] = []
  let collections: CollectionWithRelations[] = []
  let promotions: PromotionWithRules[] = []
  let priceSchedules: any[] = []
  let homepageSections = DEFAULT_HOMEPAGE_SECTIONS

  try {
    const [
      joinedProdsRes,
      fetchedCats,
      fetchedBanners,
      fetchedConfig,
      fetchedCollections,
      fetchedPromos,
      schedulesRes,
    ] = await Promise.all([
      Promise.resolve(
        supabase
          .from('products')
          .select('*, product_variants(*), product_media(*)')
          .eq('is_archived', false)
          .order('created_at', { ascending: false })
      ).catch(() => ({ data: null, error: true })),
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

    if (joinedProdsRes?.data && joinedProdsRes.data.length > 0) {
      products = joinedProdsRes.data.map((row: any) => {
        const rawVars = Array.isArray(row.product_variants) ? row.product_variants : []
        variantsMap[row.id] = rawVars.filter((v: any) => !v.is_archived)

        const rawMedia = Array.isArray(row.product_media) ? [...row.product_media] : []
        rawMedia.sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
        const altMedia =
          rawMedia.find((m: any) => m.url && m.url !== row.image_url) || rawMedia[1]
        if (altMedia?.url) {
          secondaryImagesMap[row.id] = altMedia.url
        }

        return {
          ...row,
          price: Number(row.price),
          compare_at_price: row.compare_at_price ? Number(row.compare_at_price) : null,
        }
      })
    } else {
      products = DEFAULT_PRODUCTS
      for (const v of DEFAULT_PRODUCT_VARIANTS) {
        if (!variantsMap[v.product_id]) variantsMap[v.product_id] = []
        variantsMap[v.product_id]!.push(v)
      }
    }

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
    for (const v of DEFAULT_PRODUCT_VARIANTS) {
      if (!variantsMap[v.product_id]) variantsMap[v.product_id] = []
      variantsMap[v.product_id]!.push(v)
    }
  }

  // Precompute live effective pricing (strikethrough MRP, selling price, best coupon)
  const pricingMap: Record<string, ProductPricingSummary> = {}
  const pricingList: ProductPricingSummary[] = []
  products.forEach((p) => {
    const summary = getEffectiveProductPricing(p, promotions, priceSchedules)
    pricingMap[p.id] = summary
    pricingList.push(summary)
  })

  // Compute Category Metrics (item count & starting price) for CategoryStrip
  const categoryMetrics: Record<string, CategoryMetric> = {}
  const parentCategories = categories.filter((c) => !c.parent_id)
  for (const parent of parentCategories) {
    const childCats = categories.filter((c) => c.parent_id === parent.id)
    const matchingIds = new Set([parent.id, ...childCats.map((c) => c.id)])
    const matchingNames = new Set([
      parent.name.toLowerCase(),
      ...childCats.map((c) => c.name.toLowerCase()),
    ])

    const matchedProds = products.filter(
      (p) =>
        (p.category_id && matchingIds.has(p.category_id)) ||
        (p.category && matchingNames.has(p.category.toLowerCase()))
    )
    const minPrice =
      matchedProds.length > 0
        ? Math.min(...matchedProds.map((p) => pricingMap[p.id]?.sellingPrice ?? Number(p.price)))
        : null

    categoryMetrics[parent.id] = {
      count: matchedProds.length,
      minPrice,
    }
  }

  // Build SSR Public Campaigns & Buckets for OffersDealsSection
  const publicCampaigns: PublicCampaign[] = promotions
    .filter((p) => p.is_active)
    .map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      bannerImageUrl: (p as any).banner_image_url || null,
      promotionType: p.promotion_type,
      discountType: p.discount_type,
      discountValue: Number(p.discount_value),
      minOrderSubtotal: p.min_order_subtotal ? Number(p.min_order_subtotal) : null,
      maxDiscountAmount: p.max_discount_amount ? Number(p.max_discount_amount) : null,
      isStackable: p.is_stackable,
      priority: p.priority,
      startsAt: p.starts_at,
      endsAt: p.ends_at,
      publicCoupons: (p.coupons || [])
        .filter(
          (c: any) =>
            c.is_active &&
            !c.is_single_use &&
            !c.assigned_customer_email &&
            (c.is_public === true || (c.is_public === undefined && !c.assigned_customer_email))
        )
        .map((c: any) => ({ id: c.id, code: c.code })),
    }))
  const discountBuckets = calculateDiscountBuckets(products, pricingList)

  const heroSlides: HeroSlide[] =
    banners.length > 0
      ? banners.map((b) => ({
          id: b.id,
          tagline: b.badge_text || 'ARCHIVE SELECTION',
          title: b.title,
          description: b.subtitle || '',
          image:
            b.image_url ||
            'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1800&q=85',
          primaryCtaLabel: b.cta_label || 'Shop Now',
          primaryCtaHref: b.cta_link || '/shop',
          secondaryCtaLabel: (b as any).secondary_cta_label || 'Explore Lookbook',
          secondaryCtaHref: (b as any).secondary_cta_link || '/about',
        }))
      : []

  const effectiveSections = [...homepageSections]
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
    offers_deals: (
      <OffersDealsSection
        key="offers_deals"
        initialCampaigns={publicCampaigns}
        initialBuckets={discountBuckets}
      />
    ),
    trust_strip: <TrustServiceStrip key="trust_strip" />,
    marquee: (
      <div
        key="marquee"
        className="bg-[#f8f8f8] border-b border-[#d3d6db] py-3 overflow-hidden select-none text-xs tracking-wider uppercase font-semibold"
      >
        <div
          className="flex whitespace-nowrap gap-10 animate-marquee"
          style={{ animationDuration: '28s' }}
        >
          {[...FABRIC_MARQUEE, ...FABRIC_MARQUEE, ...FABRIC_MARQUEE].map((text, idx) => (
            <div key={idx} className="flex items-center gap-3 shrink-0">
              <span className="text-[#b91c1c] text-xs">·</span>
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
        categoryMetrics={categoryMetrics}
        variantsMap={variantsMap}
        secondaryImagesMap={secondaryImagesMap}
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
      {showNewsletter && <NewsletterStrip key="newsletter" />}
    </div>
  )
}
