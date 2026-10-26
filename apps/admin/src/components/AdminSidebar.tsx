'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Boxes,
  FolderTree,
  ShoppingBag,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Scissors,
  Cpu,
  Sparkles,
} from 'lucide-react'
import { createBrowserClient } from '@repo/supabase/browser'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Command Hub', icon: LayoutDashboard, code: '01' },
  { href: '/cms', label: 'Storefront CMS', icon: Sparkles, code: '02' },
  { href: '/inventory', label: 'Apparel Inventory', icon: Boxes, code: '03' },
  { href: '/inventory/new', label: 'Design Garment', icon: Scissors, code: '04' },
  { href: '/categories', label: 'Apparel Categories', icon: FolderTree, code: '05' },
  { href: '/orders', label: 'Order Manifest', icon: ShoppingBag, code: '06' },
  { href: '/customers', label: 'Patron Registry', icon: Users, code: '07' },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)

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
      className={`bg-[#0A0A0C] border-r border-[#23232A] flex flex-col justify-between shrink-0 transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div>
        {/* Brand & Terminal Indicator */}
        <div className="h-20 px-6 flex items-center justify-between border-b border-[#23232A]">
          {!collapsed ? (
            <div>
              <Link href="/dashboard" className="flex items-center gap-2">
                <span className="text-lg tracking-[0.15em] font-black text-white">
                  ATELIER
                </span>
                <span className="text-[9px] font-mono uppercase bg-[#18181C] text-[#166534] px-1.5 py-0.5 border border-[#27272A]">
                  CREATOR
                </span>
              </Link>
            </div>
          ) : (
            <span className="font-serif text-lg text-[#166534] font-bold mx-auto">A</span>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 text-neutral-500 hover:text-white transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation list */}
        <nav className="p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-3 rounded-none text-xs tracking-caps font-mono transition-all duration-200 relative group ${
                  isActive
                    ? 'bg-[#18181C] text-white border-l-2 border-amber-400'
                    : 'text-neutral-400 hover:text-neutral-100 hover:bg-[#121215]'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="w-4 h-4 shrink-0 text-neutral-400 group-hover:text-white" />
                {!collapsed && (
                  <div className="flex items-center justify-between w-full">
                    <span className="uppercase">{item.label}</span>
                    <span className="text-[10px] text-neutral-600 font-mono">{item.code}</span>
                  </div>
                )}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Footer System Status */}
      <div className="p-4 border-t border-[#23232A] space-y-3">
        {!collapsed && (
          <div className="p-3 bg-[#121215] border border-[#23232A] text-[10px] font-mono space-y-1.5 text-neutral-400">
            <div className="flex items-center justify-between text-neutral-300">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3 h-3 text-emerald-400" /> Supabase Realtime
              </span>
              <span className="text-emerald-400">Active</span>
            </div>
            <p className="text-neutral-500 text-[9px]">PostgreSQL RLS Protected</p>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-mono text-neutral-400 hover:text-rose-400 hover:bg-rose-950/20 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>End Session</span>}
        </button>
      </div>
    </aside>
  )
}
