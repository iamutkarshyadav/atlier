'use client'

import React, { useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  UserCheck,
} from 'lucide-react'
import { createBrowserClient } from '@repo/supabase/browser'
import { AuthShell } from '../../components/auth/AuthShell'
import { mapAuthErrorMessage, sanitizeAuthRedirect } from '../../lib/authRedirect'

function LoginForm() {
  const searchParams = useSearchParams()
  const rawRedirect = searchParams.get('redirect') || searchParams.get('callbackUrl')
  const redirectTo = sanitizeAuthRedirect(rawRedirect, '/shop')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isDemoLoading, setIsDemoLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const [showForgotPanel, setShowForgotPanel] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [isResetting, setIsResetting] = useState(false)
  const [resetSuccess, setResetSuccess] = useState<string | null>(null)
  const [resetError, setResetError] = useState<string | null>(null)

  const signInAndRedirect = async (targetEmail: string, targetPassword: string) => {
    const supabase = createBrowserClient()
    let { data, error } = await supabase.auth.signInWithPassword({
      email: targetEmail.trim(),
      password: targetPassword,
    })

    if (error && error.message.toLowerCase().includes('not confirmed')) {
      try {
        const confRes = await fetch('/api/auth/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: targetEmail.trim() }),
        })
        if (confRes.ok) {
          const retry = await supabase.auth.signInWithPassword({
            email: targetEmail.trim(),
            password: targetPassword,
          })
          data = retry.data
          error = retry.error
        }
      } catch {
        // Proceed with error feedback below
      }
    }

    if (error || !data?.session) {
      return { ok: false as const, error: mapAuthErrorMessage(error?.message) }
    }

    return { ok: true as const }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      setAuthError('Please enter both your email address and password.')
      return
    }

    setIsLoading(true)
    setAuthError(null)

    try {
      const res = await signInAndRedirect(email, password)
      if (!res.ok) {
        setAuthError(res.error)
        setIsLoading(false)
        return
      }
      window.location.href = redirectTo
    } catch (err: any) {
      setAuthError(mapAuthErrorMessage(err?.message))
      setIsLoading(false)
    }
  }

  const handleDemoPatronSignIn = async () => {
    setIsDemoLoading(true)
    setAuthError(null)
    try {
      const res = await fetch('/api/auth/demo-patron', { method: 'POST' })
      const payload = await res.json()
      if (!payload?.email || !payload?.password) {
        setAuthError('Demo patron session is unavailable in this environment.')
        setIsDemoLoading(false)
        return
      }

      setEmail(payload.email)
      setPassword(payload.password)

      const signInRes = await signInAndRedirect(payload.email, payload.password)
      if (!signInRes.ok) {
        setAuthError(signInRes.error)
        setIsDemoLoading(false)
        return
      }
      window.location.href = redirectTo
    } catch {
      setAuthError('Unable to initialize demo patron sign-in.')
      setIsDemoLoading(false)
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    const target = (resetEmail || email).trim()
    if (!target || !target.includes('@')) {
      setResetError('Enter a valid email address to receive a reset link.')
      return
    }

    setIsResetting(true)
    setResetError(null)
    setResetSuccess(null)
    try {
      const supabase = createBrowserClient()
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const { error } = await supabase.auth.resetPasswordForEmail(target, {
        redirectTo: origin ? `${origin}/login` : undefined,
      })
      if (error) {
        setResetError(mapAuthErrorMessage(error.message))
      } else {
        setResetSuccess(`Password reset link sent to ${target}. Check your inbox.`)
      }
    } catch {
      setResetError('Could not send password reset email. Please try again.')
    } finally {
      setIsResetting(false)
    }
  }

  const registerHref =
    redirectTo !== '/shop' ? `/register?redirect=${encodeURIComponent(redirectTo)}` : '/register'

  return (
    <AuthShell mode="login" redirectTo={redirectTo}>
      <div className="space-y-5">
        <div className="space-y-1">
          <h1 className="font-sans text-2xl font-bold tracking-tight text-[#14293a]">
            Welcome Back
          </h1>
          <p className="text-xs text-[#6c7079] leading-relaxed">
            Sign in to access saved addresses, track orders, and book Bolt 45-min home trials.
          </p>
        </div>

        {authError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3 bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] text-xs rounded-sm"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.75} />
            <span className="leading-relaxed">{authError}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label
              htmlFor="login-email"
              className="block text-[11px] font-bold uppercase tracking-[0.1em] text-[#14293a]"
            >
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              placeholder="name@domain.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (authError) setAuthError(null)
              }}
              required
              className="w-full h-11 px-3.5 bg-white border border-[#d3d6db] focus:border-[#14293a] focus:outline-none text-sm text-[#14293a] placeholder:text-[#9ca3af] rounded-sm transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="login-password"
                className="block text-[11px] font-bold uppercase tracking-[0.1em] text-[#14293a]"
              >
                Password
              </label>
              <button
                type="button"
                onClick={() => {
                  setShowForgotPanel((prev) => !prev)
                  setResetEmail(email)
                  setResetError(null)
                  setResetSuccess(null)
                }}
                className="text-[11px] font-semibold text-[#6c7079] hover:text-[#b91c1c] transition-colors cursor-pointer"
              >
                {showForgotPanel ? 'Close Reset' : 'Forgot password?'}
              </button>
            </div>

            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (authError) setAuthError(null)
                }}
                required
                className="w-full h-11 pl-3.5 pr-11 bg-white border border-[#d3d6db] focus:border-[#14293a] focus:outline-none text-sm text-[#14293a] placeholder:text-[#9ca3af] rounded-sm transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-[#6c7079] hover:text-[#14293a] transition-colors cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" strokeWidth={1.75} />
                ) : (
                  <Eye className="w-4 h-4" strokeWidth={1.75} />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || isDemoLoading}
            className="w-full h-12 bg-[#14293a] hover:bg-[#b91c1c] disabled:opacity-60 text-white font-sans font-bold text-xs uppercase tracking-[0.12em] rounded-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {isLoading ? (
              <span>Signing In...</span>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
              </>
            )}
          </button>
        </form>

        {/* Inline Collapsible Forgot Password Panel */}
        {showForgotPanel && (
          <form
            onSubmit={handlePasswordReset}
            className="p-3.5 bg-[#f8f8f8] border border-[#d3d6db] rounded-sm space-y-2.5"
          >
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#14293a]">
              <KeyRound className="w-3.5 h-3.5 text-[#b91c1c]" strokeWidth={1.75} />
              <span>Reset Password</span>
            </div>
            <p className="text-[11px] text-[#6c7079] leading-relaxed">
              Enter your registered email and we will send a secure recovery link.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="name@domain.com"
                className="flex-1 h-9 px-3 bg-white border border-[#d3d6db] focus:border-[#14293a] focus:outline-none text-xs text-[#14293a] rounded-sm"
              />
              <button
                type="submit"
                disabled={isResetting}
                className="h-9 px-3.5 bg-[#14293a] hover:bg-[#b91c1c] text-white text-[11px] font-bold uppercase tracking-wider rounded-sm transition-colors cursor-pointer shrink-0"
              >
                {isResetting ? 'Sending...' : 'Send Link'}
              </button>
            </div>
            {resetError && <p className="text-[11px] text-[#b91c1c]">{resetError}</p>}
            {resetSuccess && (
              <p className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                <span>{resetSuccess}</span>
              </p>
            )}
          </form>
        )}

        {/* Evaluation Quick Patron Access */}
        <div className="pt-2 space-y-3">
          <div className="relative flex items-center">
            <div className="flex-grow border-t border-[#e5e7eb]" />
            <span className="shrink mx-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8a909a]">
              Or Instant Preview
            </span>
            <div className="flex-grow border-t border-[#e5e7eb]" />
          </div>

          <button
            type="button"
            onClick={handleDemoPatronSignIn}
            disabled={isLoading || isDemoLoading}
            className="w-full h-10 bg-[#f5f5f4] hover:bg-[#ededec] border border-[#d3d6db] text-[#14293a] text-xs font-semibold rounded-sm flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
          >
            <UserCheck className="w-3.5 h-3.5 text-[#14293a]" strokeWidth={1.75} />
            <span>{isDemoLoading ? 'Connecting Demo Patron...' : 'Continue with Demo Patron Account'}</span>
          </button>
        </div>

        <p className="pt-2 text-center text-xs text-[#6c7079]">
          New to Maison TG?{' '}
          <Link href={registerHref} className="text-[#b91c1c] font-bold hover:underline">
            Create an Account
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}

export default function StorefrontLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center text-xs text-[#6c7079] font-sans">
          Loading account session...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
