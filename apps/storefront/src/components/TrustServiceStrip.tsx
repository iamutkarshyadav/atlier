'use client'

import React from 'react'
import { Zap, Truck, ShieldCheck, RotateCcw } from 'lucide-react'

export interface TrustItem {
  icon: React.ComponentType<{ className?: string }>
  title: string
  subtitle: string
  highlight?: boolean
}

export const TRUST_ITEMS: TrustItem[] = [
  {
    icon: Zap,
    title: 'Bolt Doorstep Try-On',
    subtitle: '45-min delivery • Try up to 5 items',
    highlight: true,
  },
  {
    icon: Truck,
    title: 'Free Express Shipping',
    subtitle: 'Complimentary across India over ₹1,999',
    highlight: false,
  },
  {
    icon: ShieldCheck,
    title: 'Zero Synthetic Fibers',
    subtitle: '100% Organic Cotton & Pure Selvedge',
    highlight: false,
  },
  {
    icon: RotateCcw,
    title: 'Seamless Size Exchange',
    subtitle: 'Hassle-free doorstep collection',
    highlight: false,
  },
]

export interface TrustServiceStripProps {
  className?: string
}

export function TrustServiceStrip({ className = '' }: TrustServiceStripProps) {
  return (
    <div className={`border-y border-[#d3d6db] bg-white py-6 sm:py-8 font-sans ${className}`}>
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center md:text-left">
          {TRUST_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <div key={item.title} className="flex flex-col md:flex-row items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 border ${
                    item.highlight
                      ? 'bg-[#fef2f2] border-[#fecaca]'
                      : 'bg-[#f8f8f8] border-[#d3d6db]'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      item.highlight
                        ? 'fill-[#b91c1c] text-[#b91c1c]'
                        : 'text-[#14293a]'
                    }`}
                  />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#14293a]">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-[#6c7079] mt-0.5">
                    {item.subtitle}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
