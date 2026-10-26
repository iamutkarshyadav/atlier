'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Image as ImageIcon,
  Scissors,
  Layers,
  Tag,
} from 'lucide-react'
import { Button, Input } from '@repo/ui'
import { createBrowserClient } from '@repo/supabase/browser'
import {
  getCategories,
  createProductWithVariantsAndMedia,
  uploadProductImage,
  type Category,
} from '@repo/supabase/utils'
import { SizeMatrixInput, type SizeVariantItem } from '@/components/SizeMatrixInput'
import { triggerStorefrontRevalidation } from '@/lib/revalidate'

// Apparel-Specific Zod Validation Schema
const variantSchema = z.object({
  size: z.string().min(1, 'Size is required'),
  sku: z.string().min(2, 'SKU is required'),
  stock: z.number().int().min(0, 'Stock cannot be negative'),
  price_override: z.number().optional().nullable(),
})

const apparelFormSchema = z.object({
  title: z.string().min(2, 'Garment title is required (e.g. Heavyweight Boxy Hoodie)'),
  category_id: z.string().min(1, 'Category is mandatory'),
  description: z.string().min(10, 'A provenance description of the garment is required'),
  price: z.number().positive('Retail price must be greater than zero'),
  material: z.string().min(2, 'Fabric & GSM specification required (e.g. 480 GSM French Terry)'),
  edition: z.string().min(2, 'Drop / Edition tag required (e.g. Drop 01 // Strict 150 Pieces)'),
  silhouette: z.string().optional(),
  care_instructions: z.string().optional(),
})

type ApparelFormData = z.infer<typeof apparelFormSchema>

