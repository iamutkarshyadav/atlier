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
} from 'lucide-react'
import { createBrowserClient } from '@repo/supabase/browser'
import { useLocation } from '@/context/LocationContext'
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

export function AdminHeader() {
  const router = useRouter()
  const { locations, activeLocation, setActiveLocation, activeLocationCode } = useLocation()

  const [staffName, setStaffName] = useState('Staff Operator')
  const [staffEmail, setStaffEmail] = useState('operator@atelier.internal')
  const [staffRole, setStaffRole] = useState<'admin' | 'warehouse_manager' | 'store_manager' | 'pos_cashier'>('admin')
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setLocationDropdownOpen(false)
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

  const handleGlobalCodeRouting = (code: string) => {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return

    setPaletteOpen(false)

    // Shelf / Location pattern (e.g. BLK-A-01-A1 or LOC-...)
    if (
      trimmed.startsWith('LOC-') ||
      trimmed.startsWith('BLK-') ||
      trimmed.startsWith('FLR-') ||
      trimmed.startsWith('RCV-') ||
      trimmed.startsWith('QRN-') ||
      trimmed.startsWith('DSK-')
    ) {
      router.push(`/locations?shelf=${encodeURIComponent(trimmed)}`)
      return
    }

    // Order or POS receipt pattern
    if (trimmed.startsWith('ORD-') || trimmed.startsWith('POS-') || trimmed.startsWith('INV-')) {
      router.push(`/orders?search=${encodeURIComponent(trimmed)}`)
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
            <div className="flex flex-col text-right leading-none hidden md:block">
              <span className="text-zinc-200 font-semibold">{staffName}</span>
              <span className="text-3xs text-zinc-500 mt-0.5 truncate max-w-[140px]">{staffEmail}</span>
            </div>
            <StatusBadge variant={staffRole} className="font-mono">
              {formatRoleLabel(staffRole)}
            </StatusBadge>
          </div>

          <button
            onClick={handleSignOut}
            className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-chrome-900 transition-colors border border-transparent hover:border-chrome-800"
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
    </>
  )
}
