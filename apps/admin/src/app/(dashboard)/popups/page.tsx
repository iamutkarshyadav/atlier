'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Layers,
  Plus,
  Search,
  Eye,
  MousePointerClick,
  Sparkles,
  Tag,
  Star,
  Settings2,
  Trash2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  RefreshCw,
  Sliders,
  AlertCircle,
} from 'lucide-react'
import type { PopupCampaign, PopupType } from '@repo/supabase'

export default function PopupsDashboardPage() {
  const [popups, setPopups] = useState<PopupCampaign[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | PopupType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchPopups = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/popups')
      const data = await res.json()
      if (data.success && Array.isArray(data.popups)) {
        setPopups(data.popups)
      } else {
        setError(data.error || 'Failed to load popups')
      }
    } catch {
      setError('Network error fetching popups')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPopups()
  }, [])

  const handleToggleActive = async (popup: PopupCampaign) => {
    setTogglingId(popup.id)
    try {
      const updatedStatus = !popup.is_active
      const res = await fetch(`/api/admin/popups/${popup.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...popup,
          is_active: updatedStatus,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setPopups((prev) =>
          prev.map((p) => (p.id === popup.id ? { ...p, is_active: updatedStatus } : p))
        )
      } else {
        alert(data.error || 'Failed to update popup status')
      }
    } catch {
      alert('Error updating popup status')
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/popups/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setPopups((prev) => prev.filter((p) => p.id !== id))
      } else {
        alert(data.error || 'Failed to delete popup')
      }
    } catch {
      alert('Error deleting popup')
    } finally {
      setDeletingId(null)
    }
  }

  // Filtered list
  const filteredPopups = popups.filter((p) => {
    if (activeFilter === 'active' && !p.is_active) return false
    if (activeFilter !== 'all' && activeFilter !== 'active' && p.type !== activeFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchTitle = p.title.toLowerCase().includes(q)
      const matchHeadline = p.headline.toLowerCase().includes(q)
      const matchBadge = p.badge_text?.toLowerCase().includes(q)
      return matchTitle || matchHeadline || matchBadge
    }
    return true
  })

  // Summary Metrics
  const totalPopups = popups.length
  const activeCount = popups.filter((p) => p.is_active).length
  const totalImpressions = popups.reduce((acc, p) => acc + (p.impression_count || 0), 0)
  const totalClicks = popups.reduce((acc, p) => acc + (p.click_count || 0), 0)
  const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : '0.0'

  const getTypeBadge = (type: PopupType) => {
    switch (type) {
      case 'sale':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[11px] font-mono font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <Tag className="w-3 h-3" /> Sale / Offer
          </span>
        )
      case 'feature':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[11px] font-mono font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <Sparkles className="w-3 h-3" /> Feature Spotlight
          </span>
        )
      case 'review':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[11px] font-mono font-medium bg-amber-50 text-amber-800 border border-amber-200">
            <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Review Prompt
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[11px] font-mono font-medium bg-purple-50 text-purple-700 border border-purple-200">
            <Sliders className="w-3 h-3" /> Custom
          </span>
        )
    }
  }

  const formatTrigger = (p: PopupCampaign) => {
    switch (p.trigger) {
      case 'delay':
        return `Delay (${p.trigger_delay_seconds || 3}s)`
      case 'scroll':
        return `Scroll (${p.trigger_scroll_percentage || 30}%)`
      case 'exit_intent':
        return 'Exit Intent'
      case 'immediate':
      default:
        return 'Immediate'
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-6 h-6 text-foreground" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Pop-Up Studio
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Create, target, and monitor interactive pop-ups for sales, product features, customer reviews, and announcements.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchPopups}
            className="p-2 border border-border rounded-xs hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Refresh popups"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href="/popups/new"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:border-transparent dark:hover:bg-zinc-200 text-xs font-semibold rounded-xs transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create Pop-Up</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-sm border border-chrome-800 bg-chrome-900 text-foreground shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Active Campaigns</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {activeCount}{' '}
            <span className="text-xs font-normal text-muted-foreground">/ {totalPopups} total</span>
          </div>
        </div>

        <div className="p-4 rounded-sm border border-chrome-800 bg-chrome-900 text-foreground shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Total Impressions</span>
            <Eye className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {totalImpressions.toLocaleString()}
          </div>
        </div>

        <div className="p-4 rounded-sm border border-chrome-800 bg-chrome-900 text-foreground shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>CTA Click Actions</span>
            <MousePointerClick className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {totalClicks.toLocaleString()}
          </div>
        </div>

        <div className="p-4 rounded-sm border border-chrome-800 bg-chrome-900 text-foreground shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Click-Through Rate</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">{avgCtr}%</div>
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'all', label: 'All Pop-Ups' },
            { id: 'active', label: 'Active Only' },
            { id: 'sale', label: 'Sales & Offers' },
            { id: 'feature', label: 'Feature Spotlights' },
            { id: 'review', label: 'Review Prompts' },
            { id: 'custom', label: 'Custom' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xs text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border ${
                activeFilter === tab.id
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs font-semibold dark:bg-zinc-100 dark:text-zinc-900 dark:border-transparent'
                  : 'bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border-slate-200 dark:bg-chrome-900 dark:hover:bg-chrome-850 dark:text-zinc-400 dark:hover:text-zinc-200 dark:border-chrome-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-chrome-950 border border-chrome-750 rounded-xs text-foreground focus:outline-hidden focus:border-chrome-700"
          />
        </div>
      </div>

      {/* Campaign List */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-sm text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground text-xs space-y-2">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto text-foreground" />
          <p>Loading pop-up studio campaigns...</p>
        </div>
      ) : filteredPopups.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border rounded-sm bg-card space-y-3">
          <Layers className="w-8 h-8 mx-auto text-muted-foreground/60" />
          <h3 className="text-sm font-semibold text-foreground">No pop-up campaigns found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {searchQuery
              ? 'No campaigns match your current search query.'
              : 'Create your first interactive pop-up to engage customers with sales, reviews, or new features.'}
          </p>
          <Link
            href="/popups/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:border-transparent text-xs font-semibold rounded-xs transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Pop-Up</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPopups.map((popup) => (
            <div
              key={popup.id}
              className="group border border-slate-200 dark:border-chrome-800 hover:border-slate-300 dark:hover:border-chrome-750 bg-white dark:bg-chrome-900 rounded-sm overflow-hidden flex flex-col justify-between transition-all shadow-xs hover:shadow-md"
            >
              {/* Card Banner / Thumbnail */}
              <div className="relative h-36 w-full bg-slate-100 dark:bg-chrome-950 overflow-hidden border-b border-slate-200 dark:border-chrome-800">
                {popup.banner_image_url ? (
                  <Image
                    src={popup.banner_image_url}
                    alt={popup.title}
                    fill
                    className="object-cover group-hover:scale-102 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-chrome-950 text-slate-400 dark:text-zinc-500">
                    <Layers className="w-8 h-8 mb-1" />
                    <span className="text-2xs font-mono">No Image Banner</span>
                  </div>
                )}

                {/* Status Overlay Badge */}
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                  {getTypeBadge(popup.type)}
                </div>

                <div className="absolute top-2.5 right-2.5">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(popup)}
                    disabled={togglingId === popup.id}
                    className={`px-2 py-0.5 rounded-xs text-[10px] font-mono font-bold tracking-wider uppercase transition-colors shadow-xs cursor-pointer flex items-center gap-1 border ${
                      popup.is_active
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                        : 'bg-chrome-850 text-zinc-400 border-chrome-750 hover:bg-chrome-800 hover:text-foreground'
                    }`}
                    title="Click to toggle active status"
                  >
                    {togglingId === popup.id ? (
                      <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                    ) : popup.is_active ? (
                      <CheckCircle2 className="w-2.5 h-2.5" />
                    ) : (
                      <XCircle className="w-2.5 h-2.5" />
                    )}
                    <span>{popup.is_active ? 'Active' : 'Draft'}</span>
                  </button>
                </div>
              </div>

              {/* Card Content */}
              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-1.5">
                  {popup.badge_text && (
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#b91c1c] font-bold block">
                      {popup.badge_text}
                    </span>
                  )}
                  <h4 className="font-sans font-bold text-sm text-foreground line-clamp-1">
                    {popup.headline}
                  </h4>
                  {popup.subheadline && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {popup.subheadline}
                    </p>
                  )}
                </div>

                {/* Configuration Specs */}
                <div className="pt-3 border-t border-border grid grid-cols-2 gap-2 text-[11px] text-muted-foreground font-mono">
                  <div>
                    <span className="text-[10px] uppercase text-[#8a909a] block">Trigger</span>
                    <span className="text-foreground font-medium">{formatTrigger(popup)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-[#8a909a] block">Position</span>
                    <span className="text-foreground font-medium capitalize">
                      {popup.position.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-[#8a909a] block">Target Pages</span>
                    <span className="text-foreground font-medium truncate block">
                      {popup.target_pages?.join(', ') || '*'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-[#8a909a] block">Frequency</span>
                    <span className="text-foreground font-medium capitalize">
                      {popup.frequency.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                {/* Performance Counts */}
                <div className="p-2 bg-muted/40 rounded-xs flex items-center justify-between text-2xs font-mono text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3 text-blue-600" />
                    <span>{popup.impression_count || 0} views</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <MousePointerClick className="w-3 h-3 text-purple-600" />
                    <span>{popup.click_count || 0} clicks</span>
                  </span>
                  {popup.primary_cta?.coupon_code && (
                    <span className="bg-background px-1.5 py-0.5 border border-border rounded-xs text-foreground font-bold">
                      {popup.primary_cta.coupon_code}
                    </span>
                  )}
                </div>

                {/* Card Actions */}
                <div className="pt-2 flex items-center justify-between gap-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() => handleDelete(popup.id, popup.title)}
                    disabled={deletingId === popup.id}
                    className="p-1.5 text-muted-foreground hover:text-rose-600 transition-colors rounded-xs hover:bg-rose-50 cursor-pointer"
                    title="Delete campaign"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <Link
                    href={`/popups/${popup.id}`}
                    className="flex-1 py-1.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 dark:bg-chrome-850 dark:hover:bg-chrome-800 dark:text-foreground dark:border-chrome-750 text-xs font-semibold rounded-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    <span>Studio Editor</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
