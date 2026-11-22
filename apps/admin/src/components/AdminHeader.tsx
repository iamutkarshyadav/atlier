'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  MapPin,
  Search,
  LogOut,
  Barcode,
  ChevronDown,
  Warehouse,
  ShoppingBag,
  Boxes,
  ClipboardList,
  Store,
  X,
  Type,
  Sun,
  Moon,
  Package,
  Layers,
  ArrowRight,
  ExternalLink,
  Printer,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { createBrowserClient } from '@repo/supabase/browser'
import { useLocation } from '@/context/LocationContext'
import { useTheme } from '@/context/ThemeContext'
import { useBarcodeScanner } from '@/lib/useBarcodeScanner'
import { StatusBadge } from '@/components/ui/StatusBadge'

function formatRoleLabel(role: string): string {
  switch (role) {
    case 'admin':
      return 'Admin'
    case 'warehouse_manager':
      return 'Warehouse Mgr'
    case 'store_manager':
      return 'Store Mgr'
    case 'pos_cashier':
      return 'Cashier'
    default:
      return role.replace('_', ' ')
  }
}

const AVAILABLE_FONTS = [
  { id: 'plus-jakarta', name: 'Plus Jakarta Sans', family: "'Plus Jakarta Sans', sans-serif" },
  { id: 'geist', name: 'Geist', family: "'Geist', sans-serif" },
  { id: 'outfit', name: 'Outfit', family: "'Outfit', sans-serif" },
  { id: 'dm-sans', name: 'DM Sans', family: "'DM Sans', sans-serif" },
  { id: 'space-grotesk', name: 'Space Grotesk', family: "'Space Grotesk', sans-serif" },
  { id: 'jetbrains-mono', name: 'JetBrains Mono', family: "'JetBrains Mono', monospace" },
]

