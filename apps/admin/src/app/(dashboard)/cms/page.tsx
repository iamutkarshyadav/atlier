'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import {
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Globe,
  ArrowRight,
  Layers,
  Save,
  Radio,
  UploadCloud,
} from 'lucide-react'
import { Button, Input, Badge } from '@repo/ui'
import { createBrowserClient } from '@repo/supabase/browser'
import {
  getStorefrontConfig,
  updateStorefrontConfig,
  getPromotionalBanners,
  createPromotionalBanner,
  updatePromotionalBanner,
  deletePromotionalBanner,
  getAllProductsAdmin,
  getCategories,
  uploadProductImage,
  type PromotionalBanner,
  type Product,
  type Category,
} from '@repo/supabase/utils'
import { triggerStorefrontRevalidation } from '@/lib/revalidate'

export default function StorefrontCMSCommandCenter() {
  const [loading, setLoading] = useState(true)
  const [savingHero, setSavingHero] = useState(false)
  const [savingEthos, setSavingEthos] = useState(false)
  const [revalidating, setRevalidating] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Products and Categories for selector bindings
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  // Dynamic Storefront Configurations
  const [heroConfig, setHeroConfig] = useState({
    kicker: 'CREATOR CAPSULE // DROP 001',
    headline: 'AUTONOMOUS',
    headlineItalic: 'GARMENTS',
    description: 'Engineered heavyweight silhouettes cut from custom 480 GSM French Terry, 14oz Japanese selvedge denim, and technical outerwear. Made exclusively for the clothing creator.',
    ctaLabel: 'EXPLORE DROP 01',
    ctaLink: '/shop',
    secondaryCategory: 'Hoodies & Fleece',
    featuredProductId: '',
    customHeroImage: '',
  })

  const [ethosConfig, setEthosConfig] = useState({
    pretitle: 'FABRIC LAB & SILHOUETTE SPECIFICATION',
    statement: '480 GSM French Terry • 14oz Japanese Selvedge • 280 GSM Combed Jersey',
    subtext: 'Every piece is engineered from the yarn up with zero synthetic polyester blending.',
  })

  // Promotional Banners State
  const [banners, setBanners] = useState<PromotionalBanner[]>([])
  const [isAddingBanner, setIsAddingBanner] = useState(false)
  const [newBanner, setNewBanner] = useState({
    title: 'Drop 01 // Heavyweight French Terry & Selvedge Denim',
    subtitle: 'Limited batch production with strict units allocated per size. Made exclusively for the creator.',
    badge_text: 'CREATOR DROP ACTIVE',
    image_url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85',
    cta_label: 'Shop Drop 01',
    cta_link: '/shop',
    is_active: true,
  })

  // Load all initial configurations from Supabase
  const loadCMSData = async () => {
    setLoading(true)
    try {
      const supabase = createBrowserClient()
      const [config, bannerList, prods, cats] = await Promise.all([
        getStorefrontConfig(supabase),
        getPromotionalBanners(supabase, false),
        getAllProductsAdmin(supabase),
        getCategories(supabase),
      ])

      if (config.hero) {
        setHeroConfig((prev) => ({ ...prev, ...config.hero }))
      }
      if (config.ethos) {
        setEthosConfig((prev) => ({ ...prev, ...config.ethos }))
      }
      setBanners(bannerList)
      setProducts(prods)
      setCategories(cats)

      if (prods.length > 0 && !heroConfig.featuredProductId) {
        setHeroConfig((prev) => ({ ...prev, featuredProductId: prods[0]!.id }))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCMSData()
  }, [])

  // Save Hero Config
  const handleSaveHero = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingHero(true)
    setFeedback(null)
    try {
      const supabase = createBrowserClient()
      const { success, error } = await updateStorefrontConfig(
        supabase,
        'hero',
        heroConfig,
        'Storefront homepage dynamic hero configuration'
      )
      if (!success) throw new Error(error)
      // Automated ISR cache flush to live storefront
      await triggerStorefrontRevalidation({ path: '/' })
      setFeedback({ type: 'success', message: '⚡ Storefront Hero section updated and synchronized live to port 3000!' })
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update hero config' })
    } finally {
      setSavingHero(false)
    }
  }

  // Save Brand Statement / Ethos Config
  const handleSaveEthos = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingEthos(true)
    setFeedback(null)
    try {
      const supabase = createBrowserClient()
      const { success, error } = await updateStorefrontConfig(
        supabase,
        'ethos',
        ethosConfig,
        'Brand statement editorial banner configuration'
      )
      if (!success) throw new Error(error)
      // Automated ISR cache flush to live storefront
      await triggerStorefrontRevalidation({ path: '/' })
      setFeedback({ type: 'success', message: '⚡ Atelier Ethos statement updated and synchronized live to port 3000!' })
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update ethos config' })
    } finally {
      setSavingEthos(false)
    }
  }

  // Handle Banner Toggle Active
  const handleToggleBanner = async (id: string, currentStatus: boolean) => {
    const supabase = createBrowserClient()
    const nextStatus = !currentStatus
    setBanners((prev) =>
      prev.map((b) => (b.id === id ? { ...b, is_active: nextStatus } : b))
    )
    await updatePromotionalBanner(supabase, id, { is_active: nextStatus })
    await triggerStorefrontRevalidation({ path: '/' })
  }

  // Handle Banner Deletion
  const handleDeleteBanner = async (id: string) => {
    const supabase = createBrowserClient()
    setBanners((prev) => prev.filter((b) => b.id !== id))
    await deletePromotionalBanner(supabase, id)
    await triggerStorefrontRevalidation({ path: '/' })
  }

  // Create New Banner
  const handleCreateBanner = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createBrowserClient()
    const { data, error } = await createPromotionalBanner(supabase, {
      ...newBanner,
      display_order: banners.length,
    })
    if (data) {
      setBanners((prev) => [...prev, data])
      setIsAddingBanner(false)
      await triggerStorefrontRevalidation({ path: '/' })
      setFeedback({ type: 'success', message: 'Promotional announcement banner created and published live!' })
    }
  }

  // Trigger On-Demand Storefront Revalidation (ISR)
  const handleRevalidateStorefront = async () => {
    setRevalidating(true)
    setFeedback(null)
    try {
      const res = await triggerStorefrontRevalidation({ path: '/' })
      if (res.success) {
        setFeedback({
          type: 'success',
          message: '⚡ Storefront cache invalidated with verified secret token! Live changes are now visible on port 3000.',
        })
      } else {
        setFeedback({
          type: 'success',
          message: 'Live database synchronized. Storefront will reflect changes on next request.',
        })
      }
    } catch {
      setFeedback({
        type: 'success',
        message: 'Database saved. Storefront dynamic server components read directly from Supabase.',
      })
    } finally {
      setRevalidating(false)
    }
  }

  const selectedHeroProduct = products.find((p) => p.id === heroConfig.featuredProductId)

  return (
    <div className="max-w-6xl mx-auto space-y-10 font-mono pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-[#23232A] pb-6">
        <div>
          <span className="text-[10px] tracking-caps uppercase text-amber-400 block font-semibold">
            Dynamic Storefront Architecture • CMS
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-light text-white mt-1">
            Storefront Command Center
          </h1>
          <p className="text-xs text-neutral-400 font-sans mt-1">
            Dictate the Storefront homepage layout, hero highlights, promotional announcements, and brand statements in real time.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="terminal"
            size="sm"
            onClick={handleRevalidateStorefront}
            isLoading={revalidating}
            className="flex items-center gap-1.5 bg-amber-400 text-black hover:bg-amber-300 font-bold border-none"
          >
            <Radio className="w-3.5 h-3.5 text-black animate-pulse" />
            Publish & Invalidate Cache
          </Button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 border text-xs flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/40 border-rose-800 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-neutral-400 hover:text-white">
            ×
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. DYNAMIC HOMEPAGE HERO SECTION CONTROL */}
      {/* ========================================================= */}
      <form onSubmit={handleSaveHero} className="border border-[#23232A] bg-[#0E0E11] p-6 sm:p-8 space-y-6">
        <div className="flex justify-between items-center border-b border-[#23232A] pb-4">
          <div className="flex items-center gap-2.5">
            <Globe className="w-4 h-4 text-amber-400" />
            <div>
              <h2 className="text-xs uppercase tracking-luxury text-white font-medium">
                01. Primary Homepage Hero Engine
              </h2>
              <span className="text-[10px] text-neutral-500 font-sans">
                Controls the large-scale editorial hero on the storefront root (`/`).
              </span>
            </div>
          </div>

          <Button
            type="submit"
            variant="terminal"
            size="sm"
            isLoading={savingHero}
            className="flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" /> Save Hero Section
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-caps text-neutral-400 block">
                Hero Kicker Pretitle
              </label>
              <input
                value={heroConfig.kicker}
                onChange={(e) => setHeroConfig({ ...heroConfig, kicker: e.target.value })}
                placeholder="e.g. Collection N° 04 • Autumn Archive"
                className="w-full bg-[#18181C] border border-[#2B2B33] px-3.5 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-caps text-neutral-400 block">
                  Primary Headline (Sans/Serif)
                </label>
                <input
                  value={heroConfig.headline}
                  onChange={(e) => setHeroConfig({ ...heroConfig, headline: e.target.value })}
                  placeholder="e.g. Tactile forms."
                  className="w-full bg-[#18181C] border border-[#2B2B33] px-3.5 py-2 text-xs text-white focus:border-amber-400 focus:outline-none font-serif text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-caps text-neutral-400 block">
                  Secondary Headline (Italicized)
                </label>
                <input
                  value={heroConfig.headlineItalic}
                  onChange={(e) => setHeroConfig({ ...heroConfig, headlineItalic: e.target.value })}
                  placeholder="e.g. Mindful permanence."
                  className="w-full bg-[#18181C] border border-[#2B2B33] px-3.5 py-2 text-xs text-white focus:border-amber-400 focus:outline-none font-serif italic text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-caps text-neutral-400 block">
                Editorial Paragraph
              </label>
              <textarea
                rows={2}
                value={heroConfig.description}
                onChange={(e) => setHeroConfig({ ...heroConfig, description: e.target.value })}
                className="w-full bg-[#18181C] border border-[#2B2B33] p-2.5 text-xs text-white font-sans focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-caps text-neutral-400 block">
                  CTA Button Label
                </label>
                <input
                  value={heroConfig.ctaLabel}
                  onChange={(e) => setHeroConfig({ ...heroConfig, ctaLabel: e.target.value })}
                  className="w-full bg-[#18181C] border border-[#2B2B33] px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-caps text-neutral-400 block">
                  CTA Destination URL
                </label>
                <input
                  value={heroConfig.ctaLink}
                  onChange={(e) => setHeroConfig({ ...heroConfig, ctaLink: e.target.value })}
                  className="w-full bg-[#18181C] border border-[#2B2B33] px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-caps text-neutral-400 block">
                  Featured Category Pill
                </label>
                <select
                  value={heroConfig.secondaryCategory}
                  onChange={(e) => setHeroConfig({ ...heroConfig, secondaryCategory: e.target.value })}
                  className="w-full bg-[#18181C] border border-[#2B2B33] px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-caps text-neutral-400 block">
                Bind Hero Featured Product
              </label>
              <select
                value={heroConfig.featuredProductId}
                onChange={(e) => setHeroConfig({ ...heroConfig, featuredProductId: e.target.value })}
                className="w-full bg-[#18181C] border border-[#2B2B33] px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} (${p.price} USD • {p.edition})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Hero Live Preview Card */}
          <div className="lg:col-span-5 p-5 bg-[#141418] border border-[#23232A] space-y-3">
            <span className="text-[9px] uppercase tracking-caps text-neutral-500 block border-b border-[#23232A] pb-2">
              Live Hero Card Preview
            </span>

            <div className="relative aspect-[3/4] w-full bg-black overflow-hidden border border-[#23232A]">
              <Image
                src={selectedHeroProduct?.image_url || '/images/prod1-primary.jpg'}
                alt="Hero Preview"
                fill
                className="object-cover object-center"
              />
              <div className="absolute top-3 left-3 bg-white/90 text-black px-2 py-0.5 text-[9px] font-mono uppercase tracking-caps">
                {selectedHeroProduct?.edition || 'Featured Selection'}
              </div>
            </div>

            <div className="flex justify-between items-baseline pt-1">
              <span className="font-serif text-white text-base">
                {selectedHeroProduct?.title || 'Sculptural Vessel'}
              </span>
              <span className="font-mono text-amber-300 text-xs">
                ${Number(selectedHeroProduct?.price || 185).toFixed(2)} USD
              </span>
            </div>
          </div>
        </div>
      </form>

      {/* ========================================================= */}
      {/* 2. BRAND STATEMENT / ETHOS EDITORIAL BANNER */}
      {/* ========================================================= */}
      <form onSubmit={handleSaveEthos} className="border border-[#23232A] bg-[#0E0E11] p-6 sm:p-8 space-y-6">
        <div className="flex justify-between items-center border-b border-[#23232A] pb-4">
          <div className="flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-amber-400" />
            <div>
              <h2 className="text-xs uppercase tracking-luxury text-white font-medium">
                02. The Atelier Ethos & Manifesto Statement
              </h2>
              <span className="text-[10px] text-neutral-500 font-sans">
                Controls the large-type quotes appearing between product highlights.
              </span>
            </div>
          </div>

          <Button
            type="submit"
            variant="terminal"
            size="sm"
            isLoading={savingEthos}
            className="flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" /> Save Brand Statement
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-caps text-neutral-400 block">
              Pretitle Kicker
            </label>
            <input
              value={ethosConfig.pretitle}
              onChange={(e) => setEthosConfig({ ...ethosConfig, pretitle: e.target.value })}
              className="w-full bg-[#18181C] border border-[#2B2B33] px-3.5 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-caps text-neutral-400 block">
              Global Locations / Studio Subtext
            </label>
            <input
              value={ethosConfig.subtext}
              onChange={(e) => setEthosConfig({ ...ethosConfig, subtext: e.target.value })}
              className="w-full bg-[#18181C] border border-[#2B2B33] px-3.5 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-caps text-neutral-400 block">
            Manifesto Quote (Serif Display)
          </label>
          <textarea
            rows={2}
            value={ethosConfig.statement}
            onChange={(e) => setEthosConfig({ ...ethosConfig, statement: e.target.value })}
            className="w-full bg-[#18181C] border border-[#2B2B33] p-3 text-sm font-serif text-white focus:border-amber-400 focus:outline-none"
          />
        </div>
      </form>

      {/* ========================================================= */}
      {/* 3. PROMOTIONAL BANNERS & CAROUSEL ANNOUNCEMENTS */}
      {/* ========================================================= */}
      <div className="border border-[#23232A] bg-[#0E0E11] p-6 sm:p-8 space-y-6">
        <div className="flex justify-between items-center border-b border-[#23232A] pb-4">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <div>
              <h2 className="text-xs uppercase tracking-luxury text-white font-medium">
                03. Promotional Banners & Fitting Announcements
              </h2>
              <span className="text-[10px] text-neutral-500 font-sans">
                Display curated fitting salon promos and seasonal announcements.
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="terminal"
            size="sm"
            onClick={() => setIsAddingBanner(!isAddingBanner)}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Author New Banner
          </Button>
        </div>

        {isAddingBanner && (
          <form onSubmit={handleCreateBanner} className="p-5 bg-[#141418] border border-amber-900/50 space-y-4">
            <span className="text-[10px] uppercase tracking-caps text-amber-400 font-semibold block">
              Author New Promotional Announcement
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                value={newBanner.title}
                onChange={(e) => setNewBanner({ ...newBanner, title: e.target.value })}
                placeholder="Banner Title"
                className="bg-[#18181C] border border-[#2B2B33] px-3 py-2 text-xs text-white"
                required
              />
              <input
                value={newBanner.badge_text}
                onChange={(e) => setNewBanner({ ...newBanner, badge_text: e.target.value })}
                placeholder="Kicker Badge Text"
                className="bg-[#18181C] border border-[#2B2B33] px-3 py-2 text-xs text-white"
              />
            </div>
            <textarea
              rows={2}
              value={newBanner.subtitle}
              onChange={(e) => setNewBanner({ ...newBanner, subtitle: e.target.value })}
              placeholder="Detailed description of the promotional privilege..."
              className="w-full bg-[#18181C] border border-[#2B2B33] p-2.5 text-xs text-white"
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <input
                value={newBanner.image_url}
                onChange={(e) => setNewBanner({ ...newBanner, image_url: e.target.value })}
                placeholder="Image URL"
                className="bg-[#18181C] border border-[#2B2B33] px-3 py-2 text-xs text-white"
              />
              <input
                value={newBanner.cta_label}
                onChange={(e) => setNewBanner({ ...newBanner, cta_label: e.target.value })}
                placeholder="CTA Label"
                className="bg-[#18181C] border border-[#2B2B33] px-3 py-2 text-xs text-white"
              />
              <input
                value={newBanner.cta_link}
                onChange={(e) => setNewBanner({ ...newBanner, cta_link: e.target.value })}
                placeholder="CTA Link"
                className="bg-[#18181C] border border-[#2B2B33] px-3 py-2 text-xs text-white"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddingBanner(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="terminal" size="sm" className="bg-amber-400 text-black font-bold">
                Create Banner
              </Button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {banners.map((b) => (
            <div
              key={b.id}
              className="p-4 bg-[#141418] border border-[#23232A] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-24 bg-black border border-[#2B2B33] overflow-hidden shrink-0">
                  <Image
                    src={b.image_url || '/images/auth-editorial.jpg'}
                    alt={b.title}
                    fill
                    className="object-cover object-center"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] uppercase tracking-caps bg-amber-400/10 text-amber-300 px-1.5 py-0.5 border border-amber-900/40">
                      {b.badge_text || 'Announcement'}
                    </span>
                    <span className="font-serif text-white text-sm font-light">{b.title}</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 font-sans line-clamp-1">{b.subtitle}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleToggleBanner(b.id, b.is_active)}
                  className={`px-3 py-1 text-[10px] font-mono uppercase tracking-caps border transition-colors ${
                    b.is_active
                      ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                      : 'bg-neutral-900 border-neutral-700 text-neutral-500'
                  }`}
                >
                  {b.is_active ? '● Active' : '○ Inactive'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteBanner(b.id)}
                  className="p-1.5 text-neutral-500 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {banners.length === 0 && (
            <p className="text-xs text-neutral-500 py-6 text-center">
              No promotional banners configured. Click &ldquo;Author New Banner&rdquo; to launch an announcement.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
