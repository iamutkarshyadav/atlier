'use client'

import React from 'react'
import { Keyboard, X } from 'lucide-react'

interface PosShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function PosShortcutsModal({ isOpen, onClose }: PosShortcutsModalProps) {
  if (!isOpen) return null

  const shortcuts = [
    { key: '⌘ / Ctrl + Enter', desc: 'Settle Transaction & Print Receipt' },
    { key: 'F1 or /', desc: 'Focus Garment & Barcode Search' },
    { key: 'Ctrl + 1 / 2 / 3', desc: 'Switch Between Parked Register Carts' },
    { key: 'Ctrl + P', desc: 'Park Current Cart' },
    { key: 'Esc', desc: 'Close Dialogs / Clear Search' },
    { key: '?', desc: 'Toggle This Keyboard Shortcuts Cheat Sheet' },
  ]

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-chrome-900 border border-chrome-800 rounded-lg max-w-sm w-full p-4 space-y-3.5 shadow-2xl font-sans text-xs select-none">
        <div className="flex items-center justify-between border-b border-chrome-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-emerald-400" />
            <h3 className="font-semibold text-zinc-100">POS Ergonomic Hotkeys</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          {shortcuts.map((sc) => (
            <div
              key={sc.key}
              className="flex items-center justify-between p-2 rounded bg-chrome-950 border border-chrome-800/80"
            >
              <span className="text-zinc-300 font-medium">{sc.desc}</span>
              <kbd className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 font-mono text-3xs font-bold">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  )
}

