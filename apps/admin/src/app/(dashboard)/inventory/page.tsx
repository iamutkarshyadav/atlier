import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus, ArrowLeftRight, FileText, Warehouse } from 'lucide-react'
import { Button } from '@repo/ui'
import { createServerSupabaseClient } from '@repo/supabase/server'
import { getCompleteInventory } from '@repo/supabase/utils'
import { InventoryDataGrid } from '@/components/InventoryDataGrid'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Multi-Location Inventory Matrix | Atelier ERP',
  description: 'Omnichannel inventory distribution, shelf-level WMS bin allocation, and variant matrix.',
}

export default async function InventoryPimPage() {
  const supabase = await createServerSupabaseClient()
  const initialProducts = await getCompleteInventory(supabase)

  return (
    <div className="space-y-4 font-mono pb-16">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-chrome-800 pb-3">
        <div>
          <h1 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <Warehouse className="w-4 h-4 text-emerald-400" />
            <span>Multi-Location Inventory Matrix</span>
          </h1>
          <p className="text-2xs text-zinc-400">
            Available-To-Promise (ATP) aggregation, shelf bin allocations, barcode labels, and safety thresholds
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/inventory/transfers">
            <Button
              variant="terminal"
              size="sm"
              className="h-7 px-2.5 text-2xs bg-chrome-900 text-zinc-300 border border-chrome-800 hover:bg-chrome-850 flex items-center gap-1.5"
            >
              <ArrowLeftRight className="w-3 h-3 text-amber-400" /> Stock Transfers
            </Button>
          </Link>
          <Link href="/inventory/ledger">
            <Button
              variant="terminal"
              size="sm"
              className="h-7 px-2.5 text-2xs bg-chrome-900 text-zinc-300 border border-chrome-800 hover:bg-chrome-850 flex items-center gap-1.5"
            >
              <FileText className="w-3 h-3 text-cyan-400" /> Audit Ledger
            </Button>
          </Link>
          <Link href="/inventory/new">
            <Button
              size="sm"
              className="h-7 px-3 text-2xs bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-none flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Launch Garment
            </Button>
          </Link>
        </div>
      </div>

      {/* Hierarchical Client Island Data Grid */}
      <InventoryDataGrid initialProducts={initialProducts} />
    </div>
  )
}
