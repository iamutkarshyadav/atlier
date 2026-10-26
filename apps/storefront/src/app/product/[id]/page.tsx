import React from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@repo/supabase/server'
import {
  getProductWithVariantsAndMedia,
  DEFAULT_PRODUCTS,
  type Product,
} from '@repo/supabase/utils'
import { ProductInteractiveIsland } from './ProductInteractiveIsland'

export const revalidate = 60 // On-demand ISR revalidation

interface ProductPageProps {
  params: { id: string }
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const supabase = await createServerSupabaseClient()
  const { product } = await getProductWithVariantsAndMedia(supabase, params.id)

  const resolved = product || DEFAULT_PRODUCTS.find((p) => p.id === params.id) || DEFAULT_PRODUCTS[0]!

  return {
    title: `${resolved.title} | Atelier Creator Apparel`,
    description: resolved.description || 'Creator apparel engineered from custom heavyweight textiles.',
    openGraph: {
      title: `${resolved.title} — Drop 01`,
      description: resolved.description || 'Creator apparel engineered from custom heavyweight textiles.',
      images: resolved.image_url ? [resolved.image_url] : [],
      type: 'website',
    },
  }
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const supabase = await createServerSupabaseClient()
  const { product, variants, media } = await getProductWithVariantsAndMedia(
    supabase,
    params.id
  )

  // Graceful fallback for demo prototypes
  const resolvedProduct: Product =
    product ||
    DEFAULT_PRODUCTS.find((p) => p.id === params.id) ||
    DEFAULT_PRODUCTS[0]!

  return (
    <div className="max-w-7xl mx-auto px-6 sm:px-12 py-12">
      <ProductInteractiveIsland
        product={resolvedProduct}
        variants={variants}
        media={media}
      />
    </div>
  )
}
