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
    <div className="min-h-screen bg-[#F8F8F6] text-[#09090B] selection:bg-[#B91C1C] selection:text-white pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 pt-8 pb-16 sm:pt-10 sm:pb-20">
        <ProductInteractiveIsland
          product={resolvedProduct}
          variants={variants}
          media={media}
        />
      </div>
    </div>
  )
}
