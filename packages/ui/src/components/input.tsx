'use client'

import * as React from 'react'
import { cn } from '../lib/utils'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  label?: string
  variant?: 'underline' | 'box' | 'terminal'
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', error, label, id, variant = 'underline', ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    if (variant === 'underline') {
      const hasCustomPlaceholder = Boolean(props.placeholder && props.placeholder.trim() !== '')

      return (
        <div className="relative w-full group pt-3">
          <input
            id={inputId}
            type={type}
            ref={ref}
            placeholder={props.placeholder || ' '}
            className={cn(
              'peer w-full bg-transparent border-b border-neutral-300 py-2.5 text-sm text-neutral-900 focus:border-neutral-950 focus:outline-none transition-colors duration-300 font-sans',
              hasCustomPlaceholder
                ? 'placeholder:text-neutral-400 placeholder:text-xs'
                : 'placeholder-transparent',
              error && 'border-red-600 focus:border-red-600',
              className
            )}
            {...props}
          />
          {label && (
            <label
              htmlFor={inputId}
              className={cn(
                'absolute left-0 text-[10px] tracking-luxury uppercase transition-all duration-300 pointer-events-none',
                hasCustomPlaceholder
                  ? 'top-0 text-neutral-400 peer-focus:text-neutral-900'
                  : 'top-0 text-neutral-400 peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:text-neutral-500 peer-placeholder-shown:tracking-caps peer-focus:top-0 peer-focus:text-[10px] peer-focus:text-neutral-900 peer-focus:tracking-luxury'
              )}
            >
              {label}
            </label>
          )}
          {error && <p className="text-[11px] text-red-600 tracking-wide mt-1">{error}</p>}
        </div>
      )
    }

    if (variant === 'terminal') {
      return (
        <div className="w-full space-y-1 font-mono">
          {label && (
            <label htmlFor={inputId} className="block text-[10px] uppercase text-neutral-400 tracking-caps">
              {label}
            </label>
          )}
          <input
            id={inputId}
            type={type}
            ref={ref}
            className={cn(
              'w-full h-10 bg-terminal-panel border border-terminal-border px-3 text-xs text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-400 focus:outline-none font-mono transition-colors',
              error && 'border-rose-500',
              className
            )}
            {...props}
          />
          {error && <p className="text-[10px] text-rose-400 mt-1">{error}</p>}
        </div>
      )
    }

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[11px] font-medium tracking-luxury uppercase text-neutral-500"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          ref={ref}
          className={cn(
            'flex h-11 w-full border border-neutral-200 bg-transparent px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-950 focus:outline-none transition-colors',
            error && 'border-red-500',
            className
          )}
          {...props}
        />
        {error && <p className="text-[11px] text-red-600 mt-1">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
