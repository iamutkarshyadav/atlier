'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Layers,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Trash2,
  Copy,
  Plus,
  Save,
  RefreshCw,
  Sliders,
  Code,
  Palette,
  Monitor,
  Tablet,
  Smartphone,
  ExternalLink,
  Sparkles,
  Check,
  Zap,
  ArrowRight,
  ShieldCheck,
  Star,
} from 'lucide-react'
import { Button } from '@repo/ui'
import { createBrowserClient } from '@repo/supabase/browser'
import {
  getPageLayout,
  getAllPageLayouts,
  upsertPageLayout,
  DEFAULT_HOME_LAYOUT,
  type PageLayout,
  type LayoutNode,
  type ComponentType,
} from '@repo/supabase/utils'
import { triggerStorefrontRevalidation } from '@/lib/revalidate'

const COMPONENT_BLUEPRINTS: Record<ComponentType, { name: string; defaultProps: Record<string, any>; defaultClass: string }> = {
  HeroBanner: {
    name: 'Cinematic Hero Banner',
    defaultClass: 'relative min-h-[90vh] flex items-center justify-center bg-[#080808] text-white px-6 sm:px-12 py-20 overflow-hidden',
    defaultProps: {
      pillText: 'Bolt ⚡ 45m Doorstep Try-On Active',
      pillLink: '#try-on',
      kicker: 'AUTONOMOUS ATELIER // SPECIFICATION',
      titleLine1: 'ARCHITECTURAL',
      titleLine2: 'SILHOUETTES',
      description: 'Engineered heavyweight garments cut from custom 480 GSM French Terry and raw selvedge denim.',
      primaryCtaLabel: 'Order Doorstep Try-On',
      primaryCtaLink: '/shop',
      secondaryCtaLabel: 'Explore Atelier',
      secondaryCtaLink: '/about',
      bgImageUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=2000&q=85',
      overlayOpacity: 0.4,
    },
  },
  MarqueeTicker: {
    name: 'Ticker Ribbon',
    defaultClass: 'bg-[#121212] text-white border-y border-[#262626] py-3 overflow-hidden select-none font-mono text-2xs uppercase tracking-widest',
    defaultProps: {
      items: [
        '480 GSM French Terry Loopback',
        '14oz Japanese Shuttle-Loomed Selvedge Denim',
        'Bolt ⚡ 45-Minute Doorstep Fitting Session',
        'Zero Synthetic Polyester Blending',
      ],
      speedSeconds: 25,
    },
  },
  EditorialSplit: {
    name: 'Editorial Split Story',
    defaultClass: 'max-w-7xl mx-auto px-6 sm:px-12 py-20',
    defaultProps: {
      kicker: 'DOORSTEP TRY-ON REVOLUTION',
      headline: 'The Salon Comes to Your Mirror.',
      bodyParagraph1: 'Never guess your size again. Select any pieces and try them on at home.',
      bodyParagraph2: 'Keep what fits impeccably, hand back what doesn’t.',
      imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85',
      imagePosition: 'right',
      ctaLabel: 'How Bolt Works',
      ctaLink: '/about',
    },
  },
  ProductGrid: {
    name: 'Curated Product Grid',
    defaultClass: 'max-w-7xl mx-auto px-6 sm:px-12 py-16',
    defaultProps: {
      kicker: 'CURATED ATELIER ARCHIVE',
      title: 'Selected Works Available for Try-On',
      subtitle: 'Select your pieces and choose Bolt ⚡ Try-On at checkout.',
      categoryFilter: 'all',
      limit: 6,
      columns: 3,
    },
  },
  CategoryCarousel: {
    name: 'Category Carousel',
    defaultClass: 'max-w-7xl mx-auto px-6 sm:px-12 py-12',
    defaultProps: {
      title: 'Browse Silhouette Categories',
      limit: 4,
    },
  },
  ReviewsShowcase: {
    name: 'Verified Reviews Showcase',
    defaultClass: 'bg-[#FAF9F6] border-t border-neutral-200 py-20 px-6 sm:px-12',
    defaultProps: {
      title: 'Verified Doorstep Fitting Testimonials',
      subtitle: 'What patrons say about experiencing couture in front of their own mirror.',
    },
  },
  CustomDivBlock: {
    name: 'Custom HTML / Div Block',
    defaultClass: 'bg-neutral-900 text-white p-8 sm:p-12 my-12 max-w-7xl mx-auto border border-neutral-800',
    defaultProps: {
      htmlContent: '<div class="space-y-2"><span class="text-xs font-mono text-emerald-400 uppercase">CUSTOM ATELIER DIV</span><h3 class="text-xl font-serif">Bespoke Structural Element</h3><p class="text-xs text-neutral-400">Custom HTML rendered cleanly via Server-Driven UI.</p></div>',
    },
  },
  Spacer: {
    name: 'Vertical Spacer',
    defaultClass: 'w-full',
    defaultProps: {
      heightPx: 48,
    },
  },
  TextBanner: {
    name: 'Typography Text Banner',
    defaultClass: 'py-12 px-6 text-center max-w-4xl mx-auto',
    defaultProps: {
      kicker: 'ANNOUNCEMENT',
      title: 'New Creator Capsule Released',
      text: 'Strictly limited quantities crafted for this edition.',
    },
  },
  Container: {
    name: 'Layout Container Div',
    defaultClass: 'max-w-7xl mx-auto px-6 py-8',
    defaultProps: {},
  },
}

