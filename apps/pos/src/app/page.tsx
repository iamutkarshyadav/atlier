'use client'

import React, { useState, useEffect } from 'react'

export default function PosTerminalPage() {
  const [storeCode, setStoreCode] = useState('STORE-BLR01')
  const [sku, setSku] = useState('HD-480-BLK-M')
  const [stock, setStock] = useState<number | null>(null)
  const [loadingStock, setLoadingStock] = useState(false)
  const [checkoutStatus, setCheckoutStatus] = useState<string | null>(null)

  const fetchStock = async () => {
    setLoadingStock(true)
    try {
      const res = await fetch(`/api/stock?storeCode=${storeCode}&sku=${sku}`)
      const data = await res.json()
      if (data.success) {
        setStock(data.availableStock)
      } else {
        setStock(null)
      }
    } catch {
      setStock(null)
    } finally {
      setLoadingStock(false)
    }
  }

  useEffect(() => {
    fetchStock()
  }, [storeCode, sku])

  const handleCheckout = async () => {
    setCheckoutStatus('Queueing POS sale...')
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-store-code': storeCode,
        },
        body: JSON.stringify({
          storeCode,
          items: [{ sku, quantity: 1 }],
          paymentMethod: 'CASH',
        }),
      })
      const data = await res.json()
      if (res.ok || res.status === 202) {
        setCheckoutStatus(`Sale Queued! Order: ${data.orderNumber} (Job: ${data.jobId})`)
        setTimeout(fetchStock, 2500)
      } else {
        setCheckoutStatus(`Error: ${data.error}`)
      }
    } catch (err: any) {
      setCheckoutStatus(`Network error: ${err.message}`)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-8 font-mono space-y-6">
      <div className="border-b border-neutral-800 pb-4">
        <h1 className="text-xl font-bold uppercase tracking-wider text-emerald-400">
          Atelier Physical POS Terminal (Port 3002)
        </h1>
        <p className="text-xs text-neutral-400">
          Strict Ringfenced Retail Store Inventory & Offline-Tolerant Queue Ingestion
        </p>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 p-5 space-y-4">
        <div>
          <label className="text-xs uppercase text-neutral-400 block mb-1">
            Assigned Retail Location
          </label>
          <select
            value={storeCode}
            onChange={(e) => setStoreCode(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 p-2 text-sm text-white"
          >
            <option value="STORE-BLR01">STORE-BLR01 (Indiranagar Boutique)</option>
            <option value="STORE-MUM01">STORE-MUM01 (Kala Ghoda Boutique)</option>
          </select>
        </div>

        <div>
          <label className="text-xs uppercase text-neutral-400 block mb-1">
            Garment SKU
          </label>
          <input
            type="text"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 p-2 text-sm text-white"
          />
        </div>

        <div className="flex items-center justify-between border-t border-neutral-800 pt-4">
          <span className="text-xs uppercase text-neutral-400">Ringfenced Retail Stock:</span>
          <span className="text-lg font-bold text-white tabular-nums">
            {loadingStock ? 'Checking...' : stock !== null ? `${stock} units` : 'N/A'}
          </span>
        </div>

        <button
          onClick={handleCheckout}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold p-3 text-xs uppercase tracking-wider cursor-pointer"
        >
          Checkout 1 Unit (POS Sale)
        </button>

        {checkoutStatus && (
          <p className="text-xs text-amber-300 border border-amber-500/20 bg-amber-950/20 p-2">
            {checkoutStatus}
          </p>
        )}
      </div>
    </div>
  )
}

