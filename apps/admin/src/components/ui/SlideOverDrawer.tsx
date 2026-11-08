'use client'

import React, { useEffect } from 'react'
import { X } from 'lucide-react'

interface SlideOverDrawerProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  width?: string // e.g. 'max-w-xl' or 'max-w-2xl'
}

export function SlideOverDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  description,
  children,
  footer,
  width = 'max-w-xl',
}: SlideOverDrawerProps) {
  const desc = subtitle || description
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div
          className={`w-screen ${width} bg-chrome-900 border-l border-chrome-800 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200`}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-chrome-800 flex items-start justify-between bg-chrome-950">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white font-mono">
                {title}
              </h2>
              {desc && (
                <p className="text-xs text-neutral-400 font-sans mt-0.5">{desc}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-chrome-800 transition-colors rounded-none"
              aria-label="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-neutral-200 text-xs">
            {children}
          </div>

          {/* Sticky Footer */}
          {footer && (
            <div className="p-4 border-t border-chrome-800 bg-chrome-950 flex items-center justify-end gap-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
