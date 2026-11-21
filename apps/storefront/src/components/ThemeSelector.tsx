'use client'

import React from 'react'

export type ThemeMode = 'light'

interface ThemeSelectorProps {
  variant?: 'compact' | 'segmented' | 'dropdown'
  className?: string
}

// Fixed light-mode presentation selector
export function ThemeSelector({ variant = 'segmented', className = '' }: ThemeSelectorProps) {
  return null
}
