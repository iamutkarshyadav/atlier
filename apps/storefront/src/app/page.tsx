import React from 'react'
import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@repo/supabase/server'
import {
  getPageLayout,
  getStorefrontProducts,
  DEFAULT_PRODUCTS,
  DEFAULT_HOME_LAYOUT,
  type Product,
  type LayoutNode,
} from '@repo/supabase/utils'
import { HeroSplitScreen } from '../components/HeroSplitScreen'
import { LayoutRenderer } from '../components/cms/LayoutRenderer'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Tg • The Royal Look for the Real Gentleman',
  description:
    'Choose from our most luxurious collections and experience THE ROYAL LOOK & FEEL. 480 GSM French Terry, Japanese raw selvedge denim, and tailored suits.',
}

export default async function HomePage() {
  const supabase = await createServerSupabaseClient()
  let products: Product[] = []
  let layoutNodes: LayoutNode[] = DEFAULT_HOME_LAYOUT.layout_json as unknown as LayoutNode[]

  try {
    const [fetchedProds, pageLayout] = await Promise.all([
      getStorefrontProducts(supabase, 'all'),
      getPageLayout(supabase, 'home'),
    ])

    products = fetchedProds && fetchedProds.length > 0 ? fetchedProds : DEFAULT_PRODUCTS
    if (pageLayout && Array.isArray(pageLayout.layout_json) && pageLayout.layout_json.length > 0) {
      layoutNodes = pageLayout.layout_json as unknown as LayoutNode[]
    }
  } catch {
    products = DEFAULT_PRODUCTS
    layoutNodes = DEFAULT_HOME_LAYOUT.layout_json as unknown as LayoutNode[]
  }

  // Filter out any legacy HeroBanner block so the new Split-Screen Hero is the sole primary hero
  const secondaryLayoutNodes = layoutNodes.filter((node) => node.type !== 'HeroBanner')

  return (
    <div className="bg-[#212121] text-white overflow-hidden selection:bg-red-600 selection:text-white">
      {/* 50/50 Split-Screen Reconstructed Hero Landing Section */}
      <HeroSplitScreen />

      {/* Marquee & Curated Collections */}
      <div id="collection" className="bg-[#212121] text-white">
        <LayoutRenderer
          initialLayout={secondaryLayoutNodes}
          pageSlug="home"
          products={products}
        />
      </div>
    </div>
  )
}
