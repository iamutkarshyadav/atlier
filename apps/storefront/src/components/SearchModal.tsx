'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Search, X, ArrowRight } from 'lucide-react'
import { createBrowserClient } from '@repo/supabase/browser'
import { type Category, type Product, DEFAULT_PRODUCTS } from '@repo/supabase/utils'

export interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
  categories?: Category[]
}

export function SearchModal({ isOpen, onClose, categories = [] }: SearchModalProps) {
  const router = useRouter()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [query, setQuery] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [hasLoadedProducts, setHasLoadedProducts] = useState(false)

  // Handle native <dialog> open/close lifecycle
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal()
      }
      // Focus search input after animation frame
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })

      // Fetch latest products from Supabase on first open if not yet cached
      if (!hasLoadedProducts) {
        const fetchInitialProducts = async () => {
          try {
            const supabase = createBrowserClient()
            const { data, error } = await supabase
              .from('products')
              .select('*')
              .eq('is_archived', false)
              .order('created_at', { ascending: false })
              .limit(8)

            if (error || !data || data.length === 0) {
              setProducts(DEFAULT_PRODUCTS.slice(0, 8))
            } else {
              setProducts(
                data.map((row: any) => ({
                  id: row.id,
                  title: row.title,
                  description: row.description,
                  price: Number(row.price),
                  stock: row.stock,
                  image_url: row.image_url,
                  category_id: row.category_id,
                  category: row.category || 'Apparel',
                  material: row.material,
                  edition: row.edition,
                  is_archived: row.is_archived,
                  created_at: row.created_at,
                  updated_at: row.updated_at,
                }))
              )
            }
          } catch {
            setProducts(DEFAULT_PRODUCTS.slice(0, 8))
          } finally {
            setHasLoadedProducts(true)
          }
        }
        fetchInitialProducts()
      }
    } else {
      if (dialog.open) {
        dialog.close()
      }
      setQuery('')
    }
  }, [isOpen, hasLoadedProducts])

  // Dismiss when clicking outside dialog bounding box
  const handleDialogClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current
    if (!dialog) return
    const rect = dialog.getBoundingClientRect()
    const isInDialog =
      rect.top <= e.clientY &&
      e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX &&
      e.clientX <= rect.left + rect.width
    if (!isInDialog) {
      onClose()
    }
  }

  // Filter products live as user types
  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products.slice(0, 6)

    return products
      .filter((p) => {
        const titleMatch = p.title.toLowerCase().includes(q)
        const catMatch = (p.category || '').toLowerCase().includes(q)
        const matMatch = (p.material || '').toLowerCase().includes(q)
        const descMatch = (p.description || '').toLowerCase().includes(q)
        return titleMatch || catMatch || matMatch || descMatch
      })
      .slice(0, 6)
  }, [products, query])

  // Top parent categories for quick navigation chips
  const quickCategories = useMemo(() => {
    return categories
      .filter((c) => !c.parent_id)
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      .slice(0, 6)
  }, [categories])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = query.trim()
    onClose()
    if (trimmed) {
      router.push(`/shop?q=${encodeURIComponent(trimmed)}`)
    } else {
      router.push('/shop')
    }
  }

  const handleSelectProduct = (productId: string) => {
    onClose()
    router.push(`/product/${productId}`)
  }

  const handleSelectCategory = (slugOrName: string) => {
    onClose()
    router.push(`/shop?category=${encodeURIComponent(slugOrName)}`)
  }

  return (
    <dialog
      ref={dialogRef}
      onClick={handleDialogClick}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      className="fixed top-12 sm:top-20 inset-x-0 mx-auto z-50 w-[calc(100%-2rem)] max-w-2xl bg-white border border-[#d3d6db] rounded-sm shadow-2xl p-0 overflow-hidden text-[#14293a] font-sans backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <div className="flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <form onSubmit={handleSubmit} className="relative flex items-center border-b border-[#e5e7eb] px-4 py-3 bg-white">
          <Search className="w-4 h-4 text-[#6c7079] shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for hoodies, t-shirts, jackets, denim..."
            className="w-full bg-transparent text-sm text-[#14293a] placeholder:text-[#8a909a] focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 text-[#8a909a] hover:text-[#14293a] transition-colors mr-1"
              aria-label="Clear search input"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#8a909a] hover:text-[#14293a] transition-colors"
            aria-label="Close search"
          >
            <span className="text-xs font-medium text-[#6c7079] hover:text-[#14293a]">Cancel</span>
          </button>
        </form>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#f1f1f1]">
          {/* Quick Category Chips */}
          {quickCategories.length > 0 && (
            <div className="p-4 bg-[#fcfcfc]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6c7079] block mb-2">
                Categories
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectCategory('All')}
                  className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-[#f1f1f1] border border-[#d3d6db] rounded-sm transition-colors cursor-pointer text-[#14293a]"
                >
                  All Collections
                </button>
                {quickCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelectCategory(cat.slug || cat.name)}
                    className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-[#f1f1f1] border border-[#d3d6db] rounded-sm transition-colors cursor-pointer text-[#14293a]"
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Product Recommendations / Live Matches */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6c7079]">
                {query.trim() ? 'Products' : 'Popular Products'}
              </span>
              {query.trim() && (
                <span className="text-[11px] text-[#6c7079]">
                  {filteredProducts.length} {filteredProducts.length === 1 ? 'match' : 'matches'}
                </span>
              )}
            </div>

            {filteredProducts.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#6c7079]">
                No products found matching &ldquo;{query}&rdquo;. Press Enter to search catalog.
              </div>
            ) : (
              <div className="space-y-1">
                {filteredProducts.map((prod) => (
                  <div
                    key={prod.id}
                    onClick={() => handleSelectProduct(prod.id)}
                    className="flex items-center justify-between p-2 rounded-sm hover:bg-[#f8f8f8] transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-12 h-12 bg-[#f1f1f1] rounded-xs overflow-hidden shrink-0 border border-[#e5e7eb]">
                        {prod.image_url ? (
                          <Image
                            src={prod.image_url}
                            alt={prod.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            sizes="48px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-[#8a909a]">
                            TG
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#14293a] group-hover:text-[#b91c1c] transition-colors truncate">
                          {prod.title}
                        </p>
                        <p className="text-[11px] text-[#6c7079] truncate">
                          {prod.category} {prod.material ? `• ${prod.material}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <span className="text-xs font-bold text-[#14293a]">
                        ₹{Number(prod.price).toLocaleString('en-IN')}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#8a909a] group-hover:text-[#b91c1c] group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Bar */}
        <div className="p-3 bg-[#f8f8f8] border-t border-[#e5e7eb] flex items-center justify-between text-xs text-[#6c7079]">
          <span>
            {query.trim() ? (
              <span>
                Press <span className="font-semibold text-[#14293a]">Enter</span> to search all results for &ldquo;{query}&rdquo;
              </span>
            ) : (
              <span>Type a query or choose a category</span>
            )}
          </span>
          <button
            type="button"
            onClick={handleSubmit}
            className="font-bold text-[#b91c1c] hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>View all in shop</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </dialog>
  )
}
