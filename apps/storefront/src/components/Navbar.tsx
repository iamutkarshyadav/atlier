'use client'

import React, { useState, useEffect, useRef } from 'react'
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
} from 'lucide-react'
import { useHydratedCart } from '../store/useCartStore'
import { useHydratedBolt } from '../store/useBoltStore'
import { createBrowserClient } from '@repo/supabase/browser'

function formatNameFromEmail(email: string): string {
  const localPart = email.split('@')[0] || 'Gentleman'
  return localPart
    .split(/[._-]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

export function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const isHome = pathname === '/'

  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [isMenuHovered, setIsMenuHovered] = useState(false)
  const [hoveredNavIndex, setHoveredNavIndex] = useState<number>(0)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const { itemCount } = useHydratedCart()
  const { city: boltCity } = useHydratedBolt()

  // Lock body scroll when full-screen menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  // Track scroll position for subtle backdrop when scrolling past hero
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Auto focus search input when search modal opens
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [searchOpen])

  // Handle escape key to close menu or search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        setSearchOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // One-time cleanup of legacy un-namespaced auth cookies on localhost so storefront stays in clean patron/guest state
  useEffect(() => {
    if (typeof document !== 'undefined') {
      try {
        const cookies = document.cookie.split(';')
        for (const c of cookies) {
          const cookieName = c.split('=')[0].trim()
          if (
            cookieName.startsWith('sb-aavyohkylcguhrmblrcx') ||
            cookieName.startsWith('sb-admin-session')
          ) {
            document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
            if (window.location.hostname) {
              document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=${window.location.hostname}`
            }
          }
        }
      } catch {}
    }
  }, [])

  // Resolve user session
  useEffect(() => {
    const supabase = createBrowserClient()

    async function resolveUserProfile(authUser: any) {
      if (!authUser) {
        setUserEmail(null)
        setUserName(null)
        return
      }

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
      setUserEmail(null)
      setUserName(null)
      setMenuOpen(false)
      router.refresh()
    } catch {
      // Continue
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    router.push(`/shop?category=${encodeURIComponent(searchQuery.trim())}`)
    setSearchOpen(false)
    setSearchQuery('')
  }

  // Live cart count
  const displayCartBadge = itemCount

  const navItems = [
    {
      num: '01',
      label: 'The Atelier Home',
      href: '/',
      subtitle: 'Flagship split-screen architecture & maison identity',
      image: '/images/hero-woman.jpg',
      tagline: 'HAUTE COUTURE SILHOUETTE',
      provenance: 'Single-origin unbleached silk & bespoke tailoring',
    },
    {
      num: '02',
      label: 'Shop Collections',
      href: '/shop',
      subtitle: 'Limited 480 GSM loopback cotton & creator apparel',
      image: '/images/prod1-primary.jpg',
      tagline: 'PERMANENT COLLECTION',
      provenance: '480 GSM Loopback French Terry, Kojima raw selvedge',
    },
    {
      num: '03',
      label: 'Couture & Tailoring',
      href: '/shop?category=Outerwear+%26+Jackets',
      subtitle: 'Architectural outerwear & structured cuts',
      image: '/images/hero-gentleman.jpg',
      tagline: 'BESPOKE PATRON ATELIER',
      provenance: 'Brutalist silhouette, zero synthetic blending',
    },
    {
      num: '04',
      label: 'Bolt ⚡ Try-On Salon',
      href: '/shop?try_on=true',
      subtitle: '45-minute white-glove doorstep private fitting',
      image: '/images/auth-editorial.jpg',
      tagline: 'DOORSTEP FITTING PROTOCOL',
      provenance: 'Available in Bengaluru, Mumbai, Delhi NCR & Hyderabad',
    },
    {
      num: '05',
      label: 'About Us',
      href: '/about',
      subtitle: 'Wakayama loopwheel & Kojima shuttle looms',
      image: '/images/prod3-macro.jpg',
      tagline: 'HONEST TEXTILE MONOLITH',
      provenance: 'Preserving vintage slow-spinning circular loom traditions',
    },
    {
      num: '06',
      label: 'Shopping Bag',
      href: '/cart',
      subtitle: `${itemCount} curated garment${itemCount === 1 ? '' : 's'} reserved in bag`,
      badge: itemCount > 0 ? itemCount : undefined,
      image: '/images/prod2-primary.jpg',
      tagline: 'CLIENT FITTING MANIFEST',
      provenance: 'Insured trial dispatch & instant courier hand-off',
    },
    ...(userName
      ? [
          {
            num: '07',
            label: 'Patron Orders',
            href: '/orders',
            subtitle: 'Live dispatch radar & salon settlements',
            image: '/images/prod3-profile.jpg',
            tagline: 'REAL-TIME COURIER RADAR',
            provenance: 'Synchronized live with metropolitan fulfillment salons',
          },
        ]
      : []),
  ]

  const activeItem = navItems[hoveredNavIndex] || navItems[0]!

  return (
    <>
      {/* ========================================================= */}
      {/* SOVEREIGN TOP NAVBAR: FIXED ON HOME, STICKY ON INNER PAGES */}
      {/* ========================================================= */}
      <header
        className={`sovereign-navbar ${
          isHome ? 'fixed top-0 left-0 right-0' : 'sticky top-0'
        } z-50 transition-all duration-300 ${
          scrolled ? 'py-2.5 sm:py-3 shadow-md' : 'py-3 sm:py-3.5 shadow-sm'
        }`}
      >
        <div className="w-full px-5 sm:px-8 lg:px-12 flex items-center justify-between">
          {/* Left: Elegant Script "Tg" Marque & Title */}
          <Link
            href="/"
            className="group flex items-center gap-2.5 sm:gap-3 select-none cursor-pointer"
            aria-label="Tg • The Grace Atelier Home"
          >
            <span className="font-script text-3xl sm:text-4xl lg:text-[40px] navbar-brand-text font-normal tracking-wide transition-opacity group-hover:opacity-85 leading-none">
              Tg
            </span>
            <div className="flex flex-col border-l border-neutral-300 dark:border-white/15 pl-2.5 sm:pl-3">
              <span className="font-sans font-extrabold text-[10px] sm:text-[11px] uppercase tracking-[0.28em] navbar-brand-text leading-tight">
                THE GRACE ATELIER
              </span>
              <span className="font-mono text-[8px] sm:text-[9px] uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400 leading-tight">
                MAISON HAUTE COUTURE
              </span>
            </div>
          </Link>

          {/* Center: Haute Couture Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-7 xl:gap-9 font-sans text-[11px] uppercase tracking-[0.22em] font-bold">
            <Link
              href="/shop"
              className="navbar-link transition-colors cursor-pointer py-1 hover:text-[#B91C1C] dark:hover:text-red-400"
            >
              Collections
            </Link>
            <Link
              href="/shop?category=Outerwear+%26+Jackets"
              className="navbar-link transition-colors cursor-pointer py-1 hover:text-[#B91C1C] dark:hover:text-red-400"
            >
              Couture
            </Link>
            <Link
              href="/shop?try_on=true"
              className="navbar-link transition-colors cursor-pointer py-1 flex items-center gap-1.5 hover:text-amber-500"
            >
              <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span>Bolt ⚡ Try-On</span>
            </Link>
            <Link
              href="/about"
              className="navbar-link transition-colors cursor-pointer py-1 hover:text-[#B91C1C] dark:hover:text-red-400"
            >
              About Us
            </Link>
          </nav>

          {/* Right: Cart, Search, and Bespoke Asymmetric Hamburger Menu */}
          <div className="flex items-center gap-2.5 sm:gap-4">

            {/* 1. Shopping Cart Icon with Live Badge */}
            <Link
              href="/cart"
              className="navbar-icon-btn relative p-1.5 transition-colors cursor-pointer"
              aria-label="Shopping Cart"
            >
              <ShoppingBag className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[1.8]" />
              {displayCartBadge > 0 && (
                <span className="absolute -top-1 -right-1.5 bg-[#B91C1C] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none shadow-md">
                  {displayCartBadge}
                </span>
              )}
            </Link>

            {/* 2. Search Icon */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="navbar-icon-btn p-1.5 transition-colors cursor-pointer"
              aria-label="Search Collection"
            >
              <Search className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[1.8]" />
            </button>

            {/* 3. Bespoke Asymmetric Morphing Menu Button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              onMouseEnter={() => setIsMenuHovered(true)}
              onMouseLeave={() => setIsMenuHovered(false)}
              className="navbar-icon-btn p-2 transition-colors cursor-pointer relative w-9 h-9 flex flex-col justify-center items-end gap-1.5 group"
              aria-label={menuOpen ? 'Close Menu' : 'Open Bespoke Menu'}
            >
              <span
                className={`navbar-hamburger-line h-[1.5px] transition-all duration-300 ease-out origin-center ${
                  menuOpen
                    ? 'w-6 rotate-45 translate-y-[4px] !bg-red-500'
                    : 'w-6 group-hover:!bg-red-500'
                }`}
              />
              <span
                className={`navbar-hamburger-line h-[1.5px] transition-all duration-300 ease-out origin-center ${
                  menuOpen
                    ? 'w-6 -rotate-45 -translate-y-[3.5px] !bg-red-500'
                    : isMenuHovered
                    ? 'w-6 !bg-red-500'
                    : 'w-4'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Dropdown / Inline Search Bar */}
        {searchOpen && (
          <div className="w-full px-6 sm:px-10 lg:px-14 py-3 bg-[#18181a]/95 backdrop-blur-md border-t border-b border-white/10 animate-in fade-in slide-in-from-top-2 duration-200">
            <form
              onSubmit={handleSearchSubmit}
              className="max-w-2xl mx-auto flex items-center gap-3"
            >
              <Search className="w-4 h-4 text-neutral-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search luxury atelier, suiting, selvedge denim, 480 GSM hoodies..."
                className="w-full bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none font-sans"
              />
              <button
                type="submit"
                style={{ color: '#ffffff', backgroundColor: '#09090b' }}
                className="btn-dark px-4 py-1.5 hover:bg-[#27272A] dark:hover:bg-[#4A4B50] text-xs font-mono font-semibold uppercase transition-colors shrink-0 rounded-none border border-neutral-700 dark:border-white/15 cursor-pointer shadow-sm"
              >
                <span style={{ color: '#ffffff' }}>Search</span>
              </button>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="text-neutral-400 hover:text-white p-1 cursor-pointer"
                aria-label="Close search"
              >
                <X className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </header>

      {/* ========================================================= */}
      {/* FULL-SCREEN HAUTE COUTURE ATELIER NAVIGATION OVERLAY      */}
      {/* ========================================================= */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 bg-[#FDFCF7] text-[#09090B] flex flex-col justify-between overflow-y-auto selection:bg-[#B91C1C] selection:text-white sovereign-fullscreen-menu"
          >
            {/* Top Bar: Quiet Editorial Authority */}
            <div className="w-full px-6 sm:px-12 py-5 sm:py-6 border-b border-[#E8E4DA] flex items-center justify-between">
              {/* Left Brand Marque */}
              <Link
                href="/"
                onClick={() => setMenuOpen(false)}
                className="group flex items-center gap-3 select-none cursor-pointer"
                aria-label="The Grace Atelier Home"
              >
                <span className="font-script text-3xl sm:text-4xl text-[#09090B] font-normal leading-none">
                  Tg
                </span>
                <div className="flex flex-col border-l border-[#E8E4DA] pl-3">
                  <span className="font-sans font-extrabold text-[10px] sm:text-[11px] uppercase tracking-[0.28em] text-[#09090B] leading-tight">
                    THE GRACE ATELIER
                  </span>
                  <span className="font-mono text-[8px] sm:text-[9px] uppercase tracking-[0.2em] text-[#71717A] leading-tight">
                    MAISON HAUTE COUTURE
                  </span>
                </div>
              </Link>

              {/* Center Season Badge */}
              <div className="hidden sm:inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.25em] text-[#71717A] bg-[#FAF8F2] px-4 py-1.5 border border-[#E8E4DA]">
                <span className="w-1.5 h-1.5 rounded-none bg-[#B91C1C]" />
                <span>AUTUMN / WINTER 2026 • ATELIER ARCHIVE</span>
              </div>

              {/* Right: Minimal Close Trigger with ESC indicator */}
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="group flex items-center gap-2 py-1.5 px-3 bg-[#FAF8F2] hover:bg-[#F2EFE8] border border-[#E8E4DA] transition-all cursor-pointer rounded-none"
                aria-label="Close Navigation"
              >
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717A] group-hover:text-[#09090B] hidden sm:inline">
                  ESC
                </span>
                <X className="w-4 h-4 text-[#09090B] transition-transform group-hover:rotate-90 duration-300" />
              </button>
            </div>

            {/* Central Dual-Zone Grid */}
            <div className="w-full max-w-7xl mx-auto px-6 sm:px-12 py-8 sm:py-12 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
              {/* Zone A: Interactive Lookbook Visual Canvas (Desktop Left 5 cols) */}
              <div className="hidden lg:flex lg:col-span-5 flex-col justify-center space-y-4">
                <div className="relative aspect-[3/4] w-full max-w-md bg-[#FAF8F2] border border-[#E8E4DA] overflow-hidden shadow-sm">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeItem.image}
                      initial={{ opacity: 0, scale: 1.05 }}
                      animate={{ opacity: 1, scale: 1.0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      className="relative w-full h-full"
                    >
                      <Image
                        src={activeItem.image}
                        alt={activeItem.label}
                        fill
                        priority
                        className="object-cover object-center filter grayscale contrast-110 brightness-95"
                      />
                      {/* Subtle Vignette Gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                      {/* Micro-Caption Box */}
                      <div className="absolute bottom-4 left-4 right-4 text-white font-mono space-y-1">
                        <span className="text-[9px] uppercase tracking-[0.25em] text-red-300 font-bold block">
                          {activeItem.tagline}
                        </span>
                        <p className="text-[11px] font-sans font-light text-neutral-200 leading-snug">
                          {activeItem.provenance}
                        </p>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-[#71717A] uppercase tracking-wider px-1">
                  <span>PERSPECTIVE INDEX // {activeItem.num}</span>
                  <span className="flex items-center gap-1.5 text-[#047857] font-semibold">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    LIVE CATALOGUE
                  </span>
                </div>
              </div>

              {/* Zone B: Haute Couture Navigation Stack (Right 7 cols) */}
              <nav className="lg:col-span-7 flex flex-col justify-center divide-y divide-[#E8E4DA]">
                {navItems.map((item, idx) => {
                  const isHovered = hoveredNavIndex === idx

                  return (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.04 * idx, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <Link
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        onMouseEnter={() => setHoveredNavIndex(idx)}
                        className="group flex items-center justify-between py-3.5 sm:py-4.5 transition-all cursor-pointer"
                      >
                        <div className="flex items-baseline gap-4 sm:gap-6">
                          {/* Number */}
                          <span className={`font-mono text-xs sm:text-sm font-bold transition-colors duration-200 ${
                            isHovered ? 'text-[#B91C1C]' : 'text-[#71717A]'
                          }`}>
                            {item.num}
                          </span>

                          {/* Titles Stack */}
                          <div className="space-y-0.5">
                            <span className={`font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold uppercase tracking-tight transition-all duration-300 block ${
                              isHovered
                                ? 'text-[#B91C1C] translate-x-2'
                                : 'text-[#09090B]'
                            }`}>
                              {item.label}
                            </span>
                            <span className="text-[10px] sm:text-[11px] font-mono text-[#71717A] uppercase tracking-wider block">
                              {item.subtitle}
                            </span>
                          </div>
                        </div>

                        {/* Trailing Indicator */}
                        <div className="flex items-center gap-2 pl-3">
                          {item.badge ? (
                            <span className="px-2.5 py-1 bg-[#09090B] text-white font-mono font-bold text-xs shadow-sm">
                              {item.badge}
                            </span>
                          ) : (
                            <ArrowRight className={`w-5 h-5 text-[#B91C1C] transition-all duration-300 ${
                              isHovered ? 'opacity-100 translate-x-1' : 'opacity-0 -translate-x-2'
                            }`} />
                          )}
                        </div>
                      </Link>
                    </motion.div>
                  )
                })}
              </nav>
            </div>

            {/* Bottom Bar: Patron Concierge Strip */}
            <footer className="w-full max-w-7xl mx-auto px-6 sm:px-12 py-5 border-t border-[#E8E4DA] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs font-mono">
              {userName ? (
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#FAF8F2] border border-[#E8E4DA] text-[#09090B] font-bold text-xs flex items-center justify-center">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-bold uppercase text-[#09090B] tracking-wider">{userName}</span>
                      {userEmail && (
                        <span className="text-[11px] text-[#71717A] ml-2 hidden sm:inline">({userEmail})</span>
                      )}
                    </div>
                    <span className="hidden md:inline-flex items-center gap-1.5 ml-4 px-2.5 py-0.5 bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-[10px] font-semibold">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      SALON ACTIVE: {boltCity ? boltCity.toUpperCase() : 'BENGALURU'}
                    </span>
                  </div>

                  <button
                    onClick={handleSignOut}
                    type="button"
                    className="text-[#B91C1C] hover:text-[#991B1B] hover:underline uppercase tracking-wider font-bold text-xs flex items-center gap-1.5 cursor-pointer py-1"
                  >
                    <span>Sign Out</span>
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-3">
                  <p className="text-[11px] text-[#71717A] font-mono">
                    Private bespoke reservations &amp; 45-minute white-glove doorstep salon sessions.
                  </p>
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="text-[#09090B] hover:text-[#B91C1C] hover:underline uppercase tracking-wider font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Sign In to Patron Account →</span>
                  </Link>
                </div>
              )}
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
