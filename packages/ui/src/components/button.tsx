'use client'

import * as React from 'react'
import { cn } from '../lib/utils'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'editorial' | 'outline' | 'ghost' | 'terminal' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'xl' | 'icon'
  isLoading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', isLoading, children, disabled, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center text-xs tracking-caps uppercase font-medium transition-all duration-300 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40 select-none'

    const variants = {
      default:
        'bg-couture-obsidian text-couture-alabaster hover:bg-couture-pitch active:scale-[0.99]',
      editorial:
        'bg-couture-pitch text-couture-bone border border-couture-pitch hover:bg-transparent hover:text-couture-pitch transition-colors duration-500',
      outline:
        'border border-neutral-300 bg-transparent text-neutral-900 hover:border-neutral-900 transition-colors duration-300',
      ghost:
        'bg-transparent text-neutral-700 hover:text-neutral-950 hover:bg-neutral-100/60',
      terminal:
        'bg-terminal-surface border border-terminal-border text-neutral-200 hover:border-neutral-500 hover:text-white font-mono',
      link:
        'bg-transparent text-neutral-900 underline-offset-4 hover:underline p-0 h-auto tracking-normal lowercase first-letter:uppercase',
    }

    const sizes = {
      default: 'h-11 px-6 py-2.5',
      sm: 'h-9 px-4 text-[10px]',
      lg: 'h-14 px-8 text-xs tracking-luxury',
      xl: 'h-16 px-10 text-sm tracking-luxury',
      icon: 'h-11 w-11 p-0',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg
              className="h-3.5 w-3.5 animate-spin text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="tracking-widest">Processing</span>
          </span>
        ) : (
          children
        )}
      </button>
    )
  }
)
Button.displayName = 'Button'
