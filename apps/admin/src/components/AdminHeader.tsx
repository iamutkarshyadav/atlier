'use client'

import React, { useEffect, useState } from 'react'
import { Terminal, Shield, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@repo/supabase/browser'

function formatNameFromEmail(email: string): string {
  const localPart = email.split('@')[0] || 'Studio Admin'
  return localPart
    .split(/[._-]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

export function AdminHeader() {
  const router = useRouter()
  const [adminName, setAdminName] = useState('Solo Designer')
  const [adminEmail, setAdminEmail] = useState('designer@atelier.com')

  useEffect(() => {
    const supabase = createBrowserClient()

    async function resolveAdmin(authUser: any) {
      if (!authUser) {
        setAdminName('Operations Admin')
        setAdminEmail('admin@atelier.com')
        return
      }

      setAdminEmail(authUser.email || 'admin@atelier.com')

      // 1. Try public.users table
      try {
        const { data: profile } = await supabase
          .from('users')
          .select('name')
          .eq('id', authUser.id)
          .maybeSingle()

        if (profile?.name && profile.name.trim() !== '') {
          setAdminName(profile.name.trim())
          return
        }
      } catch {
        // Continue
      }

      // 2. Try auth metadata
      const metaName =
        authUser.user_metadata?.name || authUser.user_metadata?.full_name
      if (metaName && typeof metaName === 'string' && metaName.trim() !== '') {
        setAdminName(metaName.trim())
        return
      }

      // 3. Email fallback
      if (authUser.email) {
        setAdminName(formatNameFromEmail(authUser.email))
        return
      }

      setAdminName('Operations Director')
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      resolveAdmin(user)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      resolveAdmin(session?.user ?? null)
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

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
    <header className="h-16 border-b border-[#23232A] bg-[#0C0C0E] px-8 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-mono text-neutral-300">
          <Terminal className="w-3.5 h-3.5 text-amber-400" />
          <span className="uppercase tracking-caps font-semibold">Haute Couture Operations Control</span>
        </div>
        <span className="text-neutral-600 font-mono text-xs">•</span>
        <span className="text-[11px] font-mono text-neutral-400 hidden sm:inline">
          Node: Paris-01
        </span>
      </div>

      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2 px-2.5 py-1 bg-[#18181C] border border-[#27272A] text-[10px] font-mono text-neutral-300">
          <Shield className="w-3 h-3 text-emerald-400" />
          <span>ROLE: ADMIN</span>
        </div>

        <div className="flex items-center gap-3 pl-3 border-l border-[#23232A]">
          <div className="h-7 w-7 rounded-none bg-neutral-800 text-amber-300 flex items-center justify-center font-serif text-sm border border-neutral-700 uppercase font-bold shrink-0">
            {adminName[0]?.toUpperCase() || 'D'}
          </div>
          <div className="text-left text-xs font-mono">
            <p className="text-neutral-200 font-semibold leading-none">{adminName}</p>
            <p className="text-[10px] text-neutral-500 mt-0.5 truncate max-w-[140px] sm:max-w-[180px]">{adminEmail}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-[#1A1A1A] transition-colors ml-2"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  )
}
