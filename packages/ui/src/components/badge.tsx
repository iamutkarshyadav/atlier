import * as React from 'react'
import { cn } from '../lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive' | 'terminal'
}

export function Badge({
  className,
  variant = 'default',
  ...props
}: BadgeProps) {
  const variants = {
    default: 'bg-neutral-900 text-neutral-100',
    secondary: 'bg-couture-bone text-couture-charcoal border border-neutral-200/60',
    outline: 'border border-neutral-300 text-neutral-800 bg-transparent',
    success: 'bg-emerald-950/20 text-emerald-700 border border-emerald-500/30',
    warning: 'bg-amber-950/20 text-amber-700 border border-amber-500/30',
    destructive: 'bg-rose-950/20 text-rose-700 border border-rose-500/30',
    terminal: 'bg-terminal-surface text-neutral-300 border border-terminal-border font-mono text-[10px]',
  }

  return (
    <div
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 text-[10px] tracking-caps uppercase font-medium transition-colors',
        variants[variant],
        className
      )}
      {...props}
    />
  )
}
