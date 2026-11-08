'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Barcode as BarcodeIcon,
  Printer,
  Copy,
  Check,
  RefreshCw,
  Tag,
  MapPin,
  FileText,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
} from 'lucide-react'
import { Button, Barcode } from '@repo/ui'
import { createBrowserClient } from '@repo/supabase/browser'
import {
  getAllProductsAdmin,
  getProductVariants,
  getLocations,
  getLocationShelves,
  type Product,
  type ProductVariant,
  type StoreLocation,
  type Shelf,
} from '@repo/supabase/utils'
import { useLocation } from '@/context/LocationContext'

// ==========================================
// GS1 EAN-13 Modulo-10 Checksum Algorithm
// ==========================================
function calculateEan13CheckDigit(twelveDigits: string): number {
  const digits = twelveDigits.replace(/\D/g, '').slice(0, 12).split('').map(Number)
  if (digits.length < 12) return 0
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += digits[i]! * (i % 2 === 0 ? 1 : 3)
  }
  const rem = sum % 10
  return rem === 0 ? 0 : 10 - rem
}

function formatEan13(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  const base = (digits + '890123456789').slice(0, 12)
  const check = calculateEan13CheckDigit(base)
  return `${base}${check}`
}

function isEan13Valid(thirteenDigits: string): boolean {
  const clean = thirteenDigits.replace(/\D/g, '')
  if (clean.length !== 13) return false
  const base = clean.slice(0, 12)
  const actualCheck = parseInt(clean[12]!, 10)
  const expectedCheck = calculateEan13CheckDigit(base)
  return actualCheck === expectedCheck
}

