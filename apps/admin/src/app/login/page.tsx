'use client'

import React, { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, CheckCircle2, AlertCircle, Lock, Warehouse, Store, Sparkles } from 'lucide-react'
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
  const [bootstrapLoading, setBootstrapLoading] = useState(false)
  const [bootstrapSuccess, setBootstrapSuccess] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(
    errorParam === 'unauthorized_role'
      ? 'Access Denied: Account lacks required staff or administrator permissions.'
      : errorParam === 'session_verification_failed'
      ? 'Session verification failed. Please authenticate.'
      : null
  )

  const handleLogin = async (e: React.FormEvent, overrideEmail?: string, overridePass?: string) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage(null)

    const targetEmail = (overrideEmail || email).trim()
    const targetPassword = overridePass || password

    try {
      const supabase = createBrowserClient()

      // 1. Authenticate with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: targetPassword,
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

      let verifiedRole = profile?.role || (profileErr ? data.user.app_metadata?.role : null)

      // Auto-promote known owner/admin emails if newly created via Supabase dashboard with default customer role
      if (
        (!verifiedRole || verifiedRole === 'customer') &&
        (targetEmail === 'horizonlord1@gmail.com' || targetEmail === 'iamutkarshyadav1@gmail.com')
      ) {
        await fetch('/api/auth/bootstrap', { method: 'POST' })
        verifiedRole = 'admin'
      }

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

  const handleBootstrapAccounts = async () => {
    setBootstrapLoading(true)
    setBootstrapSuccess(null)
    setErrorMessage(null)

    try {
      const res = await fetch('/api/auth/bootstrap', { method: 'POST' })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setErrorMessage(data?.error || 'Failed to initialize staff accounts.')
      } else {
        setBootstrapSuccess('Staff accounts initialized in Supabase Cloud! Signing in...')
        const defaultEmail = 'horizonlord1@gmail.com'
        const defaultPass = 'asdfghjkl'
        setEmail(defaultEmail)
        setPassword(defaultPass)

        setTimeout(() => {
          const fakeEvent = { preventDefault: () => {} } as React.FormEvent
          handleLogin(fakeEvent, defaultEmail, defaultPass)
        }, 700)
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Bootstrap request failed.')
    } finally {
      setBootstrapLoading(false)
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

        {/* Feedback Message */}
        {bootstrapSuccess && (
          <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="leading-tight">{bootstrapSuccess}</span>
          </div>
        )}

        {errorMessage && (
          <div className="space-y-2">
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="leading-tight block">{errorMessage}</span>
                {errorMessage.toLowerCase().includes('invalid login credentials') && (
                  <p className="text-3xs text-rose-400/80">
                    Staff account not yet provisioned in this Supabase Cloud project. Click below to initialize.
                  </p>
                )}
              </div>
            </div>

            {errorMessage.toLowerCase().includes('invalid login credentials') && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleBootstrapAccounts}
                isLoading={bootstrapLoading}
                className="w-full text-2xs bg-chrome-950 hover:bg-chrome-850 border-amber-500/60 text-amber-400 flex items-center justify-center gap-1.5 font-semibold py-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Initialize / Provision Staff Accounts in Supabase
              </Button>
            )}
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

          <div className="pt-1">
            <button
              type="button"
              onClick={handleBootstrapAccounts}
              disabled={bootstrapLoading}
              className="w-full py-1 px-2 bg-chrome-950 hover:bg-chrome-850 border border-chrome-800 text-3xs text-amber-500 hover:text-amber-400 flex items-center justify-center gap-1 font-mono transition-colors"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>{bootstrapLoading ? 'Provisioning accounts...' : 'Provision / Sync Staff Accounts in Supabase'}</span>
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
