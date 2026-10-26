'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '../lib/utils'

export interface SheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  side?: 'right' | 'left'
  className?: string
}

export function Sheet({
  isOpen,
  onClose,
  title,
  children,
  side = 'right',
  className,
}: SheetProps) {
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 bg-neutral-950/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: side === 'right' ? '100%' : '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: side === 'right' ? '100%' : '-100%' }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'relative z-50 h-full w-full max-w-md bg-white p-8 sm:p-10 shadow-2xl flex flex-col justify-between ml-auto',
              side === 'left' && 'ml-0 mr-auto',
              className
            )}
          >
            <div>
              <div className="flex items-center justify-between pb-8 border-b border-neutral-100">
                {title && (
                  <span className="text-xs uppercase tracking-luxury font-medium text-neutral-900">
                    {title}
                  </span>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 -mr-1.5 text-neutral-400 hover:text-neutral-950 transition-colors"
                  aria-label="Close panel"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-6 overflow-y-auto max-h-[calc(100vh-200px)]">
                {children}
              </div>
            </div>

            <div className="pt-6 border-t border-neutral-100">
              <button
                onClick={onClose}
                className="w-full h-12 bg-neutral-950 text-white text-xs uppercase tracking-luxury hover:bg-neutral-800 transition-colors"
              >
                Apply & Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
