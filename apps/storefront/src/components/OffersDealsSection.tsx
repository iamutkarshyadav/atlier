'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { ArrowRight, Copy, Check, Clock } from 'lucide-react'
import { ProductImage } from './ui/ProductImage'

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

const LUXURY_EDITORIAL_PHOTOS = [
  'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1200&q=80',
]

function formatCountdown(endsAt?: string | null): string | null {
  if (!endsAt) return null
  const diffMs = new Date(endsAt).getTime() - Date.now()
  if (!Number.isFinite(diffMs) || diffMs <= 0) return null
  const days = Math.floor(diffMs / 86400000)
  const hours = Math.floor((diffMs % 86400000) / 3600000)
  const mins = Math.floor((diffMs % 3600000) / 60000)
  if (days > 0) return `Ends in ${days}d ${hours}h`
  return `Ends in ${hours}h ${mins}m`
}

export function OffersDealsSection({
  initialCampaigns = [],
  initialCoupons = [],
  initialBuckets,
}: OffersDealsSectionProps) {
  const [campaigns, setCampaigns] = useState<PublicCampaign[]>(initialCampaigns)
  const [buckets, setBuckets] = useState<DiscountBucketCounts | undefined>(initialBuckets)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const hasFetchedRef = useRef(false)

  useEffect(() => {
    if (
      hasFetchedRef.current ||
      initialCampaigns.length > 0 ||
      initialCoupons.length > 0 ||
      initialBuckets !== undefined
    ) {
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

  const offerCards = useMemo(() => {
    if (campaigns.length > 0) {
      return campaigns.slice(0, 3).map((camp, idx) => {
        const firstCoupon = camp.publicCoupons?.[0]?.code || null
        const discountLabel =
          camp.discountType === 'percentage'
            ? `${Math.round(camp.discountValue)}% OFF`
            : camp.discountType === 'free_shipping'
              ? 'FREE SHIPPING'
              : `₹${Math.round(camp.discountValue).toLocaleString('en-IN')} OFF`

        const badgeLabel =
          camp.promotionType === 'coupon'
            ? firstCoupon
              ? `CODE: ${firstCoupon}`
              : 'INVITATION CODE'
            : camp.promotionType === 'shipping_waiver'
              ? 'WHITE GLOVE'
              : camp.promotionType === 'tiered_threshold'
                ? 'WARDROBE TIER'
                : 'SEASONAL OFFER'

        return {
          id: camp.id,
          title: camp.name,
          subtitle: camp.description || 'Applied automatically or via privilege code at checkout.',
          badge: badgeLabel,
          discountText: discountLabel,
          imageUrl:
            camp.bannerImageUrl ||
            LUXURY_EDITORIAL_PHOTOS[idx % LUXURY_EDITORIAL_PHOTOS.length]!,
          couponCode: firstCoupon,
          endsAt: camp.endsAt,
          href: '/offers',
          actionText: 'Shop Offer',
        }
      })
    }

    // Fallback discount tiers strictly when zero live campaigns exist
    const fallbackCards: Array<{
      id: string
      title: string
      subtitle: string
      badge: string
      discountText: string
      imageUrl: string
      couponCode?: string | null
      endsAt?: string | null
      href: string
      actionText: string
    }> = []

    if (buckets) {
      if (buckets.min50 > 0) {
        fallbackCards.push({
          id: 'tier-50',
          title: 'Final Season Run Out',
          subtitle: `${buckets.min50} archival pieces across seasonal tailoring`,
          badge: 'FINAL CALL',
          discountText: 'MIN. 50% OFF',
          imageUrl: LUXURY_EDITORIAL_PHOTOS[2]!,
          href: '/shop?minDiscount=50',
          actionText: 'Explore Edit',
        })
      }
      if (buckets.min30 > 0) {
        fallbackCards.push({
          id: 'tier-30',
          title: 'Loopback & Fleece Edits',
          subtitle: `${buckets.min30} heavyweight silhouettes & structured knits`,
          badge: 'SEASONAL EDIT',
          discountText: 'MIN. 30% OFF',
          imageUrl: LUXURY_EDITORIAL_PHOTOS[1]!,
          href: '/shop?minDiscount=30',
          actionText: 'Explore Edit',
        })
      }
      if (buckets.min10 > 0) {
        fallbackCards.push({
          id: 'tier-10',
          title: 'Permanent Archive Staples',
          subtitle: `${buckets.min10} signature essentials & raw denim`,
          badge: 'ARCHIVE SALE',
          discountText: 'MIN. 15% OFF',
          imageUrl: LUXURY_EDITORIAL_PHOTOS[0]!,
          href: '/shop?minDiscount=15',
          actionText: 'Explore Edit',
        })
      }
    }

    return fallbackCards.slice(0, 3)
  }, [campaigns, buckets])

  if (offerCards.length === 0) {
    return null
  }

  return (
    <section className="py-12 sm:py-16 bg-[#f8f8f8] border-b border-[#e5e7eb] font-sans">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#d3d6db] pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#b91c1c] block mb-1">
              Seasonal Privileges
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#14293a] tracking-tight">
              Special Offers &amp; Sale
            </h2>
          </div>

          <Link
            href="/offers"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#14293a] hover:text-[#b91c1c] transition-colors shrink-0 group"
          >
            <span>View All Offers</span>
            <ArrowRight
              className="w-3.5 h-3.5 text-[#b91c1c] group-hover:translate-x-1 transition-transform"
              strokeWidth={1.75}
            />
          </Link>
        </div>

        {/* Layout-Adaptive Offers Presentation */}
        {offerCards.length === 1 ? (
          (() => {
            const card = offerCards[0]!
            const isCopied = Boolean(card.couponCode && copiedCode === card.couponCode)
            const countdown = formatCountdown(card.endsAt)

            return (
              <div className="group grid grid-cols-1 md:grid-cols-12 md:h-[400px] md:max-h-[420px] bg-white border border-[#d3d6db] hover:border-[#14293a] rounded-sm overflow-hidden transition-colors">
                {/* Image Left */}
                <div className="md:col-span-7 relative h-64 md:h-full bg-[#f5f5f4] overflow-hidden">
                  <ProductImage
                    src={card.imageUrl}
                    alt={card.title}
                    fill
                    priority
                    sizes="(max-width: 768px) 100vw, 58vw"
                    className="group-hover:scale-105 transition-transform duration-500 ease-out"
                  />
                </div>

                {/* Offer Copy + Countdown + CTA Right */}
                <div className="md:col-span-5 p-6 sm:p-8 lg:p-10 flex flex-col justify-between bg-white border-t md:border-t-0 md:border-l border-[#e5e7eb]">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca] rounded-sm">
                        {card.discountText}
                      </span>
                      {countdown && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6c7079]">
                          <Clock className="w-3.5 h-3.5 text-[#b91c1c]" strokeWidth={1.75} />
                          <span>{countdown}</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl sm:text-2xl font-bold text-[#14293a] tracking-tight leading-snug">
                      {card.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-[#6c7079] leading-relaxed line-clamp-3">
                      {card.subtitle}
                    </p>
                  </div>

                  <div className="pt-6 mt-6 border-t border-[#e5e7eb] flex flex-wrap items-center gap-3">
                    <Link
                      href={card.href}
                      className="flex-1 min-w-[140px] py-2.5 px-5 bg-[#14293a] hover:bg-[#b91c1c] text-white text-xs font-bold uppercase tracking-wider rounded-sm transition-colors inline-flex items-center justify-center gap-1.5"
                    >
                      <span>{card.actionText}</span>
                      <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </Link>

                    {card.couponCode && (
                      <button
                        type="button"
                        onClick={(e) => handleCopyCode(e, card.couponCode!)}
                        className={`py-2.5 px-4 text-xs font-mono font-bold uppercase tracking-wider rounded-sm border transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
                          isCopied
                            ? 'bg-emerald-700 text-white border-emerald-700'
                            : 'bg-[#f8f8f8] text-[#14293a] border-[#d3d6db] hover:border-[#14293a]'
                        }`}
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5" strokeWidth={1.75} />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" strokeWidth={1.75} />
                            <span>{card.couponCode}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })()
        ) : (
          <div
            className={`grid grid-cols-1 gap-6 ${
              offerCards.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'
            }`}
          >
            {offerCards.map((card, idx) => {
              const isCopied = Boolean(card.couponCode && copiedCode === card.couponCode)
              const countdown = formatCountdown(card.endsAt)

              return (
                <div
                  key={card.id}
                  className="group relative overflow-hidden rounded-sm border border-[#d3d6db] hover:border-[#14293a] transition-colors flex flex-col justify-between h-[380px] sm:h-[420px] bg-neutral-950"
                >
                  <div className="absolute inset-0 overflow-hidden">
                    <ProductImage
                      src={card.imageUrl}
                      alt={card.title}
                      fill
                      sizes={
                        offerCards.length === 2
                          ? '(max-width: 768px) 100vw, 50vw'
                          : '(max-width: 768px) 100vw, 33vw'
                      }
                      className="group-hover:scale-105 transition-transform duration-500 ease-out"
                      priority={idx < 2}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/20" />
                  </div>

                  <div className="relative z-10 p-5 flex items-start justify-between gap-2">
                    <span className="inline-block px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase bg-black/50 backdrop-blur-sm text-white border border-white/20 rounded-sm">
                      {card.badge}
                    </span>

                    {card.couponCode && (
                      <button
                        type="button"
                        onClick={(e) => handleCopyCode(e, card.couponCode!)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[11px] font-mono font-bold uppercase transition-colors cursor-pointer ${
                          isCopied
                            ? 'bg-emerald-700 text-white border border-emerald-600'
                            : 'bg-white text-[#14293a] hover:bg-neutral-100 border border-white'
                        }`}
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3 h-3" strokeWidth={1.75} />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" strokeWidth={1.75} />
                            <span>{card.couponCode}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <div className="relative z-10 p-5 sm:p-6 flex flex-col justify-end space-y-2 text-white">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold tracking-wider text-amber-300 uppercase">
                        {card.discountText}
                      </span>
                      {countdown && (
                        <span className="text-[11px] text-white/80 font-medium">{countdown}</span>
                      )}
                    </div>

                    <h3 className="text-xl sm:text-2xl font-bold text-white leading-snug tracking-tight">
                      {card.title}
                    </h3>

                    <p className="text-xs text-neutral-200 line-clamp-2 leading-relaxed">
                      {card.subtitle}
                    </p>

                    <div className="pt-3 border-t border-white/20">
                      <Link
                        href={card.href}
                        className="inline-flex items-center gap-1.5 text-white font-bold uppercase tracking-wider hover:text-amber-300 transition-colors text-xs"
                      >
                        <span>{card.actionText}</span>
                        <ArrowRight
                          className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform"
                          strokeWidth={1.75}
                        />
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
