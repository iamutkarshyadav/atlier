'use client'

import React, { useEffect, useState, useRef } from 'react'
import { Sun, Moon, Laptop, Check } from 'lucide-react'

export type ThemeMode = 'dark' | 'light' | 'system'

interface ThemeSelectorProps {
  variant?: 'compact' | 'segmented' | 'dropdown'
  className?: string
}

export function ThemeSelector({ variant = 'segmented', className = '' }: ThemeSelectorProps) {
  const [theme, setTheme] = useState<ThemeMode>('dark')
  const [mounted, setMounted] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Apply theme to DOM
  const applyTheme = (targetTheme: ThemeMode) => {
    const root = document.documentElement
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

    root.classList.remove('dark', 'light')

    if (targetTheme === 'dark') {
      root.classList.add('dark')
      root.setAttribute('data-theme', 'dark')
    } else if (targetTheme === 'light') {
      root.classList.add('light')
      root.setAttribute('data-theme', 'light')
    } else {
      // System
      root.setAttribute('data-theme', 'system')
      if (prefersDark) {
        root.classList.add('dark')
      } else {
        root.classList.add('light')
      }
    }
  }

  // Initial mount: read from localStorage or default to system/dark
  useEffect(() => {
    setMounted(true)
    const stored = (localStorage.getItem('atelier-theme') as ThemeMode) || 'dark'
    setTheme(stored)
    applyTheme(stored)

    // Listen to OS theme changes if on system
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      const currentStored = localStorage.getItem('atelier-theme') as ThemeMode
      if (currentStored === 'system' || !currentStored) {
        applyTheme('system')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (mode: ThemeMode) => {
    setTheme(mode)
    localStorage.setItem('atelier-theme', mode)
    applyTheme(mode)
    setMenuOpen(false)
  }

  // Placeholder while mounting to avoid SSR hydration mismatch
  if (!mounted) {
    return (
      <div className={`inline-flex items-center gap-1 opacity-60 text-xs ${className}`}>
        <span className="w-4 h-4 rounded-full bg-white/20 animate-pulse" />
      </div>
    )
  }

  // Variant A: Full Segmented 3-Way Pill (White, Dark, System)
  if (variant === 'segmented') {
    return (
      <div
        role="radiogroup"
        aria-label="Theme Selector"
        className={`inline-flex items-center p-0.5 rounded-full border border-neutral-300 dark:border-white/12 bg-neutral-100 dark:bg-[#262629] shadow-inner text-xs font-mono ${className}`}
      >
        {/* 1. White / Light */}
        <button
          type="button"
          role="radio"
          aria-checked={theme === 'light'}
          onClick={() => handleSelect('light')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all cursor-pointer select-none ${
            theme === 'light'
              ? 'bg-white text-neutral-950 font-bold shadow-sm border border-neutral-200 dark:border-transparent'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
          }`}
          title="White / Light Theme"
        >
          <Sun className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden sm:inline text-[11px] uppercase tracking-wider">White</span>
        </button>

        {/* 2. Dark */}
        <button
          type="button"
          role="radio"
          aria-checked={theme === 'dark'}
          onClick={() => handleSelect('dark')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all cursor-pointer select-none ${
            theme === 'dark'
              ? 'bg-[#121214] text-white font-bold shadow-sm border border-white/20'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
          }`}
          title="Dark Theme"
        >
          <Moon className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden sm:inline text-[11px] uppercase tracking-wider">Dark</span>
        </button>

        {/* 3. System */}
        <button
          type="button"
          role="radio"
          aria-checked={theme === 'system'}
          onClick={() => handleSelect('system')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all cursor-pointer select-none ${
            theme === 'system'
              ? 'bg-[#B91C1C] text-white font-bold shadow-sm'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
          }`}
          title="Match System Preferences"
        >
          <Laptop className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-300" />
          <span className="hidden sm:inline text-[11px] uppercase tracking-wider">Auto</span>
        </button>
      </div>
    )
  }

  // Variant B: Compact Dropdown / Toggle for Navbar
  const currentIcon =
    theme === 'light' ? (
      <Sun className="w-4 h-4 text-amber-500" />
    ) : theme === 'dark' ? (
      <Moon className="w-4 h-4 text-blue-300" />
    ) : (
      <Laptop className="w-4 h-4 text-neutral-500 dark:text-neutral-300" />
    )

  const currentLabel = theme === 'light' ? 'White' : theme === 'dark' ? 'Dark' : 'System'

  return (
    <div ref={dropdownRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-neutral-300 dark:border-white/15 bg-white dark:bg-[#262629] hover:bg-neutral-100 dark:hover:bg-[#38393D] text-neutral-950 dark:text-white text-xs font-mono transition-all cursor-pointer shadow-sm hover:shadow"
        aria-label={`Theme: currently ${currentLabel}. Click to switch theme.`}
        aria-expanded={menuOpen}
      >
        {currentIcon}
        <span className="hidden md:inline text-[11px] uppercase tracking-wider font-bold">
          {currentLabel}
        </span>
      </button>

      {menuOpen && (
        <div className="absolute right-0 mt-2 w-44 p-1.5 rounded-xl border border-neutral-200 dark:border-white/15 bg-white dark:bg-[#1A1B1D] text-neutral-950 dark:text-white shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 font-mono text-xs">
          <div className="px-2.5 py-1.5 text-[10px] uppercase tracking-widest text-neutral-500 dark:text-neutral-400 font-semibold border-b border-neutral-100 dark:border-white/10 mb-1">
            Theme Preference
          </div>

          <button
            type="button"
            onClick={() => handleSelect('light')}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
              theme === 'light'
                ? 'bg-neutral-100 dark:bg-white/10 font-bold text-neutral-950 dark:text-white'
                : 'hover:bg-neutral-50 dark:hover:bg-white/5 text-neutral-700 dark:text-neutral-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>White (Light)</span>
            </div>
            {theme === 'light' && <Check className="w-3.5 h-3.5 text-[#B91C1C]" />}
          </button>

          <button
            type="button"
            onClick={() => handleSelect('dark')}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
              theme === 'dark'
                ? 'bg-neutral-100 dark:bg-white/10 font-bold text-neutral-950 dark:text-white'
                : 'hover:bg-neutral-50 dark:hover:bg-white/5 text-neutral-700 dark:text-neutral-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Moon className="w-3.5 h-3.5 text-blue-400" />
              <span>Dark (Obsidian)</span>
            </div>
            {theme === 'dark' && <Check className="w-3.5 h-3.5 text-[#B91C1C]" />}
          </button>

          <button
            type="button"
            onClick={() => handleSelect('system')}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
              theme === 'system'
                ? 'bg-neutral-100 dark:bg-white/10 font-bold text-neutral-950 dark:text-white'
                : 'hover:bg-neutral-50 dark:hover:bg-white/5 text-neutral-700 dark:text-neutral-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Laptop className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-300" />
              <span>System (Auto)</span>
            </div>
            {theme === 'system' && <Check className="w-3.5 h-3.5 text-[#B91C1C]" />}
          </button>
        </div>
      )}
    </div>
  )
}

