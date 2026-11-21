'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { FolderTree, Plus, Trash2, Edit3, X, Check, ExternalLink, RefreshCw } from 'lucide-react'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Button,
  Badge,
  Input,
} from '@repo/ui'
import { createBrowserClient } from '@repo/supabase/browser'
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  type Category,
} from '@repo/supabase/utils'

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form states
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [parentId, setParentId] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [displayOrder, setDisplayOrder] = useState('1')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const supabase = createBrowserClient()
      const data = await getCategories(supabase)
      setCategories(data)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const supabase = createBrowserClient()
    const generatedSlug = slug.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    const { data, error } = await createCategory(supabase, {
      name: name.trim(),
      slug: generatedSlug,
      parent_id: parentId.trim() || null,
      description: description.trim() || null,
      image_url: imageUrl.trim() || null,
      display_order: parseInt(displayOrder, 10) || categories.length + 1,
    })

    if (error) {
      setFeedback({ type: 'error', message: error })
    } else {
      setFeedback({ type: 'success', message: `Category "${name}" created. Now active on Storefront navigation!` })
      setName('')
      setSlug('')
      setParentId('')
      setDescription('')
      setImageUrl('')
      setIsAdding(false)
      loadData()
    }
  }

  const handleDeleteCategory = async (id: string, catName: string) => {
    if (!confirm(`Are you sure you want to delete category "${catName}"?`)) return

    const supabase = createBrowserClient()
    const { success, error } = await deleteCategory(supabase, id)

    if (!success) {
      setFeedback({ type: 'error', message: error || 'Failed to delete category' })
    } else {
      setFeedback({ type: 'success', message: `Category "${catName}" removed.` })
      setCategories((prev) => prev.filter((c) => c.id !== id))
    }
  }

  return (
    <div className="space-y-6 font-mono">
      {/* Title & Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-chrome-800 pb-5">
        <div>
          <span className="text-3xs uppercase tracking-wider text-zinc-500 font-semibold block">
            Navigation Architecture & Shop Taxonomy
          </span>
          <h1 className="text-2xl sm:text-3xl font-light text-zinc-100 mt-1">
            Parent Categories
          </h1>
          <p className="text-xs text-zinc-400 font-sans mt-1">
            Categories defined here immediately govern the Storefront navbar, catalogue filter tabs, and drop collections.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="terminal"
            size="sm"
            onClick={loadData}
            isLoading={isLoading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => setIsAdding(!isAdding)}
            className="bg-zinc-100 hover:bg-white text-zinc-950 font-semibold flex items-center gap-1.5 rounded-none"
          >
            {isAdding ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{isAdding ? 'Close Panel' : 'New Category'}</span>
          </Button>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-3.5 border text-xs font-mono flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400'
              : 'bg-rose-950/40 border-rose-800/60 text-rose-400'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-zinc-400 hover:text-zinc-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* New Category Drawer / Panel */}
      {isAdding && (
        <div className="p-6 bg-chrome-900 border border-chrome-800 space-y-5 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-chrome-800 pb-3">
            <span className="text-xs uppercase tracking-wider text-amber-500 dark:text-amber-400 font-semibold flex items-center gap-2">
              <FolderTree className="w-4 h-4" /> Provision New Parent Category
            </span>
            <span className="text-3xs text-zinc-500 font-mono">Auto-propagates to Storefront</span>
          </div>

          <form onSubmit={handleCreateCategory} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-3xs uppercase tracking-wider text-zinc-400 font-semibold">Category Name *</label>
              <input
                type="text"
                placeholder="e.g. Sculptural Vessels"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (!slug) {
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''))
                  }
                }}
                className="w-full h-9 bg-chrome-950 border border-chrome-800 px-3 text-xs text-zinc-100 focus:border-amber-400 focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-3xs uppercase tracking-wider text-zinc-400 font-semibold">URL Slug *</label>
              <input
                type="text"
                placeholder="e.g. sculptural-vessels"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full h-9 bg-chrome-950 border border-chrome-800 px-3 text-xs text-zinc-100 focus:border-amber-400 focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-3xs uppercase tracking-wider text-zinc-400 font-semibold">Display Order</label>
              <input
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                className="w-full h-9 bg-chrome-950 border border-chrome-800 px-3 text-xs text-zinc-100 focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-3xs uppercase tracking-wider text-zinc-400 font-semibold">Parent Category (Optional)</label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full h-9 bg-chrome-950 border border-chrome-800 px-3 text-xs text-zinc-100 focus:border-amber-400 focus:outline-none"
              >
                <option value="">-- None (Top-Level Parent Category) --</option>
                {categories
                  .filter((c) => !c.parent_id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="text-3xs uppercase tracking-wider text-zinc-400 font-semibold">Curator Description</label>
              <input
                type="text"
                placeholder="e.g. Stoneware, raw clays, and architectural earthenware"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full h-9 bg-chrome-950 border border-chrome-800 px-3 text-xs text-zinc-100 focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-3xs uppercase tracking-wider text-zinc-400 font-semibold">Hero Image URL</label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full h-9 bg-chrome-950 border border-chrome-800 px-3 text-xs text-zinc-100 focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3 pt-2 flex justify-end gap-2">
              <Button type="button" variant="terminal" size="sm" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="default" size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-none">
                Publish Category
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Categories Table */}
      <div className="border border-chrome-800 bg-chrome-900 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-chrome-800 bg-chrome-950 hover:bg-transparent">
              <TableHead className="w-16 font-semibold text-zinc-400">Seq</TableHead>
              <TableHead className="font-semibold text-zinc-400">Category</TableHead>
              <TableHead className="font-semibold text-zinc-400">Slug Identifier</TableHead>
              <TableHead className="hidden md:table-cell font-semibold text-zinc-400">Curatorial Description</TableHead>
              <TableHead className="text-right font-semibold text-zinc-400">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((cat, idx) => (
              <TableRow key={cat.id} className="border-b border-chrome-850 hover:bg-chrome-850 transition-colors">
                <TableCell className="text-zinc-500 font-mono text-xs">
                  0{cat.display_order || idx + 1}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {cat.image_url && (
                      <div className="relative w-8 h-8 rounded-none overflow-hidden bg-chrome-950 border border-chrome-800 shrink-0">
                        <Image src={cat.image_url} alt={cat.name} fill unoptimized className="object-cover" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-zinc-100 text-xs">{cat.name}</p>
                        {cat.parent_id ? (
                          <span className="text-[10px] px-1.5 py-0.5 bg-amber-950/60 text-amber-400 border border-amber-800/60 rounded">
                            Subcategory of {categories.find((c) => c.id === cat.parent_id)?.name || 'Parent'}
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded">
                            Parent
                          </span>
                        )}
                      </div>
                      <span className="text-3xs text-zinc-500 font-mono">ID: {cat.id.slice(0, 8)}...</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs text-amber-500 dark:text-amber-400 font-semibold">
                  /{cat.slug}
                </TableCell>
                <TableCell className="hidden md:table-cell text-xs text-zinc-400 font-sans max-w-xs truncate">
                  {cat.description || 'No curatorial note provided.'}
                </TableCell>
                <TableCell className="text-right">
                  <button
                    onClick={() => handleDeleteCategory(cat.id, cat.name)}
                    className="p-1.5 text-zinc-400 hover:text-rose-400 transition-colors"
                    title="Delete Category"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </TableCell>
              </TableRow>
            ))}

            {categories.length === 0 && !isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-xs text-zinc-500">
                  No parent categories established. Click &quot;New Category&quot; to create your first salon category.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
