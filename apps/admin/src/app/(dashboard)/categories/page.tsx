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
    <div className="space-y-8 font-mono">
      {/* Title & Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-[#23232A] pb-6">
        <div>
          <span className="text-[10px] tracking-caps uppercase text-neutral-500 block">
            Navigation Architecture & Shop Taxonomy
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-light text-white mt-1">
            Parent Categories
          </h1>
          <p className="text-xs text-neutral-400 font-sans mt-1">
            Categories defined here immediately govern the Storefront navbar, catalogue filter tabs, and drop collections.
          </p>
        </div>

        <div className="flex items-center gap-3">
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
            variant="terminal"
            size="sm"
            onClick={() => setIsAdding(!isAdding)}
            className="bg-neutral-100 hover:bg-white text-neutral-950 border-none font-semibold flex items-center gap-1.5"
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
              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
              : 'bg-rose-950/60 border-rose-500/50 text-rose-300'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-neutral-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* New Category Drawer / Panel */}
      {isAdding && (
        <div className="p-6 bg-[#121215] border border-[#23232A] space-y-5 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-[#23232A] pb-3">
            <span className="text-xs uppercase tracking-caps text-amber-400 font-semibold flex items-center gap-2">
              <FolderTree className="w-4 h-4" /> Provision New Parent Category
            </span>
            <span className="text-[10px] text-neutral-500">Auto-propagates to Storefront</span>
          </div>

          <form onSubmit={handleCreateCategory} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-neutral-400">Category Name *</label>
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
                className="w-full h-10 bg-[#18181C] border border-[#2B2B33] px-3 text-xs text-white focus:border-amber-400 focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase text-neutral-400">URL Slug *</label>
              <input
                type="text"
                placeholder="e.g. sculptural-vessels"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full h-10 bg-[#18181C] border border-[#2B2B33] px-3 text-xs text-white focus:border-amber-400 focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase text-neutral-400">Display Order</label>
              <input
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                className="w-full h-10 bg-[#18181C] border border-[#2B2B33] px-3 text-xs text-white focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="text-[10px] uppercase text-neutral-400">Curator Description</label>
              <input
                type="text"
                placeholder="e.g. Stoneware, raw clays, and architectural earthenware"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full h-10 bg-[#18181C] border border-[#2B2B33] px-3 text-xs text-white focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase text-neutral-400">Hero Image URL</label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full h-10 bg-[#18181C] border border-[#2B2B33] px-3 text-xs text-white focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3 pt-2 flex justify-end gap-3">
              <Button type="button" variant="terminal" size="sm" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="terminal" size="sm" className="bg-amber-400 hover:bg-amber-300 text-black border-none font-bold">
                Publish Category
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Categories Table */}
      <div className="border border-[#23232A] bg-[#0E0E11] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[#23232A] hover:bg-transparent">
              <TableHead className="w-16">Seq</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Slug Identifier</TableHead>
              <TableHead className="hidden md:table-cell">Curatorial Description</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((cat, idx) => (
              <TableRow key={cat.id} className="border-b border-[#1A1A20] hover:bg-[#131317]">
                <TableCell className="text-neutral-500 font-mono text-xs">
                  0{cat.display_order || idx + 1}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {cat.image_url && (
                      <div className="relative w-8 h-8 rounded-none overflow-hidden bg-neutral-900 border border-neutral-800 shrink-0">
                        <Image src={cat.image_url} alt={cat.name} fill className="object-cover" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-white text-xs">{cat.name}</p>
                      <span className="text-[10px] text-neutral-500 font-mono">ID: {cat.id.slice(0, 8)}...</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs text-amber-400/90">
                  /{cat.slug}
                </TableCell>
                <TableCell className="hidden md:table-cell text-xs text-neutral-400 font-sans max-w-xs truncate">
                  {cat.description || 'No curatorial note provided.'}
                </TableCell>
                <TableCell className="text-right">
                  <button
                    onClick={() => handleDeleteCategory(cat.id, cat.name)}
                    className="p-1.5 text-neutral-500 hover:text-rose-400 transition-colors"
                    title="Delete Category"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </TableCell>
              </TableRow>
            ))}

            {categories.length === 0 && !isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-xs text-neutral-500">
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
