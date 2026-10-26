'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plus,
  Trash2,
  UploadCloud,
  Printer,
  Barcode as BarcodeIcon,
  Tag,
  Scissors,
  Layers,
  Save,
  Check,
} from 'lucide-react'
import { Button, Input, Badge, Barcode } from '@repo/ui'
import { createBrowserClient } from '@repo/supabase/browser'
import {
  getProductWithVariantsAndMedia,
  getCategories,
  updateProductWithVariantsAndMedia,
  updateVariantStock,
  uploadProductImage,
  generateStandardBarcode,
  generateBarcodeDataUrl,
  type Product,
  type Category,
  type ProductVariant,
  type ProductMedia,
} from '@repo/supabase/utils'
import { triggerStorefrontRevalidation } from '@/lib/revalidate'

export default function GarmentEditStudioPage() {
  const params = useParams()
  const router = useRouter()
  const productId = params?.id as string

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Product Form State
  const [categories, setCategories] = useState<Category[]>([])
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState<number>(0)
  const [material, setMaterial] = useState('')
  const [edition, setEdition] = useState('')
  const [primaryImageUrl, setPrimaryImageUrl] = useState('')

  // Variants & Media State
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [mediaList, setMediaList] = useState<Array<{ url: string; alt_text?: string; is_primary?: boolean }>>([])
  const [isUploadingMedia, setIsUploadingMedia] = useState(false)
  const [updatingVariantId, setUpdatingVariantId] = useState<string | null>(null)

  // Load Garment Dossier
  useEffect(() => {
    async function loadGarment() {
      setIsLoading(true)
      try {
        const supabase = createBrowserClient()
        const [cats, dossier] = await Promise.all([
          getCategories(supabase),
          getProductWithVariantsAndMedia(supabase, productId),
        ])
        setCategories(cats)

        if (dossier.product) {
          setTitle(dossier.product.title)
          setCategoryId(dossier.product.category_id || (cats[0]?.id ?? ''))
          setDescription(dossier.product.description || '')
          setPrice(Number(dossier.product.price) || 0)
          setMaterial(dossier.product.material || '')
          setEdition(dossier.product.edition || '')
          setPrimaryImageUrl(dossier.product.image_url || '')
        }

        setVariants(dossier.variants || [])
        setMediaList(
          dossier.media && dossier.media.length > 0
            ? dossier.media.map((m) => ({
                url: m.url,
                alt_text: m.alt_text || '',
                is_primary: m.is_primary,
              }))
            : dossier.product?.image_url
            ? [{ url: dossier.product.image_url, is_primary: true }]
            : []
        )
      } finally {
        setIsLoading(false)
      }
    }

    if (productId) {
      loadGarment()
    }
  }, [productId])

  // Multi-image upload handler
  const handleMultiFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploadingMedia(true)
    setFeedback(null)
    try {
      const supabase = createBrowserClient()
      const newUploads: string[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]!
        const { url, error } = await uploadProductImage(supabase, file)
        if (url) {
          newUploads.push(url)
        }
      }

      if (newUploads.length > 0) {
        setMediaList((prev) => [
          ...prev,
          ...newUploads.map((u, idx) => ({
            url: u,
            is_primary: prev.length === 0 && idx === 0,
          })),
        ])
        if (!primaryImageUrl && newUploads[0]) {
          setPrimaryImageUrl(newUploads[0])
        }
        setFeedback({ type: 'success', message: `Uploaded ${newUploads.length} product image(s).` })
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Error uploading media' })
    } finally {
      setIsUploadingMedia(false)
    }
  }

  // Adjust stock for an individual variant
  const handleVariantStockChange = async (variantId: string, delta: number) => {
    const target = variants.find((v) => v.id === variantId)
    if (!target) return
    const nextStock = Math.max(0, target.stock + delta)

    // Optimistic UI update
    setVariants((prev) =>
      prev.map((v) => (v.id === variantId ? { ...v, stock: nextStock } : v))
    )

    setUpdatingVariantId(variantId)
    const supabase = createBrowserClient()
    await updateVariantStock(supabase, variantId, nextStock)
    setUpdatingVariantId(null)
  }

  // Save all changes
  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setFeedback(null)

    try {
      const supabase = createBrowserClient()
      const payload = {
        title,
        category_id: categoryId,
        description,
        price,
        material,
        edition,
        image_url: primaryImageUrl || mediaList[0]?.url,
        variants: variants.map((v) => ({
          size: v.size,
          color: v.color || undefined,
          sku: v.sku,
          stock: v.stock,
          price_override: v.price_override,
        })),
        media: mediaList.map((m, idx) => ({
          url: m.url,
          alt_text: m.alt_text || title,
          is_primary: m.url === primaryImageUrl || idx === 0,
          display_order: idx,
        })),
      }

      const res = await updateProductWithVariantsAndMedia(supabase, productId, payload)
      if (!res.success) {
        throw new Error(res.error || 'Failed to update garment')
      }

      // Automated ISR cache flush to live Storefront
      await triggerStorefrontRevalidation({ tag: 'products', path: `/product/${productId}` })
      await triggerStorefrontRevalidation({ path: '/' })

      setFeedback({
        type: 'success',
        message: '⚡ Garment specifications, barcodes, and variant stock saved and synchronized live!',
      })
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Error saving changes.' })
    } finally {
      setIsSaving(false)
    }
  }

  // Print single variant warehouse label
  const handlePrintVariantLabel = (variant: ProductVariant) => {
    const printWindow = window.open('', '_blank', 'width=450,height=300')
    if (!printWindow) return

    const barcodeVal = variant.barcode || variant.barcode_data || generateStandardBarcode(variant.sku)
    const barcodeSvg = generateBarcodeDataUrl(barcodeVal)

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Warehouse Tag • ${variant.sku}</title>
          <style>
            @page { size: 2.25in 1.25in; margin: 0; }
            body { font-family: monospace; margin: 0; padding: 8px 12px; box-sizing: border-box; text-align: center; }
            .brand { font-size: 9px; letter-spacing: 2px; font-weight: bold; text-transform: uppercase; }
            .title { font-size: 11px; font-weight: 800; text-transform: uppercase; margin: 2px 0; }
            .meta { font-size: 10px; display: flex; justify-content: space-between; margin: 2px 0 4px 0; font-weight: 600; }
            .barcode-img { width: 100%; max-height: 40px; object-fit: contain; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="brand">ATELIER • DROP 01</div>
          <div class="title">${title}</div>
          <div class="meta">
            <span>SIZE: <strong>${variant.size}</strong></span>
            <span>SKU: ${variant.sku}</span>
            <span>$${price.toFixed(2)}</span>
          </div>
          <img class="barcode-img" src="${barcodeSvg}" alt="${barcodeVal}" />
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const totalVariantStock = variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0)

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3 font-mono text-xs text-neutral-400">
        <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
        <span>Loading Garment Dossier & Barcode Matrix...</span>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-24 font-mono">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#23232A]">
        <div>
          <Link
            href="/inventory"
            className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Inventory Manifest
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-light text-white tracking-tight uppercase">
              {title || 'Edit Garment'}
            </h1>
            <Badge variant="terminal" className="text-amber-400 border-amber-800">
              {totalVariantStock} Units In Production
            </Badge>
          </div>
          <p className="text-xs text-neutral-400 font-sans mt-1">
            Product ID: <span className="text-neutral-300 font-mono">{productId}</span> • Code 128 Tagging Synchronized
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/inventory">
            <Button variant="terminal" size="sm" className="bg-[#141418] border-[#27272F] text-xs">
              Cancel
            </Button>
          </Link>
          <Button
            onClick={handleSaveChanges}
            disabled={isSaving}
            className="bg-[#166534] hover:bg-[#14532d] text-white font-semibold text-xs border-none flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving Changes...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" /> Save & Synchronize Storefront
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

      {/* Main Grid: Specification Form + Media & Variant Barcodes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (7 cols): Base Garment Specifications */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 bg-[#121216] border border-[#23232A] space-y-5">
            <div className="flex items-center gap-2 text-xs text-neutral-300 font-semibold border-b border-[#23232A] pb-3">
              <Scissors className="w-4 h-4 text-amber-400" />
              <span className="uppercase tracking-caps">Garment Provenance & Materiality</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase text-neutral-400 mb-1">Garment Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#18181D] border border-[#2B2B35] px-3.5 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase text-neutral-400 mb-1">Parent Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full bg-[#18181D] border border-[#2B2B35] px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-neutral-400 mb-1">Retail Price (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#18181D] border border-[#2B2B35] px-3.5 py-2 text-xs text-white focus:border-amber-400 focus:outline-none font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase text-neutral-400 mb-1">Fabric & GSM Specification</label>
                  <input
                    type="text"
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                    placeholder="e.g. 480 GSM Organic Cotton French Terry"
                    className="w-full bg-[#18181D] border border-[#2B2B35] px-3.5 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-neutral-400 mb-1">Drop / Edition Tag</label>
                  <input
                    type="text"
                    value={edition}
                    onChange={(e) => setEdition(e.target.value)}
                    placeholder="Drop 01 // Limited 150 Pieces"
                    className="w-full bg-[#18181D] border border-[#2B2B35] px-3.5 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-neutral-400 mb-1">Provenance Description</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#18181D] border border-[#2B2B35] p-3 text-xs text-white focus:border-amber-400 focus:outline-none font-sans leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* Multi-Image Gallery Asset Studio */}
          <div className="p-6 bg-[#121216] border border-[#23232A] space-y-5">
            <div className="flex items-center justify-between border-b border-[#23232A] pb-3">
              <div className="flex items-center gap-2 text-xs text-neutral-300 font-semibold">
                <UploadCloud className="w-4 h-4 text-emerald-400" />
                <span className="uppercase tracking-caps">Multi-Image Gallery & Supabase Storage</span>
              </div>
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1B1B22] hover:bg-[#252530] border border-[#2E2E3A] text-xs text-neutral-200 transition-colors">
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Upload Media</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleMultiFileUpload}
                  className="hidden"
                  disabled={isUploadingMedia}
                />
              </label>
            </div>

            {isUploadingMedia && (
              <div className="p-3 bg-neutral-900 border border-neutral-700 text-xs text-amber-300 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Uploading high-resolution assets to Supabase Storage bucket 'products'...</span>
              </div>
            )}

            {/* Media Thumbnails Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {mediaList.map((m, idx) => {
                const isPrimary = m.url === primaryImageUrl || idx === 0
                return (
                  <div
                    key={idx}
                    className={`relative aspect-[3/4] bg-black border ${
                      isPrimary ? 'border-amber-400' : 'border-[#2E2E3A]'
                    } overflow-hidden group`}
                  >
                    <Image src={m.url} alt={m.alt_text || 'Media'} fill className="object-cover" sizes="120px" />
                    {isPrimary && (
                      <span className="absolute top-1.5 left-1.5 bg-amber-400 text-black text-[9px] font-bold px-1.5 py-0.5 uppercase">
                        Primary
                      </span>
                    )}
                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 transition-opacity p-2">
                      {!isPrimary && (
                        <button
                          type="button"
                          onClick={() => setPrimaryImageUrl(m.url)}
                          className="px-2 py-1 bg-white text-black text-[10px] font-bold uppercase hover:bg-neutral-200"
                        >
                          Set Primary
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setMediaList((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-1 text-rose-400 hover:text-rose-300"
                        title="Remove image"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Per-Variant Stock Matrix & Barcode Tagging */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 bg-[#121216] border border-[#23232A] space-y-5">
            <div className="flex items-center justify-between border-b border-[#23232A] pb-3">
              <div className="flex items-center gap-2 text-xs text-neutral-300 font-semibold">
                <BarcodeIcon className="w-4 h-4 text-amber-400" />
                <span className="uppercase tracking-caps">Size Matrix & Barcode Tagging</span>
              </div>
              <span className="text-[10px] text-neutral-400 font-mono">Code 128 Compliant</span>
            </div>

            <div className="space-y-3">
              {variants.map((v) => {
                const barcodeValue = v.barcode || v.barcode_data || generateStandardBarcode(v.sku)
                return (
                  <div
                    key={v.id}
                    className="p-3.5 bg-[#16161D] border border-[#252530] space-y-3 hover:border-[#383848] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 bg-black text-amber-400 border border-[#2D2D3A] flex items-center justify-center font-bold text-xs font-mono">
                          {v.size}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-white font-mono">{v.sku}</p>
                          <span className="text-[10px] text-neutral-500 font-mono">
                            Allocated Stock: <strong className="text-white">{v.stock}</strong> units
                          </span>
                        </div>
                      </div>

                      {/* Quick Adjust Stepper */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleVariantStockChange(v.id, -1)}
                          disabled={updatingVariantId === v.id || v.stock <= 0}
                          className="w-7 h-7 bg-[#20202A] hover:bg-neutral-800 text-white border border-[#303040] text-xs flex items-center justify-center active:scale-95 disabled:opacity-30"
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-xs font-bold text-white font-mono">{v.stock}</span>
                        <button
                          type="button"
                          onClick={() => handleVariantStockChange(v.id, 1)}
                          disabled={updatingVariantId === v.id}
                          className="w-7 h-7 bg-[#20202A] hover:bg-neutral-800 text-white border border-[#303040] text-xs flex items-center justify-center active:scale-95"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Rendered Code 128 Barcode & Print Action */}
                    <div className="pt-2 border-t border-[#22222E] flex items-center justify-between gap-3">
                      <div className="overflow-hidden bg-[#0A0A0C] p-1.5 border border-[#252532] rounded-none">
                        <Barcode value={barcodeValue} height={28} barWidth={1.3} theme="terminal" />
                      </div>

                      <button
                        type="button"
                        onClick={() => handlePrintVariantLabel(v)}
                        className="px-2.5 py-1.5 bg-[#1F1F28] hover:bg-[#2A2A38] border border-[#353545] text-neutral-200 text-[10px] font-mono flex items-center gap-1.5 shrink-0 transition-colors"
                        title="Print 2x1 inch physical thermal tag"
                      >
                        <Printer className="w-3 h-3 text-amber-400" />
                        <span>Print Tag</span>
                      </button>
                    </div>
                  </div>
                )
              })}

              {variants.length === 0 && (
                <div className="py-8 text-center text-xs text-neutral-500">
                  No size variants allocated for this garment.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
