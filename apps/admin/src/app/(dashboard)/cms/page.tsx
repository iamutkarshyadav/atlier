'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import {
  Layers,
  Palette,
  Flag,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Save,
  ArrowUp,
  ArrowDown,
  Upload,
  Eye,
  EyeOff,
  Bell,
  Sliders,
  ExternalLink,
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
  DEFAULT_ANNOUNCEMENT_BAR,
  DEFAULT_HOMEPAGE_SECTIONS,
  type PromotionalBanner,
} from '@repo/supabase/utils'
import { triggerStorefrontRevalidation } from '@/lib/revalidate'
import { TokenStudio } from '@/components/cms/TokenStudio'

export default function StorefrontCMSCommandCenter() {
  const [activeTab, setActiveTab] = useState<'announcement' | 'hero_carousel' | 'homepage_sections' | 'tokens_studio'>('announcement')
  const [loading, setLoading] = useState(false)
  const [revalidating, setRevalidating] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // 1. Announcement Bar State
  const [savingAnnouncement, setSavingAnnouncement] = useState(false)
  const [announcement, setAnnouncement] = useState(DEFAULT_ANNOUNCEMENT_BAR)

  // 2. Hero Carousel Banners State
  const [banners, setBanners] = useState<PromotionalBanner[]>([])
  const [isAddingBanner, setIsAddingBanner] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [newBanner, setNewBanner] = useState({
    title: 'Heavyweight Boxy Fleece & Tailored Drape',
    subtitle: 'Custom-milled 480 GSM organic cotton loopback French Terry.',
    badge_text: 'PERMANENT ARCHIVE // 2026',
    image_url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1800&q=85',
    cta_label: 'Shop Collection',
    cta_link: '/shop',
    secondary_cta_label: 'Explore Lookbook',
    secondary_cta_link: '/about',
    is_active: true,
  })

  // 3. Homepage Sections State
  const [savingSections, setSavingSections] = useState(false)
  const [sections, setSections] = useState(DEFAULT_HOMEPAGE_SECTIONS)

  const loadData = async () => {
    setLoading(true)
    try {
      const supabase = createBrowserClient()
      const [config, bannerList] = await Promise.all([
        getStorefrontConfig(supabase),
        getPromotionalBanners(supabase, false),
      ])

      if (config.announcement_bar) {
        setAnnouncement({ ...DEFAULT_ANNOUNCEMENT_BAR, ...config.announcement_bar })
      }
      if (config.homepage_sections && Array.isArray(config.homepage_sections)) {
        setSections(config.homepage_sections)
      }
      setBanners(bannerList || [])
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to load storefront configuration' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleGlobalRevalidate = async () => {
    setRevalidating(true)
    try {
      const res = await triggerStorefrontRevalidation({ path: '/' })
      if (res.success) {
        setFeedback({ type: 'success', message: 'Storefront ISR cache purged successfully! Live storefront updated.' })
      } else {
        setFeedback({ type: 'error', message: res.message || 'Cache purge failed' })
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Error triggering cache purge' })
    } finally {
      setRevalidating(false)
      setTimeout(() => setFeedback(null), 5000)
    }
  }

  // Announcement Bar Actions
  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingAnnouncement(true)
    try {
      const supabase = createBrowserClient()
      const { success, error } = await updateStorefrontConfig(supabase, 'announcement_bar', announcement)
      if (!success) {
        setFeedback({ type: 'error', message: error || 'Failed to save announcement bar' })
      } else {
        await triggerStorefrontRevalidation({ path: '/' })
        setFeedback({ type: 'success', message: 'Announcement bar saved and pushed to Storefront!' })
      }
    } finally {
      setSavingAnnouncement(false)
      setTimeout(() => setFeedback(null), 5000)
    }
  }

  // Hero Carousel Actions
  const handleUploadBannerImage = async (file: File) => {
    setUploadingImage(true)
    try {
      const supabase = createBrowserClient()
      const filename = `banners/banner-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '')}`

      // Attempt upload to product-media bucket under banners/ path
      let { data, error } = await supabase.storage.from('product-media').upload(filename, file, {
        cacheControl: '3600',
        upsert: true,
      })

      if (error) {
        // Fallback to promotional-banners bucket
        const retry = await supabase.storage.from('promotional-banners').upload(filename, file, {
          cacheControl: '3600',
          upsert: true,
        })
        if (retry.error) throw retry.error
        const { data: publicData } = supabase.storage.from('promotional-banners').getPublicUrl(filename)
        setNewBanner((prev) => ({ ...prev, image_url: publicData.publicUrl }))
      } else {
        const { data: publicData } = supabase.storage.from('product-media').getPublicUrl(filename)
        setNewBanner((prev) => ({ ...prev, image_url: publicData.publicUrl }))
      }

      setFeedback({ type: 'success', message: 'Banner asset uploaded successfully.' })
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to upload image asset' })
    } finally {
      setUploadingImage(false)
      setTimeout(() => setFeedback(null), 4000)
    }
  }

  const handleCreateBanner = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const supabase = createBrowserClient()
      const { data, error } = await createPromotionalBanner(supabase, {
        ...newBanner,
        display_order: banners.length + 1,
      })
      if (error || !data) {
        setFeedback({ type: 'error', message: error || 'Failed to create banner slide' })
      } else {
        setBanners((prev) => [...prev, data])
        setIsAddingBanner(false)
        await triggerStorefrontRevalidation({ path: '/' })
        setFeedback({ type: 'success', message: 'Hero slide published and synced to Storefront!' })
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Error creating hero slide' })
    } finally {
      setTimeout(() => setFeedback(null), 5000)
    }
  }

  const handleToggleBannerActive = async (banner: PromotionalBanner) => {
    const nextState = !banner.is_active
    setBanners((prev) => prev.map((b) => (b.id === banner.id ? { ...b, is_active: nextState } : b)))
    try {
      const supabase = createBrowserClient()
      await updatePromotionalBanner(supabase, banner.id, { is_active: nextState })
      await triggerStorefrontRevalidation({ path: '/' })
      setFeedback({ type: 'success', message: `Slide "${banner.title}" ${nextState ? 'activated' : 'paused'}.` })
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to update slide status' })
    } finally {
      setTimeout(() => setFeedback(null), 4000)
    }
  }

  const handleMoveBanner = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= banners.length) return

    const reordered = [...banners]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(targetIndex, 0, moved)

    // Update display_order sequence
    const updated = reordered.map((b, idx) => ({ ...b, display_order: idx + 1 }))
    setBanners(updated)

    try {
      const supabase = createBrowserClient()
      await Promise.all(
        updated.map((b) => updatePromotionalBanner(supabase, b.id, { display_order: b.display_order }))
      )
      await triggerStorefrontRevalidation({ path: '/' })
      setFeedback({ type: 'success', message: 'Slide order updated on Storefront.' })
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to persist slide reorder' })
    } finally {
      setTimeout(() => setFeedback(null), 4000)
    }
  }

  const handleDeleteBanner = async (id: string) => {
    if (!confirm('Are you sure you want to remove this hero slide?')) return
    try {
      const supabase = createBrowserClient()
      const { success, error } = await deletePromotionalBanner(supabase, id)
      if (!success) {
        setFeedback({ type: 'error', message: error || 'Failed to delete banner' })
      } else {
        setBanners((prev) => prev.filter((b) => b.id !== id))
        await triggerStorefrontRevalidation({ path: '/' })
        setFeedback({ type: 'success', message: 'Hero slide removed.' })
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Error deleting hero slide' })
    } finally {
      setTimeout(() => setFeedback(null), 4000)
    }
  }

  // Homepage Sections Actions
  const handleToggleSection = (index: number) => {
    setSections((prev) =>
      prev.map((sec, idx) => (idx === index ? { ...sec, is_active: !sec.is_active } : sec))
    )
  }

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= sections.length) return

    const reordered = [...sections]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(targetIndex, 0, moved)

    const updated = reordered.map((sec, idx) => ({ ...sec, order: idx + 1 }))
    setSections(updated)
  }

  const handleSaveSections = async () => {
    setSavingSections(true)
    try {
      const supabase = createBrowserClient()
      const { success, error } = await updateStorefrontConfig(supabase, 'homepage_sections', sections)
      if (!success) {
        setFeedback({ type: 'error', message: error || 'Failed to save section layout' })
      } else {
        await triggerStorefrontRevalidation({ path: '/' })
        setFeedback({ type: 'success', message: 'Homepage section order and visibility synced to Storefront!' })
      }
    } finally {
      setSavingSections(false)
      setTimeout(() => setFeedback(null), 5000)
    }
  }

  return (
    <div className="space-y-6 font-mono pb-20">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-chrome-800 pb-5">
        <div>
          <span className="text-3xs uppercase tracking-wider text-zinc-500 font-semibold block">
            Storefront Merchandising & Experience Engine
          </span>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <span>Visual Merchandising & CMS Studio</span>
            <Badge variant="outline" className="text-3xs bg-cyan-950/40 text-cyan-400 border-cyan-800/60">
              Direct Storefront Control
            </Badge>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleGlobalRevalidate}
            disabled={revalidating}
            variant="terminal"
            size="sm"
            className="h-8 px-3 text-xs bg-chrome-900 text-cyan-400 border border-cyan-800/80 hover:bg-chrome-850 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${revalidating ? 'animate-spin' : ''}`} />
            <span>{revalidating ? 'Purging Cache...' : 'Purge Storefront Cache'}</span>
          </Button>

          <a
            href={process.env.NEXT_PUBLIC_STOREFRONT_URL || 'http://localhost:3000'}
            target="_blank"
            rel="noreferrer"
            className="h-8 px-3 text-xs font-semibold bg-zinc-100 hover:bg-white text-zinc-950 flex items-center gap-1.5 transition-colors"
          >
            <span>Preview Storefront</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 text-xs flex justify-between items-center shadow-lg border ${
            feedback.type === 'success'
              ? 'bg-chrome-850 border-emerald-500 text-emerald-300'
              : 'bg-chrome-850 border-rose-500 text-rose-300'
          }`}
        >
          <span className="font-semibold">{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-zinc-400 hover:text-white font-bold ml-4">
            ×
          </button>
        </div>
      )}

      {/* 4 Clean Retail Tabs */}
      <div className="flex border-b border-chrome-800 bg-chrome-950 overflow-x-auto">
        <button
          onClick={() => setActiveTab('announcement')}
          className={`flex items-center gap-2 px-5 py-2.5 text-2xs font-bold uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'announcement'
              ? 'border-cyan-400 text-cyan-400 bg-chrome-900'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>1. Announcement Bar</span>
        </button>

        <button
          onClick={() => setActiveTab('hero_carousel')}
          className={`flex items-center gap-2 px-5 py-2.5 text-2xs font-bold uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'hero_carousel'
              ? 'border-cyan-400 text-cyan-400 bg-chrome-900'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Flag className="w-3.5 h-3.5" />
          <span>2. Hero Carousel ({banners.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('homepage_sections')}
          className={`flex items-center gap-2 px-5 py-2.5 text-2xs font-bold uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'homepage_sections'
              ? 'border-cyan-400 text-cyan-400 bg-chrome-900'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>3. Homepage Sections</span>
        </button>

        <button
          onClick={() => setActiveTab('tokens_studio')}
          className={`flex items-center gap-2 px-5 py-2.5 text-2xs font-bold uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'tokens_studio'
              ? 'border-cyan-400 text-cyan-400 bg-chrome-900'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>4. Theme Tokens</span>
        </button>
      </div>

      {/* TAB 1: ANNOUNCEMENT BAR */}
      {activeTab === 'announcement' && (
        <div className="bg-chrome-900 border border-chrome-800 p-6 space-y-6 max-w-4xl">
          <div className="flex justify-between items-start border-b border-chrome-800 pb-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <Bell className="w-4 h-4 text-cyan-400" />
                <span>Storefront Tier 1 Announcement Bar</span>
              </h2>
              <p className="text-2xs text-zinc-400 mt-1">
                Persistent top promotional strip shown across all pages on the customer storefront.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setAnnouncement((prev) => ({ ...prev, is_active: !prev.is_active }))}
              className={`flex items-center gap-2 px-3 py-1 text-2xs font-bold uppercase transition-colors border ${
                announcement.is_active
                  ? 'bg-emerald-950/60 border-emerald-700 text-emerald-400'
                  : 'bg-rose-950/60 border-rose-800 text-rose-400'
              }`}
            >
              {announcement.is_active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              <span>{announcement.is_active ? 'Active (Visible)' : 'Disabled (Hidden)'}</span>
            </button>
          </div>

          <form onSubmit={handleSaveAnnouncement} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-3xs uppercase tracking-wider text-zinc-400 font-semibold block mb-1">
                  Highlight Badge Text
                </label>
                <input
                  type="text"
                  value={announcement.badge}
                  onChange={(e) => setAnnouncement((prev) => ({ ...prev, badge: e.target.value }))}
                  placeholder="e.g. BOLT 45-MIN DOORSTEP TRY-ON"
                  className="w-full h-9 bg-chrome-950 border border-chrome-800 px-3 text-xs text-zinc-100 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-3xs uppercase tracking-wider text-zinc-400 font-semibold block mb-1">
                  Main Announcement Message
                </label>
                <input
                  type="text"
                  value={announcement.message}
                  onChange={(e) => setAnnouncement((prev) => ({ ...prev, message: e.target.value }))}
                  placeholder="e.g. Try up to 5 pieces at home before buying • Free express delivery on orders over ₹1,999"
                  className="w-full h-9 bg-chrome-950 border border-chrome-800 px-3 text-xs text-zinc-100 focus:border-cyan-400 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-3xs uppercase tracking-wider text-zinc-400 font-semibold block mb-1">
                Pincode Trigger Button Label
              </label>
              <input
                type="text"
                value={announcement.link_text || ''}
                onChange={(e) => setAnnouncement((prev) => ({ ...prev, link_text: e.target.value }))}
                placeholder="e.g. Select Delivery PIN"
                className="w-full h-9 bg-chrome-950 border border-chrome-800 px-3 text-xs text-zinc-100 focus:border-cyan-400 focus:outline-none"
              />
            </div>

            {/* Live Visual Preview */}
            <div className="space-y-1.5 pt-2">
              <span className="text-3xs uppercase tracking-wider text-zinc-500 font-semibold">Storefront Preview:</span>
              <div className="bg-[#f8f8f8] border border-[#e5e7eb] py-2 px-4 text-center text-xs tracking-wider font-sans font-medium text-[#14293a] flex flex-wrap items-center justify-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[#b91c1c] font-semibold">
                  <Sparkles className="w-3 h-3 text-[#b91c1c]" />
                  {announcement.badge || 'PROMO'}
                </span>
                <span className="text-[#6c7079]">|</span>
                <span className="text-[#6c7079]">{announcement.message}</span>
                <span className="text-[11px] bg-white border border-[#d3d6db] px-2 py-0.5 rounded-full text-[#14293a]">
                  {announcement.link_text || 'Select Delivery PIN'}
                </span>
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <Button
                type="submit"
                disabled={savingAnnouncement}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold h-9 px-4 rounded-none flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingAnnouncement ? 'Pushing to Storefront...' : 'Save & Publish Announcement'}</span>
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: HERO CAROUSEL */}
      {activeTab === 'hero_carousel' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-chrome-900 border border-chrome-800 p-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Homepage Hero Carousel Slides</h2>
              <p className="text-2xs text-zinc-400 mt-0.5">
                Manage full-bleed editorial hero slides. Reorder sequence, toggle visibility, and configure CTAs.
              </p>
            </div>

            <Button
              onClick={() => setIsAddingBanner((prev) => !prev)}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-none flex items-center gap-1.5 text-2xs"
            >
              <Plus className="w-3 h-3" />
              <span>{isAddingBanner ? 'Cancel Slide Form' : 'Add Hero Slide'}</span>
            </Button>
          </div>

          {/* Add Slide Drawer / Card */}
          {isAddingBanner && (
            <div className="bg-chrome-900 border border-cyan-800/80 p-5 space-y-4">
              <h3 className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">New Editorial Hero Slide</h3>
              <form onSubmit={handleCreateBanner} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-3xs uppercase tracking-wider text-zinc-400 font-semibold block mb-1">
                      Headline (Title) *
                    </label>
                    <input
                      type="text"
                      value={newBanner.title}
                      onChange={(e) => setNewBanner((prev) => ({ ...prev, title: e.target.value }))}
                      className="w-full h-9 bg-chrome-950 border border-chrome-800 px-3 text-zinc-100 focus:border-cyan-400 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-3xs uppercase tracking-wider text-zinc-400 font-semibold block mb-1">
                      Tagline / Kicker *
                    </label>
                    <input
                      type="text"
                      value={newBanner.badge_text}
                      onChange={(e) => setNewBanner((prev) => ({ ...prev, badge_text: e.target.value }))}
                      className="w-full h-9 bg-chrome-950 border border-chrome-800 px-3 text-zinc-100 focus:border-cyan-400 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-3xs uppercase tracking-wider text-zinc-400 font-semibold block mb-1">
                      Body Description *
                    </label>
                    <input
                      type="text"
                      value={newBanner.subtitle}
                      onChange={(e) => setNewBanner((prev) => ({ ...prev, subtitle: e.target.value }))}
                      className="w-full h-9 bg-chrome-950 border border-chrome-800 px-3 text-zinc-100 focus:border-cyan-400 focus:outline-none"
                      required
                    />
                  </div>

                  {/* Image Asset with File Upload */}
                  <div className="sm:col-span-2 space-y-2">
                    <label className="text-3xs uppercase tracking-wider text-zinc-400 font-semibold block">
                      Slide Background Image *
                    </label>
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                      <input
                        type="url"
                        value={newBanner.image_url}
                        onChange={(e) => setNewBanner((prev) => ({ ...prev, image_url: e.target.value }))}
                        placeholder="https://images.unsplash.com/..."
                        className="flex-1 h-9 bg-chrome-950 border border-chrome-800 px-3 text-zinc-100 focus:border-cyan-400 focus:outline-none"
                        required
                      />

                      <label className="h-9 px-3 bg-chrome-800 hover:bg-chrome-750 text-zinc-200 border border-chrome-700 flex items-center gap-1.5 cursor-pointer text-2xs font-semibold shrink-0">
                        <Upload className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{uploadingImage ? 'Uploading...' : 'Upload File'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleUploadBannerImage(file)
                          }}
                        />
                      </label>
                    </div>

                    {newBanner.image_url && (
                      <div className="relative w-full h-32 bg-chrome-950 border border-chrome-800 overflow-hidden">
                        <Image src={newBanner.image_url} alt="Preview" fill unoptimized className="object-cover" />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-3xs uppercase tracking-wider text-zinc-400 font-semibold block mb-1">
                      Primary CTA Label *
                    </label>
                    <input
                      type="text"
                      value={newBanner.cta_label}
                      onChange={(e) => setNewBanner((prev) => ({ ...prev, cta_label: e.target.value }))}
                      className="w-full h-9 bg-chrome-950 border border-chrome-800 px-3 text-zinc-100 focus:border-cyan-400 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-3xs uppercase tracking-wider text-zinc-400 font-semibold block mb-1">
                      Primary CTA Target URL *
                    </label>
                    <input
                      type="text"
                      value={newBanner.cta_link}
                      onChange={(e) => setNewBanner((prev) => ({ ...prev, cta_link: e.target.value }))}
                      className="w-full h-9 bg-chrome-950 border border-chrome-800 px-3 text-zinc-100 focus:border-cyan-400 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-chrome-800">
                  <Button type="button" variant="terminal" size="sm" onClick={() => setIsAddingBanner(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-none">
                    Publish Slide to Carousel
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Banner Cards Grid */}
          <div className="space-y-3">
            {banners.map((b, idx) => (
              <div
                key={b.id}
                className={`bg-chrome-900 border p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors ${
                  b.is_active ? 'border-chrome-800 hover:border-chrome-700' : 'border-rose-950/60 opacity-60'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Sequence & Reorder Controls */}
                  <div className="flex flex-col items-center gap-1 text-zinc-500 font-mono text-2xs">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveBanner(idx, 'up')}
                      className="p-1 hover:text-cyan-400 disabled:opacity-20"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-bold text-zinc-300">0{idx + 1}</span>
                    <button
                      type="button"
                      disabled={idx === banners.length - 1}
                      onClick={() => handleMoveBanner(idx, 'down')}
                      className="p-1 hover:text-cyan-400 disabled:opacity-20"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Thumbnail */}
                  <div className="relative w-28 h-18 bg-chrome-950 border border-chrome-800 overflow-hidden shrink-0">
                    {b.image_url ? (
                      <Image src={b.image_url} alt={b.title} fill unoptimized className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xs text-zinc-600">No Image</div>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-3xs font-mono font-bold text-cyan-400 uppercase tracking-widest">
                        {b.badge_text || 'ARCHIVE'}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-3xs ${
                          b.is_active ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60' : 'bg-rose-950/40 text-rose-400 border-rose-800/60'
                        }`}
                      >
                        {b.is_active ? 'Live on Storefront' : 'Inactive'}
                      </Badge>
                    </div>
                    <h4 className="text-xs font-semibold text-zinc-100">{b.title}</h4>
                    <p className="text-2xs text-zinc-400 max-w-lg truncate">{b.subtitle}</p>
                    <div className="text-3xs text-zinc-500 font-mono">
                      CTA: &quot;{b.cta_label}&quot; &rarr; {b.cta_link}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    type="button"
                    onClick={() => handleToggleBannerActive(b)}
                    className={`px-2.5 py-1 text-2xs font-bold border transition-colors flex items-center gap-1 ${
                      b.is_active
                        ? 'bg-chrome-800 hover:bg-rose-950/40 border-chrome-700 hover:border-rose-800 text-zinc-300 hover:text-rose-400'
                        : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400 hover:bg-emerald-900/60'
                    }`}
                  >
                    {b.is_active ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{b.is_active ? 'Pause' : 'Activate'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteBanner(b.id)}
                    className="p-1.5 text-zinc-500 hover:text-rose-400 transition-colors"
                    title="Delete Slide"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {banners.length === 0 && !loading && (
              <div className="bg-chrome-900 border border-chrome-800 p-8 text-center text-xs text-zinc-500">
                No hero slides defined in Supabase. The storefront will use fallback archive slides until you publish your first slide.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: HOMEPAGE SECTIONS */}
      {activeTab === 'homepage_sections' && (
        <div className="bg-chrome-900 border border-chrome-800 p-6 space-y-6 max-w-4xl">
          <div className="flex justify-between items-start border-b border-chrome-800 pb-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Homepage Merchandising Flow & Sequencing</span>
              </h2>
              <p className="text-2xs text-zinc-400 mt-1">
                Reorder or toggle sections on the homepage. Storefront layout immediately updates upon saving.
              </p>
            </div>

            <Button
              onClick={handleSaveSections}
              disabled={savingSections}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold h-8 px-3 text-xs rounded-none flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingSections ? 'Saving...' : 'Save Section Flow'}</span>
            </Button>
          </div>

          <div className="space-y-2">
            {sections.map((sec, idx) => (
              <div
                key={sec.id}
                className={`flex items-center justify-between p-3.5 border transition-colors ${
                  sec.is_active ? 'bg-chrome-950 border-chrome-800' : 'bg-chrome-950/50 border-rose-950/40 opacity-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 font-mono text-xs text-zinc-500">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveSection(idx, 'up')}
                      className="p-1 hover:text-cyan-400 disabled:opacity-20"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-bold text-zinc-300 w-4 text-center">{idx + 1}</span>
                    <button
                      type="button"
                      disabled={idx === sections.length - 1}
                      onClick={() => handleMoveSection(idx, 'down')}
                      className="p-1 hover:text-cyan-400 disabled:opacity-20"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-zinc-100">{sec.name}</h4>
                    <span className="text-3xs text-zinc-500 font-mono">Module ID: {sec.id}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className={`text-3xs ${
                      sec.is_active ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60' : 'bg-rose-950/40 text-rose-400 border-rose-800/60'
                    }`}
                  >
                    {sec.is_active ? 'Rendered' : 'Hidden'}
                  </Badge>

                  <button
                    type="button"
                    onClick={() => handleToggleSection(idx)}
                    className={`px-2.5 py-1 text-2xs font-bold border transition-colors ${
                      sec.is_active
                        ? 'bg-chrome-800 hover:bg-rose-950/40 border-chrome-700 text-zinc-300 hover:text-rose-400'
                        : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400'
                    }`}
                  >
                    {sec.is_active ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              onClick={handleSaveSections}
              disabled={savingSections}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold h-9 px-4 rounded-none flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingSections ? 'Saving...' : 'Save & Push Section Flow'}</span>
            </Button>
          </div>
        </div>
      )}

      {/* TAB 4: THEME DESIGN TOKENS */}
      {activeTab === 'tokens_studio' && <TokenStudio />}
    </div>
  )
}
