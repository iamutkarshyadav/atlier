import React from 'react'

export type StatusType =
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'cyan'
  | 'neutral'

interface StatusBadgeProps {
  status?: StatusType
  variant?: string // semantic string like 'in_stock', 'low_stock', 'depleted', 'paid', etc.
  children?: React.ReactNode
  className?: string
  dot?: boolean
}

function resolveStatusColor(variant?: string, explicitStatus?: StatusType): StatusType {
  if (explicitStatus) return explicitStatus
  if (!variant) return 'neutral'

  const v = variant.toLowerCase()
  if (
    v.includes('in_stock') ||
    v.includes('optimal') ||
    v.includes('verified') ||
    v.includes('paid') ||
    v.includes('delivered') ||
    v.includes('completed') ||
    v.includes('received') ||
    v.includes('active')
  ) {
    return 'emerald'
  }

  if (
    v.includes('low') ||
    v.includes('transit') ||
    v.includes('pending') ||
    v.includes('hold') ||
    v.includes('processing') ||
    v.includes('partially')
  ) {
    return 'amber'
  }

  if (
    v.includes('depleted') ||
    v.includes('zero') ||
    v.includes('shrinkage') ||
    v.includes('damaged') ||
    v.includes('cancelled') ||
    v.includes('failed') ||
    v.includes('refund') ||
    v.includes('quarantine')
  ) {
    return 'rose'
  }

  if (
    v.includes('dispatch') ||
    v.includes('draft') ||
    v.includes('staged') ||
    v.includes('online') ||
    v.includes('allocated')
  ) {
    return 'cyan'
  }

  return 'neutral'
}

const COLOR_CLASSES: Record<StatusType, { bg: string; text: string; border: string; dotBg: string }> = {
  emerald: {
    bg: 'bg-emerald-950/40',
    text: 'text-emerald-400',
    border: 'border-emerald-800/60',
    dotBg: 'bg-emerald-500',
  },
  amber: {
    bg: 'bg-amber-950/40',
    text: 'text-amber-400',
    border: 'border-amber-800/60',
    dotBg: 'bg-amber-500',
  },
  rose: {
    bg: 'bg-rose-950/40',
    text: 'text-rose-400',
    border: 'border-rose-800/60',
    dotBg: 'bg-rose-500',
  },
  cyan: {
    bg: 'bg-cyan-950/40',
    text: 'text-cyan-400',
    border: 'border-cyan-800/60',
    dotBg: 'bg-cyan-500',
  },
  neutral: {
    bg: 'bg-zinc-900',
    text: 'text-zinc-400',
    border: 'border-zinc-800',
    dotBg: 'bg-zinc-500',
  },
}

export function StatusBadge({ status, variant, children, className = '', dot = false }: StatusBadgeProps) {
  const resolved = resolveStatusColor(variant, status)
  const styles = COLOR_CLASSES[resolved]

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-2xs font-mono uppercase tracking-wider border ${styles.bg} ${styles.text} ${styles.border} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${styles.dotBg}`} />}
      {children || variant}
    </span>
  )
}