const COMMON_TAILWIND_SNIPPETS = [
  'bg-black',
  'bg-neutral-900',
  'bg-[#FAF9F6]',
  'text-white',
  'text-neutral-950',
  'p-6',
  'p-12',
  'py-20',
  'px-6',
  'border',
  'border-neutral-800',
  'border-b',
  'max-w-7xl',
  'mx-auto',
  'text-center',
  'shadow-2xl',
  'overflow-hidden',
  'rounded-none',
]

export function LayoutBuilder() {
  const [activeSlug, setActiveSlug] = useState('home')
  const [pageTitle, setPageTitle] = useState('Homepage')
  const [nodes, setNodes] = useState<LayoutNode[]>([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [viewportMode, setViewportMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [inspectorTab, setInspectorTab] = useState<'props' | 'tailwind' | 'css' | 'raw_json'>('props')

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [showAddMenu, setShowAddMenu] = useState(false)

  // CSS Key-Value Editor helper state
  const [newCssProp, setNewCssProp] = useState('')
  const [newCssVal, setNewCssVal] = useState('')

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Load Layout
  const loadLayout = async (slug: string) => {
    setIsLoading(true)
    try {
      const supabase = createBrowserClient()
      const layout = await getPageLayout(supabase, slug)
      setPageTitle(layout.page_title)
      const layoutNodes = (layout.layout_json as unknown as LayoutNode[]) || []
      setNodes(layoutNodes)
      if (layoutNodes.length > 0) {
        setSelectedNodeId(layoutNodes[0]!.id)
      } else {
        setSelectedNodeId(null)
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadLayout(activeSlug)
  }, [activeSlug])

  // Selected Node Reference
  const selectedNode = useMemo(() => {
    return nodes.find((n) => n.id === selectedNodeId) || null
  }, [nodes, selectedNodeId])

  // Node Mutations
  const updateSelectedNode = (updater: (prev: LayoutNode) => LayoutNode) => {
    if (!selectedNodeId) return
    setNodes((prev) =>
      prev.map((n) => (n.id === selectedNodeId ? updater(n) : n))
    )
  }

  const toggleVisibility = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setNodes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isVisible: !n.isVisible } : n))
    )
  }

  const moveNode = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= nodes.length) return
    const next = [...nodes]
    const temp = next[index]!
    next[index] = next[targetIdx]!
    next[targetIdx] = temp
    setNodes(next)
  }

  const duplicateNode = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const target = nodes.find((n) => n.id === id)
    if (!target) return
    const copy: LayoutNode = {
      ...JSON.parse(JSON.stringify(target)),
      id: `${target.type.toLowerCase()}-${Date.now().toString().slice(-4)}`,
      name: `${target.name || target.type} (Copy)`,
    }
    const idx = nodes.findIndex((n) => n.id === id)
    const next = [...nodes]
    next.splice(idx + 1, 0, copy)
    setNodes(next)
    setSelectedNodeId(copy.id)
    showToast(`Duplicated block: ${copy.name}`)
  }

  const deleteNode = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setNodes((prev) => prev.filter((n) => n.id !== id))
    if (selectedNodeId === id) {
      setSelectedNodeId(null)
    }
    showToast('Deleted block from tree')
  }

  const addComponentBlock = (type: ComponentType) => {
    const blueprint = COMPONENT_BLUEPRINTS[type]
    const newNode: LayoutNode = {
      id: `${type.toLowerCase()}-${Date.now().toString().slice(-4)}`,
      type,
      name: blueprint.name,
      isVisible: true,
      className: blueprint.defaultClass,
      styles: {},
      props: JSON.parse(JSON.stringify(blueprint.defaultProps)),
    }
    setNodes((prev) => [...prev, newNode])
    setSelectedNodeId(newNode.id)
    setShowAddMenu(false)
    showToast(`Added ${blueprint.name} to layout`)
  }

  // CSS Style manipulation
  const handleAddCssStyle = () => {
    if (!newCssProp.trim() || !newCssVal.trim()) return
    updateSelectedNode((prev) => ({
      ...prev,
      styles: {
        ...(prev.styles || {}),
        [newCssProp.trim()]: newCssVal.trim(),
      },
    }))
    setNewCssProp('')
    setNewCssVal('')
  }

  const handleRemoveCssStyle = (propName: string) => {
    updateSelectedNode((prev) => {
      const nextStyles = { ...(prev.styles || {}) }
      delete nextStyles[propName]
      return { ...prev, styles: nextStyles }
    })
  }

  // Save & Deploy
  const handleSaveAndDeploy = async () => {
    setIsSaving(true)
    try {
      const supabase = createBrowserClient()
      const res = await upsertPageLayout(supabase, {
        page_slug: activeSlug,
        page_title: pageTitle,
        layout_json: nodes as any,
        is_published: true,
      })

      if (!res.success) {
        showToast(`Save Error: ${res.error}`)
        return
      }

      // Purge Storefront ISR Cache
      await triggerStorefrontRevalidation({ path: activeSlug === 'home' ? '/' : `/${activeSlug}` })

      // Broadcast Supabase Realtime update for live storefront tabs
      try {
        const channel = supabase.channel(`cms_layout_${activeSlug}`)
        await channel.send({
          type: 'broadcast',
          event: 'layout_update',
          payload: { layout_json: nodes },
        })
      } catch (broadcastErr) {
        console.warn('Realtime broadcast note:', broadcastErr)
      }

      showToast(`Layout published! Storefront ISR cache purged & Realtime sync active.`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetToDefault = () => {
    if (confirm('Revert current layout tree back to factory default?')) {
      if (activeSlug === 'home') {
        const defaultNodes = (DEFAULT_HOME_LAYOUT.layout_json as unknown as LayoutNode[]) || []
        setNodes(defaultNodes)
        if (defaultNodes.length > 0 && defaultNodes[0]) {
          setSelectedNodeId(defaultNodes[0].id)
        }
        showToast('Restored default home layout')
      }
    }
  }

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Action & Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-3 bg-chrome-900 border border-chrome-800">
        <div className="flex items-center gap-3">
          <span className="text-2xs uppercase text-zinc-400 font-semibold">Editing Page:</span>
          <select
            value={activeSlug}
            onChange={(e) => setActiveSlug(e.target.value)}
            className="bg-chrome-950 border border-chrome-750 px-2.5 py-1 text-xs text-cyan-300 font-bold focus:outline-none"
          >
            <option value="home">Home Page (/)</option>
            <option value="shop">Catalog (/shop)</option>
            <option value="about">About Atelier (/about)</option>
          </select>
          <span className="text-3xs text-zinc-500 font-normal">
            ({nodes.length} Sections / Blocks)
          </span>
        </div>

        {/* Viewport & Actions */}
        <div className="flex items-center gap-2">
          {/* Viewport switch */}
          <div className="flex bg-chrome-950 border border-chrome-750 p-0.5">
            <button
              onClick={() => setViewportMode('desktop')}
              className={`p-1.5 transition-colors ${
                viewportMode === 'desktop' ? 'bg-chrome-800 text-cyan-300' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Desktop View (100%)"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewportMode('tablet')}
              className={`p-1.5 transition-colors ${
                viewportMode === 'tablet' ? 'bg-chrome-800 text-cyan-300' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Tablet View (768px)"
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewportMode('mobile')}
              className={`p-1.5 transition-colors ${
                viewportMode === 'mobile' ? 'bg-chrome-800 text-cyan-300' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Mobile View (375px)"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>

          <Button
            variant="terminal"
            size="sm"
            onClick={handleResetToDefault}
            className="h-7 text-3xs border-chrome-750 text-zinc-400"
          >
            Reset Default
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleSaveAndDeploy}
            isLoading={isSaving}
            className="h-7 px-3 text-2xs bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold rounded-none flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" /> Save & Deploy Live
          </Button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-2.5 bg-chrome-850 border border-cyan-500/70 text-cyan-300 text-xs flex justify-between items-center shadow-lg">
          <span className="font-semibold">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-zinc-400 hover:text-white font-bold ml-4">
            ×
          </button>
        </div>
      )}

      {/* Main Split-Pane Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Pane: Hierarchical Tree Inspector (4 Cols) */}
        <div className="lg:col-span-4 bg-chrome-900 border border-chrome-800 p-3 space-y-3 flex flex-col min-h-[620px]">
          <div className="flex justify-between items-center border-b border-chrome-800 pb-2">
            <span className="text-3xs uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" /> Page Component Tree
            </span>
            <div className="relative">
              <Button
                variant="terminal"
                size="sm"
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="h-6 px-2 text-3xs flex items-center gap-1 border-cyan-500/60 text-cyan-300"
              >
                <Plus className="w-3 h-3" /> Add Block
              </Button>

              {showAddMenu && (
                <div className="absolute right-0 top-7 w-64 bg-chrome-950 border border-chrome-750 shadow-2xl z-40 p-1.5 space-y-1">
                  <span className="text-3xs uppercase text-zinc-500 font-bold px-2 py-1 block">
                    Select Block Blueprint:
                  </span>
                  {(Object.keys(COMPONENT_BLUEPRINTS) as ComponentType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => addComponentBlock(t)}
                      className="w-full text-left px-2 py-1 text-2xs hover:bg-chrome-800 text-zinc-200 flex justify-between items-center"
                    >
                      <span>{COMPONENT_BLUEPRINTS[t].name}</span>
                      <span className="text-3xs text-zinc-500 font-mono">{t}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Node Tree List */}
          <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
            {nodes.map((node, idx) => {
              const isSelected = node.id === selectedNodeId
              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`p-2 border transition-colors cursor-pointer select-none flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-400 text-zinc-100'
                      : 'bg-chrome-950 border-chrome-800 hover:border-chrome-700 text-zinc-300'
                  } ${!node.isVisible ? 'opacity-40 line-through' : ''}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-3xs font-mono text-zinc-500 tabular-nums">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-2xs truncate">
                        {node.name || node.type}
                      </div>
                      <span className="text-3xs text-cyan-400/80 font-mono block">
                        &lt;{node.type} /&gt;
                      </span>
                    </div>
                  </div>

                  {/* Quick Inline Actions */}
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => toggleVisibility(node.id, e)}
                      className="p-1 text-zinc-400 hover:text-zinc-100"
                      title={node.isVisible ? 'Hide Block' : 'Show Block'}
                    >
                      {node.isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-zinc-600" />}
                    </button>

                    <button
                      onClick={() => moveNode(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 text-zinc-400 hover:text-zinc-100 disabled:opacity-20"
                      title="Move Up"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>

                    <button
                      onClick={() => moveNode(idx, 'down')}
                      disabled={idx === nodes.length - 1}
                      className="p-1 text-zinc-400 hover:text-zinc-100 disabled:opacity-20"
                      title="Move Down"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>

                    <button
                      onClick={(e) => duplicateNode(node.id, e)}
                      className="p-1 text-zinc-400 hover:text-zinc-100"
                      title="Duplicate"
                    >
                      <Copy className="w-3 h-3" />
                    </button>

                    <button
                      onClick={(e) => deleteNode(node.id, e)}
                      className="p-1 text-zinc-400 hover:text-rose-400"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )
            })}

            {nodes.length === 0 && !isLoading && (
              <div className="py-12 text-center text-zinc-500 text-2xs">
                No component nodes in page layout. Click &quot;Add Block&quot; to begin.
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Property & CSS Inspector (8 Cols) */}
        <div className="lg:col-span-8 bg-chrome-900 border border-chrome-800 p-4 space-y-4 min-h-[620px] flex flex-col">
          {selectedNode ? (
            <>
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-chrome-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-3xs uppercase tracking-wider text-cyan-400 font-bold">
                      Component Inspector
                    </span>
                    <span className="px-1.5 py-0.2 bg-chrome-950 border border-chrome-750 text-3xs text-zinc-300 font-mono">
                      &lt;{selectedNode.type} /&gt;
                    </span>
                  </div>
                  <input
                    type="text"
                    value={selectedNode.name || ''}
                    onChange={(e) =>
                      updateSelectedNode((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Block descriptive name..."
                    className="bg-transparent border-0 font-bold text-sm text-zinc-100 focus:outline-none focus:ring-0 p-0 mt-0.5 w-full"
                  />
                </div>

                {/* Inspector Tabs */}
                <div className="flex bg-chrome-950 border border-chrome-750 text-2xs">
                  <button
                    onClick={() => setInspectorTab('props')}
                    className={`px-2.5 py-1 ${
                      inspectorTab === 'props' ? 'bg-chrome-800 text-cyan-300 font-bold' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Props
                  </button>
                  <button
                    onClick={() => setInspectorTab('tailwind')}
                    className={`px-2.5 py-1 ${
                      inspectorTab === 'tailwind' ? 'bg-chrome-800 text-cyan-300 font-bold' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Tailwind
                  </button>
                  <button
                    onClick={() => setInspectorTab('css')}
                    className={`px-2.5 py-1 ${
                      inspectorTab === 'css' ? 'bg-chrome-800 text-cyan-300 font-bold' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Inline CSS
                  </button>
                  <button
                    onClick={() => setInspectorTab('raw_json')}
                    className={`px-2.5 py-1 ${
                      inspectorTab === 'raw_json' ? 'bg-chrome-800 text-cyan-300 font-bold' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Raw JSON
                  </button>
                </div>
              </div>

              {/* TAB 1: COMPONENT PROPS */}
              {inspectorTab === 'props' && (
                <div className="space-y-3 overflow-y-auto max-h-[460px] pr-1">
                  {/* HERO BANNER PROPS */}
                  {selectedNode.type === 'HeroBanner' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-3xs uppercase text-zinc-400 font-semibold block">Pill Text</label>
                          <input
                            type="text"
                            value={selectedNode.props.pillText || ''}
                            onChange={(e) =>
                              updateSelectedNode((prev) => ({
                                ...prev,
                                props: { ...prev.props, pillText: e.target.value },
                              }))
                            }
                            className="w-full bg-chrome-950 border border-chrome-750 px-2 py-1 text-2xs text-zinc-100 focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-3xs uppercase text-zinc-400 font-semibold block">Kicker</label>
                          <input
                            type="text"
                            value={selectedNode.props.kicker || ''}
                            onChange={(e) =>
                              updateSelectedNode((prev) => ({
                                ...prev,
                                props: { ...prev.props, kicker: e.target.value },
                              }))
                            }
                            className="w-full bg-chrome-950 border border-chrome-750 px-2 py-1 text-2xs text-zinc-100 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-3xs uppercase text-zinc-400 font-semibold block">Headline Line 1</label>
                          <input
                            type="text"
                            value={selectedNode.props.titleLine1 || ''}
                            onChange={(e) =>
                              updateSelectedNode((prev) => ({
                                ...prev,
                                props: { ...prev.props, titleLine1: e.target.value },
                              }))
                            }
                            className="w-full bg-chrome-950 border border-chrome-750 px-2 py-1 text-2xs text-zinc-100 focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-3xs uppercase text-zinc-400 font-semibold block">Headline Line 2 (Italic)</label>
                          <input
                            type="text"
                            value={selectedNode.props.titleLine2 || ''}
                            onChange={(e) =>
                              updateSelectedNode((prev) => ({
                                ...prev,
                                props: { ...prev.props, titleLine2: e.target.value },
                              }))
                            }
                            className="w-full bg-chrome-950 border border-chrome-750 px-2 py-1 text-2xs text-zinc-100 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-3xs uppercase text-zinc-400 font-semibold block">Description Narrative</label>
                        <textarea
                          rows={2}
                          value={selectedNode.props.description || ''}
                          onChange={(e) =>
                            updateSelectedNode((prev) => ({
                              ...prev,
                              props: { ...prev.props, description: e.target.value },
                            }))
                          }
                          className="w-full bg-chrome-950 border border-chrome-750 p-2 text-2xs text-zinc-100 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-3xs uppercase text-zinc-400 font-semibold block">Primary Button Label & Link</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={selectedNode.props.primaryCtaLabel || ''}
                              onChange={(e) =>
                                updateSelectedNode((prev) => ({
                                  ...prev,
                                  props: { ...prev.props, primaryCtaLabel: e.target.value },
                                }))
                              }
                              placeholder="Label"
                              className="w-1/2 bg-chrome-950 border border-chrome-750 px-2 py-1 text-2xs text-zinc-100"
                            />
                            <input
                              type="text"
                              value={selectedNode.props.primaryCtaLink || ''}
                              onChange={(e) =>
                                updateSelectedNode((prev) => ({
                                  ...prev,
                                  props: { ...prev.props, primaryCtaLink: e.target.value },
                                }))
                              }
                              placeholder="/shop"
                              className="w-1/2 bg-chrome-950 border border-chrome-750 px-2 py-1 text-2xs text-zinc-100"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-3xs uppercase text-zinc-400 font-semibold block">Background Image URL</label>
                          <input
                            type="text"
                            value={selectedNode.props.bgImageUrl || ''}
                            onChange={(e) =>
                              updateSelectedNode((prev) => ({
                                ...prev,
                                props: { ...prev.props, bgImageUrl: e.target.value },
                              }))
                            }
                            className="w-full bg-chrome-950 border border-chrome-750 px-2 py-1 text-2xs text-zinc-100 font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* EDITORIAL SPLIT PROPS */}
                  {selectedNode.type === 'EditorialSplit' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-3xs uppercase text-zinc-400 font-semibold block">Kicker</label>
                          <input
                            type="text"
                            value={selectedNode.props.kicker || ''}
                            onChange={(e) =>
                              updateSelectedNode((prev) => ({
                                ...prev,
                                props: { ...prev.props, kicker: e.target.value },
                              }))
                            }
                            className="w-full bg-chrome-950 border border-chrome-750 px-2 py-1 text-2xs text-zinc-100"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-3xs uppercase text-zinc-400 font-semibold block">Headline</label>
                          <input
                            type="text"
                            value={selectedNode.props.headline || ''}
                            onChange={(e) =>
                              updateSelectedNode((prev) => ({
                                ...prev,
                                props: { ...prev.props, headline: e.target.value },
                              }))
                            }
                            className="w-full bg-chrome-950 border border-chrome-750 px-2 py-1 text-2xs text-zinc-100"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-3xs uppercase text-zinc-400 font-semibold block">Body Paragraph 1</label>
                        <textarea
                          rows={2}
                          value={selectedNode.props.bodyParagraph1 || ''}
                          onChange={(e) =>
                            updateSelectedNode((prev) => ({
                              ...prev,
                              props: { ...prev.props, bodyParagraph1: e.target.value },
                            }))
                          }
                          className="w-full bg-chrome-950 border border-chrome-750 p-2 text-2xs text-zinc-100"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-3xs uppercase text-zinc-400 font-semibold block">Image URL</label>
                          <input
                            type="text"
                            value={selectedNode.props.imageUrl || ''}
                            onChange={(e) =>
                              updateSelectedNode((prev) => ({
                                ...prev,
                                props: { ...prev.props, imageUrl: e.target.value },
                              }))
                            }
                            className="w-full bg-chrome-950 border border-chrome-750 px-2 py-1 text-2xs text-zinc-100 font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-3xs uppercase text-zinc-400 font-semibold block">Image Position</label>
                          <select
                            value={selectedNode.props.imagePosition || 'right'}
                            onChange={(e) =>
                              updateSelectedNode((prev) => ({
                                ...prev,
                                props: { ...prev.props, imagePosition: e.target.value },
                              }))
                            }
                            className="w-full bg-chrome-950 border border-chrome-750 px-2 py-1 text-2xs text-zinc-100"
                          >
                            <option value="right">Right</option>
                            <option value="left">Left</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PRODUCT GRID PROPS */}
                  {selectedNode.type === 'ProductGrid' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-3xs uppercase text-zinc-400 font-semibold block">Section Title</label>
                          <input
                            type="text"
                            value={selectedNode.props.title || ''}
                            onChange={(e) =>
                              updateSelectedNode((prev) => ({
                                ...prev,
                                props: { ...prev.props, title: e.target.value },
                              }))
                            }
                            className="w-full bg-chrome-950 border border-chrome-750 px-2 py-1 text-2xs text-zinc-100"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-3xs uppercase text-zinc-400 font-semibold block">Columns</label>
                          <select
                            value={selectedNode.props.columns || 3}
                            onChange={(e) =>
                              updateSelectedNode((prev) => ({
                                ...prev,
                                props: { ...prev.props, columns: Number(e.target.value) },
                              }))
                            }
                            className="w-full bg-chrome-950 border border-chrome-750 px-2 py-1 text-2xs text-zinc-100"
                          >
                            <option value={2}>2 Columns</option>
                            <option value={3}>3 Columns</option>
                            <option value={4}>4 Columns</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-3xs uppercase text-zinc-400 font-semibold block">Max Items</label>
                          <input
                            type="number"
                            min={1}
                            max={24}
                            value={selectedNode.props.limit || 6}
                            onChange={(e) =>
                              updateSelectedNode((prev) => ({
                                ...prev,
                                props: { ...prev.props, limit: Number(e.target.value) },
                              }))
                            }
                            className="w-full bg-chrome-950 border border-chrome-750 px-2 py-1 text-2xs text-zinc-100 tabular-nums"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CUSTOM HTML BLOCK PROPS */}
                  {selectedNode.type === 'CustomDivBlock' && (
                    <div className="space-y-2">
                      <label className="text-3xs uppercase text-zinc-400 font-semibold block">
                        Raw HTML / Dynamic Div Content
                      </label>
                      <textarea
                        rows={7}
                        value={selectedNode.props.htmlContent || ''}
                        onChange={(e) =>
                          updateSelectedNode((prev) => ({
                            ...prev,
                            props: { ...prev.props, htmlContent: e.target.value },
                          }))
                        }
                        className="w-full bg-chrome-950 border border-chrome-750 p-2 text-2xs text-emerald-400 font-mono focus:outline-none"
                      />
                    </div>
                  )}

                  {/* MARQUEE PROPS */}
                  {selectedNode.type === 'MarqueeTicker' && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-3xs uppercase text-zinc-400 font-semibold block">
                          Ticker Strings (Comma-Separated)
                        </label>
                        <textarea
                          rows={3}
                          value={Array.isArray(selectedNode.props.items) ? selectedNode.props.items.join(', ') : ''}
                          onChange={(e) =>
                            updateSelectedNode((prev) => ({
                              ...prev,
                              props: {
                                ...prev.props,
                                items: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                              },
                            }))
                          }
                          className="w-full bg-chrome-950 border border-chrome-750 p-2 text-2xs text-zinc-100 font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-3xs uppercase text-zinc-400 font-semibold block">
                          Speed in Seconds
                        </label>
                        <input
                          type="number"
                          value={selectedNode.props.speedSeconds || 25}
                          onChange={(e) =>
                            updateSelectedNode((prev) => ({
                              ...prev,
                              props: { ...prev.props, speedSeconds: Number(e.target.value) },
                            }))
                          }
                          className="w-32 bg-chrome-950 border border-chrome-750 px-2 py-1 text-2xs text-zinc-100 tabular-nums"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: TAILWIND UTILITY CLASSES */}
              {inspectorTab === 'tailwind' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-3xs uppercase text-zinc-400 font-semibold block">
                      Element Class Name String (Tailwind Utilities)
                    </label>
                    <textarea
                      rows={3}
                      value={selectedNode.className || ''}
                      onChange={(e) =>
                        updateSelectedNode((prev) => ({ ...prev, className: e.target.value }))
                      }
                      className="w-full bg-chrome-950 border border-chrome-750 p-2 text-2xs text-cyan-300 font-mono focus:outline-none"
                    />
                  </div>

                  {/* Snippets / Pills */}
                  <div className="space-y-1.5">
                    <span className="text-3xs uppercase text-zinc-500 font-semibold block">
                      Quick Tailwind Snippets (Click to Toggle):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {COMMON_TAILWIND_SNIPPETS.map((snippet) => {
                        const current = (selectedNode.className || '').split(' ')
                        const isIncluded = current.includes(snippet)
                        return (
                          <button
                            key={snippet}
                            onClick={() => {
                              let next: string[]
                              if (isIncluded) {
                                next = current.filter((c) => c !== snippet)
                              } else {
                                next = [...current, snippet]
                              }
                              updateSelectedNode((prev) => ({ ...prev, className: next.join(' ') }))
                            }}
                            className={`px-2 py-0.5 text-3xs border transition-colors ${
                              isIncluded
                                ? 'bg-cyan-950 text-cyan-300 border-cyan-700 font-bold'
                                : 'bg-chrome-950 text-zinc-400 border-chrome-800 hover:text-zinc-200'
                            }`}
                          >
                            {snippet}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: INLINE CSS CUSTOM STYLES */}
              {inspectorTab === 'css' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <span className="text-3xs uppercase text-zinc-400 font-semibold block">
                      Active CSS Property Overrides:
                    </span>
                    <div className="border border-chrome-800 bg-chrome-950 divide-y divide-chrome-800 text-2xs">
                      {Object.entries(selectedNode.styles || {}).map(([key, val]) => (
                        <div key={key} className="flex justify-between items-center px-3 py-1.5">
                          <span className="text-cyan-400 font-mono">{key}:</span>
                          <span className="text-zinc-200 font-mono">{val}</span>
                          <button
                            onClick={() => handleRemoveCssStyle(key)}
                            className="text-zinc-500 hover:text-rose-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}

                      {Object.keys(selectedNode.styles || {}).length === 0 && (
                        <div className="p-3 text-center text-zinc-500 text-3xs">
                          No inline style overrides applied. Defaulting to component theme.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Add New CSS Property */}
                  <div className="p-3 bg-chrome-950 border border-chrome-800 space-y-2">
                    <span className="text-3xs uppercase text-zinc-400 font-semibold block">
                      Add Custom CSS Property Override:
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Property (e.g. letterSpacing)"
                        value={newCssProp}
                        onChange={(e) => setNewCssProp(e.target.value)}
                        className="bg-chrome-900 border border-chrome-750 px-2 py-1 text-2xs text-zinc-100 font-mono"
                      />
                      <input
                        type="text"
                        placeholder="Value (e.g. 0.25em or #121212)"
                        value={newCssVal}
                        onChange={(e) => setNewCssVal(e.target.value)}
                        className="bg-chrome-900 border border-chrome-750 px-2 py-1 text-2xs text-zinc-100 font-mono"
                      />
                    </div>
                    <Button
                      variant="terminal"
                      size="sm"
                      onClick={handleAddCssStyle}
                      className="w-full text-3xs border-cyan-500/60 text-cyan-300"
                    >
                      + Add CSS Override
                    </Button>
                  </div>
                </div>
              )}

              {/* TAB 4: RAW JSON TREE NODE */}
              {inspectorTab === 'raw_json' && (
                <div className="space-y-1">
                  <span className="text-3xs uppercase text-zinc-400 font-semibold block">
                    Node JSON Structure
                  </span>
                  <pre className="p-3 bg-chrome-950 border border-chrome-800 text-3xs text-emerald-400 font-mono overflow-auto max-h-[380px]">
                    {JSON.stringify(selectedNode, null, 2)}
                  </pre>
                </div>
              )}
            </>
          ) : (
            <div className="py-24 text-center text-zinc-500 text-2xs">
              Select any component node from the tree on the left to inspect and modify its DOM properties.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
