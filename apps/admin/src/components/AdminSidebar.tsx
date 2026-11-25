'use client'

import React, { useState, useEffect } from 'react'
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
  Sparkles,
  LogOut,
  Zap,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Tag,
  TrendingDown,
  BarChart3,
  Star,
} from 'lucide-react'
import { createBrowserClient } from '@repo/supabase/browser'
import { useTheme } from '@/context/ThemeContext'
import { SidebarBadge, type SidebarBadgeVariant } from '@/components/ui/SidebarBadge'

export interface NavItemBadgeConfig {
  key?: 'openOrdersCount' | 'lowStockCount' | 'pendingTransfersCount' | 'openPoCount' | 'pendingReviewsCount'
  variant?: SidebarBadgeVariant
  isLive?: boolean
  title?: string
}

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  exact?: boolean
  badge?: NavItemBadgeConfig
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Operations',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
      {
        href: '/pos',
        label: 'POS Terminal',
        icon: Store,
        badge: { isLive: true, variant: 'emerald', title: 'POS Terminal Live & Online' },
      },
      {
        href: '/orders',
        label: 'Orders',
        icon: ShoppingBag,
        badge: { key: 'openOrdersCount', variant: 'rose', title: 'Open orders requiring fulfillment' },
      },
      { href: '/dispatch', label: 'Outbound Dispatch', icon: Truck },
      { href: '/bolt', label: 'Bolt Try-On', icon: Zap },
    ],
  },
  {
    label: 'Inventory & WMS',
    items: [
      {
        href: '/inventory',
        label: 'Inventory Matrix',
        icon: Boxes,
        exact: true,
        badge: { key: 'lowStockCount', variant: 'amber', title: 'SKUs with low on-hand stock' },
      },
      { href: '/locations', label: 'Locations & Shelves', icon: Warehouse },
      {
        href: '/inventory/transfers',
        label: 'Stock Transfers',
        icon: ArrowLeftRight,
        badge: { key: 'pendingTransfersCount', variant: 'neutral', title: 'Pending transfers in-transit' },
      },
      { href: '/inventory/ledger', label: 'Audit Ledger', icon: FileText },
    ],
  },
  {
    label: 'Supply Chain',
    items: [
      {
        href: '/procurement',
        label: 'Purchase Orders & GRN',
        icon: ClipboardList,
        badge: { key: 'openPoCount', variant: 'neutral', title: 'Open POs awaiting receipt' },
      },
      { href: '/suppliers', label: 'Suppliers', icon: Building2 },
    ],
  },
  {
    label: 'Promotions & Engagement',
    items: [
      { href: '/promotions', label: 'Campaigns & Coupons', icon: Tag, exact: true },
      { href: '/popups', label: 'Pop-Up Studio', icon: Layers, exact: false },
      { href: '/promotions/markdowns', label: 'Scheduled Markdowns', icon: TrendingDown },
      { href: '/promotions/analytics', label: 'Redemption Analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Catalog & CMS',
    items: [
      { href: '/categories', label: 'Categories', icon: FolderTree },
      { href: '/collections', label: 'Collections & Occasions', icon: Sparkles },
      {
        href: '/reviews',
        label: 'Customer Reviews',
        icon: Star,
        badge: { key: 'pendingReviewsCount', variant: 'amber', title: 'Reviews awaiting moderation' },
      },
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

  const { toggleTheme, isLight } = useTheme()

  // Server-backed live sidebar metrics
  const [metrics, setMetrics] = useState<{
    openOrdersCount: number
    lowStockCount: number
    pendingTransfersCount: number
    openPoCount: number
    pendingReviewsCount: number
  }>({ openOrdersCount: 0, lowStockCount: 0, pendingTransfersCount: 0, openPoCount: 0, pendingReviewsCount: 0 })

  useEffect(() => {
    let isMounted = true
    const fetchMetrics = async () => {
      try {
        const res = await fetch('/api/admin/metrics')
        if (res.ok) {
          const json = await res.json()
          if (json.success && json.metrics && isMounted) {
            setMetrics(json.metrics)
          }
        }
      } catch {
        // Fallback gracefully
      }
    }
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 30000)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

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
                MAISON TG
              </span>
              <span className="text-2xs font-mono uppercase bg-chrome-900 text-zinc-400 px-1.5 py-0.5 border border-chrome-800 font-semibold tracking-wider">
                OMS / WMS
              </span>
            </Link>
          ) : (
            <span className="font-mono text-sm text-zinc-100 font-bold mx-auto">TG</span>
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
                <div className="px-2 pt-1 pb-1 text-3xs font-mono uppercase tracking-widest text-zinc-500 font-bold">
                  {group.label}
                </div>
              )}
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))

                const badgeValue = item.badge?.key ? metrics[item.badge.key] : 0
                const isLive = item.badge?.isLive || false
                const hasActiveBadge = isLive || (typeof badgeValue === 'number' && badgeValue > 0)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-2.5 py-1.5 text-xs font-mono transition-colors group relative ${
                      isActive
                        ? 'bg-chrome-850 text-zinc-100 font-semibold border-l-2 border-emerald-500'
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-chrome-850 border-l-2 border-transparent'
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0 flex items-center justify-center">
                        <Icon
                          className={`w-3.5 h-3.5 ${
                            isActive
                              ? 'text-emerald-400'
                              : 'text-zinc-400 group-hover:text-zinc-100'
                          }`}
                        />
                        {collapsed && hasActiveBadge && (
                          <SidebarBadge
                            value={badgeValue}
                            variant={item.badge?.variant}
                            isLive={isLive}
                            collapsed={true}
                            title={item.badge?.title || item.label}
                          />
                        )}
                      </div>
                      {!collapsed && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </div>

                    {!collapsed && hasActiveBadge && (
                      <div className="flex items-center shrink-0 ml-2">
                        <SidebarBadge
                          value={badgeValue}
                          variant={item.badge?.variant}
                          isLive={isLive}
                          title={item.badge?.title}
                        />
                      </div>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Footer Navigation: Theme Selector & Sign Out */}
      <div className="p-2 border-t border-chrome-800 shrink-0 bg-chrome-950">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-2 flex-1 px-2 py-1.5 text-2xs font-mono text-zinc-400 hover:text-zinc-100 hover:bg-chrome-900 transition-colors rounded"
            title={isLight ? 'Switch to Dark Theme' : 'Switch to Light Theme'}
          >
            {isLight ? <Moon className="w-3.5 h-3.5 text-zinc-400" /> : <Sun className="w-3.5 h-3.5 text-zinc-400" />}
            {!collapsed && <span>{isLight ? 'Dark Mode' : 'Light Mode'}</span>}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 px-2 py-1.5 text-2xs font-mono text-zinc-400 hover:text-rose-400 hover:bg-rose-950/20 transition-colors rounded"
            title={collapsed ? 'Sign Out' : undefined}
          >
            <LogOut className="w-3.5 h-3.5 shrink-0 text-zinc-400 hover:text-rose-400" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </div>
    </aside>
  )
}
