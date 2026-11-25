'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import {
  Star,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import type { FashionFitIndicator } from '@repo/supabase'

interface ReviewGarmentModalProps {
  isOpen: boolean
  onClose: () => void
  orderItem: {
    id: string
    order_id: string
    product_id: string
    product?: {
      title?: string
      image_url?: string | null
    } | null
    size?: string | null
    is_bolt?: boolean
  } | null
  existingReview?: {
    id: string
    rating: number
    title: string
    comment: string
    fit_indicator: FashionFitIndicator
  } | null
  onSuccess?: () => void
}

const RATING_LABELS: Record<number, string> = {
  1: 'Poor (1/5)',
  2: 'Fair (2/5)',
  3: 'Good (3/5)',
  4: 'Very Good (4/5)',
  5: 'Excellent (5/5)',
}

export function ReviewGarmentModal({
  isOpen,
  onClose,
  orderItem,
  existingReview,
  onSuccess,
}: ReviewGarmentModalProps) {
  const isEditing = Boolean(existingReview)

  const [rating, setRating] = useState<number>(existingReview?.rating || 5)
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const [fitIndicator, setFitIndicator] = useState<FashionFitIndicator>(
    (existingReview?.fit_indicator as FashionFitIndicator) || 'true_to_size'
  )
  const [title, setTitle] = useState(existingReview?.title || '')
  const [comment, setComment] = useState(existingReview?.comment || '')
  const [mediaUrls, setMediaUrls] = useState<string[]>([])

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  if (!isOpen || !orderItem) return null

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    if (mediaUrls.length + files.length > 4) {
      setErrorMessage('You can upload a maximum of 4 garment photos.')
      return
    }

    setErrorMessage(null)
    setIsUploadingPhoto(true)

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const formData = new FormData()
        formData.append('file', file)
        formData.append('orderItemId', orderItem.id)

        const res = await fetch('/api/reviews/upload', {
          method: 'POST',
          body: formData,
        })

        const data = await res.json()
        if (data.success && data.url) {
          setMediaUrls((prev) => [...prev, data.url])
        } else {
          setErrorMessage(data.error || 'Failed to upload photo')
          break
        }
      }
    } catch {
      setErrorMessage('Network error uploading photo')
    } finally {
      setIsUploadingPhoto(false)
      e.target.value = ''
    }
  }

  const handleRemovePhoto = (indexToRemove: number) => {
    setMediaUrls((prev) => prev.filter((_, idx) => idx !== indexToRemove))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!title.trim()) {
      setErrorMessage('Please provide a brief headline summary for your review.')
      return
    }

    if (!comment.trim() || comment.trim().length < 10) {
      setErrorMessage('Please share at least a short sentence describing your impressions (min 10 chars).')
      return
    }

    setIsSubmitting(true)

    try {
      if (isEditing && existingReview) {
        const res = await fetch(`/api/reviews/${existingReview.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rating,
            title: title.trim(),
            comment: comment.trim(),
            fitIndicator,
          }),
        })

        const data = await res.json()
        if (data.success) {
          setSuccessMessage('Your review has been updated.')
          setTimeout(() => {
            onSuccess?.()
            onClose()
          }, 1200)
        } else {
          setErrorMessage(data.error || 'Failed to save review changes')
        }
      } else {
        const res = await fetch('/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: orderItem.product_id,
            orderId: orderItem.order_id,
            orderItemId: orderItem.id,
            rating,
            title: title.trim(),
            comment: comment.trim(),
            fitIndicator,
            sizePurchased: orderItem.size,
            isBoltTryOn: orderItem.is_bolt,
            mediaUrls,
          }),
        })

        const data = await res.json()
        if (data.success) {
          setSuccessMessage('Thank you for sharing your review! Your feedback is now published.')
          setTimeout(() => {
            onSuccess?.()
            onClose()
          }, 1500)
        } else {
          setErrorMessage(data.error || 'Failed to submit review')
        }
      }
    } catch {
      setErrorMessage('Network error submitting your review. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const currentActiveRating = hoverRating || rating

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white text-[#14293a] border border-[#d3d6db] rounded-sm max-w-lg w-full p-6 sm:p-7 space-y-5 relative shadow-2xl my-8 font-sans">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#8a909a] hover:text-[#14293a] p-1 rounded-xs hover:bg-[#f8f9fa] transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="border-b border-[#e5e7eb] pb-4">
          <div className="flex items-center gap-1.5 text-2xs uppercase tracking-wider text-[#14293a] font-mono font-bold">
            <Star className="w-3.5 h-3.5 fill-[#14293a] text-[#14293a]" />
            <span>Product Review & Rating</span>
          </div>
          <h3 className="text-xl font-sans font-bold text-[#14293a] mt-1">
            {isEditing ? 'Edit Your Review' : 'Write a Customer Review'}
          </h3>

          {/* Garment Summary Card */}
          <div className="flex items-center gap-3.5 mt-3.5 p-3 bg-[#f8f9fa] rounded-sm border border-[#e5e7eb]">
            <div className="w-12 h-14 bg-white rounded-xs relative overflow-hidden shrink-0 border border-[#d3d6db]">
              {orderItem.product?.image_url ? (
                <Image
                  src={orderItem.product.image_url}
                  alt={orderItem.product?.title || 'Garment'}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-[#8a909a] font-mono">
                  TG
                </div>
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-[#14293a] font-sans">
                {orderItem.product?.title || 'Garment Piece'}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-2xs font-mono text-[#6c7079] mt-0.5">
                {orderItem.size && (
                  <span className="bg-white px-1.5 py-0.2 border border-[#d3d6db] rounded-xs font-medium text-[#14293a]">
                    Size: {orderItem.size}
                  </span>
                )}
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Verified Purchase
                </span>
                {orderItem.is_bolt && (
                  <span className="text-[#b91c1c] font-semibold flex items-center gap-0.5">
                    <Zap className="w-3 h-3 fill-[#b91c1c]" /> Bolt Kept
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4.5 text-xs">
          {/* 1. Star Rating Picker */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#6c7079] font-mono font-bold mb-1.5">
              Overall Rating
            </label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1" onMouseLeave={() => setHoverRating(null)}>
                {[1, 2, 3, 4, 5].map((starVal) => (
                  <button
                    key={starVal}
                    type="button"
                    onClick={() => setRating(starVal)}
                    onMouseEnter={() => setHoverRating(starVal)}
                    className="p-1 focus:outline-hidden hover:scale-115 transition-transform cursor-pointer"
                  >
                    <Star
                      className={`w-6 h-6 transition-colors ${
                        starVal <= currentActiveRating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-neutral-300 hover:text-amber-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="text-xs font-sans font-semibold text-[#14293a] ml-2">
                {RATING_LABELS[currentActiveRating]}
              </span>
            </div>
          </div>

          {/* 2. Fit Consensus Indicator */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#6c7079] font-mono font-bold mb-1.5">
              Fit & Sizing
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { val: 'runs_small', label: 'Runs Small', desc: 'Snug / fitted' },
                { val: 'true_to_size', label: 'True to Size', desc: 'Standard fit' },
                { val: 'runs_large', label: 'Runs Large', desc: 'Relaxed / loose' },
              ].map((opt) => {
                const isSelected = fitIndicator === opt.val
                return (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setFitIndicator(opt.val as FashionFitIndicator)}
                    className={`p-2.5 rounded-xs text-center border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#14293a] bg-[#14293a] text-white font-bold shadow-xs'
                        : 'border-[#d3d6db] bg-white text-[#6c7079] hover:border-[#14293a] hover:text-[#14293a]'
                    }`}
                  >
                    <div className="text-2xs font-mono">{opt.label}</div>
                    <div
                      className={`text-[10px] mt-0.5 ${
                        isSelected ? 'text-neutral-300' : 'text-[#8a909a]'
                      }`}
                    >
                      {opt.desc}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 3. Review Title */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#6c7079] font-mono font-bold mb-1">
              Headline
            </label>
            <input
              type="text"
              required
              maxLength={150}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Great quality and fits true to size"
              className="w-full bg-white border border-[#d3d6db] rounded-xs p-2.5 text-xs text-[#14293a] placeholder-[#8a909a] focus:outline-hidden focus:border-[#14293a] focus:ring-1 focus:ring-[#14293a] font-sans"
            />
          </div>

          {/* 4. Detailed Review */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#6c7079] font-mono font-bold mb-1">
              Review Details
            </label>
            <textarea
              required
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share details about the fit, fabric feel, finish, and overall experience..."
              className="w-full bg-white border border-[#d3d6db] rounded-xs p-2.5 text-xs text-[#14293a] placeholder-[#8a909a] focus:outline-hidden focus:border-[#14293a] focus:ring-1 focus:ring-[#14293a] font-sans"
            />
          </div>

          {/* 5. Customer Photo Upload (New reviews only) */}
          {!isEditing && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] uppercase tracking-wider text-[#6c7079] font-mono font-bold">
                  Garment Photos (Optional, Up to 4)
                </label>
                <span className="text-2xs font-mono text-[#8a909a]">{mediaUrls.length}/4 uploaded</span>
              </div>

              {/* Photo Thumbnails */}
              <div className="flex flex-wrap gap-2.5 mb-2">
                {mediaUrls.map((url, idx) => (
                  <div
                    key={url}
                    className="w-16 h-20 relative rounded-xs border border-[#d3d6db] overflow-hidden group shadow-2xs"
                  >
                    <Image src={url} alt={`Upload ${idx + 1}`} fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {mediaUrls.length < 4 && (
                  <label className="w-16 h-20 rounded-xs border border-dashed border-[#d3d6db] hover:border-[#14293a] bg-[#f8f9fa] flex flex-col items-center justify-center cursor-pointer transition-colors text-[#6c7079] hover:text-[#14293a]">
                    {isUploadingPhoto ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#14293a]" />
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mb-1" />
                        <span className="text-[9px] font-mono uppercase font-bold">Add</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      onChange={handlePhotoUpload}
                      disabled={isUploadingPhoto}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              <p className="text-[10px] text-[#8a909a] font-mono">
                Supported formats: JPEG, PNG, WebP, AVIF (max 5 MB each).
              </p>
            </div>
          )}

          {/* Feedback Alerts */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xs text-rose-800 text-xs flex items-center gap-2 font-sans">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xs text-emerald-800 text-xs flex items-center gap-2 font-sans">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3.5 border-t border-[#e5e7eb]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-[#6c7079] hover:text-[#14293a] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploadingPhoto}
              className="px-6 py-2.5 bg-[#14293a] hover:bg-neutral-800 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xs transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
