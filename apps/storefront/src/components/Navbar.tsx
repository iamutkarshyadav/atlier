'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  ShoppingBag,
  X,
  ArrowRight,
  LogOut,
  Package,
  Zap,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  User,
  Menu,
  MapPin,
  Heart,
} from 'lucide-react'
import { useHydratedCart } from '../store/useCartStore'
import { useHydratedBolt } from '../store/useBoltStore'
import { useHydratedWishlist, useWishlistStore } from '../store/useWishlistStore'
import { PincodeModal } from './PincodeModal'
import { SearchModal } from './SearchModal'
import { createBrowserClient } from '@repo/supabase/browser'
import {
  getCategories,
  getCollections,
  DEFAULT_CATEGORIES,
  DEFAULT_PRODUCTS,
  type Category,
  type Product,
  type CollectionWithRelations,
} from '@repo/supabase/utils'

function formatNameFromEmail(email: string): string {
  const localPart = email.split('@')[0] || 'Account'
  return localPart
    .split(/[._-]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

export interface NavbarProps {
  initialCategories?: Category[]
  announcement?: {
    is_active?: boolean
    badge?: string
    message?: string
    link_text?: string
    link_url?: string | null
  }
}

export function Navbar({ initialCategories = DEFAULT_CATEGORIES, announcement }: NavbarProps) {
  const router = useRouter()
  const pathname = usePathname()

  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [occasions, setOccasions] = useState<CollectionWithRelations[]>([])
  const [activeMegaMenu, setActiveMegaMenu] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [expandedMobileCategory, setExpandedMobileCategory] = useState<string | null>(null)
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [isPincodeModalOpen, setIsPincodeModalOpen] = useState(false)
  const [latestProducts, setLatestProducts] = useState<Product[]>(DEFAULT_PRODUCTS.slice(0, 2))

  const isBoltPage = pathname?.startsWith('/bolt')

  const megaMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const userDropdownRef = useRef<HTMLDivElement>(null)
  const categoryNavRef = useRef<HTMLElement>(null)
  const categoryScrollRef = useRef<HTMLUListElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScrollIndicators = () => {
    const el = categoryScrollRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    setCanScrollLeft(scrollLeft > 6)
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6)
  }

  useEffect(() => {
    const el = categoryScrollRef.current
    if (!el) return
    checkScrollIndicators()
    el.addEventListener('scroll', checkScrollIndicators, { passive: true })
    window.addEventListener('resize', checkScrollIndicators)
    return () => {
      el.removeEventListener('scroll', checkScrollIndicators)
      window.removeEventListener('resize', checkScrollIndicators)
    }
  }, [categories, occasions])

  const scrollCategoryTrack = (direction: 'left' | 'right') => {
    const el = categoryScrollRef.current
    if (!el) return
    const scrollAmount = direction === 'left' ? -260 : 260
    el.scrollBy({ left: scrollAmount, behavior: 'smooth' })
  }

  const { itemCount } = useHydratedCart()
  const { city: boltCity, pincode } = useHydratedBolt()
  const { itemCount: wishlistCount } = useHydratedWishlist()
  const clearWishlist = useWishlistStore((s) => s.clearWishlist)
  const syncGuestWishlist = useWishlistStore((s) => s.syncGuestWishlist)

  // Global keyboard shortcut for search modal: Cmd/Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsSearchModalOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Re-fetch categories and occasions on mount and subscribe to real-time changes
  useEffect(() => {
    const supabase = createBrowserClient()
    const fetchNavData = async () => {
      try {
        const [catRes, colRes] = await Promise.all([
          fetch('/api/categories', { cache: 'no-store' }),
          fetch('/api/collections?showInNavbar=true', { cache: 'no-store' }),
        ])
        const [catJson, colJson] = await Promise.all([catRes.json(), colRes.json()])
        if (catJson.success && Array.isArray(catJson.categories) && catJson.categories.length > 0) {
          setCategories(catJson.categories)
        }
        if (colJson.success && Array.isArray(colJson.collections)) {
          setOccasions(colJson.collections)
          return
        }
      } catch {}

      Promise.all([
        getCategories(supabase),
        getCollections(supabase, { onlyActive: true, showInNavbar: true }),
      ])
        .then(([cats, cols]) => {
          if (Array.isArray(cats) && cats.length > 0) setCategories(cats)
          if (Array.isArray(cols)) setOccasions(cols)
        })
        .catch(() => {})
    }

    fetchNavData()

    const channel = supabase
      .channel('navbar_realtime_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collections' }, () => {
        fetchNavData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        fetchNavData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'storefront_config' }, () => {
        fetchNavData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Fetch latest products from Supabase for New Arrivals live preview
  useEffect(() => {
    async function loadLatestProducts() {
      try {
        const supabase = createBrowserClient()
        const { data } = await supabase
          .from('products')
          .select('*')
          .eq('is_archived', false)
          .order('created_at', { ascending: false })
          .limit(2)

        if (data && data.length > 0) {
          setLatestProducts(
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
        // Fallback already populated via DEFAULT_PRODUCTS
      }
    }
    loadLatestProducts()
  }, [])

  // Build memoized category tree: parents without parent_id, children grouped by parent_id
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

  // Close mobile menu and mega-menu on navigation
  useEffect(() => {
    setMobileMenuOpen(false)
    setActiveMegaMenu(null)
    setUserDropdownOpen(false)
  }, [pathname])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  // Click outside & Escape listener for dropdowns and category popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false)
      }
      if (categoryNavRef.current && !categoryNavRef.current.contains(e.target as Node)) {
        setActiveMegaMenu(null)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMegaMenu(null)
        setUserDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Resolve user session from Supabase
  useEffect(() => {
    const supabase = createBrowserClient()

    async function resolveUserProfile(authUser: any) {
      if (!authUser) {
        setUserEmail(null)
        setUserName(null)
        return
      }

      // Sync any guest wishlist items upon successful patron login
      syncGuestWishlist()

      setUserEmail(authUser.email || null)

      try {
        const { data: profile } = await supabase
          .from('users')
          .select('name')
          .eq('id', authUser.id)
          .maybeSingle()

        if (profile?.name && profile.name.trim() !== '') {
          setUserName(profile.name.trim())
          return
        }
      } catch {
        // Fallback
      }

      const metaName = authUser.user_metadata?.name || authUser.user_metadata?.full_name
      if (metaName && typeof metaName === 'string' && metaName.trim() !== '') {
        setUserName(metaName.trim())
        return
      }

      if (authUser.email) {
        setUserName(formatNameFromEmail(authUser.email))
        return
      }

      setUserName('Patron')
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) resolveUserProfile(session.user)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      resolveUserProfile(session?.user ?? null)
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    try {
      const supabase = createBrowserClient()
      await supabase.auth.signOut()
      clearWishlist()
      setUserEmail(null)
      setUserName(null)
      setUserDropdownOpen(false)
      router.refresh()
    } catch {
      // Continue
    }
  }

  const handleMouseEnterMenu = (title: string) => {
    if (megaMenuTimeoutRef.current) {
      clearTimeout(megaMenuTimeoutRef.current)
    }
    setActiveMegaMenu(title)
  }

  const handleMouseLeaveMenu = () => {
    megaMenuTimeoutRef.current = setTimeout(() => {
      setActiveMegaMenu(null)
    }, 180)
  }

  return (
    <header className="sticky top-0 z-50 w-full max-w-full bg-white text-[#14293a] shadow-[0_1px_3px_0_rgba(0,0,0,0.06)] border-b border-[#d3d6db] overflow-x-clip">
      {/* ========================================================= */}
      {/* TIER 1: E-COMMERCE ANNOUNCEMENT STRIP                    */}
      {/* ========================================================= */}
      {announcement?.is_active !== false && (
        <div className="bg-[#f8f8f8] border-b border-[#e5e7eb] py-1.5 px-4 text-center text-xs tracking-wider font-sans font-medium text-[#14293a] flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[#b91c1c] font-semibold">
            <Zap className="w-3 h-3 fill-[#b91c1c] text-[#b91c1c]" />
            {announcement?.badge || 'BOLT 45-MIN DOORSTEP TRY-ON'}
          </span>
          <span className="text-[#6c7079] hidden sm:inline">|</span>
          <span className="text-[#6c7079] hidden sm:inline">
            {announcement?.message || 'Try up to 5 pieces at home before buying • Free express delivery on orders over ₹1,999'}
          </span>
          <button
            type="button"
            onClick={() => setIsPincodeModalOpen(true)}
            className="inline-flex items-center gap-1 text-[11px] bg-white border border-[#d3d6db] hover:border-[#14293a] px-2 py-0.5 rounded-full text-[#14293a] transition-colors cursor-pointer"
          >
            <MapPin className="w-2.5 h-2.5 text-[#b91c1c]" />
            <span>{pincode ? `Deliver to: ${pincode}${boltCity ? ` (${boltCity})` : ''}` : (announcement?.link_text || 'Select Delivery PIN')}</span>
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* TIER 2: PRIMARY HEADER (LOGO, CENTERED SEARCH, ACTIONS)   */}
      {/* ========================================================= */}
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4 sm:gap-6">
        {/* Left: Mobile Hamburger & Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-1.5 -ml-1.5 text-[#14293a] hover:bg-[#f1f1f1] rounded transition-colors"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          <Link href="/" className="flex flex-col group">
            <span className="font-sans text-2xl sm:text-3xl font-black tracking-tight text-[#14293a] group-hover:text-[#b91c1c] transition-colors leading-none">
              MAISON TG
            </span>
            <span className="text-[9px] font-sans tracking-[0.25em] uppercase text-[#6c7079] mt-0.5 font-semibold">
              ONLINE STORE
            </span>
          </Link>
        </div>

        {/* Center: Balanced Proportionate Search Bar (Clicking opens native SearchModal) */}
        <div className="hidden md:flex flex-1 max-w-md mx-4 lg:mx-8">
          <button
            type="button"
            onClick={() => setIsSearchModalOpen(true)}
            className="w-full flex items-center bg-[#f8f8f8] hover:bg-white border border-[#d3d6db] hover:border-[#14293a] rounded-sm px-3.5 py-2 text-xs text-[#6c7079] hover:text-[#14293a] transition-all shadow-2xs group cursor-pointer text-left"
            aria-label="Search products"
          >
            <Search className="w-4 h-4 text-[#6c7079] group-hover:text-[#14293a] mr-2.5 shrink-0 transition-colors" />
            <span className="font-sans text-xs text-[#8a909a] group-hover:text-[#6c7079] transition-colors">
              Search for hoodies, t-shirts, jackets, denim...
            </span>
          </button>
        </div>

        {/* Right Utility Group (Bolt Badge, Account, Wishlist, Cart) */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* Mobile search trigger button */}
          <button
            type="button"
            onClick={() => setIsSearchModalOpen(true)}
            className="md:hidden p-2 text-[#14293a] hover:bg-[#f1f1f1] rounded-sm transition-colors cursor-pointer"
            aria-label="Search products"
          >
            <Search className="w-5 h-5 text-[#14293a]" />
          </button>

          {/* Bolt Try-On Service Pill (Single sleek branded badge, zero clunky toggle) */}
          <Link
            href="/bolt"
            className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border ${
              isBoltPage
                ? 'bg-[#14293a] text-white border-[#14293a] shadow-xs'
                : 'border-[#b91c1c] text-[#b91c1c] hover:bg-[#b91c1c] hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Bolt Try-On</span>
          </Link>

          {/* Account dropdown */}
          <div className="relative" ref={userDropdownRef}>
            {userEmail ? (
              <div>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-1.5 text-xs font-sans font-medium text-[#14293a] hover:text-[#b91c1c] transition-colors py-1 cursor-pointer"
                >
                  <User className="w-4 h-4 text-[#6c7079]" />
                  <span className="hidden sm:inline max-w-[120px] truncate">{userName || 'Account'}</span>
                  <ChevronDown className="w-3 h-3 text-[#6c7079]" />
                </button>

                <AnimatePresence>
                  {userDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="absolute right-0 mt-2 w-52 bg-white border border-[#d3d6db] shadow-xl rounded-sm py-2 z-50 text-xs font-sans"
                    >
                      <div className="px-4 py-2 border-b border-[#e5e7eb]">
                        <p className="font-semibold text-[#14293a] truncate">{userName || 'Account'}</p>
                        <p className="text-[11px] text-[#6c7079] truncate">{userEmail}</p>
                      </div>
                      <Link
                        href="/orders"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-[#14293a] hover:bg-[#f8f8f8] transition-colors"
                      >
                        <Package className="w-3.5 h-3.5 text-[#6c7079]" />
                        <span>My Orders</span>
                      </Link>
                      <Link
                        href="/wishlist"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center justify-between px-4 py-2 text-[#14293a] hover:bg-[#f8f8f8] transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Heart className="w-3.5 h-3.5 text-[#6c7079]" />
                          <span>My Wishlist</span>
                        </div>
                        {wishlistCount > 0 && (
                          <span className="text-[10px] font-bold bg-[#f1f1f1] text-[#14293a] px-1.5 py-0.5 rounded-full">
                            {wishlistCount}
                          </span>
                        )}
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false)
                          setIsPincodeModalOpen(true)
                        }}
                        className="w-full flex items-center justify-between px-4 py-2 text-[#14293a] hover:bg-[#f8f8f8] transition-colors cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <MapPin className="w-3.5 h-3.5 text-[#6c7079] shrink-0" />
                          <span className="truncate">
                            {pincode ? `PIN: ${pincode}` : 'Delivery Pincode'}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#14293a] font-bold underline ml-1 shrink-0">
                          {pincode ? 'Change' : 'Set'}
                        </span>
                      </button>
                      <div className="border-t border-[#e5e7eb] my-1" />
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-4 py-2 text-left text-[#b91c1c] hover:bg-[#fef2f2] transition-colors cursor-pointer font-medium"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 text-xs font-sans font-semibold text-[#14293a] hover:text-[#b91c1c] transition-colors py-1"
              >
                <User className="w-4 h-4 text-[#6c7079]" />
                <span className="hidden sm:inline">Sign In / Join</span>
              </Link>
            )}
          </div>

          {/* Wishlist Icon & Badge */}
          <Link
            href="/wishlist"
            className="flex items-center gap-1 text-[#14293a] hover:text-[#b91c1c] transition-colors py-1 relative"
            aria-label="Wishlist"
          >
            <div className="relative">
              <Heart className="w-5 h-5" />
              {wishlistCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-[#b91c1c] text-white font-sans text-[10px] font-bold h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center leading-none">
                  {wishlistCount}
                </span>
              )}
            </div>
            <span className="hidden md:inline font-sans text-xs font-semibold ml-1">Wishlist</span>
          </Link>

          {/* Cart Icon & Badge */}
          <Link
            href="/cart"
            className="flex items-center gap-1 text-[#14293a] hover:text-[#b91c1c] transition-colors py-1 relative"
            aria-label="Shopping Cart"
          >
            <div className="relative">
              <ShoppingBag className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-[#b91c1c] text-white font-sans text-[10px] font-bold h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center leading-none">
                  {itemCount}
                </span>
              )}
            </div>
            <span className="hidden md:inline font-sans text-xs font-semibold ml-1">Cart</span>
          </Link>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TIER 3: DEDICATED CATEGORY BAR (MENUS ONLY)               */}
      {/* ========================================================= */}
      <nav
        ref={categoryNavRef}
        className="hidden lg:block border-t border-[#e5e7eb] bg-white relative w-full max-w-full overflow-x-clip"
        onMouseLeave={handleMouseLeaveMenu}
      >
        <div className="relative max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8">
          {/* Left Navigation Chevron Button & Fade Mask */}
          {canScrollLeft && (
            <div className="absolute left-0 top-0 bottom-0 z-20 flex items-center pr-4 pl-1 bg-gradient-to-r from-white via-white/95 to-transparent">
              <button
                type="button"
                onClick={() => scrollCategoryTrack('left')}
                className="w-6 h-6 rounded-full bg-white border border-[#d3d6db] shadow-xs flex items-center justify-center text-[#14293a] hover:text-[#b91c1c] hover:border-[#14293a] transition-all cursor-pointer"
                aria-label="Scroll navigation left"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Scrollable Category Track */}
          <ul
            ref={categoryScrollRef}
            onWheel={(e) => {
              const el = categoryScrollRef.current
              if (el && el.scrollWidth > el.clientWidth && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                el.scrollLeft += e.deltaY
              }
            }}
            className="flex items-center justify-start gap-6 sm:gap-8 overflow-x-auto scroll-smooth scrollbar-none py-0 select-none min-w-0"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {/* Item 1: NEW ARRIVALS */}
            <li
              onMouseEnter={() => handleMouseEnterMenu('new-arrivals')}
              className="relative shrink-0"
            >
              <button
                type="button"
                onClick={() => {
                  setActiveMegaMenu((prev) => (prev === 'new-arrivals' ? null : 'new-arrivals'))
                }}
                className={`inline-flex items-center gap-1.5 py-3 text-xs font-sans font-bold tracking-wider uppercase whitespace-nowrap transition-colors border-b-2 cursor-pointer ${
                  activeMegaMenu === 'new-arrivals'
                    ? 'text-[#b91c1c] border-[#b91c1c]'
                    : 'text-[#14293a] border-transparent hover:text-[#b91c1c] hover:border-[#b91c1c]'
                }`}
                aria-expanded={activeMegaMenu === 'new-arrivals'}
                aria-haspopup="true"
              >
                <span>NEW ARRIVALS</span>
                <span className="text-[9px] px-1.5 py-0.2 bg-[#b91c1c] text-white rounded font-sans tracking-tight">
                  NEW
                </span>
                <ChevronDown
                  className={`w-3 h-3 text-[#6c7079] transition-transform duration-200 ${
                    activeMegaMenu === 'new-arrivals' ? 'rotate-180 text-[#b91c1c]' : ''
                  }`}
                />
              </button>
            </li>

            {/* Item 2: OCCASIONS (Dynamic Multi-Category Groupings) */}
            {occasions.length > 0 && (
              <li
                onMouseEnter={() => handleMouseEnterMenu('occasions')}
                className="relative shrink-0"
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveMegaMenu((prev) => (prev === 'occasions' ? null : 'occasions'))
                  }}
                  className={`inline-flex items-center gap-1.5 py-3 text-xs font-sans font-bold tracking-wider uppercase whitespace-nowrap transition-colors border-b-2 cursor-pointer ${
                    activeMegaMenu === 'occasions'
                      ? 'text-[#b91c1c] border-[#b91c1c]'
                      : 'text-[#14293a] border-transparent hover:text-[#b91c1c] hover:border-[#b91c1c]'
                  }`}
                  aria-expanded={activeMegaMenu === 'occasions'}
                  aria-haspopup="true"
                >
                  <span>OCCASIONS</span>
                  <ChevronDown
                    className={`w-3 h-3 text-[#6c7079] transition-transform duration-200 ${
                      activeMegaMenu === 'occasions' ? 'rotate-180 text-[#b91c1c]' : ''
                    }`}
                  />
                </button>
              </li>
            )}

            {/* Dynamic Parent Categories */}
            {parentCategories.map((cat) => {
              const children = subcategoriesMap[cat.id] || []
              const hasChildren = children.length > 0
              const isActive = activeMegaMenu === cat.id

              return (
                <li
                  key={cat.id}
                  onMouseEnter={() => {
                    if (hasChildren) {
                      handleMouseEnterMenu(cat.id)
                    } else {
                      setActiveMegaMenu(null)
                    }
                  }}
                  className="relative shrink-0"
                >
                  <Link
                    href={`/shop?category=${encodeURIComponent(cat.slug || cat.name)}`}
                    className={`inline-flex items-center gap-1 py-3 text-xs font-sans font-bold tracking-wider uppercase whitespace-nowrap transition-colors border-b-2 ${
                      isActive
                        ? 'text-[#b91c1c] border-[#b91c1c]'
                        : 'text-[#14293a] border-transparent hover:text-[#b91c1c] hover:border-[#b91c1c]'
                    }`}
                  >
                    <span>{cat.name}</span>
                    {hasChildren && <ChevronDown className="w-3 h-3 text-[#6c7079]" />}
                  </Link>
                </li>
              )
            })}
          </ul>

          {/* Right Navigation Chevron Button & Fade Mask */}
          {canScrollRight && (
            <div className="absolute right-0 top-0 bottom-0 z-20 flex items-center pl-4 pr-1 bg-gradient-to-l from-white via-white/95 to-transparent">
              <button
                type="button"
                onClick={() => scrollCategoryTrack('right')}
                className="w-6 h-6 rounded-full bg-white border border-[#d3d6db] shadow-xs flex items-center justify-center text-[#14293a] hover:text-[#b91c1c] hover:border-[#14293a] transition-all cursor-pointer"
                aria-label="Scroll navigation right"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Anchored Luxury Split Popover for NEW ARRIVALS */}
        <AnimatePresence>
          {activeMegaMenu === 'new-arrivals' && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              className="absolute left-4 sm:left-6 lg:left-8 top-full mt-0 w-[560px] max-w-[calc(100vw-2rem)] bg-white border border-[#d3d6db] shadow-2xl rounded-b-sm z-50 p-5 text-left font-sans"
              onMouseEnter={() => {
                if (megaMenuTimeoutRef.current) clearTimeout(megaMenuTimeoutRef.current)
              }}
              onMouseLeave={handleMouseLeaveMenu}
            >
              <div className="grid grid-cols-12 gap-5 divide-x divide-[#e5e7eb]">
                {/* Left Column (5 cols, ~210px): Curated Fast Links & Category Filter */}
                <div className="col-span-5 pr-2 space-y-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#6c7079] block mb-2">
                      New Releases
                    </span>
                    <div className="space-y-1.5">
                      <Link
                        href="/shop?sort=newest"
                        onClick={() => setActiveMegaMenu(null)}
                        className="flex items-center justify-between p-2 rounded-xs bg-[#f8f8f8] hover:bg-[#14293a] text-[#14293a] hover:text-white transition-all group font-bold text-xs"
                      >
                        <span>View All New In</span>
                        <ArrowRight className="w-3.5 h-3.5 text-[#6c7079] group-hover:text-white group-hover:translate-x-0.5 transition-transform" />
                      </Link>

                      <Link
                        href="/bolt"
                        onClick={() => setActiveMegaMenu(null)}
                        className="flex items-center justify-between p-2 rounded-xs border border-[#b91c1c]/20 hover:border-[#b91c1c] bg-[#fef2f2]/40 hover:bg-[#b91c1c] text-[#b91c1c] hover:text-white transition-all group font-semibold text-xs"
                      >
                        <div className="flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 fill-current" />
                          <span>Bolt Try-On Drops</span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-tight opacity-75">
                          45-MIN
                        </span>
                      </Link>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#e5e7eb]">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#6c7079] block mb-2">
                      Shop by Category
                    </span>
                    <ul className="space-y-1">
                      {parentCategories.map((cat) => (
                        <li key={cat.id}>
                          <Link
                            href={`/shop?category=${encodeURIComponent(cat.slug || cat.name)}&sort=newest`}
                            onClick={() => setActiveMegaMenu(null)}
                            className="flex items-center justify-between py-1 px-1.5 rounded-xs text-xs text-[#14293a] hover:text-[#b91c1c] hover:bg-[#f8f8f8] transition-colors"
                          >
                            <span className="font-medium truncate">{cat.name}</span>
                            <span className="text-[10px] text-[#8a909a] font-normal">New</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Right Column (7 cols, ~310px): Live Product Drop Preview */}
                <div className="col-span-7 pl-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#6c7079]">
                        Just Dropped
                      </span>
                      <span className="text-[10px] font-semibold text-[#b91c1c] uppercase tracking-wider">
                        Latest Inventory
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {latestProducts.slice(0, 2).map((product) => (
                        <Link
                          key={product.id}
                          href={`/products/${product.id}`}
                          onClick={() => setActiveMegaMenu(null)}
                          className="group block border border-[#e5e7eb] hover:border-[#14293a] rounded-xs p-2 bg-[#f8f8f8]/50 hover:bg-white transition-all shadow-2xs"
                        >
                          <div className="relative aspect-3/4 bg-[#eceff1] rounded-xs overflow-hidden mb-2">
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-[#8a909a]">
                                No Image
                              </div>
                            )}
                            <span className="absolute top-1 left-1 bg-[#14293a] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-xs tracking-tight">
                              NEW
                            </span>
                          </div>
                          <h4 className="text-xs font-semibold text-[#14293a] group-hover:text-[#b91c1c] transition-colors line-clamp-1 leading-snug">
                            {product.title}
                          </h4>
                          <p className="text-xs font-bold text-[#14293a] mt-0.5">
                            ₹{product.price.toLocaleString('en-IN')}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-[#e5e7eb] flex items-center justify-end">
                    <Link
                      href="/shop?sort=newest"
                      onClick={() => setActiveMegaMenu(null)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#b91c1c] hover:underline"
                    >
                      <span>Explore Entire New Drop</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Occasions Mega-Menu Flyout */}
        <div
          className={`absolute left-0 right-0 top-full bg-white border-t border-b border-[#d3d6db] shadow-2xl z-40 transition-all duration-150 ease-out ${
            activeMegaMenu === 'occasions' && occasions.length > 0
              ? 'opacity-100 translate-y-0 pointer-events-auto visible'
              : 'opacity-0 translate-y-1 pointer-events-none invisible'
          }`}
          onMouseEnter={() => {
            if (megaMenuTimeoutRef.current) clearTimeout(megaMenuTimeoutRef.current)
          }}
          onMouseLeave={handleMouseLeaveMenu}
        >
          {activeMegaMenu === 'occasions' && occasions.length > 0 && (
            <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="flex items-center justify-between pb-3 mb-5 border-b border-[#e5e7eb]">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#14293a]">
                    Shop by Occasion & Lifestyle Edits
                  </h3>
                  <p className="text-xs text-[#6c7079] mt-0.5">
                    Curated apparel groupings tailored for weddings, festivals, resort travel, and everyday wear.
                  </p>
                </div>
                <Link
                  href="/shop"
                  onClick={() => setActiveMegaMenu(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#b91c1c] hover:underline"
                >
                  <span>Explore All Curations</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {occasions.map((occ) => (
                  <Link
                    key={occ.id}
                    href={`/shop?collection=${encodeURIComponent(occ.slug)}`}
                    onClick={() => setActiveMegaMenu(null)}
                    className="group flex flex-col bg-[#fbfbfb] border border-[#e5e7eb] hover:border-[#14293a] transition-all duration-200 overflow-hidden"
                  >
                    <div className="relative aspect-[16/10] bg-[#f0f0f0] overflow-hidden">
                      {occ.image_url ? (
                        <Image
                          src={occ.image_url}
                          alt={occ.name}
                          fill
                          unoptimized
                          className="object-cover group-hover:scale-104 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-[#8a909a]">
                          No Image
                        </div>
                      )}
                      <span className="absolute top-2 left-2 bg-[#14293a]/90 text-white text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5">
                        {occ.group_type}
                      </span>
                    </div>
                    <div className="p-3">
                      <h4 className="text-xs font-bold text-[#14293a] group-hover:text-[#b91c1c] transition-colors line-clamp-1">
                        {occ.name}
                      </h4>
                      {occ.description && (
                        <p className="text-[11px] text-[#6c7079] line-clamp-1 mt-0.5">
                          {occ.description}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Fast CSS Hover Mega-Menu Flyouts (Zero AnimatePresence overhead) */}
        {(() => {
          const activeParent = parentCategories.find((c) => c.id === activeMegaMenu)
          const children = activeParent ? subcategoriesMap[activeParent.id] || [] : []
          const isVisible = Boolean(activeParent && children.length > 0)

          return (
            <div
              className={`absolute left-0 right-0 top-full bg-white border-t border-b border-[#d3d6db] shadow-2xl z-40 transition-all duration-150 ease-out ${
                isVisible
                  ? 'opacity-100 translate-y-0 pointer-events-auto visible'
                  : 'opacity-0 translate-y-1 pointer-events-none invisible'
              }`}
              onMouseEnter={() => {
                if (megaMenuTimeoutRef.current) clearTimeout(megaMenuTimeoutRef.current)
              }}
              onMouseLeave={handleMouseLeaveMenu}
            >
              {activeParent && children.length > 0 && (
                <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
                  {/* Category Header Strip */}
                  <div className="flex items-center justify-between pb-3 mb-5 border-b border-[#e5e7eb]">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-[#14293a]">
                        {activeParent.name}
                      </h3>
                      {activeParent.description && (
                        <p className="text-xs text-[#6c7079] mt-0.5 line-clamp-1">
                          {activeParent.description}
                        </p>
                      )}
                    </div>
                    <Link
                      href={`/shop?category=${encodeURIComponent(activeParent.slug || activeParent.name)}`}
                      onClick={() => setActiveMegaMenu(null)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#b91c1c] hover:underline"
                    >
                      <span>View All {activeParent.name}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Subcategories Grid with Images */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {children.map((child) => {
                      const cardImg =
                        child.image_url ||
                        activeParent.image_url ||
                        'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=85'

                      return (
                        <Link
                          key={child.id}
                          href={`/shop?category=${encodeURIComponent(child.slug || child.name)}`}
                          onClick={() => setActiveMegaMenu(null)}
                          className="group block bg-white border border-[#e5e7eb] hover:border-[#14293a] rounded-xs overflow-hidden transition-all shadow-2xs hover:shadow-md"
                        >
                          <div className="relative aspect-[4/5] bg-[#f8f8f8] overflow-hidden">
                            <img
                              src={cardImg}
                              alt={child.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          </div>
                          <div className="p-3">
                            <span className="text-xs font-bold text-[#14293a] group-hover:text-[#b91c1c] transition-colors block line-clamp-1">
                              {child.name}
                            </span>
                            {child.description && (
                              <span className="text-[10px] text-[#6c7079] line-clamp-1 block mt-0.5 font-normal">
                                {child.description}
                              </span>
                            )}
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })()}
      </nav>

      {/* ========================================================= */}
      {/* MOBILE ACCORDION DRAWER                                  */}
      {/* ========================================================= */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="w-4/5 max-w-sm h-full bg-white shadow-2xl flex flex-col text-[#14293a]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div className="p-4 border-b border-[#e5e7eb] flex items-center justify-between">
                <div>
                  <span className="font-sans text-xl font-black tracking-tight text-[#14293a] block">
                    MAISON TG
                  </span>
                  <span className="text-[9px] uppercase tracking-widest text-[#6c7079]">
                    Online Store
                  </span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-[#6c7079] hover:text-[#14293a] rounded"
                  aria-label="Close Menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Search Trigger Button */}
              <div className="p-4 border-b border-[#e5e7eb]">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    setIsSearchModalOpen(true)
                  }}
                  className="w-full flex items-center bg-[#f8f8f8] hover:bg-[#f1f1f1] border border-[#d3d6db] text-xs px-3 py-2 text-[#6c7079] rounded-sm gap-2 text-left transition-colors cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5 text-[#6c7079]" />
                  <span>Search for hoodies, t-shirts, jackets, denim...</span>
                </button>
              </div>

              {/* Mobile Bolt Try-On Service Link */}
              <div className="p-3 bg-[#f8f8f8] border-b border-[#e5e7eb]">
                <Link
                  href="/bolt"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`w-full py-2.5 px-3 rounded-sm text-xs font-bold uppercase tracking-wider flex items-center justify-between transition-colors border ${
                    isBoltPage
                      ? 'bg-[#14293a] text-white border-[#14293a]'
                      : 'bg-white border-[#b91c1c] text-[#b91c1c] hover:bg-[#b91c1c] hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>Bolt 45-Min Try-On</span>
                  </span>
                  <span className="text-[10px] font-normal uppercase opacity-75">
                    {isBoltPage ? 'Active Mode' : 'Explore Service →'}
                  </span>
                </Link>
              </div>

              {/* Category Links */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="space-y-1">
                  {/* New Arrivals Link */}
                  <Link
                    href="/shop?sort=newest"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between py-2.5 px-3 rounded-sm text-xs font-sans font-bold uppercase tracking-wider text-[#14293a] hover:bg-[#f8f8f8] hover:text-[#b91c1c] transition-colors"
                  >
                    <span>New Arrivals</span>
                    <span className="text-[9px] px-1.5 py-0.5 bg-[#b91c1c] text-white rounded font-sans">
                      NEW
                    </span>
                  </Link>

                  {/* Dynamic Parent Categories & Subcategories */}
                  {parentCategories.map((cat) => {
                    const children = subcategoriesMap[cat.id] || []
                    const hasChildren = children.length > 0
                    const isExpanded = expandedMobileCategory === cat.id

                    return (
                      <div key={cat.id} className="border-b border-[#f1f1f1] last:border-b-0">
                        <div className="flex items-center justify-between">
                          <Link
                            href={`/shop?category=${encodeURIComponent(cat.slug || cat.name)}`}
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex-1 py-2.5 px-3 rounded-sm text-xs font-sans font-bold uppercase tracking-wider text-[#14293a] hover:bg-[#f8f8f8] hover:text-[#b91c1c] transition-colors"
                          >
                            {cat.name}
                          </Link>
                          {hasChildren && (
                            <button
                              type="button"
                              onClick={() => setExpandedMobileCategory(isExpanded ? null : cat.id)}
                              className="p-2.5 text-[#6c7079] hover:text-[#14293a]"
                              aria-label={`Toggle ${cat.name} subcategories`}
                            >
                              <ChevronDown
                                className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              />
                            </button>
                          )}
                        </div>

                        {hasChildren && isExpanded && (
                          <div className="pl-3 pr-3 pb-3 space-y-1.5 bg-[#fcfcfc] border-t border-[#f1f1f1]">
                            <Link
                              href={`/shop?category=${encodeURIComponent(cat.slug || cat.name)}`}
                              onClick={() => setMobileMenuOpen(false)}
                              className="block py-2 px-3 text-xs font-bold text-[#b91c1c] hover:underline"
                            >
                              View All {cat.name} →
                            </Link>
                            {children.map((child) => {
                              const thumbImg =
                                child.image_url ||
                                cat.image_url ||
                                'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=300&q=80'

                              return (
                                <Link
                                  key={child.id}
                                  href={`/shop?category=${encodeURIComponent(child.slug || child.name)}`}
                                  onClick={() => setMobileMenuOpen(false)}
                                  className="flex items-center gap-2.5 p-1.5 rounded bg-white border border-[#e5e7eb] hover:border-[#14293a] text-xs text-[#14293a] transition-colors"
                                >
                                  <div className="w-9 h-9 relative bg-[#f1f1f1] rounded-xs overflow-hidden shrink-0">
                                    <img
                                      src={thumbImg}
                                      alt={child.name}
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <span className="font-semibold block truncate">{child.name}</span>
                                    {child.description && (
                                      <span className="text-[10px] text-[#6c7079] block truncate font-normal">
                                        {child.description}
                                      </span>
                                    )}
                                  </div>
                                </Link>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="border-t border-[#e5e7eb] pt-4 space-y-2 text-xs font-sans">
                  <Link
                    href="/about"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-2 px-3 text-[#6c7079] hover:text-[#14293a]"
                  >
                    About Us
                  </Link>
                  <Link
                    href="/orders"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-2 px-3 text-[#6c7079] hover:text-[#14293a]"
                  >
                    My Orders
                  </Link>
                  <Link
                    href="/wishlist"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between py-2 px-3 text-[#6c7079] hover:text-[#14293a]"
                  >
                    <span className="flex items-center gap-2">
                      <Heart className="w-3.5 h-3.5" />
                      <span>My Wishlist</span>
                    </span>
                    {wishlistCount > 0 && (
                      <span className="text-[10px] font-bold bg-[#b91c1c] text-white px-1.5 py-0.2 rounded-full">
                        {wishlistCount}
                      </span>
                    )}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false)
                      setIsPincodeModalOpen(true)
                    }}
                    className="w-full flex items-center justify-between py-2 px-3 text-[#6c7079] hover:text-[#14293a] text-left cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{pincode ? `Delivery PIN: ${pincode}` : 'Select Delivery PIN'}</span>
                    </span>
                    <span className="text-[10px] text-[#14293a] font-bold underline">
                      {pincode ? 'Change' : 'Set'}
                    </span>
                  </button>
                  {userEmail ? (
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left py-2 px-3 text-[#b91c1c] font-semibold cursor-pointer"
                    >
                      Sign Out ({userEmail})
                    </button>
                  ) : (
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block py-2 px-3 text-[#b91c1c] font-bold"
                    >
                      Sign In / Register
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Delivery Pincode Modal */}
      <PincodeModal
        isOpen={isPincodeModalOpen}
        onClose={() => setIsPincodeModalOpen(false)}
      />

      {/* Global Search Pop-up Modal (Native <dialog>) */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        categories={categories}
      />
    </header>
  )
}
