import React from 'react'
import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@repo/supabase/server'
import {
  getProductWithVariantsAndMedia,
  getPromotions,
  getEffectiveProductPricing,
  DEFAULT_PRODUCTS,
  type Product,
} from '@repo/supabase'
import { ProductInteractiveIsland } from './ProductInteractiveIsland'
import { ProductReviewsSection } from '@/components/reviews/ProductReviewsSection'

export const revalidate = 60 // On-demand ISR revalidation

interface ProductPageProps {
  params: { id: string }
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const supabase = await createServerSupabaseClient()
  const { product } = await getProductWithVariantsAndMedia(supabase, params.id)

  const resolved = product || DEFAULT_PRODUCTS.find((p) => p.id === params.id) || DEFAULT_PRODUCTS[0]!

  return {
    title: `${resolved.title} | Maison TG`,
    description: resolved.description || 'Creator apparel engineered from custom heavyweight textiles.',
    openGraph: {
      title: `${resolved.title} — Maison TG`,
      description: resolved.description || 'Creator apparel engineered from custom heavyweight textiles.',
      images: resolved.image_url ? [resolved.image_url] : [],
      type: 'website',
    },
  }
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const supabase = await createServerSupabaseClient()
  const [{ product, variants, media }, promotions, schedulesRes] = await Promise.all([
    getProductWithVariantsAndMedia(supabase, params.id),
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

  // Graceful fallback for demo prototypes
  const resolvedProduct: Product =
    product ||
    DEFAULT_PRODUCTS.find((p) => p.id === params.id) ||
    DEFAULT_PRODUCTS[0]!

  const priceSchedules = schedulesRes?.data || []
  const pricing = getEffectiveProductPricing(
    resolvedProduct,
    promotions,
    priceSchedules
  )

  return (
    <div className="min-h-screen bg-white text-[#14293a] selection:bg-[#b91c1c] selection:text-white pb-20 font-sans">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-16">
        <ProductInteractiveIsland
          product={resolvedProduct}
          variants={variants}
          media={media}
          initialPricing={pricing}
        />

        <ProductReviewsSection
          productId={resolvedProduct.id}
          productTitle={resolvedProduct.title}
        />
      </div>
    </div>
  )
}
