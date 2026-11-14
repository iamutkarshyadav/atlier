'use client'

import React, { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Zap, MapPin, CheckCircle2, AlertCircle, Loader2, ArrowRight, X } from 'lucide-react'
import { useHydratedBolt } from '../store/useBoltStore'

export function BoltServiceabilityBanner() {
  const pathname = usePathname()
  const { pincode, city, isServiceable, setPincode, clearPincode, isHydrated } = useHydratedBolt()
  const [inputPin, setInputPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isChanging, setIsChanging] = useState(false)

  // Don't render on homepage hero where full-bleed split screen is featured
  if (pathname === '/') {
    return null
  }

  // Don't render with flash before hydration
  if (!isHydrated) {
    return (
      <div className="bg-[#F0F0EE] text-[#09090B] text-xs py-2 px-4 text-center border-b border-[#E4E4E0]">
        <div className="inline-flex items-center gap-1.5 opacity-80">
          <Zap className="w-3.5 h-3.5 text-[#B91C1C] fill-[#B91C1C]" />
          <span>Bolt ⚡ Doorstep Try-On: 45-Minute In-Home White-Glove Salon</span>
        </div>
      </div>
    )
  }

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = inputPin.trim()
    if (!trimmed) return

    setLoading(true)
    setErrorMsg(null)

    try {
      const res = await fetch(`/api/bolt/check-pincode?pin=${encodeURIComponent(trimmed)}`)
      const data = await res.json()

      if (data.serviceable) {
        setPincode(trimmed, true, data.city)
        setIsChanging(false)
        setInputPin('')
        setErrorMsg(null)
      } else {
        setPincode(trimmed, false, null)
        setErrorMsg(data.message || `PIN ${trimmed} is not serviceable for Bolt ⚡`)
      }
    } catch {
      setErrorMsg('Failed to verify serviceability. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    clearPincode()
    setIsChanging(true)
    setInputPin('')
    setErrorMsg(null)
  }

  // State 1: Active Serviceable PIN
  if (isServiceable && pincode && !isChanging) {
    return (
      <div className="bg-[#ECFDF5] border-b border-[#A7F3D0] text-[#065F46] px-4 py-2 text-xs transition-colors duration-200">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-[#064E3B] flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 fill-[#B91C1C] text-[#B91C1C]" />
              Bolt ⚡ Doorstep Try-On Active:
            </span>
            <span>
              Available in <strong className="text-[#064E3B] underline decoration-emerald-500">{city || 'your area'}</strong> (PIN: <span className="font-mono font-medium text-[#065F46]">{pincode}</span>). Maximum 5 pieces per fitting salon.
            </span>
          </div>

          <button
            onClick={handleReset}
            className="text-[11px] uppercase tracking-wider text-[#065F46] hover:text-[#064E3B] underline underline-offset-2 transition-colors ml-auto flex items-center gap-1 cursor-pointer font-bold"
          >
            Change PIN
          </button>
        </div>
      </div>
    )
  }

  // State 2: Active Non-Serviceable PIN notification
  if (!isServiceable && pincode && !isChanging) {
    return (
      <div className="bg-[#FFFBEB] border-b border-[#FDE68A] text-[#92400E] px-4 py-2 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[#92400E]">
            <AlertCircle className="w-3.5 h-3.5 text-[#B45309] shrink-0" />
            <span>
              Bolt ⚡ Try-On is not yet live in PIN <strong className="text-[#78350F] font-mono">{pincode}</strong>. Standard white-glove direct shipping applies.
            </span>
          </div>
          <button
            onClick={handleReset}
            className="text-[11px] uppercase tracking-wider text-[#B45309] hover:text-[#78350F] underline underline-offset-2 transition-colors cursor-pointer font-bold"
          >
            Check Another PIN
          </button>
        </div>
      </div>
    )
  }

  // State 3: Prompting input (No PIN set or Changing PIN)
  return (
    <div className="bg-[#F0F0EE] border-b border-[#E4E4E0] text-[#09090B] px-4 py-2 text-xs">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-center sm:text-left">
          <span className="bg-red-50 text-[#B91C1C] p-1 rounded-sm border border-red-200">
            <Zap className="w-3.5 h-3.5 fill-[#B91C1C] text-[#B91C1C]" />
          </span>
          <span className="font-semibold text-[#09090B]">
            Experience Bolt ⚡ 45-Minute Doorstep Try-On Salon:
          </span>
          <span className="hidden md:inline text-[#52525B]">
            Try up to 5 pieces at home before paying.
          </span>
        </div>

        <form onSubmit={handleCheck} className="flex items-center gap-1.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48">
            <MapPin className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={inputPin}
              onChange={(e) => {
                setInputPin(e.target.value)
                setErrorMsg(null)
              }}
              placeholder="Enter 6-digit PIN"
              className="w-full bg-white border border-[#D4D4D8] rounded px-2.5 py-1 pl-8 text-xs text-[#09090B] placeholder-neutral-400 focus:outline-none focus:border-[#09090B] focus:ring-1 focus:ring-[#09090B]"
            />
          </div>
          <button
            type="submit"
            disabled={loading || inputPin.trim().length === 0}
            className="bg-[#09090B] hover:bg-[#27272A] text-white font-semibold px-3 py-1 rounded text-xs transition-colors flex items-center gap-1 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <span>Check</span>
                <ArrowRight className="w-3 h-3" />
              </>
            )}
          </button>
          {isChanging && (
            <button
              type="button"
              onClick={() => setIsChanging(false)}
              className="text-neutral-400 hover:text-neutral-600 p-1"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>
      </div>

      {errorMsg && (
        <div className="max-w-7xl mx-auto mt-1.5 text-center text-[#B91C1C] text-[11px] flex items-center justify-center gap-1">
          <AlertCircle className="w-3 h-3" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  )
}

