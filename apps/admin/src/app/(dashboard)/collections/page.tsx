'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import Image from 'next/image'
import {
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  X,
  RefreshCw,
  Upload,
  Image as ImageIcon,
  ChevronDown,
  ChevronRight,
  FolderTree,
  Search,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Tag,
  Boxes,
  Globe,
} from 'lucide-react'
import { Button } from '@repo/ui'
import { triggerStorefrontRevalidation } from '@/lib/revalidate'
import { createBrowserClient } from '@repo/supabase/browser'
import {
  getAllProductsAdmin,
  type Category,
  type Product,
  type CollectionWithRelations,
  type CollectionGroupType,
} from '@repo/supabase/utils'

const CURATED_PRESETS = [
  {
    label: 'Festivals & Celebrations',
    url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=85',
  },
  {
    label: 'Royal Weddings',
    url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1200&q=85',
  },
  {
    label: 'Resort & Travel',
    url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85',
  },
  {
    label: 'Minimalist Workwear',
    url: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1200&q=85',
  },
  {
    label: 'Autumn Capsule',
    url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1200&q=85',
  },
]

export default function AdminCollectionsPage() {
  const [collections, setCollections] = useState<CollectionWithRelations[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Drawer & Form State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [groupType, setGroupType] = useState<CollectionGroupType>('occasion')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [displayOrder, setDisplayOrder] = useState('1')
  const [isActive, setIsActive] = useState(true)
  const [showInNavbar, setShowInNavbar] = useState(true)
  const [showOnHome, setShowOnHome] = useState(true)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])

  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  // Toolbar state
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | CollectionGroupType>('all')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Keyboard shortcut '/'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Auto-dismiss feedback toast
  useEffect(() => {
    if (!feedback) return
    const timer = setTimeout(() => setFeedback(null), 4000)
    return () => clearTimeout(timer)
  }, [feedback])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [colRes, catRes] = await Promise.all([
        fetch('/api/admin/collections', { cache: 'no-store' }),
        fetch('/api/admin/categories', { cache: 'no-store' }),
      ])
      const colJson = await colRes.json()
      const catJson = await catRes.json()

      if (colJson.success && colJson.collections) {
        setCollections(colJson.collections)
      }
      if (catJson.success && catJson.categories) {
        setCategories(catJson.categories)
      }

      // Fetch products for picker
      try {
        const supabase = createBrowserClient()
        const prods = await getAllProductsAdmin(supabase)
        if (prods && Array.isArray(prods)) setProducts(prods)
      } catch {}
    } catch {
      // Fallback
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()

    const supabase = createBrowserClient()
    const channel = supabase
      .channel('admin_collections_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collections' }, () => {
        loadData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'storefront_config' }, () => {
        loadData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Category Tree
  const { parentCategories, subcategoriesMap } = useMemo(() => {
    const parents = categories
      .filter((c) => !c.parent_id)
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
    const subMap: Record<string, Category[]> = {}
    categories.forEach((c) => {
      if (c.parent_id) {
        if (!subMap[c.parent_id]) subMap[c.parent_id] = []
        subMap[c.parent_id].push(c)
      }
    })
    Object.keys(subMap).forEach((pId) => {
      subMap[pId].sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
    })
    return { parentCategories: parents, subcategoriesMap: subMap }
  }, [categories])

  // Category product count map
  const categoryProductCounts = useMemo(() => {
    const map: Record<string, number> = {}
    categories.forEach((c) => {
      map[c.id] = 0
    })
    products.forEach((p) => {
      if (p.category_id && map[p.category_id] !== undefined) {
        map[p.category_id]++
      }
    })
    return map
  }, [categories, products])

  // Filtered collections
  const filteredCollections = useMemo(() => {
    return collections.filter((c) => {
      if (typeFilter !== 'all' && c.group_type !== typeFilter) return false
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase().trim()
      return (
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q)
      )
    })
  }, [collections, typeFilter, searchQuery])

  // Open Drawer to Add
  const openAdd = () => {
    setEditingId(null)
    setName('')
    setSlug('')
    setGroupType('occasion')
    setDescription('')
    setImageUrl('')
    setDisplayOrder(String(collections.length + 1))
    setIsActive(true)
    setShowInNavbar(true)
    setShowOnHome(true)
    setSelectedCategoryIds([])
    setSelectedProductIds([])
    setIsDrawerOpen(true)
  }

  // Open Drawer to Edit
  const startEdit = (col: CollectionWithRelations) => {
    setEditingId(col.id)
    setName(col.name)
    setSlug(col.slug)
    setGroupType(col.group_type || 'occasion')
    setDescription(col.description || '')
    setImageUrl(col.image_url || '')
    setDisplayOrder(String(col.display_order || 1))
    setIsActive(col.is_active ?? true)
    setShowInNavbar(col.show_in_navbar ?? true)
    setShowOnHome(col.show_on_home ?? true)
    setSelectedCategoryIds(col.category_ids || [])
    setSelectedProductIds(col.product_ids || [])
    setIsDrawerOpen(true)
  }

  const cancelForm = () => {
    setIsDrawerOpen(false)
  }

  // File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'collections')

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      })

      const json = await res.json()
      if (json.success && json.publicUrl) {
        setImageUrl(json.publicUrl)
        setFeedback({ type: 'success', message: 'Image uploaded to product media storage.' })
      } else {
        setFeedback({ type: 'error', message: json.error || 'Failed to upload image' })
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Upload failed' })
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Category Picker toggle
  const toggleCategorySelection = (catId: string) => {
    setSelectedCategoryIds((prev) => {
      const isParent = parentCategories.some((p) => p.id === catId)
      const children = subcategoriesMap[catId] || []

      if (prev.includes(catId)) {
        // If unchecking a parent, also uncheck its children
        if (isParent && children.length > 0) {
          const childIds = new Set(children.map((c) => c.id))
          return prev.filter((id) => id !== catId && !childIds.has(id))
        }
        return prev.filter((id) => id !== catId)
      } else {
        // If checking a parent, also check its children
        if (isParent && children.length > 0) {
          const childIds = children.map((c) => c.id)
          return Array.from(new Set([...prev, catId, ...childIds]))
        }
        return [...prev, catId]
      }
    })
  }

  // Save Collection
  const handleSaveCollection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsSaving(true)
    try {
      const generatedSlug =
        slug.trim() ||
        name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

      const res = await fetch('/api/admin/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId || undefined,
          name: name.trim(),
          slug: generatedSlug,
          group_type: groupType,
          description: description.trim() || null,
          image_url: imageUrl.trim() || null,
          display_order: parseInt(displayOrder, 10) || 1,
          is_active: isActive,
          show_in_navbar: showInNavbar,
          show_on_home: showOnHome,
          category_ids: selectedCategoryIds,
          product_ids: selectedProductIds,
        }),
      })

      const json = await res.json()
      if (json.success) {
        await Promise.all([
          triggerStorefrontRevalidation({ path: '/' }),
          triggerStorefrontRevalidation({ path: '/shop' }),
        ])
        setFeedback({
          type: 'success',
          message: editingId ? `Occasion "${name}" updated.` : `Occasion "${name}" published.`,
        })
        cancelForm()
        loadData()
      } else {
        setFeedback({ type: 'error', message: json.error || 'Failed to save collection' })
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Save failed' })
    } finally {
      setIsSaving(false)
    }
  }

  // Delete Collection
  const handleDelete = async (id: string, colName: string) => {
    if (!confirm(`Are you sure you want to delete "${colName}"?`)) return

    try {
      const res = await fetch(`/api/admin/collections?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (json.success) {
        await Promise.all([
          triggerStorefrontRevalidation({ path: '/' }),
          triggerStorefrontRevalidation({ path: '/shop' }),
        ])
        setFeedback({ type: 'success', message: `Occasion "${colName}" removed.` })
        loadData()
      } else {
        setFeedback({ type: 'error', message: json.error || 'Failed to delete' })
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Delete failed' })
    }
  }

  // Toggle Active State
  const toggleActiveState = async (col: CollectionWithRelations) => {
    try {
      const res = await fetch('/api/admin/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: col.id,
          name: col.name,
          slug: col.slug,
          is_active: !col.is_active,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setFeedback({
          type: 'success',
          message: `"${col.name}" is now ${!col.is_active ? 'active' : 'hidden'}.`,
        })
        loadData()
      }
    } catch {
      // Fallback
    }
  }

  return (
    <div className="space-y-6 font-sans pb-24 max-w-7xl mx-auto">
      {/* Header Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-chrome-800 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-chrome-900 border border-chrome-800 flex items-center justify-center text-zinc-300">
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-base font-semibold tracking-tight text-zinc-100">
                  Collections & Occasion Grouping
                </h1>
                <span className="text-2xs font-mono text-zinc-400">
                  ({collections.length} curations)
                </span>
              </div>
              <p className="text-2xs text-zinc-400 mt-0.5">
                Curate multi-category merchandising collections, festive edits, and lifestyle occasions.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="terminal"
            size="sm"
            onClick={loadData}
            isLoading={isLoading}
            className="flex items-center gap-1.5 text-xs h-7 px-2.5 bg-chrome-900 border-chrome-800 text-zinc-300 hover:bg-chrome-850 hover:text-zinc-100 rounded-none"
          >
            <RefreshCw className="w-3 h-3 text-zinc-400" /> Refresh
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={openAdd}
            className="bg-zinc-100 hover:bg-white text-zinc-950 font-semibold flex items-center gap-1.5 text-xs h-7 px-3.5 rounded-none shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-zinc-950" /> Add Collection / Occasion
          </Button>
        </div>
      </div>

      {/* Control Ribbon (Architectural Light & Dark Theme Native) */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-2.5 p-2 bg-chrome-900 border border-chrome-800 text-xs">
        {/* Search Input */}
        <div className="flex-1 max-w-md relative">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search collections or occasions by name or slug..."
            className="w-full bg-chrome-950 border border-chrome-800 pl-9 pr-12 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-400 transition-colors"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-3xs font-mono bg-chrome-900 text-zinc-400 border border-chrome-800 pointer-events-none">
                /
              </kbd>
            )}
          </div>
        </div>

        {/* Group Type Segmented Filter */}
        <div className="flex items-center gap-1 flex-wrap">
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={`px-2.5 py-1 text-2xs font-mono border transition-colors ${
              typeFilter === 'all'
                ? 'bg-chrome-850 text-zinc-100 border-zinc-500 font-semibold shadow-xs'
                : 'bg-chrome-950 text-zinc-400 border-chrome-800 hover:text-zinc-200 hover:bg-chrome-850'
            }`}
          >
            All ({collections.length})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('occasion')}
            className={`px-2.5 py-1 text-2xs font-mono border transition-colors ${
              typeFilter === 'occasion'
                ? 'bg-chrome-850 text-zinc-100 border-zinc-500 font-semibold shadow-xs'
                : 'bg-chrome-950 text-zinc-400 border-chrome-800 hover:text-zinc-200 hover:bg-chrome-850'
            }`}
          >
            Occasions ({collections.filter((c) => c.group_type === 'occasion').length})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('collection')}
            className={`px-2.5 py-1 text-2xs font-mono border transition-colors ${
              typeFilter === 'collection'
                ? 'bg-chrome-850 text-zinc-100 border-zinc-500 font-semibold shadow-xs'
                : 'bg-chrome-950 text-zinc-400 border-chrome-800 hover:text-zinc-200 hover:bg-chrome-850'
            }`}
          >
            Collections ({collections.filter((c) => c.group_type === 'collection').length})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('season')}
            className={`px-2.5 py-1 text-2xs font-mono border transition-colors ${
              typeFilter === 'season'
                ? 'bg-chrome-850 text-zinc-100 border-zinc-500 font-semibold shadow-xs'
                : 'bg-chrome-950 text-zinc-400 border-chrome-800 hover:text-zinc-200 hover:bg-chrome-850'
            }`}
          >
            Seasons ({collections.filter((c) => c.group_type === 'season').length})
          </button>
        </div>
      </div>

      {/* Collections Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filteredCollections.map((col) => {
          const mappedCats = categories.filter((c) => (col.category_ids || []).includes(c.id))

          return (
            <div
              key={col.id}
              className={`bg-chrome-900 border border-chrome-800 transition-colors flex flex-col justify-between overflow-hidden ${
                !col.is_active ? 'opacity-65' : ''
              }`}
            >
              {/* Card Header & Media */}
              <div>
                <div className="flex gap-3.5 p-3.5 border-b border-chrome-800/80">
                  {/* Photo Preview */}
                  <div className="relative h-24 w-36 bg-chrome-950 border border-chrome-800 shrink-0 overflow-hidden">
                    {col.image_url ? (
                      <Image
                        src={col.image_url}
                        alt={col.name}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-500 font-mono text-2xs">
                        No Image
                      </div>
                    )}
                  </div>

                  {/* Metadata Block */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-3xs uppercase font-mono px-1.5 py-0.5 bg-chrome-950 border border-chrome-800 text-zinc-400 font-semibold">
                        {col.group_type}
                      </span>
                      <span className="text-2xs font-mono text-zinc-500">
                        Seq #{col.display_order}
                      </span>
                      {col.is_active ? (
                        <span className="text-3xs font-mono px-1.5 py-0.2 bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="text-3xs font-mono px-1.5 py-0.2 bg-zinc-800 text-zinc-400 border border-zinc-700">
                          HIDDEN
                        </span>
                      )}
                    </div>

                    <h2 className="font-semibold text-xs text-zinc-100 tracking-tight mt-1 line-clamp-1">
                      {col.name}
                    </h2>
                    <span className="text-2xs font-mono text-zinc-500 block mt-0.5">
                      ?collection={col.slug}
                    </span>

                    {col.description && (
                      <p className="text-2xs text-zinc-400 line-clamp-2 mt-1 leading-snug">
                        {col.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Scope & Surface Flags */}
                <div className="p-3 bg-chrome-950/50 text-2xs font-mono text-zinc-400 space-y-1.5 border-b border-chrome-800/60">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <FolderTree className="w-3 h-3 text-zinc-500" />
                      <span>{mappedCats.length} Categories Mapped</span>
                    </span>
                    <span className="text-zinc-200 font-semibold">
                      {col.product_count ?? 0} Garments Resolved
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-3xs text-zinc-500">SURFACES:</span>
                    {col.show_in_navbar && (
                      <span className="px-1.5 py-0.2 bg-chrome-900 border border-chrome-800 text-zinc-300 text-3xs">
                        Navbar Flyout
                      </span>
                    )}
                    {col.show_on_home && (
                      <span className="px-1.5 py-0.2 bg-chrome-900 border border-chrome-800 text-zinc-300 text-3xs">
                        Homepage Strip
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Strip */}
              <div className="p-2.5 bg-chrome-900 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => toggleActiveState(col)}
                  className="px-2 py-0.5 text-2xs font-mono text-zinc-400 hover:text-zinc-200 bg-chrome-950 border border-chrome-800 hover:bg-chrome-850 flex items-center gap-1 transition-colors"
                >
                  {col.is_active ? <EyeOff className="w-3 h-3 text-zinc-400" /> : <Eye className="w-3 h-3 text-emerald-400" />}
                  <span>{col.is_active ? 'Hide' : 'Activate'}</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(col)}
                    className="px-2.5 py-0.5 text-2xs font-mono bg-chrome-950 hover:bg-chrome-850 text-zinc-200 border border-chrome-800 flex items-center gap-1 transition-colors"
                  >
                    <Edit3 className="w-3 h-3 text-zinc-400" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(col.id, col.name)}
                    className="p-1 text-zinc-500 hover:text-rose-400 hover:bg-chrome-850 transition-colors"
                    title="Delete Collection"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}

        {filteredCollections.length === 0 && !isLoading && (
          <div className="col-span-full p-12 text-center text-xs text-zinc-400 border border-chrome-800 bg-chrome-900/40">
            <p className="text-zinc-300 font-mono">No collections found.</p>
            <Button
              variant="terminal"
              size="sm"
              onClick={openAdd}
              className="mt-3 h-7 px-3 text-2xs bg-chrome-950 border-chrome-800 text-zinc-300 hover:bg-chrome-850 rounded-none font-mono"
            >
              <Plus className="w-3 h-3 text-zinc-400" /> Create First Collection / Occasion
            </Button>
          </div>
        )}
      </div>

      {/* Floating Minimalist Feedback Toast */}
      {feedback && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-3.5 py-2.5 bg-chrome-900 border border-chrome-750 text-zinc-200 shadow-2xl text-xs font-mono backdrop-blur-md">
          {feedback.type === 'success' ? (
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          )}
          <span className="font-normal">{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="ml-2 text-zinc-500 hover:text-zinc-200">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Slide-Over Drawer for Adding / Editing Collections */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" onClick={cancelForm} />

          <div className="relative w-full max-w-xl bg-chrome-900 border-l border-chrome-800 h-full shadow-2xl flex flex-col z-10 overflow-y-auto">
            {/* Header */}
            <div className="p-4 border-b border-chrome-800 flex items-center justify-between sticky top-0 bg-chrome-900/95 backdrop-blur-md z-20">
              <div>
                <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>
                    {editingId ? `Edit Collection / Occasion` : `New Collection / Occasion`}
                  </span>
                </h2>
                <p className="text-2xs text-zinc-400 mt-0.5 font-mono">
                  Map existing categories and products into a curated merchandising story.
                </p>
              </div>

              <button
                type="button"
                onClick={cancelForm}
                className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-chrome-850 transition-colors"
                title="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveCollection} className="p-4 space-y-4.5 flex-1 text-xs">
              {/* Name & Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-2xs font-mono font-medium text-zinc-400 block">
                    Curated Collection Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Festivals & Celebrations"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      if (!editingId || !slug) {
                        setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''))
                      }
                    }}
                    className="w-full h-8 bg-chrome-950 border border-chrome-800 px-2.5 text-xs text-zinc-200 placeholder-zinc-500 focus:border-zinc-400 focus:outline-none transition-colors"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-2xs font-mono font-medium text-zinc-400 block">
                    URL Slug *
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-xs">/</span>
                    <input
                      type="text"
                      placeholder="festivals"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      className="w-full h-8 bg-chrome-950 border border-chrome-800 pl-5 pr-2.5 text-xs font-mono text-zinc-200 placeholder-zinc-500 focus:border-zinc-400 focus:outline-none transition-colors"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Group Type & Sequence */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-2xs font-mono font-medium text-zinc-400 block">
                    Group Classification
                  </label>
                  <select
                    value={groupType}
                    onChange={(e) => setGroupType(e.target.value as CollectionGroupType)}
                    className="w-full h-8 bg-chrome-950 border border-chrome-800 px-2.5 text-xs text-zinc-200 font-mono focus:border-zinc-400 focus:outline-none transition-colors"
                  >
                    <option value="occasion">Occasion (Festivals, Weddings, Travel)</option>
                    <option value="collection">Collection (Signature Edits)</option>
                    <option value="season">Season (Spring/Summer, Festive 2026)</option>
                    <option value="capsule">Capsule (Limited Micro-Drops)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-2xs font-mono font-medium text-zinc-400 block">
                    Display Order Sequence
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(e.target.value)}
                    className="w-full h-8 bg-chrome-950 border border-chrome-800 px-2.5 text-xs font-mono text-zinc-200 focus:border-zinc-400 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Visibility Surface Toggles */}
              <div className="p-3 bg-chrome-950/60 border border-chrome-800 space-y-2">
                <span className="text-2xs font-mono font-medium text-zinc-300 block">
                  Storefront Visibility & Surfaces
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-2xs font-mono">
                  <label className="flex items-center gap-2 p-1.5 bg-chrome-900 border border-chrome-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="rounded-none border-chrome-750 text-zinc-100"
                    />
                    <span className="text-zinc-200">Active</span>
                  </label>

                  <label className="flex items-center gap-2 p-1.5 bg-chrome-900 border border-chrome-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showInNavbar}
                      onChange={(e) => setShowInNavbar(e.target.checked)}
                      className="rounded-none border-chrome-750 text-zinc-100"
                    />
                    <span className="text-zinc-200">Navbar Menu</span>
                  </label>

                  <label className="flex items-center gap-2 p-1.5 bg-chrome-900 border border-chrome-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showOnHome}
                      onChange={(e) => setShowOnHome(e.target.checked)}
                      className="rounded-none border-chrome-750 text-zinc-100"
                    />
                    <span className="text-zinc-200">Home Strip</span>
                  </label>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-2xs font-mono font-medium text-zinc-400 block">
                  Curatorial Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Appears on homepage cards and at the top of the collection shop view"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-chrome-950 border border-chrome-800 p-2.5 text-xs text-zinc-200 placeholder-zinc-500 focus:border-zinc-400 focus:outline-none transition-colors"
                />
              </div>

              {/* Photography Section */}
              <div className="space-y-3 p-3 bg-chrome-950/60 border border-chrome-800">
                <div className="flex items-center justify-between">
                  <span className="text-2xs font-mono font-medium text-zinc-300 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-zinc-400" />
                    Hero Photography (Homepage & Megamenu)
                  </span>
                  <span className="text-2xs font-mono text-zinc-500">4:5 portrait</span>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-20 h-25 bg-chrome-900 border border-chrome-800 shrink-0 relative overflow-hidden flex items-center justify-center">
                    {imageUrl ? (
                      <Image src={imageUrl} alt={name || 'Preview'} fill unoptimized className="object-cover" />
                    ) : (
                      <div className="text-center p-1 text-zinc-500 text-2xs font-mono">No Image</div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2 w-full">
                    <div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="terminal"
                        size="sm"
                        isLoading={isUploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="h-7 px-3 text-2xs bg-chrome-900 border-chrome-800 text-zinc-300 hover:bg-chrome-850 flex items-center gap-1.5 rounded-none font-mono"
                      >
                        <Upload className="w-3 h-3 text-zinc-400" />
                        <span>{isUploading ? 'Uploading...' : 'Upload Image File'}</span>
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        placeholder="https://images.unsplash.com/..."
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="flex-1 h-7.5 bg-chrome-900 border border-chrome-800 px-2.5 text-xs text-zinc-200 placeholder-zinc-500 focus:border-zinc-400 focus:outline-none transition-colors"
                      />
                      {imageUrl && (
                        <button
                          type="button"
                          onClick={() => setImageUrl('')}
                          className="p-1 text-zinc-500 hover:text-zinc-300"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1 pt-1">
                      {CURATED_PRESETS.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setImageUrl(preset.url)}
                          className={`text-2xs font-mono px-2 py-0.5 border transition-colors ${
                            imageUrl === preset.url
                              ? 'bg-chrome-850 text-zinc-100 border-zinc-500 font-semibold'
                              : 'bg-chrome-950 text-zinc-400 border-chrome-800 hover:text-zinc-200 hover:bg-chrome-850'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Visual Category Picker (Many-to-Many) */}
              <div className="space-y-2 p-3 bg-chrome-950/60 border border-chrome-800">
                <div className="flex items-center justify-between">
                  <span className="text-2xs font-mono font-medium text-zinc-300 flex items-center gap-1.5">
                    <FolderTree className="w-3.5 h-3.5 text-zinc-400" />
                    Mapped Categories & Subcategories
                  </span>
                  <span className="text-2xs font-mono text-emerald-400">
                    {selectedCategoryIds.length} categories attached
                  </span>
                </div>
                <p className="text-2xs font-mono text-zinc-500">
                  Select parent categories or specific subcategories. Selecting a parent automatically includes its child subcategories in the occasion storefront view.
                </p>

                <div className="max-h-56 overflow-y-auto space-y-2 p-2 bg-chrome-900 border border-chrome-800">
                  {parentCategories.map((parent) => {
                    const children = subcategoriesMap[parent.id] || []
                    const isParentSelected = selectedCategoryIds.includes(parent.id)
                    const isExpanded = expandedCategories.has(parent.id)

                    return (
                      <div key={parent.id} className="border border-chrome-800 bg-chrome-950">
                        {/* Parent Row */}
                        <div className="p-2 flex items-center justify-between gap-2">
                          <label className="flex items-center gap-2 cursor-pointer min-w-0">
                            <input
                              type="checkbox"
                              checked={isParentSelected}
                              onChange={() => toggleCategorySelection(parent.id)}
                              className="rounded-none border-chrome-750 text-zinc-100"
                            />
                            <span className="font-semibold text-xs text-zinc-200 truncate">
                              {parent.name}
                            </span>
                            <span className="text-2xs font-mono text-zinc-500">
                              /{parent.slug}
                            </span>
                          </label>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-2xs font-mono text-zinc-500">
                              {categoryProductCounts[parent.id] ?? 0} items
                            </span>
                            {children.length > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setExpandedCategories((prev) => {
                                    const next = new Set(prev)
                                    if (next.has(parent.id)) next.delete(parent.id)
                                    else next.add(parent.id)
                                    return next
                                  })
                                }}
                                className="p-0.5 text-zinc-400 hover:text-zinc-200"
                              >
                                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Child Subcategories */}
                        {isExpanded && children.length > 0 && (
                          <div className="pl-6 pr-2 py-1.5 border-t border-chrome-800 bg-chrome-900/60 space-y-1">
                            {children.map((child) => {
                              const isChildSelected = selectedCategoryIds.includes(child.id)

                              return (
                                <div key={child.id} className="flex items-center justify-between text-2xs py-0.5">
                                  <label className="flex items-center gap-2 cursor-pointer min-w-0">
                                    <input
                                      type="checkbox"
                                      checked={isChildSelected}
                                      onChange={() => toggleCategorySelection(child.id)}
                                      className="rounded-none border-chrome-750 text-zinc-100"
                                    />
                                    <span className="text-zinc-300 truncate">{child.name}</span>
                                    <span className="text-3xs font-mono text-zinc-500">/{child.slug}</span>
                                  </label>
                                  <span className="text-3xs font-mono text-zinc-500">
                                    {categoryProductCounts[child.id] ?? 0} items
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-chrome-800 sticky bottom-0 bg-chrome-900/95 py-3 -mx-4 px-4 z-20">
                <Button
                  type="button"
                  variant="terminal"
                  size="sm"
                  onClick={cancelForm}
                  className="h-7 px-3.5 text-2xs bg-chrome-900 border-chrome-800 text-zinc-300 hover:bg-chrome-850 rounded-none font-mono"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  size="sm"
                  isLoading={isSaving}
                  className="bg-zinc-100 hover:bg-white text-zinc-950 font-semibold h-7 px-4 text-2xs rounded-none shadow-xs font-mono"
                >
                  {editingId ? 'Save Changes' : 'Publish Collection / Occasion'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
