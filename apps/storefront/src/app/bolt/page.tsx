'use client'

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import {
  Filter,
  X,
  Check,
  RotateCcw,
  MapPin,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { createBrowserClient } from '@repo/supabase/browser'
import {
  getCategories,
  DEFAULT_PRODUCTS,
  DEFAULT_PRODUCT_VARIANTS,
  type Product,
  type Category,
  type ProductVariant,
} from '@repo/supabase/utils'
import {
  getEffectiveProductPricing,
  type ProductPricingSummary,
  type PromotionWithRules,
} from '@repo/supabase/pricing'
import { useCartStore } from '../../store/useCartStore'
import { useHydratedBolt } from '../../store/useBoltStore'
import { ProductCard } from '../../components/ProductCard'
import ShopFilterPanel, {
  extractVariantColorFacets,
  extractVariantSizeFacets,
  formatPriceRangeLabel,
} from '../../components/shop/ShopFilterPanel'

type BoltSortOption = 'recommended' | 'price-asc' | 'price-desc' | 'newest' | 'discount-desc'

function parseSortParam(val: string | null): BoltSortOption {
  if (val === 'newest' || val === 'price-asc' || val === 'price-desc' || val === 'discount-desc') {
    return val
  }
  return 'recommended'
}

function parsePriceParam(val: string | null): number | null {
  if (!val) return null
  const num = Number(val)
  return Number.isFinite(num) && num >= 0 ? num : null
}

function buildBoltQueryString(state: {
  selectedCategory: string
  searchQuery: string
  selectedSize: string | null
  selectedColor: string | null
  minPrice: number | null
  maxPrice: number | null
  onSaleOnly: boolean
  minDiscount: number | null
  sortBy: BoltSortOption
}): string {
  const params = new URLSearchParams()
  if (state.selectedCategory !== 'All') params.set('category', state.selectedCategory)
  if (state.searchQuery.trim()) params.set('q', state.searchQuery.trim())
  if (state.selectedSize) params.set('size', state.selectedSize)
  if (state.selectedColor) params.set('color', state.selectedColor)
  if (state.minPrice !== null) params.set('minPrice', String(state.minPrice))
  if (state.maxPrice !== null) params.set('maxPrice', String(state.maxPrice))
  if (state.onSaleOnly) params.set('onSale', 'true')
  if (state.minDiscount !== null) params.set('minDiscount', String(state.minDiscount))
  if (state.sortBy !== 'recommended') params.set('sort', state.sortBy)
  return params.toString()
}

function BoltContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const initialCategoryParam = searchParams.get('category') || 'All'
  const queryParam = searchParams.get('q') || searchParams.get('search') || ''
  const sizeParam = searchParams.get('size')
  const colorParam = searchParams.get('color')
  const minPriceParam = parsePriceParam(searchParams.get('minPrice'))
  const maxPriceParam = parsePriceParam(searchParams.get('maxPrice'))
  const minDiscountParam = searchParams.get('minDiscount')
  const onSaleParam = searchParams.get('onSale') === 'true'
  const initialSort = parseSortParam(searchParams.get('sort'))

  const [categories, setCategories] = useState<Category[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [variantsMap, setVariantsMap] = useState<Record<string, ProductVariant[]>>({})
  const [pricingMap, setPricingMap] = useState<Record<string, ProductPricingSummary>>({})
  const [isLoading, setIsLoading] = useState(true)

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategoryParam)
  const [searchQuery, setSearchQuery] = useState<string>(queryParam)
  const [selectedSize, setSelectedSize] = useState<string | null>(sizeParam || null)
  const [selectedColor, setSelectedColor] = useState<string | null>(colorParam || null)
  const [minPrice, setMinPrice] = useState<number | null>(minPriceParam)
  const [maxPrice, setMaxPrice] = useState<number | null>(maxPriceParam)
  const [minDiscount, setMinDiscount] = useState<number | null>(
    minDiscountParam ? parseInt(minDiscountParam, 10) || null : null
  )
  const [onSaleOnly, setOnSaleOnly] = useState<boolean>(onSaleParam)
  const [sortBy, setSortBy] = useState<BoltSortOption>(initialSort)
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)

  const lastSyncedQueryRef = useRef<string>(searchParams.toString())
  const skipNextUrlWriteRef = useRef<boolean>(false)

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

  // Cart action
  const addItem = useCartStore((s) => s.addItem)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Hydrate filter state when URL changes externally
  useEffect(() => {
    const qs = searchParams.toString()
    if (lastSyncedQueryRef.current === qs) return
    lastSyncedQueryRef.current = qs
    skipNextUrlWriteRef.current = true

    setSelectedCategory(searchParams.get('category') || 'All')
    setSearchQuery(searchParams.get('q') || searchParams.get('search') || '')
    setSelectedSize(searchParams.get('size') || null)
    setSelectedColor(searchParams.get('color') || null)
    setMinPrice(parsePriceParam(searchParams.get('minPrice')))
    setMaxPrice(parsePriceParam(searchParams.get('maxPrice')))
    setOnSaleOnly(searchParams.get('onSale') === 'true')
    const rawMinDisc = searchParams.get('minDiscount')
    setMinDiscount(rawMinDisc ? parseInt(rawMinDisc, 10) || null : null)
    setSortBy(parseSortParam(searchParams.get('sort')))
  }, [searchParams])

  // Sync active filter state back to URL cleanly
  useEffect(() => {
    if (skipNextUrlWriteRef.current) {
      skipNextUrlWriteRef.current = false
      return
    }
    const nextQuery = buildBoltQueryString({
      selectedCategory,
      searchQuery,
      selectedSize,
      selectedColor,
      minPrice,
      maxPrice,
      onSaleOnly,
      minDiscount,
      sortBy,
    })

    if (nextQuery !== lastSyncedQueryRef.current) {
      lastSyncedQueryRef.current = nextQuery
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false })
    }
  }, [
    selectedCategory,
    searchQuery,
    selectedSize,
    selectedColor,
    minPrice,
    maxPrice,
    onSaleOnly,
    minDiscount,
    sortBy,
    pathname,
    router,
  ])

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

        const usingFallback = !prodRes.data || prodRes.data.length === 0
        const vMap: Record<string, ProductVariant[]> = {}
        const sourceVariants =
          !usingFallback && variantsRes.data && variantsRes.data.length > 0
            ? (variantsRes.data as Array<ProductVariant & { is_archived?: boolean }>)
            : (DEFAULT_PRODUCT_VARIANTS as Array<ProductVariant & { is_archived?: boolean }>)

        sourceVariants.forEach((v) => {
          if (!v.is_archived) {
            if (!vMap[v.product_id]) vMap[v.product_id] = []
            vMap[v.product_id]!.push(v)
          }
        })

        const rawProds = usingFallback ? DEFAULT_PRODUCTS : prodRes.data
        const prods: Product[] = rawProds
          .map((row: any) => {
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
              is_try_on_eligible: row.is_try_on_eligible ?? true,
              average_rating: row.average_rating ?? 0,
              review_count: row.review_count ?? 0,
              created_at: row.created_at,
              updated_at: row.updated_at,
            }
          })
          .filter((p) => p.is_try_on_eligible !== false)

        setAllProducts(prods)
        setVariantsMap(vMap)

        let activePromos: PromotionWithRules[] = []
        let serverPricingMap: Record<string, ProductPricingSummary> = {}
        try {
          const offersRes = await fetch('/api/offers')
          if (offersRes.ok) {
            const offersData = await offersRes.json()
            if (offersData.success) {
              if (offersData.pricingMap) {
                serverPricingMap = offersData.pricingMap
              }
              if (Array.isArray(offersData.campaigns)) {
                activePromos = offersData.campaigns
              }
            }
          }
        } catch {}

        const pMap: Record<string, ProductPricingSummary> = {}
        prods.forEach((p) => {
          pMap[p.id] = serverPricingMap[p.id] || getEffectiveProductPricing(p, activePromos)
        })
        setPricingMap(pMap)
      } finally {
        setIsLoading(false)
      }
    }
    loadBoltData()
  }, [])

  const categoryProductCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    const subMap: Record<string, Category[]> = {}
    categories.forEach((c) => {
      if (c.parent_id) {
        if (!subMap[c.parent_id]) subMap[c.parent_id] = []
        subMap[c.parent_id]!.push(c)
      }
    })
    categories.forEach((cat) => {
      const ids = new Set<string>([cat.id])
      const names = new Set<string>([cat.name.toLowerCase()])
      if (!cat.parent_id) {
        ;(subMap[cat.id] || []).forEach((sub) => {
          ids.add(sub.id)
          names.add(sub.name.toLowerCase())
        })
      }
      counts[cat.name] = allProducts.filter(
        (p) => (p.category_id && ids.has(p.category_id)) || names.has((p.category || '').toLowerCase())
      ).length
    })
    return counts
  }, [categories, allProducts])

  const availableSizes = useMemo(
    () => extractVariantSizeFacets(allProducts, variantsMap),
    [allProducts, variantsMap]
  )

  const availableColors = useMemo(
    () => extractVariantColorFacets(allProducts, variantsMap),
    [allProducts, variantsMap]
  )

  const onSaleCount = useMemo(
    () => allProducts.filter((p) => (pricingMap[p.id]?.discountPercentage || 0) > 0).length,
    [allProducts, pricingMap]
  )

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

      // 2. Category Filter (Hierarchical)
      if (selectedCategory !== 'All') {
        const sel = selectedCategory.toLowerCase()
        const catName = (product.category || '').toLowerCase()
        const matchCat = categories.find(
          (c) => c.slug.toLowerCase() === sel || c.name.toLowerCase() === sel
        )
        if (matchCat) {
          if (!matchCat.parent_id) {
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
            const matchesCategory =
              (product.category_id && product.category_id === matchCat.id) ||
              catName === matchCat.name.toLowerCase() ||
              catName === matchCat.slug.toLowerCase()
            if (!matchesCategory) return false
          }
        } else if (catName !== sel) {
          return false
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

      // 5. Price Range Filter (against effective selling price)
      const sellingPrice = pricingMap[product.id]?.sellingPrice ?? Number(product.price)
      if (minPrice !== null && sellingPrice < minPrice) return false
      if (maxPrice !== null && sellingPrice > maxPrice) return false

      // 6. Discount & Sale Filters
      const discountPct = pricingMap[product.id]?.discountPercentage || 0
      if (onSaleOnly && discountPct <= 0) return false
      if (minDiscount !== null && discountPct < minDiscount) return false

      return true
    })
  }, [
    allProducts,
    searchQuery,
    selectedCategory,
    selectedSize,
    selectedColor,
    minPrice,
    maxPrice,
    onSaleOnly,
    minDiscount,
    categories,
    variantsMap,
    pricingMap,
  ])

  // Sorting
  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      const priceA = pricingMap[a.id]?.sellingPrice ?? Number(a.price)
      const priceB = pricingMap[b.id]?.sellingPrice ?? Number(b.price)
      if (sortBy === 'price-asc') return priceA - priceB
      if (sortBy === 'price-desc') return priceB - priceA
      if (sortBy === 'discount-desc') {
        const discA = pricingMap[a.id]?.discountPercentage || 0
        const discB = pricingMap[b.id]?.discountPercentage || 0
        return discB - discA
      }
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      return 0
    })
  }, [filteredProducts, sortBy, pricingMap])

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (selectedCategory !== 'All') count++
    if (searchQuery.trim()) count++
    if (selectedSize) count++
    if (selectedColor) count++
    if (minPrice !== null || maxPrice !== null) count++
    if (minDiscount !== null) count++
    if (onSaleOnly) count++
    return count
  }, [selectedCategory, searchQuery, selectedSize, selectedColor, minPrice, maxPrice, minDiscount, onSaleOnly])

  const clearAllFilters = () => {
    setSelectedCategory('All')
    setSearchQuery('')
    setSelectedSize(null)
    setSelectedColor(null)
    setMinPrice(null)
    setMaxPrice(null)
    setMinDiscount(null)
    setOnSaleOnly(false)
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

    const added = addItem({
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
    if (added) {
      useCartStore.getState().openDrawer()
    } else {
      setToastMessage('Bolt limit: maximum 5 garments per fitting session.')
      setTimeout(() => setToastMessage(null), 3500)
    }
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
                onChange={(e) => setSortBy(e.target.value as BoltSortOption)}
                className="bg-white border border-[#d3d6db] px-3 py-1.5 text-xs text-[#14293a] focus:outline-none focus:border-[#14293a] rounded-sm cursor-pointer shadow-xs font-sans"
              >
                <option value="recommended">Recommended</option>
                <option value="discount-desc">Discount: High to Low</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="newest">Newest</option>
              </select>
            </div>
          </div>
        </div>

        {/* Active Filter Chips Strip */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6 text-xs">
            <span className="text-[#6c7079] font-semibold text-[11px] uppercase tracking-wider">
              Filters:
            </span>
            {onSaleOnly && (
              <span className="inline-flex items-center gap-1.5 bg-red-50 border border-red-200 px-2.5 py-1 rounded-sm text-xs font-semibold text-[#b91c1c]">
                <span>On Sale</span>
                <button
                  type="button"
                  aria-label="Remove On Sale filter"
                  onClick={() => setOnSaleOnly(false)}
                  className="text-[#b91c1c] hover:text-[#14293a] cursor-pointer"
                >
                  <X className="w-3 h-3" strokeWidth={1.75} />
                </button>
              </span>
            )}
            {minDiscount !== null && (
              <span className="inline-flex items-center gap-1.5 bg-[#f8f8f8] border border-[#d3d6db] px-2.5 py-1 rounded-sm text-xs font-medium text-[#14293a]">
                <span>Min. {minDiscount}% Off</span>
                <button
                  type="button"
                  aria-label="Remove discount filter"
                  onClick={() => setMinDiscount(null)}
                  className="text-[#6c7079] hover:text-[#b91c1c] cursor-pointer"
                >
                  <X className="w-3 h-3" strokeWidth={1.75} />
                </button>
              </span>
            )}
            {selectedCategory !== 'All' && (
              <span className="inline-flex items-center gap-1.5 bg-[#f8f8f8] border border-[#d3d6db] px-2.5 py-1 rounded-sm text-xs font-medium text-[#14293a]">
                <span>{selectedCategory}</span>
                <button
                  type="button"
                  aria-label="Remove category filter"
                  onClick={() => setSelectedCategory('All')}
                  className="text-[#6c7079] hover:text-[#b91c1c] cursor-pointer"
                >
                  <X className="w-3 h-3" strokeWidth={1.75} />
                </button>
              </span>
            )}
            {searchQuery.trim() && (
              <span className="inline-flex items-center gap-1.5 bg-[#f8f8f8] border border-[#d3d6db] px-2.5 py-1 rounded-sm text-xs font-medium text-[#14293a]">
                <span>Search: &ldquo;{searchQuery}&rdquo;</span>
                <button
                  type="button"
                  aria-label="Remove search filter"
                  onClick={() => setSearchQuery('')}
                  className="text-[#6c7079] hover:text-[#b91c1c] cursor-pointer"
                >
                  <X className="w-3 h-3" strokeWidth={1.75} />
                </button>
              </span>
            )}
            {selectedSize && (
              <span className="inline-flex items-center gap-1.5 bg-[#f8f8f8] border border-[#d3d6db] px-2.5 py-1 rounded-sm text-xs font-medium text-[#14293a]">
                <span>Size: {selectedSize}</span>
                <button
                  type="button"
                  aria-label="Remove size filter"
                  onClick={() => setSelectedSize(null)}
                  className="text-[#6c7079] hover:text-[#b91c1c] cursor-pointer"
                >
                  <X className="w-3 h-3" strokeWidth={1.75} />
                </button>
              </span>
            )}
            {selectedColor && (
              <span className="inline-flex items-center gap-1.5 bg-[#f8f8f8] border border-[#d3d6db] px-2.5 py-1 rounded-sm text-xs font-medium text-[#14293a]">
                <span>Color: {selectedColor}</span>
                <button
                  type="button"
                  aria-label="Remove color filter"
                  onClick={() => setSelectedColor(null)}
                  className="text-[#6c7079] hover:text-[#b91c1c] cursor-pointer"
                >
                  <X className="w-3 h-3" strokeWidth={1.75} />
                </button>
              </span>
            )}
            {formatPriceRangeLabel(minPrice, maxPrice) && (
              <span className="inline-flex items-center gap-1.5 bg-[#f8f8f8] border border-[#d3d6db] px-2.5 py-1 rounded-sm text-xs font-medium text-[#14293a]">
                <span>{formatPriceRangeLabel(minPrice, maxPrice)}</span>
                <button
                  type="button"
                  aria-label="Remove price filter"
                  onClick={() => {
                    setMinPrice(null)
                    setMaxPrice(null)
                  }}
                  className="text-[#6c7079] hover:text-[#b91c1c] cursor-pointer"
                >
                  <X className="w-3 h-3" strokeWidth={1.75} />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1 text-xs text-[#b91c1c] hover:text-[#14293a] font-semibold ml-1 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3 h-3" strokeWidth={1.75} />
              <span>Clear All</span>
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
          <aside className={`${showSidebar ? 'hidden lg:block' : 'hidden'} w-64 shrink-0 bg-white border border-[#e5e7eb] p-5 rounded-sm sticky top-28 self-start`}>
            <ShopFilterPanel
              categories={categories}
              categoryProductCounts={categoryProductCounts}
              totalProductCount={allProducts.length}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              availableSizes={availableSizes}
              selectedSize={selectedSize}
              onSelectSize={setSelectedSize}
              availableColors={availableColors}
              selectedColor={selectedColor}
              onSelectColor={setSelectedColor}
              minPrice={minPrice}
              maxPrice={maxPrice}
              onPriceRangeChange={(min, max) => {
                setMinPrice(min)
                setMaxPrice(max)
              }}
              tryOnOnly={true}
              onToggleTryOn={() => {}}
              hideBoltToggle
              onSaleOnly={onSaleOnly}
              onToggleOnSale={() => setOnSaleOnly((prev) => !prev)}
              onSaleCount={onSaleCount}
              minDiscount={minDiscount}
              onSelectMinDiscount={setMinDiscount}
              activeFilterCount={activeFilterCount}
              onClearAll={clearAllFilters}
              variant="desktop"
            />
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
                {sortedProducts.map((prod, idx) => {
                  const pricing = pricingMap[prod.id]
                  return (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      variants={variantsMap[prod.id]}
                      pricing={pricing}
                      mrp={pricing?.mrp}
                      sellingPrice={pricing?.sellingPrice}
                      discountPercentage={pricing?.discountPercentage}
                      bestCouponCode={pricing?.bestCoupon?.code}
                      bestCouponPrice={pricing?.bestCouponPrice}
                      priority={idx < 4}
                      showTryOnBadge={true}
                      onQuickAdd={(p, sz) => handleQuickAdd(p, sz)}
                    />
                  )
                })}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Filter Sheet / Drawer */}
      {mobileFilterOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 lg:hidden flex items-end sm:items-stretch sm:justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Filter Bolt products"
        >
          <div className="w-full sm:max-w-sm max-h-[90dvh] sm:h-full sm:max-h-full bg-white flex flex-col border-t sm:border-t-0 sm:border-l border-[#d3d6db] rounded-t-sm sm:rounded-none">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5e7eb] shrink-0">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#14293a]">
                Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </span>
              <div className="flex items-center gap-3">
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="text-[11px] font-semibold uppercase tracking-wider text-[#b91c1c] hover:underline"
                  >
                    Clear All
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Close filters"
                  onClick={() => setMobileFilterOpen(false)}
                  className="p-1 text-[#6c7079] hover:text-[#14293a]"
                >
                  <X className="w-5 h-5" strokeWidth={1.75} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain p-5">
              <ShopFilterPanel
                categories={categories}
                categoryProductCounts={categoryProductCounts}
                totalProductCount={allProducts.length}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                availableSizes={availableSizes}
                selectedSize={selectedSize}
                onSelectSize={setSelectedSize}
                availableColors={availableColors}
                selectedColor={selectedColor}
                onSelectColor={setSelectedColor}
                minPrice={minPrice}
                maxPrice={maxPrice}
                onPriceRangeChange={(min, max) => {
                  setMinPrice(min)
                  setMaxPrice(max)
                }}
                tryOnOnly={true}
                onToggleTryOn={() => {}}
                hideBoltToggle
                onSaleOnly={onSaleOnly}
                onToggleOnSale={() => setOnSaleOnly((prev) => !prev)}
                onSaleCount={onSaleCount}
                minDiscount={minDiscount}
                onSelectMinDiscount={setMinDiscount}
                activeFilterCount={activeFilterCount}
                onClearAll={clearAllFilters}
                variant="mobile"
              />
            </div>

            <div className="p-4 border-t border-[#e5e7eb] bg-white shrink-0">
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="w-full py-3 bg-[#14293a] text-white font-sans text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-[#b91c1c] transition-colors"
              >
                Show {sortedProducts.length} {sortedProducts.length === 1 ? 'Result' : 'Results'}
              </button>
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
