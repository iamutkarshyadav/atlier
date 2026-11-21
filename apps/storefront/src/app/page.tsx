import React from 'react'
import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@repo/supabase/server'
import {
  getStorefrontProducts,
  getCategories,
  DEFAULT_PRODUCTS,
  DEFAULT_CATEGORIES,
  type Product,
  type Category,
} from '@repo/supabase/utils'
import { HeroSplitScreen } from '../components/HeroSplitScreen'
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

  try {
    const [fetchedProds, fetchedCats] = await Promise.all([
      getStorefrontProducts(supabase, 'all'),
      getCategories(supabase),
    ])
    products = fetchedProds && fetchedProds.length > 0 ? fetchedProds : DEFAULT_PRODUCTS
    categories = fetchedCats && fetchedCats.length > 0 ? fetchedCats : DEFAULT_CATEGORIES
  } catch {
    products = DEFAULT_PRODUCTS
    categories = DEFAULT_CATEGORIES
  }

  return (
    <div className="bg-white text-[#14293a] overflow-hidden selection:bg-[#b91c1c] selection:text-white font-sans">
      {/* 1. HERO BANNER CAROUSEL */}
      <HeroSplitScreen />

      {/* 2. VALUE & TRUST REASSURANCE STRIP */}
      <TrustServiceStrip />

      {/* 3. ATELIER FABRIC & CRAFT CONTINUOUS MARQUEE */}
      <div className="bg-[#f8f8f8] border-b border-[#d3d6db] py-3 overflow-hidden select-none text-xs tracking-wider uppercase font-semibold">
        <div className="flex whitespace-nowrap gap-10 animate-marquee" style={{ animationDuration: '28s' }}>
          {[...FABRIC_MARQUEE, ...FABRIC_MARQUEE, ...FABRIC_MARQUEE].map((text, idx) => (
            <div key={idx} className="flex items-center gap-3 shrink-0">
              <span className="text-[#b91c1c] text-xs">◆</span>
              <span className="text-[#14293a]">{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. PERMANENT CURATED PRODUCT SHOWCASE & CATEGORY STRIP */}
      <HomepageProductShowcase products={products} categories={categories} />

      {/* 5. CURATED SPOTLIGHT MATERIAL TILES */}
      <CuratedSpotlightGrid />

      {/* 6. ATELIER CIRCLE VIP NEWSLETTER & PRIVATE DISPATCH */}
      <NewsletterStrip />
    </div>
  )
}
