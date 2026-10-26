'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Truck, LogOut } from 'lucide-react'
import { createBrowserClient } from '@repo/supabase/browser'

function formatNameFromEmail(email: string): string {
  const localPart = email.split('@')[0] || 'Courier Officer'
  return localPart
    .split(/[._-]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

export function DeliveryNavbar() {
  const router = useRouter()
  const [courierName, setCourierName] = useState('Courier Officer')

  useEffect(() => {
    const supabase = createBrowserClient()

    async function resolveCourier(authUser: any) {
      if (!authUser) {
        setCourierName('Courier Officer')
        return
      }

      // 1. Try public.users table
      try {
        const { data: profile } = await supabase
          .from('users')
          .select('name')
          .eq('id', authUser.id)
          .maybeSingle()

        if (profile?.name && profile.name.trim() !== '') {
          setCourierName(profile.name.trim())
          return
        }
      } catch {
        // Continue
      }

      // 2. Try auth metadata
      const metaName =
        authUser.user_metadata?.name || authUser.user_metadata?.full_name
      if (metaName && typeof metaName === 'string' && metaName.trim() !== '') {
        setCourierName(metaName.trim())
        return
      }

      // 3. Email fallback
      if (authUser.email) {
        setCourierName(formatNameFromEmail(authUser.email))
        return
      }

      setCourierName('Courier Officer')
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      resolveCourier(user)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      resolveCourier(session?.user ?? null)
    })

    return () => {
      subscription?.unsubscribe()
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
    <header className="sticky top-0 z-50 bg-[#000000] border-b border-[#222222] px-4 sm:px-6 h-18 py-3 flex items-center justify-between">
      <Link href="/assigned-deliveries" className="flex items-center gap-3">
        <div className="h-10 w-10 bg-white text-black flex items-center justify-center font-bold">
          <Truck className="w-5 h-5 text-black" />
        </div>
        <div>
          <span className="font-extrabold tracking-tight text-white text-sm sm:text-base uppercase">
            Atelier Dispatch
          </span>
          <p className="text-[11px] text-emerald-400 font-mono font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Courier: {courierName} • GPS Online
          </p>
        </div>
      </Link>

      <div className="flex items-center gap-3">
        <button
          onClick={handleLogout}
          className="h-11 px-4 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white border border-[#333333] text-xs font-mono uppercase tracking-caps flex items-center gap-2 active:scale-95 transition-all"
          aria-label="Sign out"
        >
          <LogOut className="w-3.5 h-3.5 text-rose-400" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  )
}
