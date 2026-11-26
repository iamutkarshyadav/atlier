'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import type { Product, ProductVariant } from '@repo/supabase/utils'
import type { ProductPricingSummary } from '@repo/supabase/pricing'
import { useCartStore } from '@/store/useCartStore'
import { ProductCard } from '@/components/ProductCard'

interface CompleteTheLookRowProps {
  products: Product[]
  variantsMap: Record<string, ProductVariant[]>
  pricingMap: Record<string, ProductPricingSummary>
}

export function CompleteTheLookRow({
  products,
  variantsMap,
  pricingMap,
}: CompleteTheLookRowProps) {
  const addItem = useCartStore((s) => s.addItem)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  if (!products || products.length === 0) return null

  const handleQuickAdd = (product: Product, size: string) => {
    const variants = variantsMap[product.id] || []
    const matchingVar = variants.find((v) => v.size === size && v.stock > 0) || variants[0]
    const pricing = pricingMap[product.id]
    const activePrice = pricing?.sellingPrice ?? (matchingVar?.price_override ?? product.price)
    const originalPrice = pricing?.mrp && pricing.mrp > activePrice ? pricing.mrp : undefined

    const added = addItem({
      id: matchingVar ? `${product.id}-${matchingVar.id}` : `${product.id}-${size}`,
      productId: product.id,
      variantId: matchingVar?.id,
      title: product.title,
      category: product.category || 'Apparel',
      edition: product.edition || 'Collection',
      price: activePrice,
      originalPrice,
      quantity: 1,
      image: product.image_url || '/images/placeholder-garment.svg',
      size: size || matchingVar?.size || 'M',
      color: matchingVar?.color || undefined,
    })

    if (added) {
      useCartStore.getState().openDrawer()
    } else {
      setToastMessage('Bolt limit: maximum 5 garments per fitting session.')
      setTimeout(() => setToastMessage(null), 3500)
    }
  }

  return (
    <section className="mt-16 pt-12 border-t border-[#e5e7eb] font-sans text-[#14293a]">
      {toastMessage && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-40 bg-[#14293a] text-white px-5 py-2.5 rounded-sm text-xs font-semibold flex items-center gap-2 border border-white/20">
          <Check className="w-3.5 h-3.5 text-emerald-400" strokeWidth={1.75} />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#b91c1c] block">
            Curated Styling
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#14293a] mt-1">
            Complete the Look
          </h2>
        </div>

        <Link
          href="/shop"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#14293a] hover:text-[#b91c1c] transition-colors shrink-0"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {products.slice(0, 4).map((item) => {
          const pricing = pricingMap[item.id]
          return (
            <ProductCard
              key={item.id}
              product={item}
              variants={variantsMap[item.id]}
              pricing={pricing}
              mrp={pricing?.mrp}
              sellingPrice={pricing?.sellingPrice}
              discountPercentage={pricing?.discountPercentage}
              bestCouponCode={pricing?.bestCoupon?.code}
              bestCouponPrice={pricing?.bestCouponPrice}
              onQuickAdd={(p, sz) => handleQuickAdd(p, sz)}
            />
          )
        })}
      </div>
    </section>
  )
}
