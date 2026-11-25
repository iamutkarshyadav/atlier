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
  MapPin,
  Loader2,
  AlertCircle,
  CheckCircle2,
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
import { useHydratedBolt } from '../../store/useBoltStore'
import { ProductCard } from '../../components/ProductCard'

const AVAILABLE_SIZES = ['S', 'M', 'L', 'XL', '30', '32', '34']
const AVAILABLE_COLORS = [
  { name: 'Vintage Black', hex: '#1C1C1C' },
  { name: 'Natural Ecru', hex: '#F0EAE1' },
  { name: 'Washed Ink', hex: '#2A303C' },
  { name: 'Raw Indigo', hex: '#1B2A4A' },
]

function BoltContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialCategoryParam = searchParams.get('category') || 'All'
  const queryParam = searchParams.get('q') || searchParams.get('search') || ''

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
  const [sortBy, setSortBy] = useState<'recommended' | 'price-asc' | 'price-desc' | 'newest'>('recommended')
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)

  // Bolt Postal Code Checker State
  const {
    pincode,
    city,
    isServiceable,
    isHydrated,
    hasAttemptedDetection,
    setPincode,
    setHasAttemptedDetection,
    clearPincode,
  } = useHydratedBolt()
  const [inputPin, setInputPin] = useState('')
  const [loadingPin, setLoadingPin] = useState(false)
  const [pinError, setPinError] = useState<string | null>(null)
  const [isChangingPin, setIsChangingPin] = useState(false)

  // Auto-detect location once when visitor arrives without a saved pincode
  useEffect(() => {
    if (!isHydrated || pincode || hasAttemptedDetection) return
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setHasAttemptedDetection(true)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setHasAttemptedDetection(true)
        try {
          const { latitude, longitude } = pos.coords
          const res = await fetch(
            `/api/bolt/reverse-geocode?lat=${encodeURIComponent(latitude)}&lng=${encodeURIComponent(longitude)}`
          )
          const data = await res.json()
          if (data.success && data.pincode && /^\d{6}$/.test(data.pincode)) {
            const checkRes = await fetch(`/api/bolt/check-pincode?pin=${encodeURIComponent(data.pincode)}`)
            const checkData = await checkRes.json()
            setPincode(data.pincode, Boolean(checkData.serviceable), checkData.city || data.city || null)
          }
        } catch {
          // Graceful fallback: keeps clean collapsed Enter PIN state
        }
      },
      () => {
        // Denied or timed out: mark attempted so user is not prompted again
        setHasAttemptedDetection(true)
      },
      { enableHighAccuracy: false, timeout: 5000 }
    )
  }, [isHydrated, pincode, hasAttemptedDetection, setPincode, setHasAttemptedDetection])

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

  // Fetch initial data
  useEffect(() => {
    async function loadBoltData() {
      setIsLoading(true)
      try {
        const supabase = createBrowserClient()

        const [catData, prodRes, variantsRes] = await Promise.all([
          getCategories(supabase).catch(() => []),
          supabase
            .from('products')
            .select('*, categories(id, name, slug)')
            .eq('is_archived', false)
            .order('created_at', { ascending: false }),
          supabase
            .from('product_variants')
            .select('*'),
        ])

        setCategories(catData || [])

        const vMap: Record<string, ProductVariant[]> = {}
        if (variantsRes.data) {
          variantsRes.data.forEach((v: ProductVariant) => {
            if (!vMap[v.product_id]) vMap[v.product_id] = []
            vMap[v.product_id]!.push(v)
          })
        }

        const rawProds = prodRes.data && prodRes.data.length > 0 ? prodRes.data : DEFAULT_PRODUCTS
        const prods: Product[] = rawProds.map((row: any) => {
          const categoryObj = row.categories
          return {
            id: row.id,
            title: row.title,
            description: row.description,
            price: Number(row.price),
            compare_at_price: row.compare_at_price ? Number(row.compare_at_price) : null,
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
    loadBoltData()
  }, [])

  // Filter products
  const filteredProducts = useMemo(() => {
    return allProducts.filter((product) => {
      // 1. Text Search Filter
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

      // 2. Category Filter
      if (selectedCategory !== 'All') {
        const sel = selectedCategory.toLowerCase()
        const catName = (product.category || '').toLowerCase()
        const matchCat = categories.find(
          (c) => c.slug.toLowerCase() === sel || c.name.toLowerCase() === sel
        )
        const matchesCategory =
          catName === sel ||
          (matchCat && catName === matchCat.name.toLowerCase()) ||
          (matchCat && product.category_id === matchCat.id)
        if (!matchesCategory) return false
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
    return count
  }, [selectedCategory, searchQuery, selectedSize, selectedColor, priceTier])

  const clearAllFilters = () => {
    setSelectedCategory('All')
    setSearchQuery('')
    setSelectedSize(null)
    setSelectedColor(null)
    setPriceTier('all')
    setSortBy('recommended')
  }

  // Postal Code Check Logic
  const handleCheckPincode = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = inputPin.trim()
    if (!trimmed || trimmed.length !== 6) {
      setPinError('Please enter a valid 6-digit postal code.')
      return
    }

    setLoadingPin(true)
    setPinError(null)

    try {
      const res = await fetch(`/api/bolt/check-pincode?pin=${encodeURIComponent(trimmed)}`)
      const data = await res.json()

      if (data.serviceable) {
        setPincode(trimmed, true, data.city || null)
        setIsChangingPin(false)
        setInputPin('')
        setPinError(null)
      } else {
        setPincode(trimmed, false, null)
        setPinError(
          data.message ||
            `PIN ${trimmed} is outside our 45-minute delivery radius.`
        )
      }
    } catch {
      setPinError('Failed to check postal code.')
    } finally {
      setLoadingPin(false)
    }
  }

  const handleOpenPinForm = () => {
    setIsChangingPin(true)
    setInputPin(pincode || '')
    setPinError(null)
  }

  const handleCancelPinChange = () => {
    setIsChangingPin(false)
    setInputPin('')
    setPinError(null)
  }

  const handleQuickAdd = (product: Product, size: string) => {
    const prodPrice = Number(product.price)
    const originalPrice =
      Number((product as any).compare_at_price) > prodPrice
        ? Number((product as any).compare_at_price)
        : undefined

    addItem({
      id: `${product.id}-${size}`,
      productId: product.id,
      title: product.title,
      category: product.category || 'Atelier Collection',
      edition: 'Permanent Collection',
      price: prodPrice,
      originalPrice,
      quantity: 1,
      image: product.image_url || '',
      size,
    })
    setToastMessage(`Added ${product.title} (${size}) to doorstep tote`)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const isBoltActive = isHydrated && isServiceable && Boolean(pincode)
  const isBoltUnavailable = isHydrated && !isServiceable && Boolean(pincode)
  const isFormActive = isChangingPin

  return (
    <div className="bg-white min-h-screen text-[#14293a] selection:bg-[#b91c1c] selection:text-white font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#14293a] text-white px-4 py-3 rounded-sm shadow-xl flex items-center gap-2 text-xs font-sans animate-slideUp">
          <Check className="w-4 h-4 text-[#059669]" />
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
          <span className="text-[#14293a]">Bolt Try-On</span>
        </nav>

        {/* Row 2: Single Flex Bar */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#e5e7eb] pb-4 mb-6">
          {/* Left side */}
          <div>
            <h1 className="text-2xl font-bold text-[#14293a] tracking-tight flex items-baseline">
              Bolt Try-On
              <span className="text-sm font-normal text-[#6c7079] ml-2">
                ({sortedProducts.length} {sortedProducts.length === 1 ? 'item' : 'items'})
              </span>
            </h1>

            {isFormActive ? (
              <form onSubmit={handleCheckPincode} className="mt-1.5 flex items-center gap-2 flex-wrap text-xs">
                <div className="flex items-center gap-1.5 text-[#14293a] font-medium">
                  <MapPin className="w-3.5 h-3.5 text-[#14293a] shrink-0" />
                  <span>Deliver to:</span>
                </div>

                <div className="relative flex items-center">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={inputPin}
                    onChange={(e) => {
                      setInputPin(e.target.value.replace(/\D/g, '').slice(0, 6))
                      setPinError(null)
                    }}
                    placeholder="6-digit PIN"
                    className="w-28 sm:w-32 h-7 px-2.5 text-xs font-mono tracking-wider text-[#14293a] bg-white border border-[#d3d6db] rounded-sm placeholder:font-sans placeholder:tracking-normal placeholder:text-[#8a909a] focus:outline-none focus:border-[#14293a] focus:ring-1 focus:ring-[#14293a] transition-all"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={loadingPin || inputPin.length !== 6}
                  className="h-7 px-3 bg-[#14293a] hover:bg-[#b91c1c] active:bg-[#991b1b] text-white text-xs font-semibold rounded-sm transition-colors disabled:opacity-40 disabled:hover:bg-[#14293a] cursor-pointer flex items-center gap-1.5"
                >
                  {loadingPin ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Checking...</span>
                    </>
                  ) : (
                    <span>Check</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCancelPinChange}
                  className="h-7 px-2.5 text-xs font-medium text-[#6c7079] hover:text-[#14293a] bg-white hover:bg-[#f8f8f8] border border-[#d3d6db] rounded-sm transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                {pinError && (
                  <span className="text-xs text-[#b91c1c] font-medium flex items-center gap-1 ml-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{pinError}</span>
                  </span>
                )}
              </form>
            ) : isBoltUnavailable ? (
              <div className="text-xs mt-1.5 flex items-center gap-2 text-[#9f1239] flex-wrap">
                <span className="w-[6px] h-[6px] bg-[#e11d48] rounded-full shrink-0" />
                <span>PIN {pincode} outside 45-min delivery radius</span>
                <span>·</span>
                <button
                  type="button"
                  onClick={handleOpenPinForm}
                  className="text-[#14293a] font-medium underline underline-offset-2 hover:text-[#b91c1c] cursor-pointer"
                >
                  Change PIN
                </button>
                <span>·</span>
                <Link href="/shop" className="underline font-medium hover:text-[#14293a]">
                  All Shopping &rarr;
                </Link>
              </div>
            ) : isBoltActive ? (
              <div className="text-xs text-[#6c7079] mt-1.5 flex items-center gap-2 flex-wrap">
                <span className="w-[6px] h-[6px] bg-emerald-600 rounded-full shrink-0" />
                <span>
                  45-min delivery to <strong className="text-[#14293a] font-semibold">{pincode}</strong>{city ? ` (${city})` : ''}
                </span>
                <span>·</span>
                <button
                  type="button"
                  onClick={handleOpenPinForm}
                  className="text-[#14293a] font-medium underline underline-offset-2 hover:text-[#b91c1c] cursor-pointer"
                >
                  Change PIN
                </button>
                <span>·</span>
                <span>Try up to 5 items</span>
              </div>
            ) : (
              <div className="text-xs text-[#6c7079] mt-1.5 flex items-center gap-2 flex-wrap">
                <MapPin className="w-3.5 h-3.5 text-[#8a909a] shrink-0" />
                <span>Enter PIN for 45-min doorstep delivery</span>
                <span>·</span>
                <button
                  type="button"
                  onClick={handleOpenPinForm}
                  className="text-[#14293a] font-medium underline underline-offset-2 hover:text-[#b91c1c] cursor-pointer"
                >
                  Enter PIN
                </button>
                <span>·</span>
                <span>Try up to 5 items</span>
              </div>
            )}
          </div>

          {/* Right side */}
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
              <label htmlFor="bolt-sort" className="text-[#6c7079] font-medium hidden sm:inline">
                Sort by:
              </label>
              <select
                id="bolt-sort"
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
      {/* 2. MAIN CATALOG LAYOUT: LEFT SIDEBAR + 4-COL PRODUCT GRID */}
      {/* ========================================================= */}
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="flex items-start gap-8">
          {/* Desktop Filter Sidebar */}
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
                <div className="pt-2 space-y-1.5">
                  <button
                    onClick={() => setSelectedCategory('All')}
                    className={`w-full text-left text-xs py-1 px-2 rounded transition-colors flex items-center justify-between cursor-pointer ${
                      selectedCategory === 'All'
                        ? 'font-bold text-[#b91c1c] bg-white shadow-xs'
                        : 'text-[#6c7079] hover:text-[#14293a]'
                    }`}
                  >
                    <span>All Collections</span>
                    <span className="text-[11px] text-[#8a909a]">{allProducts.length}</span>
                  </button>

                  {categories.map((cat) => {
                    const isSel = selectedCategory.toLowerCase() === cat.slug.toLowerCase() || selectedCategory.toLowerCase() === cat.name.toLowerCase()
                    const count = allProducts.filter(
                      (p) => p.category_id === cat.id || p.category?.toLowerCase() === cat.name.toLowerCase()
                    ).length

                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.name)}
                        className={`w-full text-left text-xs py-1 px-2 rounded transition-colors flex items-center justify-between cursor-pointer ${
                          isSel
                            ? 'font-bold text-[#b91c1c] bg-white shadow-xs'
                            : 'text-[#6c7079] hover:text-[#14293a]'
                        }`}
                      >
                        <span className="truncate">{cat.name}</span>
                        <span className="text-[11px] text-[#8a909a]">{count}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 2. Sizes Facet */}
            <div className="py-4 border-b border-[#e5e7eb] space-y-2">
              <button
                onClick={() => toggleSection('sizes')}
                className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#14293a] cursor-pointer"
              >
                <span>Size</span>
                {openSections.sizes ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {openSections.sizes && (
                <div className="pt-2 grid grid-cols-4 gap-1.5">
                  {AVAILABLE_SIZES.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(selectedSize === size ? null : size)}
                      className={`py-1.5 text-xs font-mono font-medium rounded-xs border text-center transition-all cursor-pointer ${
                        selectedSize === size
                          ? 'border-[#14293a] bg-[#14293a] text-white'
                          : 'border-[#d3d6db] bg-white text-[#14293a] hover:border-[#14293a]'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Colorways Facet */}
            <div className="py-4 border-b border-[#e5e7eb] space-y-2">
              <button
                onClick={() => toggleSection('colors')}
                className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#14293a] cursor-pointer"
              >
                <span>Color</span>
                {openSections.colors ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {openSections.colors && (
                <div className="pt-2 space-y-1.5">
                  {AVAILABLE_COLORS.map((col) => (
                    <button
                      key={col.name}
                      onClick={() => setSelectedColor(selectedColor === col.name ? null : col.name)}
                      className={`w-full flex items-center justify-between py-1 px-1.5 rounded text-xs transition-colors cursor-pointer ${
                        selectedColor === col.name
                          ? 'font-bold text-[#14293a] bg-white shadow-xs'
                          : 'text-[#6c7079] hover:text-[#14293a]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full border border-black/20"
                          style={{ backgroundColor: col.hex }}
                        />
                        <span>{col.name}</span>
                      </div>
                      {selectedColor === col.name && <Check className="w-3 h-3 text-[#b91c1c]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Price Facet */}
            <div className="py-4 space-y-2">
              <button
                onClick={() => toggleSection('price')}
                className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#14293a] cursor-pointer"
              >
                <span>Price</span>
                {openSections.price ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {openSections.price && (
                <div className="pt-2 space-y-1.5">
                  {[
                    { label: 'All Price Tiers', val: 'all' },
                    { label: 'Under ₹5,000', val: 'under-5000' },
                    { label: '₹5,000 – ₹12,000', val: '5000-12000' },
                    { label: 'Above ₹12,000', val: 'above-12000' },
                  ].map((tier) => (
                    <button
                      key={tier.val}
                      onClick={() => setPriceTier(tier.val as any)}
                      className={`w-full text-left text-xs py-1 px-1.5 rounded transition-colors flex items-center justify-between cursor-pointer ${
                        priceTier === tier.val
                          ? 'font-bold text-[#b91c1c] bg-white shadow-xs'
                          : 'text-[#6c7079] hover:text-[#14293a]'
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

          {/* Product Grid Area */}
          <main className="flex-1 min-w-0">
            {isLoading ? (
              <div className="py-24 text-center space-y-3">
                <div className="w-8 h-8 border-2 border-[#d3d6db] border-t-[#b91c1c] rounded-full animate-spin mx-auto" />
                <p className="text-xs text-[#6c7079] uppercase tracking-wider font-semibold">
                  Loading Bolt Collections...
                </p>
              </div>
            ) : sortedProducts.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-[#d3d6db] p-8 rounded-sm bg-[#f8f8f8] space-y-4">
                <p className="text-sm font-semibold text-[#14293a]">
                  No silhouettes found matching the selected filters.
                </p>
                <button
                  onClick={clearAllFilters}
                  className="px-5 py-2.5 bg-[#14293a] text-white text-xs font-sans font-bold uppercase tracking-wider rounded-sm hover:bg-[#b91c1c] transition-colors cursor-pointer"
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
                    showTryOnBadge={true}
                    showReassuranceLine={false}
                    onQuickAdd={(p, sz) => handleQuickAdd(p, sz)}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Filter Modal */}
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

            <div className="py-4 space-y-4 flex-1">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#14293a] mb-2">Category</p>
                <div className="space-y-1">
                  <button
                    onClick={() => setSelectedCategory('All')}
                    className={`w-full text-left text-xs py-1.5 px-2 rounded ${selectedCategory === 'All' ? 'bg-[#14293a] text-white' : 'text-[#6c7079]'}`}
                  >
                    All Collections
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.name)}
                      className={`w-full text-left text-xs py-1.5 px-2 rounded ${selectedCategory === cat.name ? 'bg-[#14293a] text-white' : 'text-[#6c7079]'}`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#14293a] mb-2">Size</p>
                <div className="grid grid-cols-4 gap-2">
                  {AVAILABLE_SIZES.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(selectedSize === size ? null : size)}
                      className={`py-1.5 text-xs font-mono rounded-xs border text-center ${
                        selectedSize === size ? 'bg-[#14293a] text-white border-[#14293a]' : 'bg-white text-[#14293a] border-[#d3d6db]'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#d3d6db] space-y-2">
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="w-full py-3 bg-[#14293a] text-white font-sans text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-[#b91c1c] transition-colors"
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

export default function BoltPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white text-[#14293a] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#d3d6db] border-t-[#b91c1c] rounded-full animate-spin" />
        </div>
      }
    >
      <BoltContent />
    </Suspense>
  )
}
