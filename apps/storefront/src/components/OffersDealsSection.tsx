'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Copy, Check, Tag, Sparkles, Zap, ShieldCheck } from 'lucide-react'

export interface PublicCoupon {
  code: string
  promotionName: string
  description?: string | null
  bannerImageUrl?: string | null
  discountType: string
  discountValue: number
  minOrderSubtotal?: number | null
  maxDiscountAmount?: number | null
  endsAt?: string | null
  badgeText: string
}

export interface PublicCampaign {
  id: string
  name: string
  slug: string
  description?: string | null
  bannerImageUrl?: string | null
  promotionType: string
  discountType: string
  discountValue: number
  minOrderSubtotal?: number | null
  maxDiscountAmount?: number | null
  isStackable: boolean
  priority: number
  startsAt: string
  endsAt?: string | null
  publicCoupons: Array<{ id: string; code: string }>
}

export interface DiscountBucketCounts {
  min10: number
  min20: number
  min30: number
  min50: number
  onSaleTotal: number
}

interface OffersDealsSectionProps {
  initialCampaigns?: PublicCampaign[]
  initialCoupons?: PublicCoupon[]
  initialBuckets?: DiscountBucketCounts
}

// Curated luxury fashion editorial imagery fallbacks for promotions without an uploaded banner
const LUXURY_EDITORIAL_PHOTOS = [
  'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&w=1200&q=80',
]

