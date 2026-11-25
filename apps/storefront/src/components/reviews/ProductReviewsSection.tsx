'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Image from 'next/image'
import {
  Star,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Image as ImageIcon,
  MessageSquare,
  X,
  Filter,
  SlidersHorizontal,
  UploadCloud,
  ChevronDown,
  RotateCcw,
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
  const [sortBy, setSortBy] = useState<'recent' | 'highest' | 'lowest'>('recent')

  // Lightbox
  const [activePhoto, setActivePhoto] = useState<{
    url: string
    title?: string
    author?: string
  } | null>(null)

  // Write Review Modal
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false)
  const [writeRating, setWriteRating] = useState(5)
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const [writeFit, setWriteFit] = useState<FashionFitIndicator>('true_to_size')
  const [writeSize, setWriteSize] = useState('M')
  const [writeTitle, setWriteTitle] = useState('')
  const [writeComment, setWriteComment] = useState('')
  const [writePhotos, setWritePhotos] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formFeedback, setFormFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  const writeModalRef = useRef<HTMLDialogElement | null>(null)

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

  // Native Dialog control according to modern-web-guidance
  useEffect(() => {
    const dialog = writeModalRef.current
    if (!dialog) return
    if (isWriteModalOpen) {
      if (!dialog.open) {
        dialog.showModal()
      }
    } else {
      if (dialog.open) {
        dialog.close()
      }
    }
  }, [isWriteModalOpen])

  // Extract all media across reviews for the photo reel
  const allCustomerPhotos = useMemo(() => {
    const photos: { url: string; reviewId: string; author: string; title: string }[] = []
    reviews.forEach((r) => {
      if (r.media) {
        r.media.forEach((m) => {
          photos.push({
            url: m.image_url,
            reviewId: r.id,
            author: r.user?.name || r.user?.full_name || 'Verified Buyer',
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
    if (fitTotal === 0) return 'Standard regular fit'
    if (truePct >= 60) return `${truePct}% of customers say this fits true to size`
    if (smallPct > truePct && smallPct > largePct)
      return `${smallPct}% of customers suggest sizing up (runs slightly small)`
    if (largePct > truePct) return `${largePct}% of customers suggest sizing down (relaxed fit)`
    return `${truePct}% of customers report true to size`
  }, [fitTotal, truePct, smallPct, largePct])

  // Sorted reviews list
  const sortedReviews = useMemo(() => {
    const list = [...reviews]
    if (sortBy === 'highest') return list.sort((a, b) => b.rating - a.rating)
    if (sortBy === 'lowest') return list.sort((a, b) => a.rating - b.rating)
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [reviews, sortBy])

  // Submit Review Handler
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormFeedback(null)

    if (!writeTitle.trim() || !writeComment.trim()) {
      setFormFeedback({ type: 'error', text: 'Please provide both a review headline and detailed feedback.' })
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          rating: writeRating,
          title: writeTitle.trim(),
          comment: writeComment.trim(),
          fitIndicator: writeFit,
          sizePurchased: writeSize,
          mediaUrls: writePhotos,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setFormFeedback({
          type: 'error',
          text: data.error || 'Failed to submit review. You must be signed in with a completed purchase to review.',
        })
        return
      }

      setFormFeedback({
        type: 'success',
        text: 'Thank you! Your review has been submitted successfully.',
      })

      setTimeout(() => {
        setIsWriteModalOpen(false)
        setWriteTitle('')
        setWriteComment('')
        setWritePhotos([])
        setFormFeedback(null)
        fetchReviews()
      }, 1500)
    } catch (err: any) {
      setFormFeedback({
        type: 'error',
        text: err?.message || 'Network error submitting review.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasActiveFilters = selectedRating !== 'all' || selectedFit !== 'all' || onlyPhotos

  return (
    <section className="mt-16 pt-12 border-t border-[#e5e7eb] font-sans text-[#14293a]">
      {/* 1. Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#14293a]">
            Customer Reviews &amp; Ratings
          </h2>
          <p className="text-xs text-[#6c7079] mt-1">
            Verified feedback on fit, quality, and garment feel.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsWriteModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#14293a] text-white hover:bg-[#b91c1c] text-xs font-bold uppercase tracking-wider rounded-sm transition-colors cursor-pointer shadow-xs"
        >
          <Star className="w-3.5 h-3.5 fill-white" />
          <span>Write a Review</span>
        </button>
      </div>

      {/* 2. Rating & Fit Overview Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#f8f9fa] border border-[#e5e7eb] rounded-sm p-6 sm:p-8 mb-10">
        {/* Left: Overall Rating & Distribution (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#e5e7eb] pb-6 lg:pb-0 lg:pr-8">
          <div>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl sm:text-5xl font-bold tabular-nums text-[#14293a]">
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
                          : 'text-[#d3d6db]'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-[#6c7079]">
                  {summary.review_count > 0
                    ? `Based on ${summary.review_count} verified review${summary.review_count === 1 ? '' : 's'}`
                    : 'Based on customer feedback'}
                </p>
              </div>
            </div>
          </div>

          {/* Star Rating Breakdown Bars */}
          <div className="space-y-2 mt-6">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = summary.distribution[star as 1 | 2 | 3 | 4 | 5] || 0
              const pct = summary.review_count > 0 ? Math.round((count / summary.review_count) * 100) : 0
              const isSelected = selectedRating === star

              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => setSelectedRating(isSelected ? 'all' : (star as any))}
                  className={`w-full flex items-center gap-2.5 text-xs text-left group transition-all cursor-pointer ${
                    selectedRating !== 'all' && !isSelected ? 'opacity-40 hover:opacity-75' : ''
                  }`}
                >
                  <span className="w-7 text-xs font-semibold text-[#14293a] shrink-0">
                    {star} ★
                  </span>
                  <div className="flex-1 h-2 bg-[#e5e7eb] rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        isSelected ? 'bg-[#b91c1c]' : 'bg-[#14293a]'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-xs tabular-nums text-[#6c7079] group-hover:text-[#14293a]">
                    {pct}%
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Right: Sizing & Fit Verdict (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between lg:pl-2">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#14293a] flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#14293a]" />
                Size &amp; Fit Verdict
              </h3>
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 border border-emerald-200 rounded-xs">
                Verified Customer Sizing
              </span>
            </div>

            <p className="text-sm font-medium text-[#14293a] mb-5">
              {fitVerdict}
            </p>

            {/* Tri-Segment Fit Progress Bar */}
            <div className="space-y-2">
              <div className="h-3 w-full bg-[#e5e7eb] rounded-full overflow-hidden flex">
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

              {/* Segment Labels */}
              <div className="flex items-center justify-between text-xs pt-1 text-[#6c7079]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                  <span>Runs Small ({smallPct}%)</span>
                </div>
                <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
                  <span>True to Size ({truePct}%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                  <span>Runs Large ({largePct}%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Reassurance Strip */}
          <div className="mt-6 p-3 bg-white border border-[#e5e7eb] rounded-xs flex flex-wrap items-center justify-between gap-2 text-xs text-[#6c7079]">
            <span className="flex items-center gap-1.5 font-medium text-[#14293a]">
              <Zap className="w-3.5 h-3.5 text-[#b91c1c] fill-[#b91c1c]" />
              Bolt 45-Min Doorstep Fitting Available
            </span>
            <span>Try on at home before committing</span>
          </div>
        </div>
      </div>

      {/* 3. Customer Photos Strip */}
      {allCustomerPhotos.length > 0 && (
        <div className="space-y-3 mb-10">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#14293a] flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-[#14293a]" />
              Customer Photos ({allCustomerPhotos.length})
            </h3>
            <span className="text-xs text-[#6c7079]">Click photo to enlarge</span>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2">
            {allCustomerPhotos.map((photo, idx) => (
              <button
                key={photo.url + idx}
                type="button"
                onClick={() =>
                  setActivePhoto({
                    url: photo.url,
                    title: photo.title,
                    author: photo.author,
                  })
                }
                className="w-24 h-28 relative rounded-xs border border-[#e5e7eb] overflow-hidden shrink-0 cursor-zoom-in hover:opacity-90 hover:border-[#14293a] transition-all shadow-xs"
              >
                <Image
                  src={photo.url}
                  alt={`Customer uploaded photo ${idx + 1}`}
                  fill
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. Filters & Sorting Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-b border-[#e5e7eb] pb-4 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#6c7079] flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3 text-[#14293a]" /> Filter:
          </span>

          {/* Star Filter Dropdown */}
          <select
            value={selectedRating}
            onChange={(e) =>
              setSelectedRating(e.target.value === 'all' ? 'all' : Number(e.target.value))
            }
            className="text-xs bg-white border border-[#d3d6db] rounded-xs px-3 py-1.5 text-[#14293a] focus:outline-none focus:border-[#14293a] cursor-pointer"
          >
            <option value="all">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>

          {/* Fit Filter Dropdown */}
          <select
            value={selectedFit}
            onChange={(e) => setSelectedFit(e.target.value as any)}
            className="text-xs bg-white border border-[#d3d6db] rounded-xs px-3 py-1.5 text-[#14293a] focus:outline-none focus:border-[#14293a] cursor-pointer"
          >
            <option value="all">All Sizing Fits</option>
            <option value="true_to_size">True to Size</option>
            <option value="runs_small">Runs Small</option>
            <option value="runs_large">Runs Large</option>
          </select>

          {/* Photos Only Toggle */}
          <button
            type="button"
            onClick={() => setOnlyPhotos(!onlyPhotos)}
            className={`text-xs px-3 py-1.5 rounded-xs border transition-colors flex items-center gap-1.5 cursor-pointer font-medium ${
              onlyPhotos
                ? 'bg-[#14293a] text-white border-[#14293a]'
                : 'bg-white text-[#6c7079] border-[#d3d6db] hover:border-[#14293a] hover:text-[#14293a]'
            }`}
          >
            <ImageIcon className="w-3 h-3" />
            <span>With Photos</span>
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setSelectedRating('all')
                setSelectedFit('all')
                setOnlyPhotos(false)
              }}
              className="text-xs text-[#b91c1c] hover:underline flex items-center gap-1 font-semibold cursor-pointer ml-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Sort Order */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#6c7079]">Sort By:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs bg-white border border-[#d3d6db] rounded-xs px-3 py-1.5 text-[#14293a] focus:outline-none focus:border-[#14293a] cursor-pointer font-medium"
          >
            <option value="recent">Most Recent</option>
            <option value="highest">Highest Rating</option>
            <option value="lowest">Lowest Rating</option>
          </select>
        </div>
      </div>

      {/* 5. Reviews List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-[#6c7079]">
          Loading customer feedback...
        </div>
      ) : sortedReviews.length === 0 ? (
        <div className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-sm p-12 text-center space-y-3">
          <Star className="w-8 h-8 text-[#9ca3af] mx-auto" />
          <h3 className="font-bold text-base text-[#14293a]">
            {hasActiveFilters ? 'No reviews match your filter' : 'No reviews yet'}
          </h3>
          <p className="text-xs text-[#6c7079] max-w-md mx-auto leading-relaxed">
            {hasActiveFilters
              ? 'Try resetting your rating or sizing filters to view all customer reviews.'
              : 'Be the first to share your thoughts on this garment piece.'}
          </p>
          <div className="pt-2">
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedRating('all')
                  setSelectedFit('all')
                  setOnlyPhotos(false)
                }}
                className="px-4 py-2 bg-[#14293a] text-white text-xs font-bold uppercase tracking-wider rounded-sm"
              >
                Reset Filters
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsWriteModalOpen(true)}
                className="px-5 py-2.5 bg-[#14293a] text-white text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-[#b91c1c] transition-colors"
              >
                Write First Review
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="divide-y divide-[#e5e7eb]">
          {sortedReviews.map((rev) => {
            const authorName = rev.user?.name || rev.user?.full_name || 'Verified Buyer'

            return (
              <article key={rev.id} className="py-6 space-y-3">
                {/* Review Header: Stars, Author, Verified Badge, Date */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Star Icons */}
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-[#d3d6db]'
                          }`}
                        />
                      ))}
                    </div>

                    <span className="font-bold text-xs text-[#14293a]">
                      {authorName}
                    </span>

                    {/* Verified Purchase Badge */}
                    {rev.verified_purchase && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 border border-emerald-200 rounded-xs">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Verified Purchase
                      </span>
                    )}

                    {/* Bolt Try-On Badge */}
                    {rev.is_bolt_try_on && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#b91c1c] bg-red-50 px-2 py-0.5 border border-red-200 rounded-xs">
                        <Zap className="w-2.5 h-2.5 fill-[#b91c1c]" />
                        Bolt Doorstep Fitting
                      </span>
                    )}
                  </div>

                  <span className="text-xs text-[#8a909a] tabular-nums">
                    {new Date(rev.created_at).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                {/* Sizing & Fit Metadata */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#6c7079]">
                  {rev.size_purchased && (
                    <span className="bg-[#f3f4f6] text-[#14293a] px-2 py-0.5 rounded-xs font-medium">
                      Size: {rev.size_purchased}
                    </span>
                  )}
                  <span>
                    Fit: <strong className="text-[#14293a] font-semibold capitalize">{rev.fit_indicator.replace(/_/g, ' ')}</strong>
                  </span>
                </div>

                {/* Review Title & Body */}
                <h4 className="font-bold text-sm text-[#14293a] leading-snug">
                  {rev.title}
                </h4>
                <p className="text-sm text-[#374151] leading-relaxed whitespace-pre-line">
                  {rev.comment}
                </p>

                {/* Customer Photo Attachments */}
                {rev.media && rev.media.length > 0 && (
                  <div className="flex gap-2.5 pt-1">
                    {rev.media.map((med, idx) => (
                      <button
                        key={med.id || idx}
                        type="button"
                        onClick={() =>
                          setActivePhoto({
                            url: med.image_url,
                            title: rev.title,
                            author: authorName,
                          })
                        }
                        className="w-16 h-20 relative rounded-xs border border-[#e5e7eb] overflow-hidden cursor-zoom-in hover:opacity-90 hover:border-[#14293a] transition-all shadow-xs"
                      >
                        <Image
                          src={med.image_url}
                          alt={`Customer photo ${idx + 1}`}
                          fill
                          className="object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}

                {/* Brand / Store Response */}
                {rev.admin_reply && (
                  <div className="bg-[#f8f9fa] border-l-2 border-[#14293a] rounded-r-xs p-3.5 mt-3 space-y-1">
                    <div className="flex items-center justify-between text-xs text-[#14293a] font-bold">
                      <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                        <MessageSquare className="w-3 h-3 text-[#14293a]" />
                        Store Response
                      </span>
                      {rev.admin_replied_at && (
                        <span className="text-[#8a909a] font-normal text-[11px]">
                          {new Date(rev.admin_replied_at).toLocaleDateString('en-IN')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#4b5563] leading-relaxed">
                      {rev.admin_reply}
                    </p>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      {/* 6. Write a Review Modal (Native <dialog> conforming to modern-web-guidance) */}
      <dialog
        ref={writeModalRef}
        aria-labelledby="write-review-title"
        className="fixed inset-0 m-auto bg-transparent p-4 max-w-lg w-full backdrop:bg-black/60 backdrop:backdrop-blur-xs z-50 overflow-visible"
        style={{ overscrollBehavior: 'contain' }}
        onClose={() => setIsWriteModalOpen(false)}
      >
        <div className="bg-white border border-[#e5e7eb] rounded-sm shadow-2xl p-6 sm:p-8 space-y-6 font-sans text-[#14293a]">
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-3">
            <div>
              <h3 id="write-review-title" className="text-lg font-bold text-[#14293a]">
                Write a Review
              </h3>
              <p className="text-xs text-[#6c7079] mt-0.5">
                {productTitle || 'Share your experience with this piece'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsWriteModalOpen(false)}
              className="p-1.5 text-[#8a909a] hover:text-[#14293a] rounded-xs cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {formFeedback && (
            <div
              className={`p-3 text-xs rounded-xs border ${
                formFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}
            >
              {formFeedback.text}
            </div>
          )}

          <form onSubmit={handleReviewSubmit} className="space-y-5">
            {/* 1. Star Rating Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#14293a] block">
                Overall Rating <span className="text-[#b91c1c]">*</span>
              </label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => {
                  const filled = (hoverRating !== null ? hoverRating : writeRating) >= star
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      onClick={() => setWriteRating(star)}
                      className="p-1 cursor-pointer transition-transform hover:scale-110"
                      aria-label={`Rate ${star} out of 5 stars`}
                    >
                      <Star
                        className={`w-6 h-6 ${
                          filled ? 'fill-amber-400 text-amber-400' : 'text-[#d3d6db]'
                        }`}
                      />
                    </button>
                  )
                })}
                <span className="text-xs font-bold text-[#14293a] ml-2">
                  {writeRating} / 5 Stars
                </span>
              </div>
            </div>

            {/* 2. Sizing / Fit Indicator */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#14293a] block">
                How does it fit? <span className="text-[#b91c1c]">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'runs_small', label: 'Runs Small' },
                  { value: 'true_to_size', label: 'True to Size' },
                  { value: 'runs_large', label: 'Runs Large' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setWriteFit(opt.value as any)}
                    className={`py-2 px-2 text-xs font-semibold rounded-xs border text-center transition-colors cursor-pointer ${
                      writeFit === opt.value
                        ? 'bg-[#14293a] text-white border-[#14293a]'
                        : 'bg-white text-[#6c7079] border-[#d3d6db] hover:border-[#14293a] hover:text-[#14293a]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Size Purchased */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#14293a] block">
                Size Purchased
              </label>
              <select
                value={writeSize}
                onChange={(e) => setWriteSize(e.target.value)}
                className="w-full text-xs bg-white border border-[#d3d6db] rounded-xs px-3 py-2 text-[#14293a] focus:outline-none focus:border-[#14293a]"
              >
                {['XS', 'S', 'M', 'L', 'XL', 'XXL', '30', '32', '34', '36'].map((sz) => (
                  <option key={sz} value={sz}>
                    Size {sz}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Headline */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#14293a] block">
                Review Headline <span className="text-[#b91c1c]">*</span>
              </label>
              <input
                type="text"
                value={writeTitle}
                onChange={(e) => setWriteTitle(e.target.value)}
                placeholder="e.g. Exceptional weight and drape"
                maxLength={100}
                required
                className="w-full text-xs bg-white border border-[#d3d6db] rounded-xs px-3 py-2 text-[#14293a] focus:outline-none focus:border-[#14293a]"
              />
            </div>

            {/* 5. Detailed Comment */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#14293a] block">
                Detailed Feedback <span className="text-[#b91c1c]">*</span>
              </label>
              <textarea
                value={writeComment}
                onChange={(e) => setWriteComment(e.target.value)}
                placeholder="Describe the fabric feel, shoulder drop, wash quality, or fit expectations..."
                rows={4}
                required
                className="w-full text-xs bg-white border border-[#d3d6db] rounded-xs p-3 text-[#14293a] focus:outline-none focus:border-[#14293a] leading-relaxed resize-none"
              />
            </div>

            {/* Submit / Cancel Footer */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#e5e7eb]">
              <button
                type="button"
                onClick={() => setIsWriteModalOpen(false)}
                className="px-4 py-2 border border-[#d3d6db] text-[#14293a] hover:bg-neutral-100 text-xs font-semibold rounded-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-[#14293a] hover:bg-[#b91c1c] text-white text-xs font-bold uppercase tracking-wider rounded-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </form>
        </div>
      </dialog>

      {/* 7. Photo Lightbox Modal */}
      {activePhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setActivePhoto(null)}
        >
          <div
            className="relative max-w-2xl max-h-[85vh] w-full h-[80vh] flex flex-col justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full h-full">
              <Image
                src={activePhoto.url}
                alt={activePhoto.title || 'Customer review photograph'}
                fill
                className="object-contain"
              />
            </div>
            {activePhoto.title && (
              <div className="text-center text-white mt-3 font-sans text-xs">
                <span className="font-bold">{activePhoto.title}</span> —{' '}
                <span className="text-neutral-400 text-xs">by {activePhoto.author}</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setActivePhoto(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white p-2 cursor-pointer"
            aria-label="Close photo preview"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      )}
    </section>
  )
}
