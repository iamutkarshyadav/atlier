import React from 'react'
import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@repo/supabase/server'
import {
  getProductWithVariantsAndMedia,
  getPromotions,
  getEffectiveProductPricing,
  getStorefrontProducts,
  sortVariantsBySize,
  DEFAULT_PRODUCTS,
  DEFAULT_PRODUCT_VARIANTS,
  type Product,
  type ProductVariant,
  type ProductPricingSummary,
} from '@repo/supabase'
import { ProductInteractiveIsland } from './ProductInteractiveIsland'
import { CompleteTheLookRow } from '@/components/product/CompleteTheLookRow'
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
  const [{ product, variants, media }, promotions, schedulesRes, catalogProducts] = await Promise.all([
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
    getStorefrontProducts(supabase).catch(() => DEFAULT_PRODUCTS),
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

  // Select up to 4 complementary products for "Complete the Look"
  const otherProducts = catalogProducts.filter((p) => p.id !== resolvedProduct.id)
  const currentCat = (resolvedProduct.category || '').toLowerCase()
  const complementaryFirst = [
    ...otherProducts.filter((p) => (p.category || '').toLowerCase() !== currentCat),
    ...otherProducts.filter((p) => (p.category || '').toLowerCase() === currentCat),
  ].slice(0, 4)

  const relatedVariantsMap: Record<string, ProductVariant[]> = {}
  const relatedPricingMap: Record<string, ProductPricingSummary> = {}

  if (complementaryFirst.length > 0) {
    const relatedIds = complementaryFirst.map((p) => p.id)
    const { data: relatedVars } = await supabase
      .from('product_variants')
      .select('*')
      .in('product_id', relatedIds)
      .then((res) => res, () => ({ data: null }))

    const grouped: Record<string, ProductVariant[]> = {}
    const sourceVariants =
      relatedVars && relatedVars.length > 0
        ? relatedVars
        : DEFAULT_PRODUCT_VARIANTS.filter((v) => relatedIds.includes(v.product_id))

    for (const v of sourceVariants) {
      if (!grouped[v.product_id]) grouped[v.product_id] = []
      grouped[v.product_id]!.push(v)
    }

    for (const item of complementaryFirst) {
      relatedVariantsMap[item.id] = sortVariantsBySize(grouped[item.id] || [])
      relatedPricingMap[item.id] = getEffectiveProductPricing(item, promotions, priceSchedules)
    }
  }

  return (
    <div className="min-h-screen bg-white text-[#14293a] selection:bg-[#b91c1c] selection:text-white pb-24 font-sans">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-16">
        <ProductInteractiveIsland
          product={resolvedProduct}
          variants={variants}
          media={media}
          initialPricing={pricing}
        />

        <CompleteTheLookRow
          products={complementaryFirst}
          variantsMap={relatedVariantsMap}
          pricingMap={relatedPricingMap}
        />

        <ProductReviewsSection
          productId={resolvedProduct.id}
          productTitle={resolvedProduct.title}
        />
      </div>
    </div>
  )
}