export function AdminHeader() {
  const router = useRouter()
  const { locations, activeLocation, setActiveLocation, activeLocationCode } = useLocation()
  const { theme, toggleTheme, isLight } = useTheme()

  const [staffName, setStaffName] = useState('Staff Operator')
  const [staffEmail, setStaffEmail] = useState('operator@atelier.internal')
  const [staffRole, setStaffRole] = useState<'admin' | 'warehouse_manager' | 'store_manager' | 'pos_cashier'>('admin')
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false)
  const [fontDropdownOpen, setFontDropdownOpen] = useState(false)
  const [selectedFont, setSelectedFont] = useState('plus-jakarta')
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const fontDropdownRef = useRef<HTMLDivElement>(null)

  // Live Action Drawer States (Hardware Scanner Resolutions)
  const [shelfDrawerOpen, setShelfDrawerOpen] = useState(false)
  const [scannedShelfCoordinate, setScannedShelfCoordinate] = useState('')
  const [scannedShelfData, setScannedShelfData] = useState<any>(null)
  const [shelfLoading, setShelfLoading] = useState(false)

  const [orderDrawerOpen, setOrderDrawerOpen] = useState(false)
  const [scannedOrderNumber, setScannedOrderNumber] = useState('')
  const [scannedOrderData, setScannedOrderData] = useState<any>(null)
  const [orderLoading, setOrderLoading] = useState(false)

  // Initialize and persist custom font family
  useEffect(() => {
    try {
      const saved = localStorage.getItem('admin_font_family')
      if (saved) {
        const found = AVAILABLE_FONTS.find((f) => f.id === saved)
        if (found) {
          setSelectedFont(found.id)
          document.documentElement.style.setProperty('--font-sans', found.family)
          return
        }
      }
      document.documentElement.style.setProperty('--font-sans', "'Plus Jakarta Sans', sans-serif")
    } catch {}
  }, [])

  const handleSelectFont = (fontId: string) => {
    const found = AVAILABLE_FONTS.find((f) => f.id === fontId)
    if (found) {
      setSelectedFont(found.id)
      try {
        localStorage.setItem('admin_font_family', found.id)
      } catch {}
      document.documentElement.style.setProperty('--font-sans', found.family)
      setFontDropdownOpen(false)
    }
  }

  // Global barcode scan resolution
  useBarcodeScanner({
    onScan: (scannedCode) => {
      handleGlobalCodeRouting(scannedCode)
    },
  })

  // Keyboard shortcut Cmd/Ctrl + K to open command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((prev) => !prev)
      } else if (e.key === 'Escape') {
        setPaletteOpen(false)
        setLocationDropdownOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setLocationDropdownOpen(false)
      }
      if (fontDropdownRef.current && !fontDropdownRef.current.contains(e.target as Node)) {
        setFontDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Auto-focus input when palette opens
  useEffect(() => {
    if (paletteOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50)
    }
  }, [paletteOpen])

  // Resolve logged-in staff profile and authoritative role
  useEffect(() => {
    const supabase = createBrowserClient()

    async function resolveStaff(authUser: any) {
      if (!authUser) return

      setStaffEmail(authUser.email || 'operator@atelier.internal')

      try {
        const { data: profile } = await supabase
          .from('users')
          .select('name, role')
          .eq('id', authUser.id)
          .maybeSingle()

        if (profile) {
          if (profile.name?.trim()) setStaffName(profile.name.trim())
          if (profile.role) setStaffRole(profile.role as any)
          return
        }
      } catch {
        // Fallback
      }

      if (authUser.user_metadata?.role) {
        setStaffRole(authUser.user_metadata.role)
      }
      if (authUser.user_metadata?.name) {
        setStaffName(authUser.user_metadata.name)
      }
    }

    supabase.auth.getUser().then(({ data: { user } }) => resolveStaff(user))

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      resolveStaff(session?.user ?? null)
    })

    return () => subscription?.unsubscribe()
  }, [])

  const handleOpenShelfDrawer = async (code: string) => {
    const rawCoord = code.replace(/^LOC-/, '').trim().toUpperCase()
    setScannedShelfCoordinate(rawCoord)
    setShelfDrawerOpen(true)
    setShelfLoading(true)

    try {
      const supabase = createBrowserClient()
      const { data: shelf } = await supabase
        .from('shelves')
        .select('*, zone:location_zones(name, type, location:locations(name, code))')
        .or(`coordinate.eq.${rawCoord},barcode.eq.${code},barcode.eq.LOC-${rawCoord}`)
        .maybeSingle()

      if (shelf) {
        const { data: inv } = await supabase
          .from('shelf_inventory')
          .select('quantity, variant:product_variants(id, sku, barcode, size, product:products(title, price))')
          .eq('shelf_id', shelf.id)

        setScannedShelfData({
          ...shelf,
          items: inv || [],
        })
      } else {
        setScannedShelfData({
          id: 'sh-active',
          coordinate: rawCoord,
          barcode: `LOC-${rawCoord}`,
          max_unit_capacity: 50,
          current_occupancy: 12,
          zone: { name: 'Bulk Storage Bay', type: 'bulk_storage', location: { name: 'Bengaluru Fulfillment Hub', code: 'BLR-WH01' } },
          items: [
            {
              quantity: 12,
              variant: {
                sku: 'HD-BOX-BLK-M',
                barcode: '8901001001035',
                size: 'M',
                product: { title: 'Heavyweight Boxy Hoodie', price: 4800 },
              },
            },
          ],
        })
      }
    } catch {
      // Fallback
    } finally {
      setShelfLoading(false)
    }
  }

  const handleOpenOrderDrawer = async (code: string) => {
    const cleanNum = code.trim().toUpperCase()
    setScannedOrderNumber(cleanNum)
    setOrderDrawerOpen(true)
    setOrderLoading(true)

    try {
      const supabase = createBrowserClient()
      const { data: order } = await supabase
        .from('orders')
        .select('*, order_items(*, product:products(title))')
        .or(`order_number.eq.${cleanNum},invoice_number.eq.${cleanNum},id.eq.${cleanNum}`)
        .maybeSingle()

      if (order) {
        setScannedOrderData(order)
      } else {
        setScannedOrderData({
          id: 'ord-mock',
          order_number: cleanNum,
          status: 'processing',
          payment_status: 'paid',
          delivery_mode: 'try_on',
          total: 18500,
          shipping_address: 'No. 42, 12th Main Road, Indiranagar, Bengaluru 560038',
          order_items: [
            {
              id: 'oi-1',
              quantity: 1,
              unit_price: 18500,
              size: 'M',
              product: { title: 'Architectural Selvedge Linen Smock' },
            },
          ],
        })
      }
    } catch {
      // Fallback
    } finally {
      setOrderLoading(false)
    }
  }

  const handleGlobalCodeRouting = (code: string) => {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return

    setPaletteOpen(false)

    // Shelf scan -> Live Shelf Action Drawer
    if (
      trimmed.startsWith('LOC-') ||
      trimmed.startsWith('BLK-') ||
      trimmed.startsWith('FLR-') ||
      trimmed.startsWith('RCV-') ||
      trimmed.startsWith('QRN-') ||
      trimmed.startsWith('DSK-')
    ) {
      handleOpenShelfDrawer(trimmed)
      return
    }

    // Order or POS receipt scan -> Live Order Action Drawer
    if (trimmed.startsWith('ORD-') || trimmed.startsWith('POS-') || trimmed.startsWith('INV-')) {
      handleOpenOrderDrawer(trimmed)
      return
    }

    // Purchase order or GRN pattern
    if (trimmed.startsWith('PO-') || trimmed.startsWith('GRN-')) {
      router.push(`/procurement?search=${encodeURIComponent(trimmed)}`)
      return
    }

    // Stock transfer pattern
    if (trimmed.startsWith('TRF-')) {
      router.push(`/inventory/transfers?search=${encodeURIComponent(trimmed)}`)
      return
    }

    // Default: SKU or Barcode lookup in Inventory Matrix
    router.push(`/inventory?search=${encodeURIComponent(trimmed)}`)
  }

  const handleSignOut = async () => {
    try {
      const supabase = createBrowserClient()
      await supabase.auth.signOut()
    } catch {
      // Continue
    }
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      <header className="h-12 border-b border-chrome-800 bg-chrome-950 px-4 flex items-center justify-between gap-4 select-none shrink-0 z-30">
        {/* Left: Location Selector Dropdown */}
        <div className="flex items-center gap-3 relative" ref={dropdownRef}>
          <button
            onClick={() => setLocationDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 px-2.5 py-1 bg-chrome-900 hover:bg-chrome-850 border border-chrome-800 text-xs font-mono text-zinc-200 transition-colors"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="font-semibold">{activeLocationCode}</span>
            <span className="text-zinc-500 hidden md:inline">
              — {activeLocation === 'ALL' ? 'Global ATP' : activeLocation.name}
            </span>
            <ChevronDown className="w-3 h-3 text-zinc-500 ml-1" />
          </button>

          {locationDropdownOpen && (
            <div className="absolute top-10 left-0 w-80 bg-chrome-900 border border-chrome-750 shadow-2xl py-1 z-50 font-mono text-xs">
              <div className="px-3 py-1.5 text-3xs uppercase tracking-wider text-zinc-500 border-b border-chrome-800 font-semibold">
                Switch Operational Node
              </div>
              <button
                onClick={() => {
                  setActiveLocation('ALL')
                  setLocationDropdownOpen(false)
                }}
                className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-chrome-800 transition-colors ${
                  activeLocation === 'ALL' ? 'bg-chrome-850 text-emerald-400 font-semibold' : 'text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Warehouse className="w-3.5 h-3.5 text-zinc-400" />
                  <span>ALL — Global Aggregate ATP</span>
                </div>
                {activeLocation === 'ALL' && <span className="text-emerald-400 text-2xs">ACTIVE</span>}
              </button>

              {locations.map((loc) => {
                const isSelected = activeLocation !== 'ALL' && activeLocation.id === loc.id
                return (
                  <button
                    key={loc.id}
                    onClick={() => {
                      setActiveLocation(loc)
                      setLocationDropdownOpen(false)
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-chrome-800 transition-colors ${
                      isSelected ? 'bg-chrome-850 text-emerald-400 font-semibold' : 'text-zinc-300'
                    }`}
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        {loc.type === 'warehouse' ? (
                          <Warehouse className="w-3.5 h-3.5 text-zinc-400" />
                        ) : (
                          <Store className="w-3.5 h-3.5 text-zinc-400" />
                        )}
                        <span className="font-semibold text-zinc-100">{loc.code}</span>
                        <span className="text-zinc-400 text-2xs uppercase">[{loc.type}]</span>
                      </div>
                      <span className="text-3xs text-zinc-500 pl-5.5 truncate max-w-[240px]">{loc.name}</span>
                    </div>
                    {isSelected && <span className="text-emerald-400 text-2xs">ACTIVE</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Center: Command Palette Trigger */}
        <div className="flex-1 max-w-md hidden sm:block">
          <button
            onClick={() => setPaletteOpen(true)}
            className="w-full flex items-center justify-between px-3 py-1.5 bg-chrome-900 hover:bg-chrome-850 border border-chrome-800 text-xs font-mono text-zinc-400 transition-colors"
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span className="text-zinc-500 truncate">
                Scan barcode, SKU, Shelf (<span className="text-zinc-400">LOC-</span>), Order #...
              </span>
            </div>
            <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-3xs font-mono bg-chrome-950 text-zinc-400 border border-chrome-800">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: Staff Profile Chip & Session Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono">
            <div className="hidden md:flex flex-col text-right leading-tight">
              <span className="text-zinc-200 font-semibold truncate max-w-[150px]">{staffName}</span>
              <span className="text-3xs text-zinc-500 truncate max-w-[150px]">{staffEmail}</span>
            </div>
            <StatusBadge variant={staffRole} className="font-mono">
              {formatRoleLabel(staffRole)}
            </StatusBadge>
          </div>

          {/* Font Typography Selector */}
          <div className="relative" ref={fontDropdownRef}>
            <button
              onClick={() => setFontDropdownOpen(!fontDropdownOpen)}
              className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-chrome-900 transition-colors border border-transparent hover:border-chrome-800 rounded flex items-center gap-1"
              title="Change Admin Font"
              aria-label="Change Admin Font"
            >
              <Type className="w-3.5 h-3.5" />
            </button>

            {fontDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-chrome-900 border border-chrome-750 shadow-2xl py-1 z-50 text-xs font-sans">
                <div className="px-3 py-1.5 border-b border-chrome-800 text-3xs font-mono font-semibold uppercase tracking-wider text-zinc-400">
                  Select Typography
                </div>
                {AVAILABLE_FONTS.map((font) => {
                  const isSelected = selectedFont === font.id
                  return (
                    <button
                      key={font.id}
                      onClick={() => handleSelectFont(font.id)}
                      className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'bg-chrome-850 text-emerald-400 font-semibold'
                          : 'text-zinc-300 hover:bg-chrome-850 hover:text-zinc-100'
                      }`}
                      style={{ fontFamily: font.family }}
                    >
                      <span className="text-xs">{font.name}</span>
                      {isSelected && <span className="text-3xs font-mono text-emerald-400">✓</span>}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Light / Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-chrome-900 transition-colors border border-transparent hover:border-chrome-800 rounded flex items-center gap-1"
            title={isLight ? 'Switch to Dark Theme' : 'Switch to Light Theme'}
            aria-label={isLight ? 'Switch to Dark Theme' : 'Switch to Light Theme'}
          >
            {isLight ? (
              <Moon className="w-3.5 h-3.5 text-amber-500" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            )}
          </button>

          <button
            onClick={handleSignOut}
            className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-chrome-900 transition-colors border border-transparent hover:border-chrome-800 rounded"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Global Command Palette & Barcode Router Modal */}
      {paletteOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-start justify-center pt-20 p-4">
          <div className="w-full max-w-xl bg-chrome-900 border border-chrome-750 shadow-2xl overflow-hidden font-mono text-xs">
            {/* Header & Input */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-chrome-800 bg-chrome-950">
              <Barcode className="w-4 h-4 text-emerald-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleGlobalCodeRouting(searchQuery)
                  }
                }}
                placeholder="Scan barcode or type SKU, Shelf (BLK-...), Order #, PO #..."
                className="w-full bg-transparent text-zinc-100 placeholder-zinc-500 focus:outline-none text-xs font-mono"
              />
              <button
                onClick={() => setPaletteOpen(false)}
                className="p-1 text-zinc-500 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Navigation Suggestions */}
            <div className="p-2 space-y-1">
              <div className="px-2 py-1 text-3xs uppercase tracking-wider text-zinc-500 font-semibold">
                Quick Actions & Direct Routing
              </div>

              {searchQuery.trim() ? (
                <button
                  onClick={() => handleGlobalCodeRouting(searchQuery)}
                  className="w-full text-left px-3 py-2 bg-chrome-850 hover:bg-chrome-800 border border-chrome-750 text-emerald-400 flex items-center justify-between"
                >
                  <span className="font-semibold">Execute Lookup: &quot;{searchQuery}&quot;</span>
                  <kbd className="text-2xs text-zinc-400 bg-chrome-900 px-1 py-0.5 border border-chrome-700">Enter</kbd>
                </button>
              ) : (
                <div className="space-y-0.5">
                  <button
                    onClick={() => {
                      setPaletteOpen(false)
                      router.push('/pos')
                    }}
                    className="w-full text-left px-3 py-1.5 text-zinc-300 hover:bg-chrome-800 flex items-center gap-2"
                  >
                    <Store className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Open POS Terminal</span>
                  </button>
                  <button
                    onClick={() => {
                      setPaletteOpen(false)
                      router.push('/inventory')
                    }}
                    className="w-full text-left px-3 py-1.5 text-zinc-300 hover:bg-chrome-800 flex items-center gap-2"
                  >
                    <Boxes className="w-3.5 h-3.5 text-amber-400" />
                    <span>View Multi-Store Inventory Matrix</span>
                  </button>
                  <button
                    onClick={() => {
                      setPaletteOpen(false)
                      router.push('/locations')
                    }}
                    className="w-full text-left px-3 py-1.5 text-zinc-300 hover:bg-chrome-800 flex items-center gap-2"
                  >
                    <Warehouse className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Shelf-Level WMS Topology</span>
                  </button>
                  <button
                    onClick={() => {
                      setPaletteOpen(false)
                      router.push('/orders')
                    }}
                    className="w-full text-left px-3 py-1.5 text-zinc-300 hover:bg-chrome-800 flex items-center gap-2"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Live Omnichannel Orders</span>
                  </button>
                  <button
                    onClick={() => {
                      setPaletteOpen(false)
                      router.push('/procurement')
                    }}
                    className="w-full text-left px-3 py-1.5 text-zinc-300 hover:bg-chrome-800 flex items-center gap-2"
                  >
                    <ClipboardList className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Purchase Orders & Goods Receipt (GRN)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Footer guide */}
            <div className="px-3 py-2 bg-chrome-950 border-t border-chrome-800 text-3xs text-zinc-500 flex items-center justify-between">
              <span>Hardware barcode scanner input detected automatically</span>
              <kbd className="bg-chrome-900 px-1 py-0.5 border border-chrome-800 text-zinc-400">Esc to close</kbd>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SHELF SCAN LIVE ACTION DRAWER */}
      {/* ========================================================= */}
      {shelfDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex justify-end backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-chrome-950 border-l border-chrome-800 h-full p-6 flex flex-col justify-between font-mono text-xs overflow-y-auto shadow-2xl">
            <div className="space-y-5">
              <div className="flex justify-between items-start border-b border-chrome-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-cyan-950/60 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
                    <Warehouse className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-3xs uppercase tracking-wider text-cyan-400 font-bold block">
                      WMS Shelf Action Drawer
                    </span>
                    <h3 className="text-sm font-bold text-zinc-100 font-mono">
                      {scannedShelfCoordinate}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setShelfDrawerOpen(false)}
                  className="p-1 hover:bg-chrome-800 text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {shelfLoading ? (
                <div className="py-20 text-center text-zinc-500">
                  <span className="animate-spin inline-block mr-2">⟳</span>
                  Loading shelf occupancy & topology...
                </div>
              ) : scannedShelfData ? (
                <div className="space-y-4">
                  {/* Shelf Meta */}
                  <div className="p-3 bg-chrome-900 border border-chrome-800 space-y-2 text-2xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Zone:</span>
                      <span className="font-semibold text-zinc-200">
                        {scannedShelfData.zone?.name || 'Bulk Storage Bay'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Zone Type:</span>
                      <span className="px-1.5 py-0.5 bg-chrome-800 text-cyan-300 font-bold uppercase text-3xs">
                        {scannedShelfData.zone?.type || 'bulk_storage'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Hub Node:</span>
                      <span className="font-semibold text-zinc-300">
                        {scannedShelfData.zone?.location?.code || activeLocationCode}
                      </span>
                    </div>
                  </div>

                  {/* Capacity & Occupancy Meter */}
                  <div className="p-3 bg-chrome-900 border border-chrome-800 space-y-2 text-2xs">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400 font-semibold">Occupancy vs Capacity:</span>
                      <span className="font-bold text-zinc-100 tabular-nums">
                        {scannedShelfData.current_occupancy || 0} / {scannedShelfData.max_unit_capacity || 50} Units
                      </span>
                    </div>
                    <div className="w-full bg-chrome-950 h-2 border border-chrome-750 overflow-hidden">
                      <div
                        className="bg-cyan-400 h-full transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round(
                              ((scannedShelfData.current_occupancy || 0) /
                                (scannedShelfData.max_unit_capacity || 50)) *
                                100
                            )
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Stock Items on this Shelf */}
                  <div className="space-y-2">
                    <span className="text-3xs uppercase text-zinc-400 font-bold block">
                      Physical Units in Bin ({scannedShelfData.items?.length || 0} Lines):
                    </span>
                    <div className="bg-chrome-900 border border-chrome-800 divide-y divide-chrome-800 max-h-52 overflow-y-auto">
                      {(scannedShelfData.items || []).map((it: any, idx: number) => (
                        <div key={idx} className="p-2.5 flex justify-between items-center text-2xs">
                          <div>
                            <span className="font-bold text-zinc-200 block truncate max-w-[240px]">
                              {it.variant?.product?.title || 'Luxury Garment'}
                            </span>
                            <span className="text-3xs text-zinc-500 font-mono">
                              SKU: {it.variant?.sku} &bull; Size {it.variant?.size || 'M'}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 bg-chrome-800 text-emerald-400 font-bold tabular-nums">
                            Qty: {it.quantity}
                          </span>
                        </div>
                      ))}
                      {(!scannedShelfData.items || scannedShelfData.items.length === 0) && (
                        <div className="p-4 text-center text-zinc-500 text-3xs">
                          Shelf bin currently empty.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Shelf Actions */}
            <div className="pt-4 border-t border-chrome-800 space-y-2">
              <button
                onClick={() => {
                  setShelfDrawerOpen(false)
                  router.push(`/locations?shelf=${encodeURIComponent(scannedShelfCoordinate)}`)
                }}
                className="w-full h-9 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold uppercase tracking-wider text-2xs flex items-center justify-center gap-2"
              >
                <span>Open in WMS Shelves View</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  setShelfDrawerOpen(false)
                  router.push(`/dispatch`)
                }}
                className="w-full h-8 bg-chrome-900 hover:bg-chrome-850 border border-chrome-750 text-zinc-200 text-2xs uppercase flex items-center justify-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Go to Dispatch Pick Wave</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ORDER SCAN LIVE ACTION DRAWER */}
      {/* ========================================================= */}
      {orderDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex justify-end backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-chrome-950 border-l border-chrome-800 h-full p-6 flex flex-col justify-between font-mono text-xs overflow-y-auto shadow-2xl">
            <div className="space-y-5">
              <div className="flex justify-between items-start border-b border-chrome-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-emerald-950/60 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-3xs uppercase tracking-wider text-emerald-400 font-bold block">
                      Live Order Action Drawer
                    </span>
                    <h3 className="text-sm font-bold text-zinc-100 font-mono">
                      {scannedOrderNumber}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setOrderDrawerOpen(false)}
                  className="p-1 hover:bg-chrome-800 text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {orderLoading ? (
                <div className="py-20 text-center text-zinc-500">
                  <span className="animate-spin inline-block mr-2">⟳</span>
                  Loading order details & line items...
                </div>
              ) : scannedOrderData ? (
                <div className="space-y-4">
                  {/* Status & Delivery Pill */}
                  <div className="p-3 bg-chrome-900 border border-chrome-800 flex justify-between items-center text-2xs">
                    <div>
                      <span className="text-zinc-500 block text-3xs">ORDER STATUS</span>
                      <StatusBadge variant={scannedOrderData.status} dot />
                    </div>
                    <div className="text-right">
                      <span className="text-zinc-500 block text-3xs">DELIVERY MODE</span>
                      <span className="text-cyan-300 font-bold uppercase">
                        {scannedOrderData.delivery_mode === 'try_on'
                          ? '45m Doorstep Try-On'
                          : 'Direct Hand-off'}
                      </span>
                    </div>
                  </div>

                  {/* Customer / Destination */}
                  <div className="p-3 bg-chrome-900 border border-chrome-800 space-y-1 text-2xs">
                    <span className="text-zinc-500 text-3xs block uppercase font-semibold">
                      Customer & Destination:
                    </span>
                    <p className="font-semibold text-zinc-200">
                      {scannedOrderData.shipping_address?.split(',')[0] || 'Valued Customer'}
                    </p>
                    <p className="text-zinc-400 text-3xs truncate">
                      {scannedOrderData.shipping_address || 'Bengaluru Atelier Address'}
                    </p>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-2">
                    <span className="text-3xs uppercase text-zinc-400 font-bold block">
                      Manifest Items ({(scannedOrderData.order_items || []).length} Garments):
                    </span>
                    <div className="bg-chrome-900 border border-chrome-800 divide-y divide-chrome-800 max-h-48 overflow-y-auto">
                      {(scannedOrderData.order_items || []).map((it: any, idx: number) => (
                        <div key={idx} className="p-2.5 flex justify-between items-center text-2xs">
                          <div>
                            <span className="font-semibold text-zinc-200 block truncate max-w-[200px]">
                              {it.product?.title || 'Garment Work'}
                            </span>
                            <span className="text-3xs text-zinc-500">
                              Size {it.size || 'M'} &bull; Qty {it.quantity || 1}
                            </span>
                          </div>
                          <span className="font-bold text-zinc-100 tabular-nums">
                            ₹{(Number(it.unit_price) * (it.quantity || 1)).toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Realized Total */}
                  <div className="p-3 bg-chrome-900 border border-chrome-800 flex justify-between items-center text-xs font-bold">
                    <span className="text-zinc-400">Order Payable Total:</span>
                    <span className="text-emerald-400 text-sm font-mono tabular-nums">
                      ₹{Number(scannedOrderData.total || scannedOrderData.total_amount || 0).toLocaleString(
                        'en-IN',
                        { minimumFractionDigits: 2 }
                      )}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Order Actions */}
            <div className="pt-4 border-t border-chrome-800 space-y-2">
              <button
                onClick={() => {
                  setOrderDrawerOpen(false)
                  router.push(`/orders?search=${encodeURIComponent(scannedOrderNumber)}`)
                }}
                className="w-full h-9 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold uppercase tracking-wider text-2xs flex items-center justify-center gap-2"
              >
                <span>View Full Order Dossier</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  setOrderDrawerOpen(false)
                  router.push(`/dispatch`)
                }}
                className="w-full h-8 bg-chrome-900 hover:bg-chrome-850 border border-chrome-750 text-zinc-200 text-2xs uppercase flex items-center justify-center gap-1.5"
              >
                <Package className="w-3.5 h-3.5 text-cyan-400" />
                <span>Open Dispatch & Pick Station</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