export function OffersDealsSection({
  initialCampaigns = [],
  initialCoupons = [],
  initialBuckets,
}: OffersDealsSectionProps) {
  const [campaigns, setCampaigns] = useState<PublicCampaign[]>(initialCampaigns)
  const [coupons, setCoupons] = useState<PublicCoupon[]>(initialCoupons)
  const [buckets, setBuckets] = useState<DiscountBucketCounts | undefined>(initialBuckets)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const hasFetchedRef = useRef(false)

  useEffect(() => {
    if (hasFetchedRef.current || (initialCampaigns.length > 0 && initialCoupons.length > 0)) {
      return
    }
    hasFetchedRef.current = true

    async function fetchOffers() {
      try {
        const res = await fetch('/api/offers')
        if (!res.ok) return
        const data = await res.json()
        if (data.success) {
          if (Array.isArray(data.campaigns)) {
            setCampaigns(data.campaigns)
          }
          if (Array.isArray(data.publicCoupons)) {
            setCoupons(data.publicCoupons)
          }
          if (data.discountBuckets) {
            setBuckets(data.discountBuckets)
          }
        }
      } catch (err) {
        console.warn('Failed to load live offers:', err)
      }
    }

    fetchOffers()
  }, [initialCampaigns.length, initialCoupons.length])

  const handleCopyCode = (e: React.MouseEvent, code: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code)
    }
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2500)
  }

  // Construct dynamic photo grid cards directly from live database campaigns and discounts
  const photoGridCards = React.useMemo(() => {
    const cards: Array<{
      id: string
      title: string
      subtitle?: string
      badge: string
      discountText: string
      imageUrl: string
      couponCode?: string | null
      href: string
      actionText: string
    }> = []

    // 1. Map live campaigns from database
    campaigns.forEach((camp, idx) => {
      const firstCoupon = camp.publicCoupons?.[0]?.code || null
      const discountLabel =
        camp.discountType === 'percentage'
          ? `${Math.round(camp.discountValue)}% OFF`
          : camp.discountType === 'free_shipping'
            ? 'FREE SHIPPING'
            : `₹${Math.round(camp.discountValue).toLocaleString('en-IN')} OFF`

      const badgeLabel =
        camp.promotionType === 'coupon'
          ? firstCoupon ? `CODE: ${firstCoupon}` : 'INVITATION CODE'
          : camp.promotionType === 'shipping_waiver'
            ? 'WHITE GLOVE'
            : camp.promotionType === 'tiered_threshold'
              ? 'ROYAL CURATION'
              : 'SEASONAL SALE'

      cards.push({
        id: camp.id,
        title: camp.name,
        subtitle: camp.description || 'Exclusive private client privilege applied at checkout.',
        badge: badgeLabel,
        discountText: discountLabel,
        imageUrl:
          camp.bannerImageUrl ||
          LUXURY_EDITORIAL_PHOTOS[idx % LUXURY_EDITORIAL_PHOTOS.length],
        couponCode: firstCoupon,
        href: '/offers',
        actionText: firstCoupon ? 'Copy & Shop' : 'Shop Sale',
      })
    })

    // 2. If fewer than 4 campaigns, fill remainder dynamically with active discount tiers (if products exist)
    if (cards.length < 4 && buckets) {
      if (buckets.min50 > 0 && !cards.some((c) => c.id === 'tier-50')) {
        cards.push({
          id: 'tier-50',
          title: 'Final Season Run Out',
          subtitle: `${buckets.min50} Archive pieces across seasonal tailoring`,
          badge: 'FINAL CALL',
          discountText: 'MIN. 50% OFF',
          imageUrl: LUXURY_EDITORIAL_PHOTOS[2],
          href: '/shop?minDiscount=50',
          actionText: 'Explore Collection',
        })
      }
      if (buckets.min30 > 0 && cards.length < 4 && !cards.some((c) => c.id === 'tier-30')) {
        cards.push({
          id: 'tier-30',
          title: 'Loopback & Fleece Edits',
          subtitle: `${buckets.min30} Heavyweight silhouettes & structured knits`,
          badge: 'POPULAR EDITS',
          discountText: 'MIN. 30% OFF',
          imageUrl: LUXURY_EDITORIAL_PHOTOS[1],
          href: '/shop?minDiscount=30',
          actionText: 'Explore Collection',
        })
      }
      if (buckets.min10 > 0 && cards.length < 4 && !cards.some((c) => c.id === 'tier-10')) {
        cards.push({
          id: 'tier-10',
          title: 'Permanent Archive Staples',
          subtitle: `${buckets.min10} Signature essentials & raw denim`,
          badge: 'ARCHIVE SALE',
          discountText: 'MIN. 15% OFF',
          imageUrl: LUXURY_EDITORIAL_PHOTOS[0],
          href: '/shop?minDiscount=15',
          actionText: 'Explore Collection',
        })
      }
    }

    return cards.slice(0, 4)
  }, [campaigns, buckets])

  if (photoGridCards.length === 0) {
    return null
  }

  return (
    <section className="py-12 sm:py-20 bg-[#fafafa] border-b border-[#e5e7eb] font-sans">
      <div className="max-w-[1540px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#e5e7eb] pb-5">
          <div>
            <span className="text-xs font-bold font-sans tracking-[0.2em] text-[#b91c1c] uppercase block mb-1">
              Curated Privileges &amp; Wardrobe Tiers
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-sans text-[#14293a] tracking-tight">
              Special Offers &amp; Sale
            </h2>
            <p className="text-xs sm:text-sm text-[#6c7079] mt-1 font-sans">
              Explore active seasonal discounts, promotional bundles, and VIP invitation codes.
            </p>
          </div>

          <Link
            href="/offers"
            className="inline-flex items-center gap-2 text-xs font-bold font-sans uppercase tracking-wider text-[#14293a] hover:text-[#b91c1c] transition-colors shrink-0 group border border-[#d3d6db] hover:border-[#14293a] px-4 py-2.5 rounded-xs bg-white shadow-2xs"
          >
            <span>View All Offers</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Dynamic 2x2 Viewport-Height Photo Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {photoGridCards.map((card, idx) => {
            const isCopied = Boolean(card.couponCode && copiedCode === card.couponCode)
            // If odd count of 3 cards, expand the last card across both columns
            const isSpanned = photoGridCards.length === 3 && idx === 2

            return (
              <div
                key={card.id}
                className={`group relative overflow-hidden rounded-xs border border-[#d3d6db] hover:border-[#14293a] transition-all hover:shadow-2xl flex flex-col justify-between h-[70dvh] sm:h-[75dvh] lg:h-[82dvh] bg-neutral-950 ${
                  isSpanned ? 'md:col-span-2' : 'col-span-1'
                }`}
              >
                {/* Full Viewport Background Image with Smooth Subtle Scale */}
                <div className="absolute inset-0 overflow-hidden">
                  <Image
                    src={card.imageUrl}
                    alt={card.title}
                    fill
                    sizes={isSpanned ? '100vw' : '(max-width: 768px) 100vw, 50vw'}
                    className="object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                    priority={idx < 2}
                  />
                  {/* High-Contrast Luxury Gradient Overlay for Razor-Sharp Typography */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-black/25" />
                </div>

                {/* Top Overlay Bar: Badge & Copy Button */}
                <div className="relative z-10 p-6 sm:p-8 flex items-start justify-between gap-3">
                  <span className="inline-block px-3 py-1.5 text-[10px] font-sans font-bold tracking-[0.2em] uppercase bg-black/40 backdrop-blur-md text-white border border-white/20 rounded-xs shadow-xs">
                    {card.badge}
                  </span>

                  {card.couponCode && (
                    <button
                      type="button"
                      onClick={(e) => handleCopyCode(e, card.couponCode!)}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xs text-xs font-sans font-bold tracking-wider uppercase transition-all cursor-pointer shadow-md ${
                        isCopied
                          ? 'bg-emerald-600 text-white border border-emerald-500'
                          : 'bg-white text-[#14293a] hover:bg-neutral-100 border border-white'
                      }`}
                      title="Copy invitation code"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>COPIED!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>CODE: {card.couponCode}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Bottom Overlay Content with Modern Application Typography */}
                <div className="relative z-10 p-6 sm:p-8 flex flex-col justify-end space-y-3 text-white max-w-2xl">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs sm:text-sm font-sans font-bold tracking-[0.15em] text-amber-300 uppercase">
                      {card.discountText}
                    </span>
                    <span className="text-white/40">·</span>
                    <span className="text-[11px] font-sans font-semibold tracking-wider text-white/70 uppercase">
                      Limited Curation
                    </span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl lg:text-4xl font-sans font-extrabold text-white leading-tight tracking-tight group-hover:text-amber-100 transition-colors">
                    {card.title}
                  </h3>

                  {card.subtitle && (
                    <p className="text-xs sm:text-sm font-sans text-neutral-200 line-clamp-2 leading-relaxed">
                      {card.subtitle}
                    </p>
                  )}

                  <div className="pt-4 border-t border-white/20 flex items-center justify-between text-xs font-sans">
                    <Link
                      href={card.href}
                      className="inline-flex items-center gap-2 text-white font-bold uppercase tracking-wider hover:text-amber-300 transition-colors group/link text-xs sm:text-sm"
                    >
                      <span>{card.actionText}</span>
                      <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1.5 transition-transform" />
                    </Link>

                    {card.couponCode && (
                      <span className="text-[11px] font-sans font-semibold text-white/60 uppercase tracking-wider">
                        Apply at checkout
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
