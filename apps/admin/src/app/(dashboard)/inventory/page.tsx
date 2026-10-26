import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus, ArrowLeft } from 'lucide-react'
import { Button } from '@repo/ui'
import { createServerSupabaseClient } from '@repo/supabase/server'
import { getCompleteInventory } from '@repo/supabase/utils'
import { InventoryDataGrid } from '@/components/InventoryDataGrid'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Inventory & Variant Matrix | Atelier Gustavo Admin',
  description: 'Enterprise Variant-Aware Product Information Management & Warehouse Symbology Engine',
}

export default async function InventoryPimPage() {
  const supabase = await createServerSupabaseClient()
  const initialProducts = await getCompleteInventory(supabase)

  return (
    <div className="space-y-6 pb-24">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-[#23232A] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] tracking-widest uppercase text-neutral-400 font-mono font-bold">
              AMAZON-GRADE PIM • WAREHOUSE LOGISTICS
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] text-emerald-400 font-mono">CODE 128 ACTIVE</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-light text-white uppercase tracking-tight font-serif">
            Variant Matrix & Inventory Grid
          </h1>

          <p className="text-xs text-neutral-400 mt-1 font-sans max-w-2xl">
            Granular size-variant stock allocation, atomic RPC inline adjustments, visual Code 128 symbology, and direct thermal label printing for high-throughput fulfillment.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/inventory/new">
            <Button
              size="sm"
              className="bg-[#166534] hover:bg-[#14532d] text-white font-semibold text-xs border-none flex items-center gap-2 font-mono"
            >
              <Plus className="w-3.5 h-3.5" /> Launch New Garment
            </Button>
          </Link>
        </div>
      </div>

      {/* Hierarchical Client Island Data Grid */}
      <InventoryDataGrid initialProducts={initialProducts} />
    </div>
  )
}
