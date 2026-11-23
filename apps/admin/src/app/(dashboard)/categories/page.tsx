'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import Image from 'next/image'
import {
  FolderTree,
  Plus,
  Trash2,
  Edit3,
  X,
  RefreshCw,
  Upload,
  Image as ImageIcon,
  ChevronDown,
  ChevronRight,
  FolderPlus,
  Search,
  Check,
  AlertCircle,
  MoreVertical,
  ChevronsDown,
  ChevronsUp,
} from 'lucide-react'
import { Button } from '@repo/ui'
import { triggerStorefrontRevalidation } from '@/lib/revalidate'
import { createBrowserClient } from '@repo/supabase/browser'
import type { Category } from '@repo/supabase/utils'

const CURATED_PRESETS = [
  {
    label: 'Kurta Sets',
    url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1200&q=85',
  },
  {
    label: 'Anarkali Sets',
    url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=85',
  },
  {
    label: 'Banarasi Brocade',
    url: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=85',
  },
  {
    label: 'Velvet Festive',
    url: 'https://images.unsplash.com/photo-1596783074918-c84cb06531ca?auto=format&fit=crop&w=800&q=85',
  },
  {
    label: 'Hoodies & Fleece',
    url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85',
  },
  {
    label: 'Raw Denim & Pants',
    url: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1200&q=85',
  },
]

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formMode, setFormMode] = useState<'parent' | 'subcategory'>('parent')

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'with-subcategories' | 'empty'>('all')
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Keyboard shortcut: '/' focuses the search bar
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

  // Form states
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [parentId, setParentId] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [displayOrder, setDisplayOrder] = useState('1')
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Expand / collapse parent nodes
  const [collapsedParents, setCollapsedParents] = useState<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/categories', { cache: 'no-store' })
      const json = await res.json()
      if (json.success && json.categories) {
        setCategories(json.categories)
      }
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
      .channel('admin_categories_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        loadData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Auto-dismiss feedback toast after 4s
  useEffect(() => {
    if (!feedback) return
    const timer = setTimeout(() => setFeedback(null), 4000)
    return () => clearTimeout(timer)
  }, [feedback])

  // Partition parents and subcategories
  const parentCategories = useMemo(() => {
    return categories
      .filter((c) => !c.parent_id)
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
  }, [categories])

  const subcategoriesMap = useMemo(() => {
    const map: Record<string, Category[]> = {}
    categories.forEach((c) => {
      if (c.parent_id) {
        if (!map[c.parent_id]) map[c.parent_id] = []
        map[c.parent_id].push(c)
      }
    })
    Object.keys(map).forEach((pId) => {
      map[pId].sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
    })
    return map
  }, [categories])

  const totalSubcategories = useMemo(() => {
    return Object.values(subcategoriesMap).reduce((acc, list) => acc + list.length, 0)
  }, [subcategoriesMap])

  // Filtered tree by search query and category status
  const filteredParents = useMemo(() => {
    let result = parentCategories

    if (filterStatus === 'with-subcategories') {
      result = result.filter((p) => (subcategoriesMap[p.id] || []).length > 0)
    } else if (filterStatus === 'empty') {
      result = result.filter((p) => (subcategoriesMap[p.id] || []).length === 0)
    }

    if (!searchQuery.trim()) return result
    const q = searchQuery.toLowerCase().trim()

    return result.filter((parent) => {
      const parentMatches =
        parent.name.toLowerCase().includes(q) ||
        parent.slug.toLowerCase().includes(q) ||
        (parent.description && parent.description.toLowerCase().includes(q))

      const children = subcategoriesMap[parent.id] || []
      const childMatches = children.some(
        (child) =>
          child.name.toLowerCase().includes(q) ||
          child.slug.toLowerCase().includes(q) ||
          (child.description && child.description.toLowerCase().includes(q))
      )

      return parentMatches || childMatches
    })
  }, [parentCategories, subcategoriesMap, searchQuery, filterStatus])

  const openAddParent = () => {
    cancelForm()
    setFormMode('parent')
    setParentId('')
    setDisplayOrder(String(parentCategories.length + 1))
    setIsDrawerOpen(true)
  }

  const openAddSubcategory = (preselectedParentId?: string) => {
    cancelForm()
    setFormMode('subcategory')
    const targetParentId = preselectedParentId || (parentCategories[0]?.id ?? '')
    setParentId(targetParentId)
    const existingChildren = subcategoriesMap[targetParentId] || []
    setDisplayOrder(String(existingChildren.length + 1))
    setIsDrawerOpen(true)

    // Ensure target parent is expanded so user sees it right away
    if (targetParentId) {
      setCollapsedParents((prev) => {
        const next = new Set(prev)
        next.delete(targetParentId)
        return next
      })
    }
  }

  const startEditCategory = (cat: Category) => {
    setEditingId(cat.id)
    setName(cat.name)
    setSlug(cat.slug)
    setParentId(cat.parent_id || '')
    setFormMode(cat.parent_id ? 'subcategory' : 'parent')
    setDescription(cat.description || '')
    setImageUrl(cat.image_url || '')
    setDisplayOrder(String(cat.display_order || 1))
    setIsDrawerOpen(true)
  }

  const cancelForm = () => {
    setIsDrawerOpen(false)
    setEditingId(null)
    setName('')
    setSlug('')
    setParentId('')
    setDescription('')
    setImageUrl('')
    setDisplayOrder('1')
  }

  // Handle direct file upload to product-media storage
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'categories')

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

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const effectiveParentId = formMode === 'subcategory' ? parentId.trim() : null
    if (formMode === 'subcategory' && !effectiveParentId) {
      setFeedback({ type: 'error', message: 'Please select a parent collection for this subcategory.' })
      return
    }

    if (editingId && effectiveParentId && effectiveParentId === editingId) {
      setFeedback({ type: 'error', message: 'A collection cannot be its own parent.' })
      return
    }

    setIsSaving(true)
    try {
      const generatedSlug =
        slug.trim() ||
        name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId || undefined,
          name: name.trim(),
          slug: generatedSlug,
          parent_id: effectiveParentId,
          description: description.trim() || null,
          image_url: imageUrl.trim() || null,
          display_order: parseInt(displayOrder, 10) || 1,
        }),
      })

      const json = await res.json()
      if (json.success) {
        await triggerStorefrontRevalidation({ path: '/' })
        setFeedback({
          type: 'success',
          message: editingId
            ? `Category "${name}" updated.`
            : `${formMode === 'parent' ? 'Collection' : 'Subcategory'} "${name}" published.`,
        })

        // Auto-expand the parent collection
        if (effectiveParentId) {
          setCollapsedParents((prev) => {
            const next = new Set(prev)
            next.delete(effectiveParentId)
            return next
          })
        }

        cancelForm()
        loadData()
      } else {
        setFeedback({ type: 'error', message: json.error || 'Failed to save category' })
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Save failed' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteCategory = async (id: string, catName: string) => {
    if (!confirm(`Are you sure you want to delete "${catName}"?`)) return

    try {
      const res = await fetch(`/api/admin/categories?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (json.success) {
        await triggerStorefrontRevalidation({ path: '/' })
        setFeedback({ type: 'success', message: `Category "${catName}" removed.` })
        loadData()
      } else {
        setFeedback({ type: 'error', message: json.error || 'Failed to delete category' })
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Delete failed' })
    }
  }

  const toggleParentCollapse = (pId: string) => {
    setCollapsedParents((prev) => {
      const next = new Set(prev)
      if (next.has(pId)) next.delete(pId)
      else next.add(pId)
      return next
    })
  }

  const expandAll = () => setCollapsedParents(new Set())
  const collapseAll = () => setCollapsedParents(new Set(parentCategories.map((p) => p.id)))

  return (
    <div className="space-y-6 font-sans pb-24 max-w-7xl mx-auto">
      {/* Top Header Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-chrome-800 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-chrome-900 border border-chrome-800 flex items-center justify-center text-zinc-300">
              <FolderTree className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-base font-semibold tracking-tight text-zinc-100">
                  Collections & Categories
                </h1>
                <span className="text-2xs font-mono text-zinc-400">
                  ({parentCategories.length} collections · {totalSubcategories} subcategories)
                </span>
              </div>
              <p className="text-2xs text-zinc-400 mt-0.5">
                Taxonomy architecture governing storefront mega-menus, navigation, and catalog filters.
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
            variant="terminal"
            size="sm"
            onClick={() => openAddSubcategory()}
            className="flex items-center gap-1.5 text-xs h-7 px-3 bg-chrome-900 border-chrome-800 text-zinc-200 hover:bg-chrome-850 hover:text-white rounded-none"
          >
            <Plus className="w-3 h-3 text-zinc-400" /> Add Subcategory
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={openAddParent}
            className="bg-zinc-100 hover:bg-white text-zinc-950 font-semibold flex items-center gap-1.5 text-xs h-7 px-3.5 rounded-none shadow-xs"
          >
            <FolderPlus className="w-3.5 h-3.5 text-zinc-950" /> Add Parent Collection
          </Button>
        </div>
      </div>

      {/* Precision Search & Filter Ribbon (Architectural Light & Dark Theme Native) */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-2.5 p-2 bg-chrome-900 border border-chrome-800 text-xs">
        {/* Search Input */}
        <div className="flex-1 max-w-md relative">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search collections or subcategories by name, slug, or keyword..."
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

        {/* Dynamic Filter Controls & Tree Actions */}
        <div className="flex items-center gap-2 flex-wrap justify-between lg:justify-end">
          {/* Segmented Filter Buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`px-2.5 py-1 text-2xs font-mono border transition-colors ${
                filterStatus === 'all'
                  ? 'bg-chrome-800 text-zinc-100 border-zinc-500 font-semibold shadow-xs'
                  : 'bg-chrome-950 text-zinc-400 border-chrome-800 hover:text-zinc-200 hover:bg-chrome-850'
              }`}
            >
              All ({parentCategories.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('with-subcategories')}
              className={`px-2.5 py-1 text-2xs font-mono border transition-colors ${
                filterStatus === 'with-subcategories'
                  ? 'bg-chrome-800 text-zinc-100 border-zinc-500 font-semibold shadow-xs'
                  : 'bg-chrome-950 text-zinc-400 border-chrome-800 hover:text-zinc-200 hover:bg-chrome-850'
              }`}
            >
              With Subcategories ({parentCategories.filter((p) => (subcategoriesMap[p.id] || []).length > 0).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('empty')}
              className={`px-2.5 py-1 text-2xs font-mono border transition-colors ${
                filterStatus === 'empty'
                  ? 'bg-chrome-800 text-zinc-100 border-zinc-500 font-semibold shadow-xs'
                  : 'bg-chrome-950 text-zinc-400 border-chrome-800 hover:text-zinc-200 hover:bg-chrome-850'
              }`}
            >
              Empty ({parentCategories.filter((p) => (subcategoriesMap[p.id] || []).length === 0).length})
            </button>
          </div>

          <div className="h-4 w-px bg-chrome-800 hidden sm:block mx-0.5" />

          {/* Tree View Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={expandAll}
              className="px-2 py-1 text-2xs font-mono text-zinc-400 hover:text-zinc-200 bg-chrome-950 border border-chrome-800 hover:bg-chrome-850 flex items-center gap-1 transition-colors"
              title="Expand all parent collections"
            >
              <ChevronsDown className="w-3 h-3 text-zinc-400" />
              <span>Expand All</span>
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="px-2 py-1 text-2xs font-mono text-zinc-400 hover:text-zinc-200 bg-chrome-950 border border-chrome-800 hover:bg-chrome-850 flex items-center gap-1 transition-colors"
              title="Collapse all parent collections"
            >
              <ChevronsUp className="w-3 h-3 text-zinc-400" />
              <span>Collapse All</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Hierarchical Collection Cards */}
      <div className="space-y-3">
        {filteredParents.map((parent) => {
          const children = subcategoriesMap[parent.id] || []
          const isCollapsed = collapsedParents.has(parent.id)

          return (
            <div
              key={parent.id}
              className="bg-chrome-900 border border-chrome-800 overflow-hidden transition-colors"
            >
              {/* Parent Collection Header */}
              <div className="p-3 bg-chrome-900 flex items-center justify-between gap-3 border-b border-chrome-800">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Expand / Collapse Chevron */}
                  <button
                    type="button"
                    onClick={() => toggleParentCollapse(parent.id)}
                    className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-chrome-850 transition-colors"
                    title={isCollapsed ? 'Expand subcategories' : 'Collapse subcategories'}
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  {/* Parent Thumbnail */}
                  <div className="w-9 h-9 bg-chrome-950 border border-chrome-800 shrink-0 overflow-hidden relative">
                    {parent.image_url ? (
                      <Image
                        src={parent.image_url}
                        alt={parent.name}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-500 bg-chrome-950">
                        <FolderTree className="w-4 h-4 text-zinc-500" />
                      </div>
                    )}
                  </div>

                  {/* Info Block */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-semibold text-zinc-100 text-xs tracking-tight">
                        {parent.name}
                      </h2>
                      <span className="text-2xs font-mono px-1.5 py-0.5 bg-chrome-950 text-zinc-400 border border-chrome-800">
                        /{parent.slug}
                      </span>
                      <span className="text-2xs font-mono text-zinc-400 font-normal">
                        &middot; {children.length} {children.length === 1 ? 'subcategory' : 'subcategories'}
                      </span>
                      {parent.display_order !== undefined && (
                        <span className="text-2xs text-zinc-500 font-mono">
                          Seq #{parent.display_order}
                        </span>
                      )}
                    </div>
                    {parent.description && (
                      <p className="text-2xs text-zinc-400 truncate max-w-2xl mt-0.5">
                        {parent.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Parent Action Buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="terminal"
                    size="sm"
                    onClick={() => openAddSubcategory(parent.id)}
                    className="h-6.5 px-2 text-2xs bg-chrome-950 border-chrome-800 text-zinc-300 hover:bg-chrome-850 hover:text-white flex items-center gap-1 rounded-none font-mono"
                    title={`Add subcategory to ${parent.name}`}
                  >
                    <Plus className="w-3 h-3 text-zinc-400" />
                    <span className="hidden sm:inline">Add Subcategory</span>
                  </Button>

                  <button
                    onClick={() => startEditCategory(parent)}
                    className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-chrome-850 transition-colors"
                    title="Edit Parent Category"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDeleteCategory(parent.id, parent.name)}
                    className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-chrome-850 transition-colors"
                    title="Delete Parent Category"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Subcategories Container */}
              {!isCollapsed && (
                <div className="p-3.5 bg-chrome-950/60">
                  {children.length > 0 ? (
                    <div className="flex flex-wrap gap-3">
                      {children.map((child) => {
                        const childImg =
                          child.image_url ||
                          parent.image_url ||
                          'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=85'

                        return (
                          <div
                            key={child.id}
                            className="group w-40 sm:w-44 bg-chrome-900 border border-chrome-800 hover:border-chrome-750 overflow-hidden transition-colors flex flex-col justify-between shrink-0 shadow-xs"
                          >
                            {/* Card Media Preview (Compact & Proportional) */}
                            <div className="relative h-28 w-full bg-chrome-950 overflow-hidden">
                              <Image
                                src={childImg}
                                alt={child.name}
                                fill
                                unoptimized
                                className="object-cover group-hover:scale-103 transition-transform duration-300"
                              />
                            </div>

                            {/* Card Content Footer with Single Authoritative Edit Action */}
                            <div className="p-2.5 border-t border-chrome-800 bg-chrome-900 flex-1 flex flex-col justify-between gap-2">
                              <div>
                                <h3 className="font-semibold text-xs text-zinc-100 line-clamp-1" title={child.name}>
                                  {child.name}
                                </h3>
                                <span className="text-2xs font-mono text-zinc-500 block mt-0.5 truncate">
                                  /{child.slug}
                                </span>
                                {child.description ? (
                                  <p className="text-2xs text-zinc-400 line-clamp-2 mt-1 leading-snug">
                                    {child.description}
                                  </p>
                                ) : (
                                  <p className="text-2xs text-zinc-600 italic mt-1">
                                    No description
                                  </p>
                                )}
                              </div>

                              {/* Prominent Action Strip */}
                              <div className="pt-2 border-t border-chrome-800 flex items-center justify-between">
                                <span className="text-2xs text-zinc-500 font-mono">
                                  Seq #{child.display_order || 1}
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => startEditCategory(child)}
                                    className="px-2 py-0.5 text-2xs font-mono bg-chrome-950 hover:bg-chrome-850 text-zinc-200 border border-chrome-800 hover:border-chrome-750 flex items-center gap-1 transition-colors"
                                    title="Edit Subcategory details"
                                  >
                                    <Edit3 className="w-3 h-3 text-zinc-400" />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCategory(child.id, child.name)}
                                    className="p-1 text-zinc-500 hover:text-rose-400 hover:bg-chrome-850 transition-colors"
                                    title="Delete Subcategory"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    /* Empty Subcategories State */
                    <div className="border border-dashed border-chrome-800 p-6 text-center bg-chrome-900/30 flex flex-col items-center justify-center">
                      <p className="text-xs text-zinc-400 font-mono">
                        No subcategories in &quot;{parent.name}&quot; yet.
                      </p>
                      <Button
                        variant="terminal"
                        size="sm"
                        onClick={() => openAddSubcategory(parent.id)}
                        className="mt-2.5 h-6.5 px-3 text-2xs bg-chrome-950 border-chrome-800 text-zinc-300 hover:bg-chrome-850 hover:text-white flex items-center gap-1 rounded-none font-mono"
                      >
                        <Plus className="w-3 h-3 text-zinc-400" /> Add First Subcategory
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {filteredParents.length === 0 && !isLoading && (
          <div className="p-12 text-center text-xs text-zinc-400 border border-chrome-800 bg-chrome-900/40">
            {searchQuery ? (
              <div>
                <p className="text-zinc-300 font-mono">No categories found matching &quot;{searchQuery}&quot;.</p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-2 text-zinc-400 underline hover:text-zinc-200 text-xs font-mono"
                >
                  Clear search query
                </button>
              </div>
            ) : (
              <div>
                <p className="text-zinc-300 font-mono">No collections defined yet.</p>
                <p className="text-zinc-500 mt-1 font-mono text-2xs">Click &quot;Add Parent Collection&quot; to build your store taxonomy.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Minimalist Feedback Toast (Bottom Right) */}
      {feedback && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-3.5 py-2.5 bg-chrome-900 border border-chrome-750 text-zinc-200 shadow-2xl text-xs font-mono backdrop-blur-md">
          {feedback.type === 'success' ? (
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          )}
          <span className="font-normal">{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="ml-2 text-zinc-500 hover:text-zinc-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Slide-Over Drawer for Adding / Editing Categories */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={cancelForm}
          />

          {/* Drawer Container */}
          <div className="relative w-full max-w-lg bg-chrome-900 border-l border-chrome-800 h-full shadow-2xl flex flex-col z-10 overflow-y-auto">
            {/* Drawer Header */}
            <div className="p-4 border-b border-chrome-800 flex items-center justify-between sticky top-0 bg-chrome-900/95 backdrop-blur-md z-20">
              <div>
                <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <FolderTree className="w-4 h-4 text-zinc-400" />
                  <span>
                    {editingId
                      ? `Edit ${formMode === 'parent' ? 'Parent Collection' : 'Subcategory'}`
                      : `New ${formMode === 'parent' ? 'Parent Collection' : 'Subcategory'}`}
                  </span>
                </h2>
                <p className="text-2xs text-zinc-400 mt-0.5 font-mono">
                  Configure hierarchy, naming, and storefront flyout photography.
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

            {/* Form Body */}
            <form onSubmit={handleSaveCategory} className="p-4 space-y-4 flex-1 text-xs">
              {/* Category Tier Selector (Parent vs Subcategory) */}
              {!editingId && (
                <div className="space-y-1">
                  <label className="text-2xs font-mono font-medium text-zinc-400 block">
                    Taxonomy Tier
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 bg-chrome-950 p-1 border border-chrome-800">
                    <button
                      type="button"
                      onClick={() => {
                        setFormMode('parent')
                        setParentId('')
                      }}
                      className={`py-1.5 px-3 text-2xs font-mono font-medium transition-all ${
                        formMode === 'parent'
                          ? 'bg-chrome-850 text-zinc-100 border border-zinc-500 font-semibold shadow-xs'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Parent Collection
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormMode('subcategory')
                        if (!parentId && parentCategories[0]) setParentId(parentCategories[0].id)
                      }}
                      className={`py-1.5 px-3 text-2xs font-mono font-medium transition-all ${
                        formMode === 'subcategory'
                          ? 'bg-chrome-850 text-zinc-100 border border-zinc-500 font-semibold shadow-xs'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Child Subcategory
                    </button>
                  </div>
                </div>
              )}

              {/* Parent Selector (When Subcategory Mode) */}
              {formMode === 'subcategory' && (
                <div className="space-y-1 p-3 bg-chrome-950/60 border border-chrome-800">
                  <label className="text-2xs font-mono font-medium text-zinc-300 block">
                    Parent Collection *
                  </label>
                  <select
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                    required
                    className="w-full h-8 bg-chrome-900 border border-chrome-750 px-2.5 text-xs text-zinc-200 focus:border-zinc-400 focus:outline-none transition-colors"
                  >
                    <option value="">Select Parent Collection...</option>
                    {parentCategories
                      .filter((c) => !editingId || c.id !== editingId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} (/{c.slug})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Title & Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-2xs font-mono font-medium text-zinc-400 block">
                    {formMode === 'parent' ? 'Collection Name *' : 'Subcategory Name *'}
                  </label>
                  <input
                    type="text"
                    placeholder={formMode === 'parent' ? 'e.g. Kurta Sets' : 'e.g. Anarkali Sets'}
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
                      placeholder={formMode === 'parent' ? 'kurta-sets' : 'anarkali-sets'}
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      className="w-full h-8 bg-chrome-950 border border-chrome-800 pl-5 pr-2.5 text-xs font-mono text-zinc-200 placeholder-zinc-500 focus:border-zinc-400 focus:outline-none transition-colors"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Display Order */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-2xs font-mono font-medium text-zinc-400 block">
                    Display Order (Position Sequence)
                  </label>
                  <span className="text-2xs text-zinc-500 font-mono">1 = First, 2 = Second...</span>
                </div>
                <input
                  type="number"
                  min="1"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(e.target.value)}
                  className="w-28 h-8 bg-chrome-950 border border-chrome-800 px-2.5 text-xs font-mono text-zinc-200 focus:border-zinc-400 focus:outline-none transition-colors"
                />
                <p className="text-2xs text-zinc-500 font-mono">
                  Controls sorting order in storefront navbar (left-to-right) and mega-menu grid.
                </p>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-2xs font-mono font-medium text-zinc-400 block">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Short description displayed on storefront flyouts and catalog filters"
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
                    Photography (Storefront Hover Mega-Menu)
                  </span>
                  <span className="text-2xs font-mono text-zinc-500">4:5 portrait</span>
                </div>

                <div className="flex gap-3 items-start">
                  {/* Image Preview */}
                  <div className="w-20 h-25 bg-chrome-900 border border-chrome-800 shrink-0 relative overflow-hidden flex items-center justify-center">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={name || 'Category Preview'}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <div className="text-center p-1 text-zinc-500 text-2xs font-mono">
                        No Image
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2.5 w-full">
                    {/* File Upload */}
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

                    {/* Direct URL Input */}
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        placeholder="https://images.unsplash.com/..."
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="flex-1 h-8 bg-chrome-900 border border-chrome-800 px-2.5 text-xs text-zinc-200 placeholder-zinc-500 focus:border-zinc-400 focus:outline-none transition-colors"
                      />
                      {imageUrl && (
                        <button
                          type="button"
                          onClick={() => setImageUrl('')}
                          className="p-1.5 text-zinc-500 hover:text-zinc-300"
                          title="Clear image"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Presets */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {CURATED_PRESETS.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setImageUrl(preset.url)}
                          className={`text-2xs font-mono px-2 py-0.5 border transition-colors ${
                            imageUrl === preset.url
                              ? 'bg-chrome-800 text-zinc-100 border-zinc-500 font-semibold'
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
                  {editingId
                    ? 'Save Changes'
                    : formMode === 'parent'
                      ? 'Publish Collection'
                      : 'Publish Subcategory'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
