'use client'

import React from 'react'
import { generateCode128Svg, type BarcodeRenderOptions } from '../lib/barcode'

export interface BarcodeProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
  height?: number
  barWidth?: number
  width?: number
  includeText?: boolean
  displayValue?: boolean
  textColor?: string
  barColor?: string
  theme?: 'dark' | 'light' | 'terminal' | 'print'
}

export function Barcode({
  value,
  height = 42,
  barWidth = 1.6,
  width,
  includeText = true,
  displayValue,
  textColor,
  barColor,
  theme = 'terminal',
  className = '',
  ...props
}: BarcodeProps) {
  const effectiveBarWidth = width ?? barWidth
  const effectiveIncludeText = displayValue ?? includeText

  // Resolve theme colors
  let resolvedBarColor = barColor
  let resolvedTextColor = textColor

  if (!resolvedBarColor) {
    if (theme === 'terminal') {
      resolvedBarColor = '#F4F4F5'
      resolvedTextColor = '#A1A1AA'
    } else if (theme === 'dark') {
      resolvedBarColor = '#FFFFFF'
      resolvedTextColor = '#E4E4E7'
    } else if (theme === 'print') {
      resolvedBarColor = '#000000'
      resolvedTextColor = '#000000'
    } else {
      resolvedBarColor = '#000000'
      resolvedTextColor = '#18181B'
    }
  }

  const svgString = React.useMemo(() => {
    if (!value) return ''
    try {
      return generateCode128Svg(value, {
        height,
        barWidth: effectiveBarWidth,
        includeText: effectiveIncludeText,
        barColor: resolvedBarColor,
        textColor: resolvedTextColor,
        backgroundColor: 'transparent',
        fontSize: 10,
        quietZone: 8,
      })
    } catch (e) {
      console.warn('Barcode encoding error:', e)
      return ''
    }
  }, [value, height, barWidth, includeText, resolvedBarColor, resolvedTextColor])

  if (!svgString) {
    return (
      <div className={`text-[10px] font-mono text-neutral-500 py-1 ${className}`} {...props}>
        [BARCODE: {value}]
      </div>
    )
  }

  return (
    <div
      className={`inline-flex flex-col items-center select-none ${className}`}
      dangerouslySetInnerHTML={{ __html: svgString }}
      {...props}
    />
  )
}
