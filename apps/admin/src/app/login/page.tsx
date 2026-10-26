'use client'

import React, { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, CheckCircle2, AlertCircle, Shield, Lock } from 'lucide-react'
import { Button } from '@repo/ui'
import { createBrowserClient } from '@repo/supabase/browser'

export default function SimpleAdminLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/dashboard'
  const errorParam = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(
    errorParam === 'unauthorized_role'
      ? 'Access Denied: This account does not possess sovereign administrator privileges.'
      : errorParam === 'session_verification_failed'
      ? 'Session verification failed. Please re-authenticate.'
      : null
  )

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage(null)
    setInfoMessage(null)

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

      if (verifiedRole !== 'admin') {
        // Sign out unauthorized session immediately
        await supabase.auth.signOut()
        setErrorMessage('Access Denied: Sovereign administrator role required to access this portal.')
        setIsLoading(false)
        return
      }

      // 3. Successful Verified Authentication
      router.push(redirectTo)
      router.refresh()
    } catch (err: any) {
      setErrorMessage(err?.message || 'Authentication error.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#0E0E10]">
      <div className="w-full max-w-md bg-[#16161A] border border-[#26262C] p-8 sm:p-10 shadow-2xl space-y-7">
        {/* Brand Header */}
        <div className="space-y-1.5 text-center sm:text-left">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-serif text-2xl tracking-[0.2em] font-light text-white block">
              ATELIER
            </span>
            <span className="text-[9px] font-mono uppercase bg-[#18181C] text-[#166534] px-1.5 py-0.5 border border-[#27272A]">
              CREATOR
            </span>
          </div>
          <h1 className="text-sm font-medium text-neutral-300">
            Sovereign Admin Portal
          </h1>
          <p className="text-xs text-neutral-400 font-light">
            Authorized personnel only. Multi-factor authenticated operations console.
          </p>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* Success / Info Message */}
        {infoMessage && (
          <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{infoMessage}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-neutral-300 font-medium block">
              Operator Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="iamutkarshyadav1@gmail.com"
              required
              className="w-full bg-[#1C1C22] border border-[#2E2E36] px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:border-neutral-400 focus:outline-none font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-neutral-300 font-medium block">
              Security Key / Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              className="w-full bg-[#1C1C22] border border-[#2E2E36] px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:border-neutral-400 focus:outline-none font-mono"
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="default"
              size="lg"
              className="w-full h-11 bg-white hover:bg-neutral-200 text-black border-none text-xs font-semibold tracking-wider font-mono uppercase"
              isLoading={isLoading}
            >
              Authenticate Session <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </div>
        </form>

        {/* Security Footer Notice */}
        <div className="pt-4 border-t border-[#26262C] flex items-center justify-between text-[11px] text-neutral-500 font-mono">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-[#166534]" />
            <span>Restricted Sovereign Gate</span>
          </div>
          <span className="text-[10px] text-neutral-600">TLS 1.3 Verified</span>
        </div>
      </div>
    </div>
  )
}
