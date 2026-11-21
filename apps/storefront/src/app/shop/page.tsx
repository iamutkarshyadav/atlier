'use client'

import React, { useState, useEffect, useMemo, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Zap,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  ArrowRight,
  Check,
  RotateCcw,
  Heart,
  ChevronRight,
  Search,
} from 'lucide-react'
import { createBrowserClient } from '@repo/supabase/browser'
import {
  getCategories,
  DEFAULT_PRODUCTS,
  type Product,
  type Category,
  type ProductVariant,
} from '@repo/supabase/utils'
import { useCartStore } from '../../store/useCartStore'
import { ProductCard } from '../../components/ProductCard'

// Secondary image pairings for sleek hover crossfade
const SECONDARY_IMAGES: Record<string, string> = {
  'b1000000-0000-0000-0000-000000000001': 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1200&q=85',
  'b1000000-0000-0000-0000-000000000002': 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1200&q=85',
  'b1000000-0000-0000-0000-000000000003': 'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=1200&q=85',
  'b1000000-0000-0000-0000-000000000004': 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1200&q=85',
  'b1000000-0000-0000-0000-000000000005': 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85',
  'b1000000-0000-0000-0000-000000000006': 'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?auto=format&fit=crop&w=1200&q=85',
}

const AVAILABLE_SIZES = ['S', 'M', 'L', 'XL', '30', '32', '34']
const AVAILABLE_COLORS = [
  { name: 'Vintage Black', hex: '#1C1C1C' },
  { name: 'Natural Ecru', hex: '#F0EAE1' },
  { name: 'Washed Ink', hex: '#2A303C' },
  { name: 'Raw Indigo', hex: '#1B2A4A' },
]

function ShopContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialCategoryParam = searchParams.get('category') || 'All'
  const queryParam = searchParams.get('q') || searchParams.get('search') || ''
  const deliveryParam = searchParams.get('delivery')
  const sortParam = searchParams.get('sort')
  const initialSort =
    sortParam === 'newest'
      ? 'newest'
      : sortParam === 'price-asc'
        ? 'price-asc'
        : sortParam === 'price-desc'
          ? 'price-desc'
          : 'recommended'

  const [categories, setCategories] = useState<Category[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [variantsMap, setVariantsMap] = useState<Record<string, ProductVariant[]>>({})
  const [isLoading, setIsLoading] = useState(true)

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategoryParam)
  const [searchQuery, setSearchQuery] = useState<string>(queryParam)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [priceTier, setPriceTier] = useState<'all' | 'under-5000' | '5000-12000' | 'above-12000'>('all')
  const [tryOnOnly, setTryOnOnly] = useState<boolean>(deliveryParam === 'try_on')
  const [sortBy, setSortBy] = useState<'recommended' | 'price-asc' | 'price-desc' | 'newest'>(initialSort)
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null)
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({})

  // Category Tree Structure
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

  const getCategoryCount = (cat: Category) => {
    const ids = new Set<string>([cat.id])
    const names = new Set<string>([cat.name.toLowerCase()])
    if (!cat.parent_id) {
      const children = subcategoriesMap[cat.id] || []
      children.forEach((c) => {
        ids.add(c.id)
        names.add(c.name.toLowerCase())
      })
    }
    return allProducts.filter(
      (p) => (p.category_id && ids.has(p.category_id)) || names.has((p.category || '').toLowerCase())
    ).length
  }

  // Collapsible section toggles
  const [openSections, setOpenSections] = useState({
    categories: true,
    sizes: true,
    colors: true,
    price: true,
  })

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  // Cart action
  const addItem = useCartStore((s) => s.addItem)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Sync state with URL params
  useEffect(() => {
    if (initialCategoryParam) {
      setSelectedCategory(initialCategoryParam)
    }
  }, [initialCategoryParam])

  useEffect(() => {
    setSearchQuery(queryParam)
  }, [queryParam])

  useEffect(() => {
    if (deliveryParam === 'try_on') {
      setTryOnOnly(true)
    }
  }, [deliveryParam])

  useEffect(() => {
    if (sortParam === 'newest') {
      setSortBy('newest')
    } else if (sortParam === 'price-asc') {
      setSortBy('price-asc')
    } else if (sortParam === 'price-desc') {
      setSortBy('price-desc')
    }
  }, [sortParam])

  // Single Joined Data Load
  useEffect(() => {
    async function loadShopData() {
      setIsLoading(true)
      try {
        const supabase = createBrowserClient()

        const [cats, joinedRes] = await Promise.all([
          getCategories(supabase),
          supabase
            .from('products')
            .select('*, product_variants(*), categories(*)')
            .eq('is_archived', false)
            .order('created_at', { ascending: false }),
        ])

        setCategories(cats)

        if (joinedRes.error || !joinedRes.data || joinedRes.data.length === 0) {
          setAllProducts(DEFAULT_PRODUCTS)
          return
        }

        const vMap: Record<string, ProductVariant[]> = {}
        const prods: Product[] = (joinedRes.data as unknown as Array<{
          id: string
          title: string
          description: string | null
          price: number
          stock: number
          image_url: string | null
          category_id: string | null
          category?: string | null
          material: string | null
          edition: string | null
          is_archived: boolean
          created_at: string
          updated_at: string
          product_variants?: ProductVariant[]
          categories?: Category | null
        }>).map((row) => {
          vMap[row.id] = (row.product_variants || []).filter((v: any) => !v.is_archived)

          const categoryObj = row.categories
          return {
            id: row.id,
            title: row.title,
            description: row.description,
            price: Number(row.price),
            stock: row.stock,
            image_url: row.image_url,
            category_id: row.category_id,
            category: row.category || categoryObj?.name || 'Apparel',
            material: row.material,
            edition: row.edition,
            is_archived: row.is_archived,
            created_at: row.created_at,
            updated_at: row.updated_at,
          }
        })

        setAllProducts(prods)
        setVariantsMap(vMap)
      } finally {
        setIsLoading(false)
      }
    }
    loadShopData()
  }, [])

  // Filter application with full search query support (User Adjustment 3)
  const filteredProducts = useMemo(() => {
    return allProducts.filter((product) => {
      // 1. Text Search Filter (q param)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchesQuery =
          product.title.toLowerCase().includes(q) ||
          (product.description || '').toLowerCase().includes(q) ||
          (product.material || '').toLowerCase().includes(q) ||
          (product.category || '').toLowerCase().includes(q) ||
          (product.edition || '').toLowerCase().includes(q)
        if (!matchesQuery) return false
      }

      // 2. Category Filter (Hierarchical: parent includes all child subcategories)
      if (selectedCategory !== 'All') {
        const sel = selectedCategory.toLowerCase()
        const catName = (product.category || '').toLowerCase()
        const matchCat = categories.find(
          (c) => c.slug.toLowerCase() === sel || c.name.toLowerCase() === sel
        )
        if (matchCat) {
          const matchedIds = new Set<string>([matchCat.id])
          const matchedNames = new Set<string>([matchCat.name.toLowerCase()])
          categories.forEach((c) => {
            if (c.parent_id === matchCat.id) {
              matchedIds.add(c.id)
              matchedNames.add(c.name.toLowerCase())
            }
          })
          const matchesCategory =
            (product.category_id && matchedIds.has(product.category_id)) ||
            matchedNames.has(catName)
          if (!matchesCategory) return false
        } else {
          if (catName !== sel) return false
        }
      }

      // 3. Size Filter
      if (selectedSize) {
        const variants = variantsMap[product.id] || []
        const hasSize = variants.some(
          (v) => v.size?.toLowerCase() === selectedSize.toLowerCase() && v.stock > 0
        )
        if (!hasSize) return false
      }

      // 4. Color Filter
      if (selectedColor) {
        const variants = variantsMap[product.id] || []
        const hasColor = variants.some(
          (v) => v.color?.toLowerCase() === selectedColor.toLowerCase()
        )
        const titleMatch = product.title.toLowerCase().includes(selectedColor.toLowerCase())
        if (!hasColor && !titleMatch) return false
      }

      // 5. Price Tier Filter
      const price = Number(product.price)
      if (priceTier === 'under-5000' && price >= 5000) return false
      if (priceTier === '5000-12000' && (price < 5000 || price > 12000)) return false
      if (priceTier === 'above-12000' && price <= 12000) return false

      return true
    })
  }, [allProducts, searchQuery, selectedCategory, selectedSize, selectedColor, priceTier, categories, variantsMap])

  // Sorting
  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price
      if (sortBy === 'price-desc') return b.price - a.price
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      return 0
    })
  }, [filteredProducts, sortBy])

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (selectedCategory !== 'All') count++
    if (searchQuery.trim()) count++
    if (selectedSize) count++
    if (selectedColor) count++
    if (priceTier !== 'all') count++
    if (tryOnOnly) count++
    return count
  }, [selectedCategory, searchQuery, selectedSize, selectedColor, priceTier, tryOnOnly])

  const clearAllFilters = () => {
    setSelectedCategory('All')
    setSearchQuery('')
    setSelectedSize(null)
    setSelectedColor(null)
    setPriceTier('all')
    setTryOnOnly(false)
    setSortBy('recommended')
    router.push('/shop')
  }

  const toggleWishlist = (e: React.MouseEvent, productId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setWishlist((prev) => ({ ...prev, [productId]: !prev[productId] }))
  }

  const handleQuickAdd = (product: Product, size: string = 'M') => {
    const variants = variantsMap[product.id] || []
    const matchingVar = variants.find((v) => v.size === size && v.stock > 0) || variants[0]

    const added = addItem({
      id: matchingVar ? `${product.id}-${matchingVar.id}` : `${product.id}-${size}`,
      productId: product.id,
      title: product.title,
      category: product.category || 'Atelier Collection',
      edition: product.edition || '100% Cotton',
      price: matchingVar?.price_override ?? product.price,
      quantity: 1,
      image: product.image_url || '/images/prod1-primary.jpg',
      size: size || matchingVar?.size || 'M',
    })

    if (added) {
      setToastMessage(`${product.title} (Size ${size}) added to your bag`)
      setTimeout(() => setToastMessage(null), 3000)
    } else {
      setToastMessage('Bolt limit: maximum 5 garments per fitting session.')
      setTimeout(() => setToastMessage(null), 3500)
    }
  }

  return (
    <div className="min-h-screen bg-white text-[#14293a] font-sans pb-24 selection:bg-[#b91c1c] selection:text-white">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#14293a] text-white px-5 py-3 rounded-sm shadow-xl text-xs font-sans font-semibold flex items-center gap-2 border border-white/20">
          <Check className="w-4 h-4 text-[#b91c1c]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. COMPACT PAGE HEADER & BREADCRUMBS                      */}
      {/* ========================================================= */}
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        {/* Row 1: Breadcrumb */}
        <nav className="text-xs text-[#6c7079] mb-2 font-sans" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-[#14293a] transition-colors">Home</Link>
          <span> / </span>
          <Link href="/shop" className="hover:text-[#14293a] transition-colors">Shop</Link>
          {selectedCategory !== 'All' && (
            <>
              <span> / </span>
              <span className="text-[#14293a]">{selectedCategory}</span>
            </>
          )}
          {searchQuery && (
            <>
              <span> / </span>
              <span className="text-[#14293a]">Search: &ldquo;{searchQuery}&rdquo;</span>
            </>
          )}
        </nav>

        {/* Row 2: Single Flex Bar */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#e5e7eb] pb-4 mb-6">
          {/* Left side */}
          <div>
            <h1 className="text-2xl font-bold text-[#14293a] tracking-tight flex items-baseline">
              {searchQuery ? `Search: "${searchQuery}"` : selectedCategory === 'All' ? 'All Products' : selectedCategory}
              <span className="text-sm font-normal text-[#6c7079] ml-2">
                ({sortedProducts.length} {sortedProducts.length === 1 ? 'item' : 'items'})
              </span>
            </h1>
            <div className="text-xs text-[#6c7079] mt-1 flex items-center gap-2">
              <span>Standard Pan-India Delivery</span>
              <span>·</span>
              <span>45-min doorstep try-on available</span>
            </div>
          </div>

          {/* Right side: Filter & Sort Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileFilterOpen(true)}
              className="lg:hidden px-3 py-1.5 bg-white border border-[#d3d6db] text-xs font-medium text-[#14293a] flex items-center gap-1.5 rounded-sm shadow-xs cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5 text-[#14293a]" />
              <span>Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}</span>
            </button>

            <button
              onClick={() => setShowSidebar((prev) => !prev)}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#d3d6db] text-xs font-medium text-[#14293a] hover:bg-[#f8f8f8] rounded-sm transition-colors shadow-xs cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5 text-[#14293a]" />
              <span>{showSidebar ? 'Hide Filters' : 'Show Filters'}</span>
            </button>

            <div className="flex items-center gap-2 text-xs">
              <label htmlFor="shop-sort" className="text-[#6c7079] font-medium hidden sm:inline">
                Sort by:
              </label>
              <select
                id="shop-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'recommended' | 'price-asc' | 'price-desc' | 'newest')}
                className="bg-white border border-[#d3d6db] px-3 py-1.5 text-xs text-[#14293a] focus:outline-none focus:border-[#14293a] rounded-sm cursor-pointer shadow-xs font-sans"
              >
                <option value="recommended">Recommended</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="newest">Newest</option>
              </select>
            </div>
          </div>
        </div>

        {/* Active Filter Pills Strip */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6 text-xs">
            <span className="text-[#6c7079] font-medium text-[11px] uppercase tracking-wider">Active:</span>
            {selectedCategory !== 'All' && (
              <span className="inline-flex items-center gap-1 bg-[#f8f8f8] border border-[#d3d6db] px-2.5 py-1 rounded-sm text-xs font-medium text-[#14293a]">
                Category: {selectedCategory}
                <button onClick={() => setSelectedCategory('All')} className="text-[#8a909a] hover:text-[#b91c1c]">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {searchQuery && (
              <span className="inline-flex items-center gap-1 bg-[#f8f8f8] border border-[#d3d6db] px-2.5 py-1 rounded-sm text-xs font-medium text-[#14293a]">
                Query: {searchQuery}
                <button onClick={() => setSearchQuery('')} className="text-[#8a909a] hover:text-[#b91c1c]">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedSize && (
              <span className="inline-flex items-center gap-1 bg-[#f8f8f8] border border-[#d3d6db] px-2.5 py-1 rounded-sm text-xs font-medium text-[#14293a]">
                Size: {selectedSize}
                <button onClick={() => setSelectedSize(null)} className="text-[#8a909a] hover:text-[#b91c1c]">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedColor && (
              <span className="inline-flex items-center gap-1 bg-[#f8f8f8] border border-[#d3d6db] px-2.5 py-1 rounded-sm text-xs font-medium text-[#14293a]">
                Color: {selectedColor}
                <button onClick={() => setSelectedColor(null)} className="text-[#8a909a] hover:text-[#b91c1c]">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {priceTier !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-[#f8f8f8] border border-[#d3d6db] px-2.5 py-1 rounded-sm text-xs font-medium text-[#14293a]">
                Price: {priceTier}
                <button onClick={() => setPriceTier('all')} className="text-[#8a909a] hover:text-[#b91c1c]">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              onClick={clearAllFilters}
              className="text-xs text-[#b91c1c] hover:underline font-semibold ml-2 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset All</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 2. MAIN CATALOG LAYOUT: LEFT SIDEBAR + 4-COL GRID        */}
      {/* ========================================================= */}
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="flex items-start gap-8">
          {/* ========================================================= */}
          {/* DESKTOP FILTER SIDEBAR (cx-facet-list / Fabindia pattern) */}
          {/* ========================================================= */}
          <aside className={`${showSidebar ? 'hidden lg:block' : 'hidden'} w-64 shrink-0 bg-[#f8f8f8] border border-[#d3d6db] p-5 rounded-sm shadow-sm sticky top-28 self-start`}>
            <div className="flex items-center justify-between pb-3 border-b border-[#d3d6db]">
              <span className="text-xs font-bold uppercase tracking-wider text-[#14293a]">
                Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
              </span>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="text-[11px] text-[#b91c1c] hover:text-[#14293a] uppercase tracking-wider flex items-center gap-1 cursor-pointer font-semibold"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {/* 1. Category Facet */}
            <div className="py-4 border-b border-[#e5e7eb] space-y-2">
              <button
                onClick={() => toggleSection('categories')}
                className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#14293a] cursor-pointer"
              >
                <span>Category</span>
                {openSections.categories ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {openSections.categories && (
                <div className="space-y-1 pt-1 text-xs">
                  <button
                    onClick={() => setSelectedCategory('All')}
                    className={`w-full text-left py-1.5 px-2 rounded-sm transition-colors flex items-center justify-between ${
                      selectedCategory === 'All'
                        ? 'bg-[#14293a] text-white font-bold'
                        : 'text-[#6c7079] hover:text-[#14293a] hover:bg-white'
                    }`}
                  >
                    <span>All Collections</span>
                    <span className="text-[10px]">{allProducts.length}</span>
                  </button>

                  {parentCategories.map((parent) => {
                    const children = subcategoriesMap[parent.id] || []
                    const isParentSelected =
                      selectedCategory.toLowerCase() === parent.name.toLowerCase() ||
                      selectedCategory.toLowerCase() === parent.slug.toLowerCase()

                    return (
                      <div key={parent.id} className="space-y-0.5">
                        <button
                          onClick={() => setSelectedCategory(parent.name)}
                          className={`w-full text-left py-1.5 px-2 rounded-sm transition-colors flex items-center justify-between ${
                            isParentSelected
                              ? 'bg-[#14293a] text-white font-bold'
                              : 'text-[#14293a] font-semibold hover:bg-white'
                          }`}
                        >
                          <span className="truncate">{parent.name}</span>
                          <span className="text-[10px] opacity-75">
                            {getCategoryCount(parent)}
                          </span>
                        </button>

                        {children.length > 0 && (
                          <div className="pl-3 border-l border-[#e5e7eb] ml-2 space-y-0.5 my-0.5">
                            {children.map((child) => {
                              const isChildSelected =
                                selectedCategory.toLowerCase() === child.name.toLowerCase() ||
                                selectedCategory.toLowerCase() === child.slug.toLowerCase()

                              return (
                                <button
                                  key={child.id}
                                  onClick={() => setSelectedCategory(child.name)}
                                  className={`w-full text-left py-1 px-2 rounded-sm transition-colors flex items-center justify-between text-[11px] ${
                                    isChildSelected
                                      ? 'bg-[#14293a] text-white font-bold'
                                      : 'text-[#6c7079] hover:text-[#14293a] hover:bg-white'
                                  }`}
                                >
                                  <span className="truncate">{child.name}</span>
                                  <span className="text-[10px] opacity-75">
                                    {getCategoryCount(child)}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 2. Size Facet */}
            <div className="py-4 border-b border-[#e5e7eb] space-y-2">
              <button
                onClick={() => toggleSection('sizes')}
                className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#14293a] cursor-pointer"
              >
                <span>Size</span>
                {openSections.sizes ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {openSections.sizes && (
                <div className="grid grid-cols-3 gap-1.5 pt-1 text-xs">
                  {AVAILABLE_SIZES.map((sz) => {
                    const isSelected = selectedSize === sz
                    return (
                      <button
                        key={sz}
                        onClick={() => setSelectedSize(isSelected ? null : sz)}
                        className={`py-1.5 px-2 border text-center font-sans font-semibold rounded-sm transition-colors ${
                          isSelected
                            ? 'bg-[#14293a] text-white border-[#14293a]'
                            : 'bg-white border-[#d3d6db] text-[#14293a] hover:border-[#14293a]'
                        }`}
                      >
                        {sz}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 3. Color Facet */}
            <div className="py-4 border-b border-[#e5e7eb] space-y-2">
              <button
                onClick={() => toggleSection('colors')}
                className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#14293a] cursor-pointer"
              >
                <span>Color</span>
                {openSections.colors ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {openSections.colors && (
                <div className="space-y-1.5 pt-1 text-xs">
                  {AVAILABLE_COLORS.map((c) => {
                    const isSelected = selectedColor === c.name
                    return (
                      <button
                        key={c.name}
                        onClick={() => setSelectedColor(isSelected ? null : c.name)}
                        className={`w-full flex items-center justify-between py-1 px-2 rounded-sm transition-colors ${
                          isSelected
                            ? 'bg-[#14293a] text-white font-bold'
                            : 'text-[#6c7079] hover:text-[#14293a] hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-neutral-300 shrink-0"
                            style={{ backgroundColor: c.hex }}
                          />
                          <span>{c.name}</span>
                        </div>
                        {isSelected && <Check className="w-3 h-3 text-[#b91c1c]" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 4. Price Tier Facet */}
            <div className="py-4 space-y-2">
              <button
                onClick={() => toggleSection('price')}
                className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#14293a] cursor-pointer"
              >
                <span>Price Range</span>
                {openSections.price ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {openSections.price && (
                <div className="space-y-1.5 pt-1 text-xs">
                  {[
                    { label: 'All Prices', val: 'all' },
                    { label: 'Under ₹5,000', val: 'under-5000' },
                    { label: '₹5,000 to ₹12,000', val: '5000-12000' },
                    { label: 'Above ₹12,000', val: 'above-12000' },
                  ].map((tier) => (
                    <button
                      key={tier.val}
                      onClick={() => setPriceTier(tier.val as any)}
                      className={`w-full text-left py-1 px-2 rounded-sm transition-colors flex items-center justify-between ${
                        priceTier === tier.val
                          ? 'bg-[#14293a] text-white font-bold'
                          : 'text-[#6c7079] hover:text-[#14293a] hover:bg-white'
                      }`}
                    >
                      <span>{tier.label}</span>
                      {priceTier === tier.val && <Check className="w-3 h-3 text-[#b91c1c]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* ========================================================= */}
          {/* PRODUCT GRID (3-Col when Sidebar Open, 4-Col Fullwidth)   */}
          {/* ========================================================= */}
          <main className="flex-1 min-w-0">
            {isLoading ? (
              <div className="py-24 text-center space-y-3">
                <div className="w-8 h-8 border-2 border-[#d3d6db] border-t-[#b91c1c] rounded-full animate-spin mx-auto" />
                <p className="text-xs text-[#6c7079] uppercase tracking-wider font-semibold">
                  Loading collections...
                </p>
              </div>
            ) : sortedProducts.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-[#d3d6db] p-8 rounded-sm bg-[#f8f8f8] space-y-4">
                <p className="text-sm font-semibold text-[#14293a]">
                  No silhouettes found matching the selected filters.
                </p>
                <button
                  onClick={clearAllFilters}
                  className="px-5 py-2.5 bg-[#14293a] text-white text-xs font-sans font-bold uppercase tracking-wider rounded-sm hover:bg-[#b91c1c] transition-colors"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className={`grid grid-cols-2 md:grid-cols-2 ${showSidebar ? 'lg:grid-cols-3 2xl:grid-cols-4' : 'lg:grid-cols-4'} gap-4 sm:gap-6`}>
                {sortedProducts.map((prod, idx) => (
                  <ProductCard
                    key={prod.id}
                    product={prod}
                    priority={idx < 4}
                    showTryOnBadge={tryOnOnly}
                    onQuickAdd={(p, sz) => handleQuickAdd(p, sz)}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MOBILE FILTER MODAL DRAWER                               */}
      {/* ========================================================= */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 lg:hidden flex justify-end">
          <div className="w-4/5 max-w-sm h-full bg-white shadow-2xl flex flex-col p-5 overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#d3d6db]">
              <span className="text-xs font-bold uppercase tracking-wider text-[#14293a]">
                Filters ({activeFilterCount})
              </span>
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="p-1 text-[#6c7079] hover:text-[#14293a]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Categories */}
            <div className="py-4 border-b border-[#e5e7eb] space-y-2">
              <span className="text-xs font-bold uppercase text-[#14293a] block">Categories</span>
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedCategory('All')}
                  className={`w-full text-left py-1.5 px-2 rounded-sm text-xs ${
                    selectedCategory === 'All' ? 'bg-[#14293a] text-white font-bold' : 'text-[#6c7079]'
                  }`}
                >
                  All Collections
                </button>
                {parentCategories.map((parent) => {
                  const children = subcategoriesMap[parent.id] || []
                  const isParentSelected =
                    selectedCategory.toLowerCase() === parent.name.toLowerCase() ||
                    selectedCategory.toLowerCase() === parent.slug.toLowerCase()

                  return (
                    <div key={parent.id} className="space-y-0.5">
                      <button
                        onClick={() => setSelectedCategory(parent.name)}
                        className={`w-full text-left py-1.5 px-2 rounded-sm text-xs flex items-center justify-between ${
                          isParentSelected ? 'bg-[#14293a] text-white font-bold' : 'text-[#14293a] font-semibold'
                        }`}
                      >
                        <span className="truncate">{parent.name}</span>
                        <span className="text-[10px] opacity-75">{getCategoryCount(parent)}</span>
                      </button>

                      {children.length > 0 && (
                        <div className="pl-3 border-l border-[#e5e7eb] ml-2 space-y-0.5">
                          {children.map((child) => {
                            const isChildSelected =
                              selectedCategory.toLowerCase() === child.name.toLowerCase() ||
                              selectedCategory.toLowerCase() === child.slug.toLowerCase()

                            return (
                              <button
                                key={child.id}
                                onClick={() => setSelectedCategory(child.name)}
                                className={`w-full text-left py-1 px-2 rounded-sm text-[11px] flex items-center justify-between ${
                                  isChildSelected ? 'bg-[#14293a] text-white font-bold' : 'text-[#6c7079]'
                                }`}
                              >
                                <span className="truncate">{child.name}</span>
                                <span className="text-[10px] opacity-75">{getCategoryCount(child)}</span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Mobile Sizes */}
            <div className="py-4 border-b border-[#e5e7eb] space-y-2">
              <span className="text-xs font-bold uppercase text-[#14293a] block">Sizes</span>
              <div className="grid grid-cols-3 gap-1.5">
                {AVAILABLE_SIZES.map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setSelectedSize(selectedSize === sz ? null : sz)}
                    className={`py-1.5 text-xs font-semibold rounded-sm border ${
                      selectedSize === sz ? 'bg-[#14293a] text-white' : 'border-[#d3d6db] text-[#14293a]'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile Actions */}
            <div className="pt-6 mt-auto space-y-2">
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="w-full py-2.5 bg-[#14293a] text-white font-bold text-xs uppercase tracking-wider rounded-sm hover:bg-[#b91c1c] transition-colors"
              >
                Apply Filters ({sortedProducts.length} Results)
              </button>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="w-full py-2 text-xs text-[#b91c1c] font-semibold hover:underline"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ShopPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white text-[#14293a] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#d3d6db] border-t-[#b91c1c] rounded-full animate-spin" />
        </div>
      }
    >
      <ShopContent />
    </Suspense>
  )
}
