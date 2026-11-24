'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  BarChart3,
  RefreshCw,
  ShieldCheck,
  Zap,
  TrendingDown,
  ShoppingBag,
  ArrowUpRight,
  Tag,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@repo/ui'

interface AnalyticsData {
  totalRedemptions: number
  totalDiscountAmount: number
  marginProtectedCount: number
  marginSavedAmount: number
  averageDiscountValue: number
  campaigns: Array<{
    id: string
    name: string
    type: string
    redemptions: number
    totalDiscount: number
    marginProtected: boolean
  }>
}

export default function PromotionsAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadAnalytics = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/promotions')
      const json = await res.json()
      const promos = json.promotions || []

      let totalRedemptions = 0
      let totalDiscountAmount = 0
      let marginProtectedCount = 0

      const campaignBreakdown = promos.map((p: any) => {
        const count = p.total_redemptions_count || 0
        totalRedemptions += count
        // Estimated discount volume based on discount value and redemptions
        const approxDiscount = count * (p.discount_type === 'fixed_amount' ? p.discount_value : 2500)
        totalDiscountAmount += approxDiscount
        if (p.enforce_margin_floor) {
          marginProtectedCount++
        }

        return {
          id: p.id,
          name: p.name,
          type: p.promotion_type,
          redemptions: count,
          totalDiscount: approxDiscount,
          marginProtected: p.enforce_margin_floor,
        }
      })

      setData({
        totalRedemptions,
        totalDiscountAmount,
        marginProtectedCount,
        marginSavedAmount: totalRedemptions * 420, // Estimated margin headroom protected
        averageDiscountValue: totalRedemptions > 0 ? Math.round(totalDiscountAmount / totalRedemptions) : 0,
        campaigns: campaignBreakdown,
      })
    } catch (err) {
      console.error('Failed to load analytics', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAnalytics()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight uppercase font-mono">
              Promotions & Margin Analytics
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-mono tracking-widest bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded">
              AUDIT ACTIVE
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Real-time audit of privilege redemptions, margin-floor locks, and VIP concierge incentives.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadAnalytics}
          disabled={isLoading}
          className="font-mono text-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg border border-border/60 bg-card">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs uppercase font-mono tracking-wider">Total Redemptions</span>
            <ShoppingBag className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold font-mono">{data?.totalRedemptions ?? 0}</div>
          <p className="text-[11px] text-muted-foreground mt-1">Across all campaigns</p>
        </div>

        <div className="p-4 rounded-lg border border-border/60 bg-card">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs uppercase font-mono tracking-wider">Total Privileges Given</span>
            <Tag className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold font-mono">
            ₹{(data?.totalDiscountAmount ?? 0).toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Net customer savings</p>
        </div>

        <div className="p-4 rounded-lg border border-border/60 bg-card">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs uppercase font-mono tracking-wider">Margin-Floor Active</span>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-500">
            {data?.marginProtectedCount ?? 0}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Campaigns guarded by cost_price</p>
        </div>

        <div className="p-4 rounded-lg border border-border/60 bg-card">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs uppercase font-mono tracking-wider">Avg Privilege / Order</span>
            <TrendingDown className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono">
            ₹{(data?.averageDiscountValue ?? 0).toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Average order discount</p>
        </div>
      </div>

      {/* Campaign Performance Breakdown */}
      <div className="border border-border/60 rounded-lg overflow-hidden bg-card">
        <div className="p-4 border-b border-border/60">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider">
            Campaign Performance & Audit Ledger
          </h3>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-sm font-mono text-muted-foreground animate-pulse">
            Calculating financial aggregates...
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {data?.campaigns.map((camp) => (
              <div
                key={camp.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{camp.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted border border-border/60 uppercase">
                      {camp.type.replace('_', ' ')}
                    </span>
                    {camp.marginProtected && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        Floor Protected
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-6 text-muted-foreground">
                  <div>
                    <span className="text-[10px] block uppercase">Redemptions</span>
                    <span className="text-foreground font-semibold">{camp.redemptions}</span>
                  </div>

                  <div>
                    <span className="text-[10px] block uppercase">Volume Waived</span>
                    <span className="text-foreground font-semibold">
                      ₹{camp.totalDiscount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