export default function CreatorApparelProductStudio() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [isInitializing, setIsInitializing] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Size Matrix State
  const [variants, setVariants] = useState<Array<{ size: string; sku: string; stock: number; price_override?: number | null }>>([
    { size: 'XS', sku: 'HD-BOX-BLK-XS', stock: 10, price_override: null },
    { size: 'S', sku: 'HD-BOX-BLK-S', stock: 25, price_override: null },
    { size: 'M', sku: 'HD-BOX-BLK-M', stock: 45, price_override: null },
    { size: 'L', sku: 'HD-BOX-BLK-L', stock: 25, price_override: null },
    { size: 'XL', sku: 'HD-BOX-BLK-XL', stock: 10, price_override: null },
  ])

  // Media preview state
  const [primaryImageUrl, setPrimaryImageUrl] = useState<string>(
    'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85'
  )
  const [secondaryImageUrl, setSecondaryImageUrl] = useState<string>('/images/prod3-front.jpg')
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ApparelFormData>({
    resolver: zodResolver(apparelFormSchema),
    defaultValues: {
      title: 'Heavyweight Boxy Hoodie',
      category_id: '',
      description:
        'Custom-milled 480 GSM loopback organic French Terry. Engineered with an exaggerated dropped shoulder, double-layered architectural hood, and concealed side-seam pockets. Mineral washed for a vintage drape.',
      price: 165,
      material: '480 GSM 100% Organic Cotton French Terry',
      edition: 'Drop 01 // Limited 150 Pieces',
      silhouette: 'Oversized Boxy Cut with Dropped Shoulders',
      care_instructions: 'Machine wash cold inside out with like colors. Hang dry in shade.',
    },
  })

  const watchedTitle = watch('title')
  const watchedPrice = watch('price')

  // Load Parent Clothing Categories
  useEffect(() => {
    async function loadTaxonomy() {
      try {
        const supabase = createBrowserClient()
        const cats = await getCategories(supabase)
        setCategories(cats)
        if (cats.length > 0) {
          setValue('category_id', cats[0]!.id)
        }
      } finally {
        setIsInitializing(false)
      }
    }
    loadTaxonomy()
  }, [setValue])

  // File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsUploadingImage(true)
      const supabase = createBrowserClient()
      const { url, error } = await uploadProductImage(supabase, file)

      if (error || !url) {
        setFeedback({ type: 'error', message: `Image upload failed: ${error || 'Unknown'}` })
        return
      }
      setPrimaryImageUrl(url)
    } finally {
      setIsUploadingImage(false)
    }
  }

  // Submit Handler
  const onSubmit = async (data: ApparelFormData) => {
    if (variants.length === 0) {
      setFeedback({ type: 'error', message: 'You must allocate stock to at least one size variant.' })
      return
    }

    try {
      setIsSubmitting(true)
      setFeedback(null)
      const supabase = createBrowserClient()

      const payload = {
        title: data.title,
        category_id: data.category_id,
        description: data.description,
        price: data.price,
        material: data.material,
        edition: data.edition,
        image_url: primaryImageUrl,
        variants: variants,
        media: [
          { url: primaryImageUrl, is_primary: true, display_order: 0 },
          ...(secondaryImageUrl ? [{ url: secondaryImageUrl, is_primary: false, display_order: 1 }] : []),
        ],
      }

      const res = await createProductWithVariantsAndMedia(supabase, payload)

      if (!res.success) {
        setFeedback({ type: 'error', message: res.error || 'Failed to save product in database.' })
        return
      }

      setFeedback({
        type: 'success',
        message: 'Garment successfully published to catalog with all size variant units allocated!',
      })

      // ISR revalidation to live Storefront
      try {
        await triggerStorefrontRevalidation({ tag: 'products', path: '/' })
      } catch (e) {
        // revalidation error non-blocking
      }

      setTimeout(() => {
        router.push('/inventory')
      }, 1500)
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Submission error.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const totalBatchUnits = variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0)

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#23232A]">
        <div>
          <Link
            href="/inventory"
            className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Inventory
          </Link>
          <h1 className="text-2xl sm:text-3xl font-light text-white tracking-tight uppercase">
            New Garment Specification
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Engineered exclusively for clothing creators. Define fabric, cut, and exact units per size.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/inventory">
            <Button variant="outline" size="sm" className="bg-[#141418] border-[#27272F] text-xs">
              Cancel
            </Button>
          </Link>
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting || isInitializing}
            className="bg-[#166534] hover:bg-[#14532d] text-white font-semibold text-xs border-none flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Publishing Garment...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" /> Publish to Storefront
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 text-xs flex items-center gap-2.5 border ${
            feedback.type === 'success'
              ? 'bg-[#166534]/15 border-[#166534]/30 text-[#166534]'
              : 'bg-rose-950/30 border-rose-800 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
        {/* SECTION 1: Garment Fundamentals */}
        <section className="bg-[#121215] border border-[#23232A] p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-[#1F1F24]">
            <Scissors className="w-4 h-4 text-[#166534]" />
            <h2 className="text-xs uppercase tracking-wider font-semibold text-white">
              Garment Identity & Classification
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs uppercase text-neutral-300 font-medium block">
                Garment Title <span className="text-[#166534]">*</span>
              </label>
              <Input
                {...register('title')}
                placeholder="e.g. Heavyweight Boxy Hoodie"
                className="bg-[#18181C] border-[#2A2A32] text-white text-xs h-10"
              />
              {errors.title && <p className="text-[11px] text-rose-400">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase text-neutral-300 font-medium block">
                Apparel Category <span className="text-[#166534]">*</span>
              </label>
              <select
                {...register('category_id')}
                className="w-full h-10 px-3 bg-[#18181C] border border-[#2A2A32] text-white text-xs focus:outline-none focus:border-[#166534]"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#18181C] text-white">
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.category_id && (
                <p className="text-[11px] text-rose-400">{errors.category_id.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs uppercase text-neutral-300 font-medium block">
                Retail Price (USD) <span className="text-[#166534]">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-neutral-500 font-mono">$</span>
                <Input
                  type="number"
                  step="0.01"
                  {...register('price', { valueAsNumber: true })}
                  placeholder="165.00"
                  className="bg-[#18181C] border-[#2A2A32] text-white text-xs h-10 pl-7"
                />
              </div>
              {errors.price && <p className="text-[11px] text-rose-400">{errors.price.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase text-neutral-300 font-medium block">
                Drop / Edition Tag <span className="text-[#166534]">*</span>
              </label>
              <Input
                {...register('edition')}
                placeholder="e.g. Drop 01 // Limited 150 Pieces"
                className="bg-[#18181C] border-[#2A2A32] text-white text-xs h-10"
              />
              {errors.edition && (
                <p className="text-[11px] text-rose-400">{errors.edition.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase text-neutral-300 font-medium block">
              Provenance & Design Narrative <span className="text-[#166534]">*</span>
            </label>
            <textarea
              {...register('description')}
              rows={3}
              placeholder="Describe the silhouette drape, wash technique, and inspiration..."
              className="w-full p-3 bg-[#18181C] border border-[#2A2A32] text-white text-xs focus:outline-none focus:border-[#166534]"
            />
            {errors.description && (
              <p className="text-[11px] text-rose-400">{errors.description.message}</p>
            )}
          </div>
        </section>

        {/* SECTION 2: Fabric Lab & Technical Specifications */}
        <section className="bg-[#121215] border border-[#23232A] p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-[#1F1F24]">
            <Tag className="w-4 h-4 text-[#166534]" />
            <h2 className="text-xs uppercase tracking-wider font-semibold text-white">
              Fabric Lab & Materiality
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs uppercase text-neutral-300 font-medium block">
                Fabric Composition & GSM Weight <span className="text-[#166534]">*</span>
              </label>
              <Input
                {...register('material')}
                placeholder="e.g. 480 GSM 100% Organic Cotton French Terry"
                className="bg-[#18181C] border-[#2A2A32] text-white text-xs h-10"
              />
              {errors.material && (
                <p className="text-[11px] text-rose-400">{errors.material.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase text-neutral-300 font-medium block">
                Cut & Silhouette Architecture
              </label>
              <Input
                {...register('silhouette')}
                placeholder="e.g. Oversized Boxy Cut with Dropped Shoulders"
                className="bg-[#18181C] border-[#2A2A32] text-white text-xs h-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase text-neutral-300 font-medium block">
              Care & Laundering Instructions
            </label>
            <Input
              {...register('care_instructions')}
              placeholder="e.g. Machine wash cold inside out, hang dry in shade"
              className="bg-[#18181C] border-[#2A2A32] text-white text-xs h-10"
            />
          </div>
        </section>

        {/* SECTION 3: Industry-Standard Size Matrix & Unit Allocation */}
        <section className="space-y-3">
          <SizeMatrixInput
            productTitle={watchedTitle || 'GARMENT'}
            basePrice={watchedPrice || 100}
            onChange={(updatedVariants) => setVariants(updatedVariants)}
          />
        </section>

        {/* SECTION 4: Lookbook & Media Assets */}
        <section className="bg-[#121215] border border-[#23232A] p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-[#1F1F24]">
            <ImageIcon className="w-4 h-4 text-[#166534]" />
            <h2 className="text-xs uppercase tracking-wider font-semibold text-white">
              Lookbook Imagery & Media Gallery
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-xs uppercase text-neutral-300 font-medium block">
                Primary Editorial Image URL (Front View)
              </label>
              <Input
                type="text"
                value={primaryImageUrl}
                onChange={(e) => setPrimaryImageUrl(e.target.value)}
                placeholder="https://..."
                className="bg-[#18181C] border-[#2A2A32] text-white text-xs h-10"
              />

              <div className="pt-2">
                <label className="inline-block px-3 py-1.5 bg-[#1F1F26] hover:bg-neutral-800 text-xs text-neutral-300 border border-neutral-700 cursor-pointer">
                  {isUploadingImage ? 'Uploading Image...' : 'Choose File to Upload'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploadingImage}
                  />
                </label>
              </div>

              {primaryImageUrl && (
                <div className="relative aspect-[3/4] max-w-[220px] bg-black border border-[#2A2A32] overflow-hidden mt-3">
                  <Image
                    src={primaryImageUrl}
                    alt="Primary Preview"
                    fill
                    className="object-cover"
                    sizes="220px"
                  />
                  <span className="absolute bottom-2 left-2 text-[9px] uppercase font-bold bg-black/80 px-2 py-0.5 text-[#166534] border border-[#166534]/40">
                    Primary Front
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-xs uppercase text-neutral-300 font-medium block">
                Secondary Image URL (Back / Detail Shot)
              </label>
              <Input
                type="text"
                value={secondaryImageUrl}
                onChange={(e) => setSecondaryImageUrl(e.target.value)}
                placeholder="https://..."
                className="bg-[#18181C] border-[#2A2A32] text-white text-xs h-10"
              />

              {secondaryImageUrl && (
                <div className="relative aspect-[3/4] max-w-[220px] bg-black border border-[#2A2A32] overflow-hidden mt-3">
                  <Image
                    src={secondaryImageUrl}
                    alt="Secondary Preview"
                    fill
                    className="object-cover"
                    sizes="220px"
                  />
                  <span className="absolute bottom-2 left-2 text-[9px] uppercase font-bold bg-black/80 px-2 py-0.5 text-neutral-300 border border-neutral-700">
                    Detail / Back
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Bottom Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-[#141418] border border-[#2A2A32]">
          <div className="text-xs text-neutral-400">
            Total Batch Allocation:{' '}
            <span className="font-bold text-white text-sm">
              {totalBatchUnits} Units Across {variants.length} Sizes
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/inventory">
              <Button variant="outline" size="sm" className="bg-[#18181F] border-[#2A2A35] text-xs">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={isSubmitting || isInitializing}
              className="bg-[#166534] hover:bg-[#14532d] text-white font-semibold text-xs border-none flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Publishing...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" /> Publish Garment
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
