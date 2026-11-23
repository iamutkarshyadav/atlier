import React from 'react'

export type SidebarBadgeVariant = 'default' | 'neutral' | 'emerald' | 'amber' | 'rose' | 'live'

export interface SidebarBadgeProps {
  value?: number | string
  variant?: SidebarBadgeVariant
  isLive?: boolean
  collapsed?: boolean
  title?: string
  className?: string
}

const VARIANT_STYLES: Record<SidebarBadgeVariant, string> = {
  default:
    'bg-slate-200/90 text-slate-800 border border-slate-300 dark:bg-chrome-850 dark:text-zinc-300 dark:border-chrome-750',
  neutral:
    'bg-slate-200/90 text-slate-800 border border-slate-300 dark:bg-zinc-800/90 dark:text-zinc-300 dark:border-zinc-700/60',
  emerald:
    'bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
  amber:
    'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',
  rose:
    'bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60',
  live:
    'bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
}

const COLLAPSED_DOT_STYLES: Record<SidebarBadgeVariant, string> = {
  default: 'bg-slate-500 dark:bg-zinc-400',
  neutral: 'bg-slate-500 dark:bg-zinc-400',
  emerald: 'bg-emerald-600 dark:bg-emerald-400',
  amber: 'bg-amber-500 dark:bg-amber-400',
  rose: 'bg-rose-600 dark:bg-rose-400',
  live: 'bg-emerald-500 animate-pulse',
}

export function SidebarBadge({
  value,
  variant = 'default',
  isLive = false,
  collapsed = false,
  title,
  className = '',
}: SidebarBadgeProps) {
  const numericValue = typeof value === 'number' ? value : Number(value)
  const hasValue = !isNaN(numericValue) && numericValue > 0

  if (!hasValue && !isLive) return null

  // Collapsed mode: render sleek micro-indicator dot
  if (collapsed) {
    const dotColor = COLLAPSED_DOT_STYLES[variant] || 'bg-slate-500 dark:bg-zinc-400'
    return (
      <span
        className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${dotColor} ring-2 ring-white dark:ring-chrome-950`}
        title={title || (hasValue ? `${value}` : 'Active')}
      />
    )
  }

  // Live Pulse Indicator
  if (isLive && !hasValue) {
    return (
      <span className="flex items-center gap-1.5" title={title || 'Live Active'}>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
      </span>
    )
  }

  // Expanded mode: render styled count pill
  const style = VARIANT_STYLES[variant] || VARIANT_STYLES.default

  return (
    <span
      className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 text-2xs font-mono font-bold rounded-full tabular-nums leading-none tracking-tight transition-colors shadow-2xs ${style} ${className}`}
      title={title || `${value}`}
    >
      {value}
    </span>
  )
}
