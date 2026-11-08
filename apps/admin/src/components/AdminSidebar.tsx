'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Store,
  ShoppingBag,
  Truck,
  Boxes,
  Warehouse,
  ArrowLeftRight,
  FileText,
  ClipboardList,
  Building2,
  FolderTree,
  Barcode as BarcodeIcon,
  Users,
  Layers,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Scan,
} from 'lucide-react'
import { createBrowserClient } from '@repo/supabase/browser'
import { useLocation } from '@/context/LocationContext'
import { useBarcodeScanner } from '@/lib/useBarcodeScanner'

interface NavGroup {
  label: string
  items: Array<{
    href: string
    label: string
    icon: React.ComponentType<{ className?: string }>
    exact?: boolean
  }>
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Operations',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
      { href: '/pos', label: 'POS Terminal', icon: Store },
      { href: '/orders', label: 'Orders', icon: ShoppingBag },
      { href: '/dispatch', label: 'Outbound Dispatch', icon: Truck },
    ],
  },
  {
    label: 'Inventory & WMS',
    items: [
      { href: '/inventory', label: 'Inventory Matrix', icon: Boxes, exact: true },
      { href: '/locations', label: 'Locations & Shelves', icon: Warehouse },
      { href: '/inventory/transfers', label: 'Stock Transfers', icon: ArrowLeftRight },
      { href: '/inventory/ledger', label: 'Audit Ledger', icon: FileText },
    ],
  },
  {
    label: 'Supply Chain',
    items: [
      { href: '/procurement', label: 'Purchase Orders & GRN', icon: ClipboardList },
      { href: '/suppliers', label: 'Suppliers', icon: Building2 },
    ],
  },
  {
    label: 'Catalog & Tools',
    items: [
      { href: '/categories', label: 'Categories', icon: FolderTree },
      { href: '/barcodes', label: 'Barcode Studio', icon: BarcodeIcon },
      { href: '/customers', label: 'Customers & Staff', icon: Users },
      { href: '/cms', label: 'Storefront CMS', icon: Layers },
    ],
  },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const { activeLocationCode } = useLocation()
  const { isListening } = useBarcodeScanner({
    onScan: () => {},
  })

  const handleLogout = async () => {
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
    <aside
      className={`bg-chrome-950 border-r border-chrome-800 flex flex-col justify-between shrink-0 transition-all duration-200 select-none ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      <div className="flex flex-col min-h-0 flex-1 overflow-y-auto">
        {/* Brand & Header */}
        <div className="h-12 px-3.5 flex items-center justify-between border-b border-chrome-800 shrink-0">
          {!collapsed ? (
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-widest text-zinc-100 font-mono">
                ATELIER
              </span>
              <span className="text-2xs font-mono uppercase bg-chrome-900 text-zinc-400 px-1 py-0.5 border border-chrome-800">
                ERP
              </span>
            </Link>
          ) : (
            <span className="font-mono text-sm text-zinc-100 font-bold mx-auto">A</span>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Grouped Navigation */}
        <nav className="p-2 space-y-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="space-y-0.5">
              {!collapsed && (
                <div className="px-2 pt-1 pb-1 text-3xs font-mono uppercase tracking-widest text-zinc-500 font-semibold">
                  {group.label}
                </div>
              )}
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-mono transition-colors group relative ${
                      isActive
                        ? 'bg-chrome-850 text-white font-medium border-l-2 border-emerald-500'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-chrome-900 border-l-2 border-transparent'
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-emerald-400' : 'text-zinc-400 group-hover:text-zinc-200'}`} />
                    {!collapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Operational Footer Status Bar */}
      <div className="p-2 border-t border-chrome-800 space-y-2 shrink-0 bg-chrome-950">
        {!collapsed ? (
          <div className="p-2 bg-chrome-900 border border-chrome-800 text-2xs font-mono space-y-1 text-zinc-400">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Location</span>
              <span className="text-zinc-200 font-semibold">{activeLocationCode}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-zinc-500">
                <Scan className="w-3 h-3 text-emerald-400" /> Scanner
              </span>
              <span className={isListening ? 'text-emerald-400 font-medium' : 'text-zinc-500'}>
                {isListening ? 'Ready' : 'Offline'}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-1" title={`Location: ${activeLocationCode} | Scanner Ready`}>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
        )}

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs font-mono text-zinc-400 hover:text-rose-400 hover:bg-rose-950/20 transition-colors"
          title={collapsed ? 'End Session' : undefined}
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          {!collapsed && <span>End Session</span>}
        </button>
      </div>
    </aside>
  )
}
