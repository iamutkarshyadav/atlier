'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import Image from 'next/image'
import {
  Star,
  ShieldCheck,
  Zap,
  Image as ImageIcon,
  MessageSquare,
  Sparkles,
  ChevronRight,
  X,
  Filter,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react'
import type {
  ProductReviewWithMedia,
  ProductRatingAggregate,
  FashionFitIndicator,
} from '@repo/supabase'

interface ProductReviewsSectionProps {
  productId: string
  productTitle?: string
}

export function ProductReviewsSection({ productId, productTitle }: ProductReviewsSectionProps) {
  const [reviews, setReviews] = useState<ProductReviewWithMedia[]>([])
  const [summary, setSummary] = useState<ProductRatingAggregate>({
    average_rating: 0,
    review_count: 0,
    fit_runs_small_count: 0,
    fit_true_to_size_count: 0,
    fit_runs_large_count: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  })
  const [loading, setLoading] = useState(true)

  // Filters
  const [selectedRating, setSelectedRating] = useState<number | 'all'>('all')
  const [selectedFit, setSelectedFit] = useState<FashionFitIndicator | 'all'>('all')
  const [onlyPhotos, setOnlyPhotos] = useState(false)

  // Lightbox
  const [activePhoto, setActivePhoto] = useState<{
    url: string
    title?: string
    author?: string
  } | null>(null)

  const fetchReviews = useCallback(async () => {
    try {
      const params = new URLSearchParams({ productId })
      if (selectedRating !== 'all') params.set('rating', String(selectedRating))
      if (selectedFit !== 'all') params.set('fit', selectedFit)
      if (onlyPhotos) params.set('hasPhotos', 'true')

      const res = await fetch(`/api/reviews?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setReviews(data.reviews || [])
          if (data.summary) {
            setSummary(data.summary)
          }
        }
      }
    } catch (err) {
      console.error('Failed to load product reviews:', err)
    } finally {
      setLoading(false)
    }
  }, [productId, selectedRating, selectedFit, onlyPhotos])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  // Extract all media across reviews for the photo strip
  const allPatronPhotos = useMemo(() => {
    const photos: { url: string; reviewId: string; author: string; title: string }[] = []
    reviews.forEach((r) => {
      if (r.media) {
        r.media.forEach((m) => {
          photos.push({
            url: m.image_url,
            reviewId: r.id,
            author: r.user?.full_name || 'Patron',
            title: r.title,
          })
        })
      }
    })
    return photos
  }, [reviews])

  // Fit Consensus percentages
  const fitTotal =
    summary.fit_runs_small_count + summary.fit_true_to_size_count + summary.fit_runs_large_count
  const smallPct = fitTotal > 0 ? Math.round((summary.fit_runs_small_count / fitTotal) * 100) : 0
  const truePct = fitTotal > 0 ? Math.round((summary.fit_true_to_size_count / fitTotal) * 100) : 100
  const largePct = fitTotal > 0 ? Math.round((summary.fit_runs_large_count / fitTotal) * 100) : 0

  const fitVerdict = useMemo(() => {
    if (fitTotal === 0) return 'Standard tailored silhouette'
    if (truePct >= 65) return `True to Size (${truePct}% of patrons recommend ordering your true size)`
    if (smallPct > truePct && smallPct > largePct)
      return `Runs Slightly Small (${smallPct}% recommend sizing up)`
    if (largePct > truePct) return `Relaxed Silhouette (${largePct}% note a generous cut)`
    return `Balanced Tailoring (${truePct}% true to size)`
  }, [fitTotal, truePct, smallPct, largePct])

  return (
    <section className="mt-16 pt-12 border-t border-[#e5e7eb] font-sans">
      {/* Section Title */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-2xs uppercase tracking-widest text-amber-700 font-mono font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Maison TG Client Impressions</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#14293a] mt-1">
            Patron Reviews & Fit Consensus
          </h2>
        </div>

        {summary.review_count > 0 && (
          <div className="text-right">
            <span className="text-xs font-mono text-neutral-500">
              Verified Order Feedback: {summary.review_count} {summary.review_count === 1 ? 'entry' : 'entries'}
            </span>
          </div>
        )}
      </div>

      {summary.review_count === 0 && !loading ? (
        <div className="bg-[#fafafa] border border-[#e5e7eb] rounded-sm p-10 text-center space-y-2">
          <Star className="w-8 h-8 text-neutral-400 mx-auto" />
          <h3 className="font-serif font-bold text-base text-[#14293a]">
            First Impressions Awaiting Publication
          </h3>
          <p className="text-xs text-neutral-500 max-w-md mx-auto">
            Order this garment piece and share your impressions after delivery. All verified reviews are curated by our editorial team.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Rating Summary & Fit Consensus Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-[#fafafa] border border-[#e5e7eb] rounded-sm p-6 sm:p-8">
            {/* Left: Overall Score (4 cols) */}
            <div className="lg:col-span-4 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#e5e7eb] pb-6 lg:pb-0 lg:pr-8">
              <div>
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl font-serif font-bold text-[#14293a]">
                    {summary.average_rating > 0 ? summary.average_rating.toFixed(1) : '5.0'}
                  </span>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i <= Math.round(summary.average_rating || 5)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-neutral-300'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-2xs font-mono text-neutral-500">out of 5.0 stars</p>
                  </div>
                </div>

                <p className="text-xs text-neutral-600 mt-3 font-serif italic">
                  Based on {summary.review_count} verified client purchase{summary.review_count === 1 ? '' : 's'}.
                </p>
              </div>

              {/* Star Distribution Bars */}
              <div className="space-y-1.5 mt-6">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = summary.distribution[star as 1 | 2 | 3 | 4 | 5] || 0
                  const pct = summary.review_count > 0 ? Math.round((count / summary.review_count) * 100) : 0

                  return (
                    <button
                      key={star}
                      onClick={() =>
                        setSelectedRating(selectedRating === star ? 'all' : (star as any))
                      }
                      className={`w-full flex items-center gap-2 text-2xs font-mono text-left group transition-opacity ${
                        selectedRating !== 'all' && selectedRating !== star ? 'opacity-40' : ''
                      }`}
                    >
                      <span className="w-6 text-neutral-500 shrink-0">{star}★</span>
                      <div className="flex-1 h-2 bg-neutral-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 transition-all duration-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-neutral-400 group-hover:text-neutral-700">
                        {pct}%
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Right: Atelier Fit Consensus Gauge (8 cols) */}
            <div className="lg:col-span-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-[#14293a] flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
                    Atelier Tailoring & Fit Consensus
                  </h3>
                  <span className="text-2xs font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 border border-emerald-200 rounded-xs font-medium">
                    Verified Fit Data
                  </span>
                </div>

                <p className="text-xs text-neutral-600 mb-5 leading-relaxed font-serif">
                  {fitVerdict}
                </p>

                {/* Tri-Segment Fit Bar */}
                <div className="space-y-2">
                  <div className="h-3.5 w-full bg-neutral-200 rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${smallPct}%` }}
                      className="bg-amber-400 h-full transition-all duration-500"
                      title={`Runs Small: ${smallPct}%`}
                    />
                    <div
                      style={{ width: `${truePct}%` }}
                      className="bg-emerald-600 h-full transition-all duration-500"
                      title={`True to Size: ${truePct}%`}
                    />
                    <div
                      style={{ width: `${largePct}%` }}
                      className="bg-indigo-500 h-full transition-all duration-500"
                      title={`Runs Large: ${largePct}%`}
                    />
                  </div>

                  {/* Segment Legends */}
                  <div className="flex items-center justify-between text-2xs font-mono pt-1 text-neutral-600">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                      <span>Runs Small ({smallPct}%)</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                      <span>True to Size ({truePct}%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
                      <span>Runs Large ({largePct}%)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bolt Try-On Note */}
              <div className="mt-6 p-3 bg-white border border-[#e5e7eb] rounded-xs flex items-center justify-between text-2xs font-mono text-neutral-600">
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                  Try at home with Bolt 45-Min Doorstep Fitting
                </span>
                <span className="text-neutral-400">Doorstep returns excluded from rating</span>
              </div>
            </div>
          </div>

          {/* Patron Photos Strip */}
          {allPatronPhotos.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-[#14293a] flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-neutral-500" />
                  Patron Photos ({allPatronPhotos.length})
                </h3>
                <span className="text-2xs font-mono text-neutral-400">Click to zoom</span>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                {allPatronPhotos.map((photo, idx) => (
                  <div
                    key={photo.url + idx}
                    onClick={() =>
                      setActivePhoto({
                        url: photo.url,
                        title: photo.title,
                        author: photo.author,
                      })
                    }
                    className="w-24 h-32 relative rounded-xs border border-[#e5e7eb] overflow-hidden shrink-0 cursor-zoom-in hover:opacity-90 hover:border-[#14293a] transition-all shadow-2xs"
                  >
                    <Image
                      src={photo.url}
                      alt={`Patron photograph ${idx + 1}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-b border-[#e5e7eb] pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-2xs font-mono uppercase text-neutral-500 flex items-center gap-1 mr-1">
                <Filter className="w-3 h-3" /> Filters:
              </span>

              {/* Star Filter Pill */}
              <select
                value={selectedRating}
                onChange={(e) =>
                  setSelectedRating(e.target.value === 'all' ? 'all' : Number(e.target.value))
                }
                className="text-2xs font-mono bg-white border border-[#d3d6db] rounded-xs px-2.5 py-1 text-neutral-700 focus:outline-hidden cursor-pointer"
              >
                <option value="all">All Star Ratings</option>
                <option value="5">5 Stars Only</option>
                <option value="4">4 Stars Only</option>
                <option value="3">3 Stars Only</option>
                <option value="2">2 Stars Only</option>
                <option value="1">1 Star Only</option>
              </select>

              {/* Fit Filter Pill */}
              <select
                value={selectedFit}
                onChange={(e) => setSelectedFit(e.target.value as any)}
                className="text-2xs font-mono bg-white border border-[#d3d6db] rounded-xs px-2.5 py-1 text-neutral-700 focus:outline-hidden cursor-pointer"
              >
                <option value="all">All Sizing Fits</option>
                <option value="true_to_size">True to Size</option>
                <option value="runs_small">Runs Small</option>
                <option value="runs_large">Runs Large</option>
              </select>

              {/* Has Photos Toggle */}
              <button
                type="button"
                onClick={() => setOnlyPhotos(!onlyPhotos)}
                className={`text-2xs font-mono px-2.5 py-1 rounded-xs border transition-colors flex items-center gap-1 ${
                  onlyPhotos
                    ? 'bg-[#14293a] text-white border-[#14293a]'
                    : 'bg-white text-neutral-700 border-[#d3d6db] hover:border-neutral-400'
                }`}
              >
                <ImageIcon className="w-3 h-3" />
                With Photos Only
              </button>
            </div>

            {(selectedRating !== 'all' || selectedFit !== 'all' || onlyPhotos) && (
              <button
                onClick={() => {
                  setSelectedRating('all')
                  setSelectedFit('all')
                  setOnlyPhotos(false)
                }}
                className="text-2xs font-mono text-neutral-500 hover:text-[#14293a] underline"
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* Reviews List */}
          {reviews.length === 0 ? (
            <div className="py-12 text-center text-neutral-500 text-xs font-mono">
              No reviews match the selected filter criteria.
            </div>
          ) : (
            <div className="divide-y divide-[#e5e7eb]">
              {reviews.map((rev) => {
                const authorName = rev.user?.full_name || 'Verified Patron'

                return (
                  <article key={rev.id} className="py-8 space-y-3.5">
                    {/* Header: Rating, Date, Patron */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        {/* Stars */}
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-200'
                              }`}
                            />
                          ))}
                        </div>

                        {/* Patron Name */}
                        <span className="font-serif font-bold text-xs text-[#14293a]">
                          {authorName}
                        </span>

                        {/* Verified Purchase Badge */}
                        {rev.verified_purchase && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 border border-emerald-200 rounded-xs">
                            <ShieldCheck className="w-3 h-3" /> Verified Purchase
                          </span>
                        )}

                        {/* Bolt Try-On Badge */}
                        {rev.is_bolt_try_on && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.2 border border-amber-300 rounded-xs">
                            <Zap className="w-2.5 h-2.5 fill-amber-500" /> Bolt 45m Kept
                          </span>
                        )}
                      </div>

                      <span className="text-2xs font-mono text-neutral-400">
                        {new Date(rev.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    {/* Sizing & Fit Feedback */}
                    <div className="flex items-center gap-2 text-2xs font-mono text-neutral-500">
                      {rev.size_purchased && (
                        <span className="bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded-xs border border-neutral-200">
                          Size: {rev.size_purchased}
                        </span>
                      )}
                      <span>
                        Fit: <strong className="text-neutral-800 capitalize">{rev.fit_indicator.replace('_', ' ')}</strong>
                      </span>
                    </div>

                    {/* Review Title & Body */}
                    <h4 className="font-serif font-bold text-sm text-[#14293a]">{rev.title}</h4>
                    <p className="text-xs text-neutral-700 leading-relaxed font-sans whitespace-pre-line">
                      {rev.comment}
                    </p>

                    {/* Photo Attachments */}
                    {rev.media && rev.media.length > 0 && (
                      <div className="flex gap-2.5 pt-2">
                        {rev.media.map((med, idx) => (
                          <div
                            key={med.id || idx}
                            onClick={() =>
                              setActivePhoto({
                                url: med.image_url,
                                title: rev.title,
                                author: authorName,
                              })
                            }
                            className="w-16 h-20 relative rounded-xs border border-[#e5e7eb] overflow-hidden cursor-zoom-in hover:opacity-90 hover:border-[#14293a] transition-all shadow-2xs"
                          >
                            <Image
                              src={med.image_url}
                              alt={`Customer photo ${idx + 1}`}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Maison TG Concierge Response */}
                    {rev.admin_reply && (
                      <div className="bg-[#f8f9fa] border-l-2 border-amber-600 rounded-r-xs p-3.5 mt-3 space-y-1">
                        <div className="flex items-center justify-between text-2xs font-mono text-amber-800">
                          <span className="font-bold uppercase tracking-wider flex items-center gap-1.5">
                            <MessageSquare className="w-3 h-3 text-amber-600" />
                            Maison TG Atelier Concierge
                          </span>
                          {rev.admin_replied_at && (
                            <span className="text-neutral-400">
                              {new Date(rev.admin_replied_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-700 font-serif italic">
                          {rev.admin_reply}
                        </p>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Lightbox Modal */}
      {activePhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xs flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setActivePhoto(null)}
        >
          <div
            className="relative max-w-2xl max-h-[85vh] w-full h-[80vh] flex flex-col justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full h-full">
              <Image
                src={activePhoto.url}
                alt={activePhoto.title || 'Patron photograph'}
                fill
                className="object-contain"
              />
            </div>
            {activePhoto.title && (
              <div className="text-center text-white mt-3 font-serif text-xs">
                <span>{activePhoto.title}</span> —{' '}
                <span className="text-neutral-400 font-mono text-2xs">by {activePhoto.author}</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setActivePhoto(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white p-2"
            aria-label="Close photo preview"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      )}
    </section>
  )
}
