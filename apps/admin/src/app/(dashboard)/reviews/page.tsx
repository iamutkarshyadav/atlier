'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Star,
  CheckCircle2,
  XCircle,
  EyeOff,
  MessageSquare,
  RefreshCw,
  Search,
  Filter,
  Image as ImageIcon,
  Zap,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  ChevronRight,
  X,
  Trash2,
} from 'lucide-react'
import type { ProductReviewWithMedia, ReviewStatus, FashionFitIndicator } from '@repo/supabase'

interface ReviewMetrics {
  pendingCount: number
  approvedCount: number
  rejectedCount: number
  totalReviews: number
  lowRatingCount: number
  averageRating: number
  photosCount: number
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<ProductReviewWithMedia[]>([])
  const [metrics, setMetrics] = useState<ReviewMetrics>({
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    totalReviews: 0,
    lowRatingCount: 0,
    averageRating: 0,
    photosCount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  // Filters
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [selectedRating, setSelectedRating] = useState<number | 'all'>('all')
  const [onlyBolt, setOnlyBolt] = useState(false)
  const [onlyWithPhotos, setOnlyWithPhotos] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Concierge Reply state
  const [replyOpenId, setReplyOpenId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')

  // Rejection Modal state
  const [rejectModalId, setRejectModalId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  // Lightbox state
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/reviews/metrics')
      if (res.ok) {
        const data = await res.json()
        if (data.success && data.metrics) {
          setMetrics(data.metrics)
        }
      }
    } catch (err) {
      console.error('Failed to load review metrics:', err)
    }
  }, [])

  const fetchReviews = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (activeTab !== 'all') {
        params.set('status', activeTab)
      }
      if (selectedRating !== 'all') {
        params.set('rating', String(selectedRating))
      }
      if (onlyBolt) {
        params.set('isBolt', 'true')
      }
      if (onlyWithPhotos) {
        params.set('hasPhotos', 'true')
      }
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim())
      }

      const res = await fetch(`/api/admin/reviews?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setReviews(data.reviews || [])
        }
      }
    } catch (err) {
      console.error('Failed to load reviews:', err)
    } finally {
      setLoading(false)
    }
  }, [activeTab, selectedRating, onlyBolt, onlyWithPhotos, searchQuery])

  useEffect(() => {
    fetchMetrics()
    fetchReviews()
  }, [fetchMetrics, fetchReviews])

  const handleUpdateStatus = async (reviewId: string, status: ReviewStatus, reason?: string) => {
    setActionLoadingId(reviewId)
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          rejectionReason: reason || null,
        }),
      })

      if (res.ok) {
        setRejectModalId(null)
        setRejectionReason('')
        fetchMetrics()
        fetchReviews()
      } else {
        const err = await res.json().catch(() => ({}))
        alert(`Failed to update review: ${err.error || 'Server error'}`)
      }
    } catch (err) {
      alert('Error updating review status')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleSaveConciergeReply = async (reviewId: string) => {
    if (!replyText.trim()) return
    setActionLoadingId(reviewId)
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminReply: replyText.trim(),
        }),
      })

      if (res.ok) {
        setReplyOpenId(null)
        setReplyText('')
        fetchReviews()
      } else {
        const err = await res.json().catch(() => ({}))
        alert(`Failed to submit reply: ${err.error || 'Server error'}`)
      }
    } catch (err) {
      alert('Error submitting concierge reply')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to permanently delete this review?')) return
    setActionLoadingId(reviewId)
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        fetchMetrics()
        fetchReviews()
      } else {
        alert('Failed to delete review')
      }
    } catch {
      alert('Error deleting review')
    } finally {
      setActionLoadingId(null)
    }
  }

  const renderFitBadge = (fit: FashionFitIndicator) => {
    switch (fit) {
      case 'runs_small':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Runs Small
          </span>
        )
      case 'runs_large':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-mono font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            Runs Large
          </span>
        )
      case 'true_to_size':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            True to Size
          </span>
        )
    }
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i <= rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-600 dark:text-zinc-700'
            }`}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-chrome-950 text-foreground p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-chrome-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Customer Reviews & Moderation
            </h1>
            <span className="text-2xs font-mono uppercase bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/30 px-2 py-0.5 rounded">
              Verified Purchase Moderation
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-sans">
            Review verified customer experiences, oversee sizing fit feedback, and publish official store replies.
          </p>
        </div>

        <button
          onClick={() => {
            fetchMetrics()
            fetchReviews()
          }}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-chrome-900 hover:bg-slate-100 dark:hover:bg-chrome-850 border border-slate-200 dark:border-chrome-750 text-xs font-mono text-foreground rounded transition-colors self-start md:self-auto cursor-pointer shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-chrome-900 border border-slate-200 dark:border-chrome-800 rounded-lg p-3.5 shadow-2xs">
          <div className="text-2xs font-mono uppercase text-muted-foreground mb-1">Pending Moderation</div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-amber-500 dark:text-amber-400">{metrics.pendingCount}</span>
            {metrics.pendingCount > 0 && (
              <span className="text-2xs font-mono bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded">
                Action Req.
              </span>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-chrome-900 border border-slate-200 dark:border-chrome-800 rounded-lg p-3.5 shadow-2xs">
          <div className="text-2xs font-mono uppercase text-muted-foreground mb-1">Catalog Avg Rating</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {metrics.averageRating > 0 ? metrics.averageRating.toFixed(2) : '—'}
            </span>
            <span className="text-xs text-amber-500 dark:text-amber-400 font-mono">★</span>
          </div>
        </div>

        <div className="bg-white dark:bg-chrome-900 border border-slate-200 dark:border-chrome-800 rounded-lg p-3.5 shadow-2xs">
          <div className="text-2xs font-mono uppercase text-muted-foreground mb-1">Published Reviews</div>
          <div className="text-2xl font-bold font-mono text-foreground">{metrics.approvedCount}</div>
        </div>

        <div className="bg-white dark:bg-chrome-900 border border-slate-200 dark:border-chrome-800 rounded-lg p-3.5 shadow-2xs">
          <div className="text-2xs font-mono uppercase text-muted-foreground mb-1">Low-Rating Radar (≤2★)</div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">{metrics.lowRatingCount}</span>
            {metrics.lowRatingCount > 0 && (
              <span className="text-2xs font-mono bg-rose-500/20 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded">
                Alert
              </span>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-chrome-900 border border-slate-200 dark:border-chrome-800 rounded-lg p-3.5 shadow-2xs col-span-2 lg:col-span-1">
          <div className="text-2xs font-mono uppercase text-muted-foreground mb-1">Customer Photos</div>
          <div className="text-2xl font-bold font-mono text-cyan-600 dark:text-cyan-400">{metrics.photosCount}</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-chrome-900 border border-slate-200 dark:border-chrome-800 rounded-lg p-4 space-y-3 shadow-2xs">
        {/* Tab Selection */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-chrome-800/80 pb-3">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-chrome-950 p-1 rounded-md border border-slate-200 dark:border-chrome-800">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3 py-1 text-xs font-mono font-medium rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'pending'
                  ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              <span>Pending Queue</span>
              {metrics.pendingCount > 0 && (
                <span className="px-1.5 py-0.2 text-2xs bg-amber-500 text-white dark:text-chrome-950 font-bold rounded-full">
                  {metrics.pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`px-3 py-1 text-xs font-mono font-medium rounded transition-colors cursor-pointer ${
                activeTab === 'approved'
                  ? 'bg-white dark:bg-chrome-800 text-slate-900 dark:text-zinc-100 border border-slate-200 dark:border-chrome-700 shadow-2xs font-semibold'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              Published ({metrics.approvedCount})
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={`px-3 py-1 text-xs font-mono font-medium rounded transition-colors cursor-pointer ${
                activeTab === 'rejected'
                  ? 'bg-white dark:bg-chrome-800 text-slate-900 dark:text-zinc-100 border border-slate-200 dark:border-chrome-700 shadow-2xs font-semibold'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              Rejected / Hidden ({metrics.rejectedCount})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 text-xs font-mono font-medium rounded transition-colors cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white dark:bg-chrome-800 text-slate-900 dark:text-zinc-100 border border-slate-200 dark:border-chrome-700 shadow-2xs font-semibold'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              All Records ({metrics.totalReviews})
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search garments, patrons, words..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-chrome-950 border border-chrome-800 rounded pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-hidden focus:border-chrome-600 font-sans"
            />
          </div>
        </div>

        {/* Secondary Filter Chips */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {/* Star Filter */}
          <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-400">
            <span>Rating:</span>
            {[
              { val: 'all', label: 'All' },
              { val: 5, label: '5★' },
              { val: 4, label: '4★' },
              { val: 3, label: '3★' },
              { val: 2, label: '2★' },
              { val: 1, label: '1★' },
            ].map((opt) => (
              <button
                key={String(opt.val)}
                onClick={() => setSelectedRating(opt.val as any)}
                className={`px-2 py-0.5 text-2xs font-mono rounded border transition-colors ${
                  selectedRating === opt.val
                    ? 'bg-chrome-800 text-amber-400 border-amber-500/50'
                    : 'bg-chrome-950 text-zinc-400 border-chrome-800 hover:border-chrome-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-chrome-800" />

          {/* Checkboxes */}
          <label className="flex items-center gap-1.5 text-xs text-zinc-300 font-mono cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyWithPhotos}
              onChange={(e) => setOnlyWithPhotos(e.target.checked)}
              className="rounded bg-chrome-950 border-chrome-800 text-amber-500 focus:ring-0"
            />
            <span className="flex items-center gap-1">
              <ImageIcon className="w-3 h-3 text-cyan-400" />
              Customer Photos Only
            </span>
          </label>

          <label className="flex items-center gap-1.5 text-xs text-zinc-300 font-mono cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyBolt}
              onChange={(e) => setOnlyBolt(e.target.checked)}
              className="rounded bg-chrome-950 border-chrome-800 text-amber-500 focus:ring-0"
            />
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              Bolt 45m Try-On Orders
            </span>
          </label>
        </div>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="py-16 text-center text-zinc-500 font-mono text-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-zinc-400" />
          Loading patron impressions...
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-chrome-900 border border-chrome-800 rounded-lg p-12 text-center">
          <Star className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-foreground">No Reviews Matching Filters</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {activeTab === 'pending'
              ? 'All submitted customer feedback has been moderated.'
              : 'Try clearing the search query or adjusting the rating filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((rev) => {
            const isLoading = actionLoadingId === rev.id

            return (
              <div
                key={rev.id}
                className="bg-white dark:bg-chrome-900 border border-slate-200 dark:border-chrome-800 rounded-lg p-5 transition-colors hover:border-slate-300 dark:hover:border-chrome-750 shadow-2xs space-y-4"
              >
                {/* Garment Header & Customer Meta */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-chrome-800">
                  <div className="flex items-start gap-3.5">
                    {/* Product Image */}
                    <div className="w-14 h-18 bg-slate-100 dark:bg-chrome-950 rounded border border-slate-200 dark:border-chrome-800 overflow-hidden relative shrink-0">
                      {rev.product?.image_url ? (
                        <Image
                          src={rev.product.image_url}
                          alt={rev.product.title || 'Product'}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600 text-2xs font-mono">
                          N/A
                        </div>
                      )}
                    </div>

                    {/* Garment Details */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">
                          {rev.product?.title || 'Garment Piece'}
                        </span>
                        {rev.product?.id && (
                          <Link
                            href={`/inventory/${rev.product.id}`}
                            className="text-zinc-500 hover:text-zinc-300"
                            title="View in Admin Inventory"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-1 text-2xs font-mono text-zinc-400">
                        {rev.size_purchased && (
                          <span className="bg-chrome-950 px-1.5 py-0.5 rounded border border-chrome-800 text-zinc-300">
                            Size: {rev.size_purchased}
                          </span>
                        )}
                        {rev.order?.order_number && (
                          <span className="text-zinc-400">Order #{rev.order.order_number}</span>
                        )}
                        {rev.verified_purchase && (
                          <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            <ShieldCheck className="w-3 h-3" />
                            Verified Purchase
                          </span>
                        )}
                        {rev.is_bolt_try_on && (
                          <span className="inline-flex items-center gap-1 text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            <Zap className="w-3 h-3" />
                            Bolt 45m Try-On
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status & Date */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 text-right">
                    <div>
                      {rev.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-mono font-medium rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          Pending Moderation
                        </span>
                      )}
                      {rev.status === 'approved' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-mono font-medium rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          Published
                        </span>
                      )}
                      {rev.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-mono font-medium rounded bg-rose-500/10 text-rose-400 border border-rose-500/30">
                          <XCircle className="w-3 h-3" />
                          Rejected
                        </span>
                      )}
                      {rev.status === 'hidden' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-mono font-medium rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                          <EyeOff className="w-3 h-3" />
                          Hidden
                        </span>
                      )}
                    </div>
                    <span className="text-2xs font-mono text-zinc-500">
                      {new Date(rev.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                {/* Review Body */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    {renderStars(rev.rating)}
                    <span className="font-bold text-sm text-foreground">{rev.title}</span>
                    {renderFitBadge(rev.fit_indicator)}
                    <span className="text-2xs font-mono text-muted-foreground">
                      by <span className="text-foreground">{rev.user?.name || rev.user?.full_name || 'Customer'}</span>
                    </span>
                  </div>

                  <p className="text-xs text-foreground/80 leading-relaxed font-sans whitespace-pre-line">
                    {rev.comment}
                  </p>

                  {/* Customer Photos */}
                  {rev.media && rev.media.length > 0 && (
                    <div className="pt-2">
                      <div className="text-2xs font-mono uppercase text-muted-foreground mb-1.5 flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" />
                        Customer Photos ({rev.media.length})
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {rev.media.map((med, idx) => (
                          <div
                            key={med.id || idx}
                            onClick={() => setLightboxUrl(med.image_url)}
                            className="w-16 h-20 relative rounded border border-chrome-800 overflow-hidden cursor-zoom-in hover:opacity-90 transition-opacity"
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
                    </div>
                  )}

                  {/* Rejection Note if Rejected */}
                  {rev.status === 'rejected' && rev.rejection_reason && (
                    <div className="bg-rose-500/10 border border-rose-500/20 rounded p-2 text-xs text-rose-300 font-mono mt-2">
                      <strong>Moderation Note:</strong> {rev.rejection_reason}
                    </div>
                  )}

                  {/* Atelier Concierge Reply Display */}
                  {rev.admin_reply && (
                    <div className="bg-chrome-950/80 border-l-2 border-amber-400/80 rounded-r p-3 mt-2 space-y-1">
                      <div className="flex items-center justify-between text-2xs font-mono text-amber-500">
                        <span className="font-bold tracking-wider uppercase flex items-center gap-1.5">
                          <MessageSquare className="w-3 h-3" />
                          Official Store Response
                        </span>
                        {rev.admin_replied_at && (
                          <span className="text-zinc-500">
                            {new Date(rev.admin_replied_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-300 font-sans">{rev.admin_reply}</p>
                    </div>
                  )}
                </div>

                {/* Inline Reply Composer */}
                {replyOpenId === rev.id && (
                  <div className="bg-chrome-950 border border-chrome-800 rounded p-3 space-y-2 mt-3">
                    <div className="text-2xs font-mono uppercase text-amber-500 font-semibold">
                      Publish Official Store Response
                    </div>
                    <textarea
                      rows={3}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="e.g. Thank you for your feedback! Our team is glad the fit and fabric met your expectations..."
                      className="w-full bg-chrome-900 border border-chrome-800 rounded p-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-hidden focus:border-amber-500/50 font-sans"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setReplyOpenId(null)
                          setReplyText('')
                        }}
                        className="px-2.5 py-1 text-2xs font-mono text-zinc-400 hover:text-zinc-200"
                      >
                        Cancel
                      </button>
                      <button
                        disabled={isLoading || !replyText.trim()}
                        onClick={() => handleSaveConciergeReply(rev.id)}
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-mono text-2xs font-bold rounded transition-colors disabled:opacity-50"
                      >
                        {isLoading ? 'Publishing...' : 'Publish Response'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Actions Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-chrome-800/60">
                  <div className="flex items-center gap-2">
                    {/* Approve Button */}
                    {rev.status !== 'approved' && (
                      <button
                        disabled={isLoading}
                        onClick={() => handleUpdateStatus(rev.id, 'approved')}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-medium rounded transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve & Publish
                      </button>
                    )}

                    {/* Reject Button */}
                    {rev.status !== 'rejected' && (
                      <button
                        disabled={isLoading}
                        onClick={() => {
                          setRejectModalId(rev.id)
                          setRejectionReason('')
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-chrome-800 hover:bg-rose-950/40 text-zinc-300 hover:text-rose-300 border border-chrome-700 text-xs font-mono font-medium rounded transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    )}

                    {/* Hide Toggle if already approved */}
                    {rev.status === 'approved' && (
                      <button
                        disabled={isLoading}
                        onClick={() => handleUpdateStatus(rev.id, 'hidden')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono text-zinc-400 hover:text-zinc-200"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        Hide
                      </button>
                    )}

                    {/* Concierge Reply Toggle */}
                    <button
                      onClick={() => {
                        if (replyOpenId === rev.id) {
                          setReplyOpenId(null)
                          setReplyText('')
                        } else {
                          setReplyOpenId(rev.id)
                          setReplyText(rev.admin_reply || '')
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-chrome-950 hover:bg-chrome-850 text-foreground border border-chrome-800 text-xs font-mono font-medium rounded transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                      {rev.admin_reply ? 'Edit Store Response' : 'Reply as Store'}
                    </button>
                  </div>

                  {/* Permanent Delete */}
                  <button
                    disabled={isLoading}
                    onClick={() => handleDeleteReview(rev.id)}
                    className="text-zinc-600 hover:text-rose-400 transition-colors p-1"
                    title="Delete review permanently"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-chrome-900 border border-chrome-800 rounded-lg p-5 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                Reject Customer Review
              </h3>
              <button
                onClick={() => setRejectModalId(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Provide an internal moderation reason for rejecting this review (e.g., inappropriate language, off-topic, spam).
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Reason for rejection..."
              className="w-full bg-chrome-950 border border-chrome-800 rounded p-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:border-rose-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRejectModalId(null)}
                className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateStatus(rejectModalId, 'rejected', rejectionReason)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium rounded cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Lightbox Modal */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh] w-full h-[80vh]">
            <Image
              src={lightboxUrl}
              alt="High-resolution patron photo"
              fill
              className="object-contain"
            />
          </div>
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 text-zinc-400 hover:text-white p-2"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  )
}
