'use client'

import React, { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, CheckCircle2, AlertCircle, Lock, Warehouse, Store } from 'lucide-react'
import { Button } from '@repo/ui'
import { createBrowserClient } from '@repo/supabase/browser'

const STAFF_ROLES = ['admin', 'warehouse_manager', 'store_manager', 'pos_cashier']

function AdminLoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo')
  const errorParam = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(
    errorParam === 'unauthorized_role'
      ? 'Access Denied: Account lacks required staff or administrator permissions.'
      : errorParam === 'session_verification_failed'
      ? 'Session verification failed. Please authenticate.'
      : null
  )

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const supabase = createBrowserClient()

      // 1. Authenticate with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        setErrorMessage(error.message)
        setIsLoading(false)
        return
      }

      if (!data?.user) {
        setErrorMessage('Authentication failed. Please verify credentials.')
        setIsLoading(false)
        return
      }

      // 2. Authoritative database role verification from public.users table
      const { data: profile, error: profileErr } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single()

      const verifiedRole = profile?.role || (profileErr ? data.user.app_metadata?.role : null)

      if (!verifiedRole || !STAFF_ROLES.includes(verifiedRole)) {
        // Sign out unauthorized customer session
        await supabase.auth.signOut()
        setErrorMessage('Access Denied: Enterprise staff role required to access this portal.')
        setIsLoading(false)
        return
      }

      // 3. Role-based navigation
      if (redirectTo) {
        router.push(redirectTo)
      } else if (verifiedRole === 'pos_cashier') {
        router.push('/pos')
      } else {
        router.push('/dashboard')
      }
      router.refresh()
    } catch (err: any) {
      setErrorMessage(err?.message || 'Authentication error.')
      setIsLoading(false)
    }
  }

  const fillCredentials = (staffEmail: string) => {
    setEmail(staffEmail)
    if (staffEmail === 'horizonlord1@gmail.com' || staffEmail === 'iamutkarshyadav1@gmail.com') {
      setPassword('asdfghjkl')
    } else {
      setPassword('atelier-master-password')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-chrome-950 font-mono">
      <div className="w-full max-w-md bg-chrome-900 border border-chrome-800 p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Brand Header */}
        <div className="space-y-1.5 border-b border-chrome-800 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-widest text-zinc-100">
              ATELIER
            </span>
            <span className="text-2xs font-mono uppercase bg-chrome-850 text-zinc-300 px-1.5 py-0.5 border border-chrome-800">
              ERP & WMS
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Enterprise Omnichannel Operations, WMS & POS Engine
          </p>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="p-3 bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-tight">{errorMessage}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleLogin} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold block">
              Operator Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@atelier.internal"
              required
              className="w-full bg-chrome-950 border border-chrome-800 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:border-zinc-400 focus:outline-none font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold block">
              Access Token / Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              className="w-full bg-chrome-950 border border-chrome-800 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:border-zinc-400 focus:outline-none font-mono"
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="default"
              size="lg"
              className="w-full h-9 bg-zinc-100 hover:bg-white text-zinc-950 font-mono text-xs font-semibold uppercase tracking-wider rounded-none"
              isLoading={isLoading}
            >
              Sign In to Terminal <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </div>
        </form>

        {/* Quick Staff Logins for Dev & Evaluation */}
        <div className="pt-3 border-t border-chrome-800 space-y-2">
          <span className="text-3xs uppercase tracking-wider text-zinc-500 font-semibold block">
            Demo Staff Identities
          </span>
          <div className="grid grid-cols-2 gap-1.5 text-3xs">
            <button
              type="button"
              onClick={() => fillCredentials('horizonlord1@gmail.com')}
              className="p-1.5 bg-chrome-950 border border-chrome-800 hover:border-zinc-600 text-left text-zinc-300"
            >
              <span className="text-emerald-400 font-semibold block">Admin</span>
              <span className="text-zinc-500 truncate block">horizonlord1@gmail.com</span>
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('warehouse@atelier.internal')}
              className="p-1.5 bg-chrome-950 border border-chrome-800 hover:border-zinc-600 text-left text-zinc-300"
            >
              <span className="text-cyan-400 font-semibold block">Warehouse Mgr</span>
              <span className="text-zinc-500 truncate block">warehouse@atelier...</span>
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('store.manager@atelier.internal')}
              className="p-1.5 bg-chrome-950 border border-chrome-800 hover:border-zinc-600 text-left text-zinc-300"
            >
              <span className="text-amber-400 font-semibold block">Store Mgr</span>
              <span className="text-zinc-500 truncate block">store.manager@...</span>
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('cashier@atelier.internal')}
              className="p-1.5 bg-chrome-950 border border-chrome-800 hover:border-zinc-600 text-left text-zinc-300"
            >
              <span className="text-zinc-300 font-semibold block">POS Cashier</span>
              <span className="text-zinc-500 truncate block">cashier@atelier...</span>
            </button>
          </div>
        </div>

        {/* Security Footer Notice */}
        <div className="pt-2 border-t border-chrome-800 flex items-center justify-between text-3xs text-zinc-500 font-mono">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>Role-Based RLS Protected</span>
          </div>
          <span className="text-zinc-600">PostgreSQL 16</span>
        </div>
      </div>
    </div>
  )
}

export default function SimpleAdminLoginPage() {
  return (
    <Suspense fallback={<div className="py-24 text-center text-xs font-mono text-zinc-500">Initializing ERP Auth...</div>}>
      <AdminLoginContent />
    </Suspense>
  )
}
