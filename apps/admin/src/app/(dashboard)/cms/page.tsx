'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
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
  Globe,
  ArrowRight,
  Save,
  Radio,
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
  getAllProductsAdmin,
  getCategories,
  type PromotionalBanner,
  type Product,
  type Category,
} from '@repo/supabase/utils'
import { triggerStorefrontRevalidation } from '@/lib/revalidate'
import { LayoutBuilder } from '@/components/cms/LayoutBuilder'
import { TokenStudio } from '@/components/cms/TokenStudio'

export default function StorefrontCMSCommandCenter() {
  const [activeTab, setActiveTab] = useState<'layout_builder' | 'tokens_studio' | 'banners'>('layout_builder')
  const [loading, setLoading] = useState(false)
  const [revalidating, setRevalidating] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Promotional Banners State
  const [banners, setBanners] = useState<PromotionalBanner[]>([])
  const [isAddingBanner, setIsAddingBanner] = useState(false)
  const [newBanner, setNewBanner] = useState({
    title: 'Drop 01 // Heavyweight French Terry & Selvedge Denim',
    subtitle: 'Limited batch production with strict units allocated per size.',
    badge_text: 'CREATOR DROP ACTIVE',
    image_url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85',
    cta_label: 'Shop Drop 01',
    cta_link: '/shop',
    is_active: true,
  })

  // Ethos Config
  const [savingEthos, setSavingEthos] = useState(false)
  const [ethosConfig, setEthosConfig] = useState({
    pretitle: 'FABRIC LAB & SILHOUETTE SPECIFICATION',
    statement: '480 GSM French Terry • 14oz Japanese Selvedge • 280 GSM Combed Jersey',
    subtext: 'Every piece is engineered from the yarn up with zero synthetic polyester blending.',
  })

  const loadBannerData = async () => {
    try {
      const supabase = createBrowserClient()
      const [config, bannerList] = await Promise.all([
        getStorefrontConfig(supabase),
        getPromotionalBanners(supabase, false),
      ])
      if (config.ethos) {
        setEthosConfig((prev) => ({ ...prev, ...config.ethos }))
      }
      setBanners(bannerList)
    } catch {}
  }

  useEffect(() => {
    if (activeTab === 'banners') {
      loadBannerData()
    }
  }, [activeTab])

  const handleGlobalRevalidate = async () => {
    setRevalidating(true)
    try {
      const res = await triggerStorefrontRevalidation({ path: '/' })
      if (res.success) {
        setFeedback({ type: 'success', message: 'Storefront ISR Cache purged successfully!' })
      } else {
        setFeedback({ type: 'error', message: res.message || 'Cache purge failed' })
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Error triggering cache purge' })
    } finally {
      setRevalidating(false)
      setTimeout(() => setFeedback(null), 4000)
    }
  }

  const handleSaveEthos = async () => {
    setSavingEthos(true)
    try {
      const supabase = createBrowserClient()
      const { success, error } = await updateStorefrontConfig(supabase, 'ethos', ethosConfig)
      if (!success) {
        setFeedback({ type: 'error', message: error || 'Failed to save ethos' })
      } else {
        await triggerStorefrontRevalidation({ path: '/' })
        setFeedback({ type: 'success', message: 'Ethos specification saved and ISR cache revalidated!' })
      }
    } finally {
      setSavingEthos(false)
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
        setFeedback({ type: 'error', message: error || 'Failed to create banner' })
      } else {
        setBanners((prev) => [...prev, data])
        setIsAddingBanner(false)
        await triggerStorefrontRevalidation({ path: '/' })
        setFeedback({ type: 'success', message: 'Promotional banner created successfully!' })
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Error creating banner' })
    } finally {
      setTimeout(() => setFeedback(null), 4000)
    }
  }

  const handleDeleteBanner = async (id: string) => {
    if (!confirm('Are you sure you want to remove this promotional banner?')) return
    try {
      const supabase = createBrowserClient()
      const { success, error } = await deletePromotionalBanner(supabase, id)
      if (!success) {
        setFeedback({ type: 'error', message: error || 'Failed to delete banner' })
      } else {
        setBanners((prev) => prev.filter((b) => b.id !== id))
        await triggerStorefrontRevalidation({ path: '/' })
        setFeedback({ type: 'success', message: 'Banner deleted.' })
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Error deleting banner' })
    } finally {
      setTimeout(() => setFeedback(null), 4000)
    }
  }

  return (
    <div className="space-y-4 font-mono pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-chrome-800 pb-3">
        <div>
          <h1 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Storefront Visual Live-Editing CMS & Layout Engine</span>
          </h1>
          <p className="text-2xs text-zinc-400">
            Absolute administrative control over storefront component trees, Tailwind classes, and global design tokens
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="terminal"
            size="sm"
            onClick={handleGlobalRevalidate}
            isLoading={revalidating}
            className="h-7 px-3 text-2xs flex items-center gap-1.5 border-cyan-500/60 text-cyan-300"
          >
            <RefreshCw className="w-3 h-3" /> Purge Storefront ISR Cache
          </Button>

          <Link
            href="http://localhost:3000"
            target="_blank"
            className="h-7 px-3 text-2xs bg-chrome-800 hover:bg-chrome-750 text-zinc-200 border border-chrome-700 flex items-center gap-1.5"
          >
            <span>Open Storefront</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 text-xs flex justify-between items-center shadow-lg border ${
            feedback.type === 'success'
              ? 'bg-chrome-850 border-cyan-500 text-cyan-300'
              : 'bg-chrome-850 border-rose-500 text-rose-300'
          }`}
        >
          <span className="font-semibold">{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-zinc-400 hover:text-white font-bold ml-4">
            ×
          </button>
        </div>
      )}

      {/* 3 Operational Sub-Tabs */}
      <div className="flex border-b border-chrome-800 bg-chrome-950">
        <button
          onClick={() => setActiveTab('layout_builder')}
          className={`flex items-center gap-2 px-4 py-2 text-2xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
            activeTab === 'layout_builder'
              ? 'border-cyan-400 text-cyan-400 bg-chrome-900'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>1. Visual Layout Orchestrator</span>
        </button>

        <button
          onClick={() => setActiveTab('tokens_studio')}
          className={`flex items-center gap-2 px-4 py-2 text-2xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
            activeTab === 'tokens_studio'
              ? 'border-cyan-400 text-cyan-400 bg-chrome-900'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>2. Storefront Design Tokens</span>
        </button>

        <button
          onClick={() => setActiveTab('banners')}
          className={`flex items-center gap-2 px-4 py-2 text-2xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
            activeTab === 'banners'
              ? 'border-cyan-400 text-cyan-400 bg-chrome-900'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Flag className="w-3.5 h-3.5" />
          <span>3. Promotional Banners & Ethos</span>
        </button>
      </div>

      {/* TAB 1: VISUAL LAYOUT ORCHESTRATOR */}
      {activeTab === 'layout_builder' && <LayoutBuilder />}

      {/* TAB 2: STOREFRONT DESIGN TOKENS */}
      {activeTab === 'tokens_studio' && <TokenStudio />}

      {/* TAB 3: PROMOTIONAL BANNERS & ETHOS */}
      {activeTab === 'banners' && (
        <div className="space-y-6">
          {/* Ethos Configuration */}
          <div className="bg-chrome-900 border border-chrome-800 p-4 space-y-4">
            <div className="flex justify-between items-center border-b border-chrome-800 pb-2">
              <span className="text-2xs font-bold uppercase tracking-wider text-zinc-300">
                Ethos Statement & Fabric Specification
              </span>
              <Button
                variant="terminal"
                size="sm"
                onClick={handleSaveEthos}
                isLoading={savingEthos}
                className="h-6 text-3xs border-cyan-500/60 text-cyan-300"
              >
                Save Ethos
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-2xs">
              <div className="space-y-1">
                <label className="text-3xs uppercase text-zinc-400 font-semibold block">Pretitle</label>
                <input
                  type="text"
                  value={ethosConfig.pretitle}
                  onChange={(e) => setEthosConfig({ ...ethosConfig, pretitle: e.target.value })}
                  className="w-full bg-chrome-950 border border-chrome-750 px-2 py-1 text-zinc-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-3xs uppercase text-zinc-400 font-semibold block">Primary Statement</label>
                <input
                  type="text"
                  value={ethosConfig.statement}
                  onChange={(e) => setEthosConfig({ ...ethosConfig, statement: e.target.value })}
                  className="w-full bg-chrome-950 border border-chrome-750 px-2 py-1 text-zinc-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-3xs uppercase text-zinc-400 font-semibold block">Subtext</label>
                <input
                  type="text"
                  value={ethosConfig.subtext}
                  onChange={(e) => setEthosConfig({ ...ethosConfig, subtext: e.target.value })}
                  className="w-full bg-chrome-950 border border-chrome-750 px-2 py-1 text-zinc-100"
                />
              </div>
            </div>
          </div>

          {/* Banners List */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-2xs font-bold uppercase tracking-wider text-zinc-400">
                Active Promotional Banners ({banners.length})
              </span>
              <Button
                variant="terminal"
                size="sm"
                onClick={() => setIsAddingBanner(!isAddingBanner)}
                className="h-6 text-3xs border-cyan-500/60 text-cyan-300"
              >
                + Add Banner
              </Button>
            </div>

            {isAddingBanner && (
              <form onSubmit={handleCreateBanner} className="p-4 bg-chrome-900 border border-chrome-800 space-y-3 text-2xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-3xs uppercase text-zinc-400 font-semibold block">Title</label>
                    <input
                      type="text"
                      required
                      value={newBanner.title}
                      onChange={(e) => setNewBanner({ ...newBanner, title: e.target.value })}
                      className="w-full bg-chrome-950 border border-chrome-750 px-2 py-1 text-zinc-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-3xs uppercase text-zinc-400 font-semibold block">Badge Text</label>
                    <input
                      type="text"
                      value={newBanner.badge_text}
                      onChange={(e) => setNewBanner({ ...newBanner, badge_text: e.target.value })}
                      className="w-full bg-chrome-950 border border-chrome-750 px-2 py-1 text-zinc-100"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-3xs uppercase text-zinc-400 font-semibold block">Subtitle</label>
                  <input
                    type="text"
                    value={newBanner.subtitle}
                    onChange={(e) => setNewBanner({ ...newBanner, subtitle: e.target.value })}
                    className="w-full bg-chrome-950 border border-chrome-750 px-2 py-1 text-zinc-100"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-3xs uppercase text-zinc-400 font-semibold block">Image URL</label>
                    <input
                      type="text"
                      value={newBanner.image_url}
                      onChange={(e) => setNewBanner({ ...newBanner, image_url: e.target.value })}
                      className="w-full bg-chrome-950 border border-chrome-750 px-2 py-1 text-zinc-100 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-3xs uppercase text-zinc-400 font-semibold block">CTA Label</label>
                    <input
                      type="text"
                      value={newBanner.cta_label}
                      onChange={(e) => setNewBanner({ ...newBanner, cta_label: e.target.value })}
                      className="w-full bg-chrome-950 border border-chrome-750 px-2 py-1 text-zinc-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-3xs uppercase text-zinc-400 font-semibold block">CTA Link</label>
                    <input
                      type="text"
                      value={newBanner.cta_link}
                      onChange={(e) => setNewBanner({ ...newBanner, cta_link: e.target.value })}
                      className="w-full bg-chrome-950 border border-chrome-750 px-2 py-1 text-zinc-100"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="terminal" size="sm" type="button" onClick={() => setIsAddingBanner(false)}>
                    Cancel
                  </Button>
                  <Button variant="default" size="sm" type="submit" className="bg-cyan-500 text-zinc-950 font-bold rounded-none">
                    Save Banner
                  </Button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {banners.map((banner) => (
                <div key={banner.id} className="p-4 bg-chrome-900 border border-chrome-800 space-y-3 relative group">
                  <button
                    onClick={() => handleDeleteBanner(banner.id)}
                    className="absolute top-3 right-3 text-zinc-500 hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="text-3xs bg-cyan-950 text-cyan-300 border border-cyan-800 px-1.5 py-0.5 font-bold uppercase">
                      {banner.badge_text || 'PROMOTION'}
                    </span>
                    <span className="text-3xs text-zinc-500">Order #{banner.display_order}</span>
                  </div>

                  <div>
                    <h4 className="font-bold text-zinc-100 text-xs">{banner.title}</h4>
                    {banner.subtitle && (
                      <p className="text-2xs text-zinc-400 mt-0.5">{banner.subtitle}</p>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-3xs pt-2 border-t border-chrome-800">
                    <span className="text-zinc-500">CTA: {banner.cta_label} ({banner.cta_link})</span>
                    <span className={banner.is_active ? 'text-emerald-400' : 'text-zinc-500'}>
                      {banner.is_active ? 'Active' : 'Draft'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