export default function BarcodeStudioPage() {
  const { activeLocationCode, locations } = useLocation()
  const [activeTab, setActiveTab] = useState<'hangtags' | 'shelves' | 'documents'>('hangtags')

  // Catalog State for Hangtags
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [selectedVariantId, setSelectedVariantId] = useState<string>('')
  const [hangtagSize, setHangtagSize] = useState<'standard' | 'compact'>('standard') // 50x25mm vs 38x25mm
  const [symbologyMode, setSymbologyMode] = useState<'EAN13' | 'CODE128'>('EAN13')
  const [customEanPrefix, setCustomEanPrefix] = useState('890450128901')
  const [hsnCode, setHsnCode] = useState('620442')
  const [batchCount, setBatchCount] = useState(24)
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false)

  // Shelf Labels State
  const [selectedLocationCode, setSelectedLocationCode] = useState(activeLocationCode || 'BLR-WH01')
  const [shelves, setShelves] = useState<Shelf[]>([])
  const [selectedShelfId, setSelectedShelfId] = useState<string>('')

  // Document & Custom Barcode State
  const [customPayload, setCustomPayload] = useState('PO-2026-001')
  const [barcodeHeight, setBarcodeHeight] = useState(48)
  const [barcodeBarWidth, setBarcodeBarWidth] = useState(1.8)
  const [includeText, setIncludeText] = useState(true)
  const [barcodeTheme, setBarcodeTheme] = useState<'terminal' | 'light' | 'print'>('light')

  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Load Catalog & Shelves
  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      try {
        const supabase = createBrowserClient()
        const [allProds, allLocs] = await Promise.all([
          getAllProductsAdmin(supabase),
          getLocations(supabase),
        ])

        setProducts(allProds)
        if (allProds.length > 0) {
          const firstProd = allProds[0]!
          setSelectedProductId(firstProd.id)
          const prodVariants = await getProductVariants(supabase, firstProd.id)
          setVariants(prodVariants)
          if (prodVariants.length > 0) {
            setSelectedVariantId(prodVariants[0]!.id)
          }
        }

        // Load Shelves for location
        const targetLoc = allLocs.find((l) => l.code === selectedLocationCode) || allLocs[0]
        if (targetLoc) {
          const locShelves = await getLocationShelves(supabase, targetLoc.id)
          setShelves(locShelves)
          if (locShelves.length > 0) {
            setSelectedShelfId(locShelves[0]!.id)
          }
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [selectedLocationCode])

  // Handle Product Change
  const handleProductChange = async (productId: string) => {
    setSelectedProductId(productId)
    const supabase = createBrowserClient()
    const prodVariants = await getProductVariants(supabase, productId)
    setVariants(prodVariants)
    if (prodVariants.length > 0) {
      setSelectedVariantId(prodVariants[0]!.id)
    }
  }

  // Selected product & variant entities
  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) || products[0] || null,
    [products, selectedProductId]
  )

  const selectedVariant = useMemo(
    () => variants.find((v) => v.id === selectedVariantId) || variants[0] || null,
    [variants, selectedVariantId]
  )

  // Selected Shelf entity
  const selectedShelf = useMemo(
    () => shelves.find((s) => s.id === selectedShelfId) || shelves[0] || null,
    [shelves, selectedShelfId]
  )

  // EAN-13 Checksum for currently selected item
  const computedEan13 = useMemo(() => {
    if (symbologyMode === 'CODE128') {
      return selectedVariant?.sku || selectedProduct?.title || 'ATELIER-01'
    }
    return formatEan13(customEanPrefix)
  }, [symbologyMode, customEanPrefix, selectedVariant, selectedProduct])

  const isEanValid = useMemo(() => {
    if (symbologyMode === 'CODE128') return true
    return isEan13Valid(computedEan13)
  }, [symbologyMode, computedEan13])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="space-y-4 font-mono pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-chrome-800 pb-3">
        <div>
          <h1 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <BarcodeIcon className="w-4 h-4 text-emerald-400" />
            <span>Dual-Symbology Barcode Studio & Thermal Print Engine</span>
          </h1>
          <p className="text-2xs text-zinc-400">
            Generate GS1 EAN-13 and Code-128 vectors for garment hangtags, warehouse shelf racks, and document challans
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => window.print()}
            className="h-7 px-3 text-2xs bg-zinc-100 hover:bg-white text-zinc-950 font-bold flex items-center gap-1.5 rounded-none"
          >
            <Printer className="w-3.5 h-3.5" /> Quick Print
          </Button>
        </div>
      </div>

      {/* 3 Operational Tabs */}
      <div className="flex border-b border-chrome-800 bg-chrome-950">
        <button
          onClick={() => setActiveTab('hangtags')}
          className={`flex items-center gap-2 px-4 py-2 text-2xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
            activeTab === 'hangtags'
              ? 'border-emerald-400 text-emerald-400 bg-chrome-900'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>1. Garment Hangtag Studio (50x25mm & 38x25mm)</span>
        </button>

        <button
          onClick={() => setActiveTab('shelves')}
          className={`flex items-center gap-2 px-4 py-2 text-2xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
            activeTab === 'shelves'
              ? 'border-emerald-400 text-emerald-400 bg-chrome-900'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>2. Warehouse Shelf Rack Labels (75x50mm)</span>
        </button>

        <button
          onClick={() => setActiveTab('documents')}
          className={`flex items-center gap-2 px-4 py-2 text-2xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
            activeTab === 'documents'
              ? 'border-emerald-400 text-emerald-400 bg-chrome-900'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>3. Document & Tote Barcodes</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: GARMENT HANGTAG STUDIO */}
      {/* ========================================================= */}
      {activeTab === 'hangtags' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Controls Column */}
          <div className="lg:col-span-6 bg-chrome-900 border border-chrome-800 p-4 space-y-4">
            <h2 className="text-2xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" /> Hangtag Specifications
            </h2>

            {/* Product Selector */}
            <div className="space-y-1">
              <label className="text-3xs uppercase tracking-wider text-zinc-400 font-semibold block">
                Select Garment Style *
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => handleProductChange(e.target.value)}
                className="w-full bg-chrome-950 border border-chrome-750 px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-400"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} (${Number(p.price).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            {/* Variant / Size Selector */}
            <div className="space-y-1">
              <label className="text-3xs uppercase tracking-wider text-zinc-400 font-semibold block">
                Size & Color Variant *
              </label>
              <select
                value={selectedVariantId}
                onChange={(e) => setSelectedVariantId(e.target.value)}
                className="w-full bg-chrome-950 border border-chrome-750 px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-400 font-mono"
              >
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    Size {v.size} {v.color ? `(${v.color})` : ''} — SKU: {v.sku}
                  </option>
                ))}
              </select>
            </div>

            {/* Symbology Standard Switch */}
            <div className="grid grid-cols-2 gap-3 text-2xs">
              <div className="space-y-1">
                <label className="text-3xs uppercase text-zinc-400 font-semibold block">
                  Symbology Standard
                </label>
                <select
                  value={symbologyMode}
                  onChange={(e) => setSymbologyMode(e.target.value as any)}
                  className="w-full bg-chrome-950 border border-chrome-750 px-2 py-1 text-zinc-200 focus:outline-none"
                >
                  <option value="EAN13">GS1 EAN-13 (Standard Retail)</option>
                  <option value="CODE128">Code-128 (Direct SKU Alpha)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-3xs uppercase text-zinc-400 font-semibold block">
                  Hangtag Dimensions
                </label>
                <select
                  value={hangtagSize}
                  onChange={(e) => setHangtagSize(e.target.value as any)}
                  className="w-full bg-chrome-950 border border-chrome-750 px-2 py-1 text-zinc-200 focus:outline-none"
                >
                  <option value="standard">50 x 25 mm (Standard Luxury)</option>
                  <option value="compact">38 x 25 mm (Compact Swing Ticket)</option>
                </select>
              </div>
            </div>

            {/* GS1 Payload or SKU string */}
            {symbologyMode === 'EAN13' ? (
              <div className="space-y-1">
                <div className="flex justify-between items-center text-3xs">
                  <span className="uppercase text-zinc-400 font-semibold">12-Digit EAN Prefix:</span>
                  <span className="text-emerald-400 font-mono font-bold">
                    Check Digit: {calculateEan13CheckDigit(customEanPrefix)} (Modulo-10)
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={12}
                  value={customEanPrefix}
                  onChange={(e) => setCustomEanPrefix(e.target.value.replace(/\D/g, ''))}
                  placeholder="890123456789"
                  className="w-full bg-chrome-950 border border-chrome-750 px-2.5 py-1.5 text-xs text-zinc-100 font-mono focus:outline-none tabular-nums"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <span className="text-3xs uppercase text-zinc-400 font-semibold block">
                  Code-128 Payload (Garment SKU):
                </span>
                <input
                  type="text"
                  value={selectedVariant?.sku || ''}
                  readOnly
                  className="w-full bg-chrome-950 border border-chrome-800 px-2.5 py-1.5 text-xs text-zinc-400 font-mono select-all"
                />
              </div>
            )}

            {/* HSN & Regulatory Info */}
            <div className="grid grid-cols-2 gap-3 text-2xs">
              <div className="space-y-1">
                <label className="text-3xs uppercase text-zinc-400 font-semibold block">HSN Code</label>
                <input
                  type="text"
                  value={hsnCode}
                  onChange={(e) => setHsnCode(e.target.value)}
                  className="w-full bg-chrome-950 border border-chrome-750 px-2 py-1 text-zinc-200 focus:outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-3xs uppercase text-zinc-400 font-semibold block">Mfg Date</label>
                <input
                  type="text"
                  defaultValue="11/2026"
                  className="w-full bg-chrome-950 border border-chrome-750 px-2 py-1 text-zinc-200 focus:outline-none font-mono"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-between border-t border-chrome-800">
              <Button
                variant="terminal"
                size="sm"
                onClick={() => copyToClipboard(computedEan13)}
                className="h-7 text-2xs flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Barcode String'}</span>
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={() => setIsBatchModalOpen(true)}
                className="h-7 text-2xs bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold flex items-center gap-1.5 rounded-none"
              >
                <Layers className="w-3.5 h-3.5" /> Batch Print Sheet (24 Stickers)
              </Button>
            </div>
          </div>

          {/* Hangtag Live Preview Column */}
          <div className="lg:col-span-6 bg-chrome-900 border border-chrome-800 p-6 flex flex-col items-center justify-center">
            <span className="text-3xs uppercase text-zinc-400 tracking-wider font-semibold mb-4 block">
              Live Thermal Hangtag Vector Preview ({hangtagSize === 'standard' ? '50 x 25 mm' : '38 x 25 mm'})
            </span>

            {/* Physical Hangtag Sticker Card */}
            <div
              id="hangtag-sticker"
              className={`bg-white text-black font-sans p-3 border-2 border-black select-none shadow-2xl flex flex-col justify-between ${
                hangtagSize === 'standard' ? 'w-[75mm] min-h-[42mm]' : 'w-[60mm] min-h-[35mm]'
              }`}
            >
              {/* Header */}
              <div className="border-b border-black pb-1 flex justify-between items-start">
                <div>
                  <h3 className="font-serif font-black tracking-widest text-xs uppercase leading-none">
                    ATELIER DE COUTURE
                  </h3>
                  <p className="text-[7.5px] uppercase font-bold text-zinc-700 tracking-wider mt-0.5">
                    PARIS &bull; BENGALURU &bull; TOKYO
                  </p>
                </div>
                <div className="text-right text-[8px] font-mono font-bold">
                  <div>HSN: {hsnCode}</div>
                  <div className="text-[7px] text-zinc-600">MFG: 11/2026</div>
                </div>
              </div>

              {/* Garment Details */}
              <div className="py-1 text-left space-y-0.5">
                <div className="text-[10px] font-bold text-black truncate leading-tight">
                  {selectedProduct?.title || 'Luxury Garment Piece'}
                </div>
                <div className="flex justify-between items-center text-[9px] font-mono">
                  <span>
                    SIZE: <strong className="font-black text-[11px]">{selectedVariant?.size || 'M'}</strong>
                    {selectedVariant?.color ? ` (${selectedVariant.color})` : ''}
                  </span>
                  <span className="font-semibold text-zinc-700">{selectedVariant?.sku}</span>
                </div>
              </div>

              {/* Vector Barcode */}
              <div className="flex flex-col items-center justify-center py-1 bg-white">
                <Barcode
                  value={computedEan13}
                  height={32}
                  width={hangtagSize === 'standard' ? 1.6 : 1.3}
                  theme="print"
                  displayValue={false}
                />
                <span className="text-[9px] font-mono font-black tracking-widest mt-0.5">
                  {computedEan13}
                </span>
              </div>

              {/* Footer MRP */}
              <div className="border-t border-black pt-1 flex justify-between items-center text-[9px]">
                <span className="font-bold">MRP (INCL. ALL TAXES)</span>
                <span className="font-black text-xs font-mono tabular-nums">
                  ${Number(selectedProduct?.price || 165).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => window.print()}
                className="bg-zinc-100 hover:bg-white text-zinc-950 font-bold rounded-none text-2xs flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Print Single Sticker
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: WAREHOUSE SHELF RACK LABELS */}
      {/* ========================================================= */}
      {activeTab === 'shelves' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Controls */}
          <div className="lg:col-span-5 bg-chrome-900 border border-chrome-800 p-4 space-y-4">
            <h2 className="text-2xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" /> Shelf Coordinate Selector
            </h2>

            <div className="space-y-1">
              <label className="text-3xs uppercase text-zinc-400 font-semibold block">Warehouse Location</label>
              <select
                value={selectedLocationCode}
                onChange={(e) => setSelectedLocationCode(e.target.value)}
                className="w-full bg-chrome-950 border border-chrome-750 px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.code}>
                    {loc.code} — {loc.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-3xs uppercase text-zinc-400 font-semibold block">
                Target Shelf Bin ({shelves.length} Shelves Available)
              </label>
              <select
                value={selectedShelfId}
                onChange={(e) => setSelectedShelfId(e.target.value)}
                className="w-full bg-chrome-950 border border-chrome-750 px-2.5 py-1.5 text-xs text-cyan-300 font-mono focus:outline-none"
              >
                {shelves.map((sh) => (
                  <option key={sh.id} value={sh.id}>
                    {sh.coordinate} — Cap: {sh.max_unit_capacity || 50} units
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 bg-chrome-950 border border-chrome-800 space-y-2 text-2xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Rack Coordinate:</span>
                <span className="font-bold text-zinc-200">{selectedShelf?.coordinate || 'BLK-A-01-A1'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Max Unit Capacity:</span>
                <span className="font-bold text-zinc-200">{selectedShelf?.max_unit_capacity || 50} Garments</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Encoded Barcode:</span>
                <span className="font-mono text-cyan-300">LOC-{selectedShelf?.coordinate || 'BLK-A-01-A1'}</span>
              </div>
            </div>

            <Button
              variant="default"
              size="sm"
              onClick={() => window.print()}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold rounded-none flex items-center justify-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" /> Print 75x50mm Thermal Rack Label
            </Button>
          </div>

          {/* 75x50mm Rack Label Preview */}
          <div className="lg:col-span-7 bg-chrome-900 border border-chrome-800 p-6 flex flex-col items-center justify-center">
            <span className="text-3xs uppercase text-zinc-400 tracking-wider font-semibold mb-4 block">
              75 x 50 mm High-Visibility Industrial Shelf Label
            </span>

            {/* Physical 75x50mm Surface */}
            <div
              id="shelf-rack-label"
              className="bg-white text-black p-4 border-4 border-black select-none shadow-2xl font-mono text-center flex flex-col justify-between"
              style={{ width: '85mm', minHeight: '52mm' }}
            >
              <div className="flex justify-between items-center border-b-2 border-black pb-1 text-[9px] uppercase font-black">
                <span>ATELIER WMS &bull; {selectedLocationCode}</span>
                <span className="bg-black text-white px-1.5 py-0.2">CAP: {selectedShelf?.max_unit_capacity || 50}</span>
              </div>

              {/* Giant Coordinate */}
              <div className="py-2">
                <div className="text-3xl font-black tracking-tight text-black">
                  {selectedShelf?.coordinate || 'BLK-A-01-A1'}
                </div>
                <div className="text-[9px] uppercase font-bold tracking-wider text-zinc-700">
                  STORAGE ZONE BIN LOCATION
                </div>
              </div>

              {/* Barcode */}
              <div className="flex flex-col items-center justify-center bg-white pt-1">
                <Barcode
                  value={`LOC-${selectedShelf?.coordinate || 'BLK-A-01-A1'}`}
                  height={38}
                  width={2.2}
                  theme="print"
                  displayValue={false}
                />
                <span className="text-[10px] font-black tracking-widest mt-0.5">
                  LOC-{selectedShelf?.coordinate || 'BLK-A-01-A1'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: DOCUMENT & CUSTOM BARCODES */}
      {/* ========================================================= */}
      {activeTab === 'documents' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-6 bg-chrome-900 border border-chrome-800 p-4 space-y-4">
            <h2 className="text-2xs font-bold uppercase tracking-wider text-zinc-300">
              Symbology Parameter Controls
            </h2>

            {/* Presets */}
            <div className="space-y-1.5">
              <span className="text-3xs uppercase text-zinc-400 font-semibold block">Quick Presets:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'Purchase Order', val: 'PO-2026-001' },
                  { label: 'GRN Putaway', val: 'GRN-2026-001' },
                  { label: 'Stock Transfer', val: 'TRF-2026-001' },
                  { label: 'Warehouse Tote', val: 'TOTE-042' },
                  { label: 'POS Register Shift', val: 'SHIFT-BLR-01' },
                ].map((p) => (
                  <button
                    key={p.val}
                    onClick={() => setCustomPayload(p.val)}
                    className="px-2 py-0.5 bg-chrome-950 hover:bg-chrome-800 border border-chrome-750 text-3xs text-zinc-300"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input */}
            <div className="space-y-1">
              <label className="text-3xs uppercase text-zinc-400 font-semibold block">
                Payload String *
              </label>
              <input
                type="text"
                value={customPayload}
                onChange={(e) => setCustomPayload(e.target.value.toUpperCase())}
                className="w-full bg-chrome-950 border border-chrome-750 px-2.5 py-1.5 text-xs text-zinc-100 font-mono uppercase focus:outline-none"
              />
            </div>

            {/* Sliders */}
            <div className="grid grid-cols-2 gap-3 text-2xs">
              <div className="space-y-1">
                <div className="flex justify-between text-3xs text-zinc-400 font-semibold">
                  <span>Height:</span>
                  <span>{barcodeHeight}px</span>
                </div>
                <input
                  type="range"
                  min="24"
                  max="80"
                  value={barcodeHeight}
                  onChange={(e) => setBarcodeHeight(Number(e.target.value))}
                  className="w-full accent-emerald-400"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-3xs text-zinc-400 font-semibold">
                  <span>Bar Width:</span>
                  <span>{barcodeBarWidth}px</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.2"
                  value={barcodeBarWidth}
                  onChange={(e) => setBarcodeBarWidth(Number(e.target.value))}
                  className="w-full accent-emerald-400"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 text-2xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeText}
                  onChange={(e) => setIncludeText(e.target.checked)}
                  className="accent-emerald-400"
                />
                <span className="text-zinc-300">Show Human-Readable Text</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-zinc-400">Theme:</span>
                <select
                  value={barcodeTheme}
                  onChange={(e) => setBarcodeTheme(e.target.value as any)}
                  className="bg-chrome-950 border border-chrome-750 px-2 py-0.5 text-2xs text-zinc-200 focus:outline-none"
                >
                  <option value="light">Light (Black on White)</option>
                  <option value="terminal">Terminal (White on Black)</option>
                  <option value="print">Print (Pure Monochrome)</option>
                </select>
              </label>
            </div>
          </div>

          {/* Preview */}
          <div className="lg:col-span-6 bg-chrome-900 border border-chrome-800 p-6 flex flex-col items-center justify-center">
            <span className="text-3xs uppercase text-zinc-400 tracking-wider font-semibold mb-4 block">
              Vector Barcode Payload Rendering
            </span>

            <div className="p-6 bg-white border border-zinc-300 shadow-xl flex flex-col items-center justify-center min-w-[280px]">
              <Barcode
                value={customPayload || 'ATELIER-01'}
                height={barcodeHeight}
                width={barcodeBarWidth}
                theme={barcodeTheme}
                displayValue={includeText}
              />
            </div>

            <div className="mt-4 flex gap-2">
              <Button
                variant="terminal"
                size="sm"
                onClick={() => copyToClipboard(customPayload)}
                className="text-2xs flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy String'}</span>
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={() => window.print()}
                className="bg-zinc-100 hover:bg-white text-zinc-950 font-bold rounded-none text-2xs flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Print Thermal Test Label
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* BATCH PRINT SHEET MODAL (24 Hangtags per A4 Page) */}
      {/* ========================================================= */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-chrome-900 border border-chrome-800 p-4 max-w-4xl w-full font-mono text-xs space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-chrome-800 pb-2">
              <span className="font-semibold text-zinc-100 flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-emerald-400" /> Batch Hangtag Print Sheet ({batchCount} Stickers)
              </span>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-200 font-bold"
              >
                ✕
              </button>
            </div>

            {/* A4 Sticker Sheet Container */}
            <div
              id="batch-hangtag-sheet"
              className="bg-white text-black p-4 border border-zinc-300 font-sans grid grid-cols-2 sm:grid-cols-3 gap-2 overflow-y-auto max-h-[65vh]"
            >
              {Array.from({ length: batchCount }).map((_, idx) => (
                <div
                  key={idx}
                  className="border border-black p-2 text-[9px] flex flex-col justify-between select-none"
                  style={{ minHeight: '34mm' }}
                >
                  <div className="flex justify-between items-start border-b border-black pb-0.5">
                    <span className="font-serif font-black uppercase text-[9px]">ATELIER</span>
                    <span className="font-mono font-bold text-[7.5px]">{selectedVariant?.sku}</span>
                  </div>
                  <div className="py-0.5">
                    <div className="font-bold truncate text-[8.5px]">{selectedProduct?.title}</div>
                    <div className="flex justify-between text-[8px] font-mono">
                      <span>SIZE: {selectedVariant?.size || 'M'}</span>
                      <span>${Number(selectedProduct?.price || 165).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    <Barcode
                      value={computedEan13}
                      height={24}
                      width={1.2}
                      theme="print"
                      displayValue={false}
                    />
                    <span className="text-[7.5px] font-mono font-bold">{computedEan13}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-chrome-800 text-2xs">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400">Total Stickers:</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={batchCount}
                  onChange={(e) => setBatchCount(Number(e.target.value))}
                  className="w-16 bg-chrome-950 border border-chrome-750 px-2 py-0.5 text-zinc-100 font-mono"
                />
              </div>

              <div className="flex gap-2">
                <Button variant="terminal" size="sm" onClick={() => setIsBatchModalOpen(false)}>
                  Close
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => window.print()}
                  className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-none flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Print A4 Sheet
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
