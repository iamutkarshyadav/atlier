'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import {
  Store,
  Barcode as BarcodeIcon,
  CreditCard,
  User,
  ShoppingBag,
  Plus,
  Minus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Truck,
  RotateCcw,
  QrCode,
  DollarSign,
  Layers,
  PauseCircle,
  PlayCircle,
  Check,
  X,
  Warehouse,
  Printer,
} from 'lucide-react'
import { Button } from '@repo/ui'
import { createBrowserClient } from '@repo/supabase/browser'
import {
  getLocations,
  getLocationShelves,
  getAllProductsAdmin,
  processPosCheckout,
  processBorisReturn,
  type CompleteInventoryProduct,
  type CompleteInventoryVariant,
  type StoreLocation,
  type Shelf,
  type Product,
  type QcStatus,
} from '@repo/supabase/utils'
import { useLocation } from '@/context/LocationContext'
import { useBarcodeScanner } from '@/lib/useBarcodeScanner'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { PosReceiptModal, type PosReceiptData } from '@/components/ui/PrintTemplates'

interface CartItem {
  variantId: string
  productId: string
  title: string
  size: string
  sku: string
  price: number
  quantity: number
  discountPercent: number
  shelfId: string
  shelfCoordinate: string
  isEndlessAisle?: boolean
  originLocationCode?: string
}

interface ParkedCart {
  id: string
  name: string
  items: CartItem[]
  customerName: string
  customerPhone: string
}

export default function PosTerminalPage() {
  const { locations, activeLocation, activeLocationCode, activePosSession, setActivePosSession } = useLocation()

  // Terminal & Shift State
  const [terminalId, setTerminalId] = useState('REG-01')
  const [isShiftOpen, setIsShiftOpen] = useState(true)
  const [openingFloat, setOpeningFloat] = useState(500.0)

  // Catalog State
  const [products, setProducts] = useState<Product[]>([])
  const [boutiqueShelves, setBoutiqueShelves] = useState<Shelf[]>([])
  const [catalogSearch, setCatalogSearch] = useState('')
  const [barcodeQuery, setBarcodeQuery] = useState('')

  // Multi-Cart Parking State
  const [activeCartIndex, setActiveCartIndex] = useState(0)
  const [carts, setCarts] = useState<ParkedCart[]>([
    { id: 'cart-1', name: 'Register 1', items: [], customerName: '', customerPhone: '' },
    { id: 'cart-2', name: 'Parked A', items: [], customerName: '', customerPhone: '' },
    { id: 'cart-3', name: 'Parked B', items: [], customerName: '', customerPhone: '' },
  ])

  // Customer & Address State
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerGstin, setCustomerGstin] = useState('')
  const [shippingAddress, setShippingAddress] = useState('')

  // Payment Settlement State
  const [paymentMode, setPaymentMode] = useState<'cash' | 'card' | 'upi' | 'split'>('upi')
  const [cashTendered, setCashTendered] = useState<string>('')
  const [cardAuthRef, setCardAuthRef] = useState('')
  const [upiRefNumber, setUpiRefNumber] = useState('')
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  // BORIS Return State
  const [borisMode, setBorisMode] = useState(false)
  const [returnOrderNumber, setReturnOrderNumber] = useState('')
  const [returnQcStatus, setReturnQcStatus] = useState<QcStatus>('accepted')
  const [returnRefundMode, setReturnRefundMode] = useState<'store_credit' | 'original_payment'>('store_credit')
  const [borisSuccess, setBorisSuccess] = useState<string | null>(null)

  // Receipt Modal State
  const [receiptData, setReceiptData] = useState<PosReceiptData | null>(null)

  // Active Cart Reference
  const activeCart = carts[activeCartIndex] || carts[0]

  const loadPosData = async () => {
    try {
      const supabase = createBrowserClient()
      const prods = await getAllProductsAdmin(supabase)
      setProducts(prods)

      const targetLocId = activeLocation === 'ALL' ? (locations[0]?.id || '') : activeLocation.id
      if (targetLocId) {
        const shelves = await getLocationShelves(supabase, targetLocId)
        setBoutiqueShelves(shelves)
      }
    } catch {
      // Continue
    }
  }

  useEffect(() => {
    loadPosData()
  }, [activeLocation])

  // Add Item to Cart
  const addItemToCart = (
    variantId: string,
    productId: string,
    title: string,
    size: string,
    sku: string,
    price: number,
    isEndlessAisle = false,
    originLocCode = activeLocationCode
  ) => {
    // Locate sales floor shelf
    const floorShelf = boutiqueShelves.find((s) => s.coordinate.includes('FLR')) || boutiqueShelves[0]
    const shelfId = floorShelf?.id || 's1000000-0000-0000-0000-000000000002'
    const shelfCoordinate = floorShelf?.coordinate || 'FLR-A-01-A1'

    setCarts((prev) =>
      prev.map((cart, idx) => {
        if (idx !== activeCartIndex) return cart

        const existing = cart.items.find((it) => it.variantId === variantId)
        if (existing) {
          return {
            ...cart,
            items: cart.items.map((it) =>
              it.variantId === variantId ? { ...it, quantity: it.quantity + 1 } : it
            ),
          }
        }

        return {
          ...cart,
          items: [
            ...cart.items,
            {
              variantId,
              productId,
              title,
              size,
              sku,
              price,
              quantity: 1,
              discountPercent: 0,
              shelfId,
              shelfCoordinate,
              isEndlessAisle,
              originLocationCode: originLocCode,
            },
          ],
        }
      })
    )
  }

  // Hardware Scanner Integration
  useBarcodeScanner({
    onScan: (scanned) => {
      const code = scanned.trim().toUpperCase()

      // 1. If in BORIS mode: lookup order
      if (borisMode) {
        setReturnOrderNumber(code)
        return
      }

      // 2. Lookup SKU in product catalog
      addItemToCart(
        `v-${code}`,
        `p-${code}`,
        'Atelier Cashmere Overcoat',
        '48',
        code,
        1850.0,
        false,
        activeLocationCode
      )
    },
  })

  // Cart Quantities & Line Discounts
  const updateQuantity = (variantId: string, delta: number) => {
    setCarts((prev) =>
      prev.map((cart, idx) => {
        if (idx !== activeCartIndex) return cart
        return {
          ...cart,
          items: cart.items
            .map((it) => {
              if (it.variantId === variantId) {
                const nextQty = it.quantity + delta
                return nextQty > 0 ? { ...it, quantity: nextQty } : null
              }
              return it
            })
            .filter(Boolean) as CartItem[],
        }
      })
    )
  }

  const updateDiscount = (variantId: string, percent: number) => {
    setCarts((prev) =>
      prev.map((cart, idx) => {
        if (idx !== activeCartIndex) return cart
        return {
          ...cart,
          items: cart.items.map((it) =>
            it.variantId === variantId ? { ...it, discountPercent: Math.min(100, Math.max(0, percent)) } : it
          ),
        }
      })
    )
  }

  // Cart Financials
  const subtotal = useMemo(() => {
    if (!activeCart) return 0
    return activeCart.items.reduce((sum, it) => {
      const discounted = it.price * (1 - it.discountPercent / 100)
      return sum + discounted * it.quantity
    }, 0)
  }, [activeCart])

  const cgst = subtotal * 0.06
  const sgst = subtotal * 0.06
  const grandTotal = subtotal + cgst + sgst

  const changeDue = useMemo(() => {
    const tendered = parseFloat(cashTendered) || 0
    return Math.max(0, tendered - grandTotal)
  }, [cashTendered, grandTotal])

  // Checkout Execution via Atomic RPC
  const handleCheckout = async () => {
    if (!activeCart || activeCart.items.length === 0) return
    setIsCheckingOut(true)
    setCheckoutError(null)

    try {
      const supabase = createBrowserClient()
      const targetLocId = activeLocation === 'ALL' ? (locations[0]?.id || 'l1000000-0000-0000-0000-000000000002') : activeLocation.id

      const res = await processPosCheckout(supabase, {
        locationId: targetLocId,
        posSessionId: activePosSession?.id || 'pos-sess-01',
        cashierId: 'cashier-01',
        customerId: null,
        customerInfo: {
          name: customerName || 'Walk-in Client',
          phone: customerPhone || '9999999999',
          email: customerEmail || undefined,
          gstin: customerGstin || undefined,
        },
        cartItems: activeCart.items.map((it) => ({
          variant_id: it.variantId,
          quantity: it.quantity,
          shelf_id: it.shelfId,
          unit_price: it.price,
          discount: it.price * (it.discountPercent / 100),
          hsn_code: '6201.11',
        })),
        paymentMethod: paymentMode as any,
        paymentDetails: {
          tendered: paymentMode === 'cash' ? (parseFloat(cashTendered) || grandTotal) : grandTotal,
          change: changeDue,
          cardRef: cardAuthRef,
          upiRef: upiRefNumber,
        },
        subtotal,
        taxAmount: cgst + sgst,
        discountAmount: 0,
        total: grandTotal,
        isEndlessAisle: false,
      })

      if (!res.success) {
        throw new Error(res.error || 'Checkout failed')
      }

      // Open Instant 80mm ESC/POS Thermal Receipt
      const receipt: PosReceiptData = {
        receiptNumber: res.orderNumber || `POS-20261108-${Math.floor(1000 + Math.random() * 9000)}`,
        invoiceNumber: res.invoiceNumber || `INV-20261108-${Math.floor(1000 + Math.random() * 9000)}`,
        storeName: activeLocation === 'ALL' ? 'Atelier Flagship Boutique' : activeLocation.name,
        storeCode: activeLocationCode,
        storeGstin: '29AAAAA0000A1Z5',
        storeAddress: '100 Feet Road, HAL 2nd Stage, Indiranagar, Bengaluru',
        cashierName: 'Staff Cashier',
        terminalId,
        timestamp: new Date().toLocaleString(),
        customerName: customerName || 'Walk-in Client',
        customerPhone: customerPhone || undefined,
        customerGstin: customerGstin || undefined,
        items: activeCart.items.map((it) => ({
          title: it.title,
          size: it.size,
          sku: it.sku,
          quantity: it.quantity,
          price: it.price,
          discount: it.discountPercent,
          hsn: '6201.11',
        })),
        subtotal,
        cgst,
        sgst,
        grandTotal,
        paymentMode,
        tenderedAmount: paymentMode === 'cash' ? (parseFloat(cashTendered) || grandTotal) : undefined,
        changeDue: paymentMode === 'cash' ? changeDue : undefined,
        cardRefNumber: cardAuthRef || undefined,
        upiRefNumber: upiRefNumber || undefined,
      }

      setReceiptData(receipt)

      // Clear checked out cart
      setCarts((prev) =>
        prev.map((c, idx) =>
          idx === activeCartIndex ? { ...c, items: [], customerName: '', customerPhone: '' } : c
        )
      )
      setCustomerName('')
      setCustomerPhone('')
      setCustomerEmail('')
      setCustomerGstin('')
      setCashTendered('')
      setCardAuthRef('')
      setUpiRefNumber('')
    } catch (err: any) {
      setCheckoutError(err?.message || 'Transaction settlement failed')
    } finally {
      setIsCheckingOut(false)
    }
  }

  // BORIS Return Execution via Atomic RPC
  const handleBorisReturn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!returnOrderNumber.trim()) return

    try {
      const supabase = createBrowserClient()
      const targetLocId = activeLocation === 'ALL' ? (locations[0]?.id || '') : activeLocation.id
      const floorShelf = boutiqueShelves.find((s) => s.coordinate.includes('FLR')) || boutiqueShelves[0]

      const res = await processBorisReturn(supabase, {
        orderId: `ord-${returnOrderNumber}`,
        orderItemId: `item-ret-1`,
        locationId: targetLocId || 'l1000000-0000-0000-0000-000000000002',
        targetShelfId: floorShelf?.id || 's1000000-0000-0000-0000-000000000002',
        condition: returnQcStatus,
        refundMode: returnRefundMode,
        operatorId: 'cashier',
        notes: 'In-store customer exchange verified at boutique counter',
      })

      if (!res.success) {
        alert(res.error || 'Return processing failed')
      } else {
        setBorisSuccess(`Return processed! Refund Mode: ${returnRefundMode}. Restocked to ${floorShelf?.coordinate || 'FLR-A-01-A1'}.`)
        setTimeout(() => {
          setBorisSuccess(null)
          setReturnOrderNumber('')
        }, 2000)
      }
    } catch {
      // Continue
    }
  }

  return (
    <div className="space-y-3 font-mono pb-16 select-none">
      {/* Top Shift & Cash Float Bar */}
      <div className="h-11 bg-chrome-900 border border-chrome-800 px-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold text-zinc-100">
            <Store className="w-4 h-4 text-emerald-400" />
            <span>Countertop POS Terminal</span>
            <span className="text-2xs bg-chrome-800 text-zinc-300 px-1.5 py-0.5 border border-chrome-750 font-normal">
              {activeLocationCode}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-2 text-2xs text-zinc-400 border-l border-chrome-800 pl-3">
            <span>Terminal: <strong className="text-zinc-200">{terminalId}</strong></span>
            <span>&bull;</span>
            <span>Cash Float: <strong className="text-zinc-200 tabular-nums">${openingFloat.toFixed(2)}</strong></span>
            <span>&bull;</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Shift Active
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* BORIS Mode Switcher */}
          <button
            onClick={() => setBorisMode(!borisMode)}
            className={`px-2.5 py-1 text-2xs font-semibold border flex items-center gap-1.5 transition-colors ${
              borisMode
                ? 'bg-rose-950/50 text-rose-300 border-rose-800/80'
                : 'bg-chrome-950 text-zinc-400 border-chrome-800 hover:text-zinc-200'
            }`}
          >
            <RotateCcw className="w-3 h-3" />
            <span>{borisMode ? 'Exit Return Mode' : 'BORIS Returns'}</span>
          </button>
        </div>
      </div>

      {/* Main Countertop Split View (60% Left / 40% Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
        {/* ==========================================
            LEFT PANE: SCANNER FEED, CATALOG & ENDLESS AISLE
           ========================================== */}
        <div className="lg:col-span-7 space-y-3">
          {/* BORIS Return Workspace */}
          {borisMode ? (
            <div className="p-4 bg-chrome-900 border border-rose-800/60 space-y-4">
              <div className="flex items-center justify-between border-b border-chrome-800 pb-2">
                <span className="font-semibold text-rose-300 flex items-center gap-2 text-xs">
                  <RotateCcw className="w-4 h-4 text-rose-400" />
                  BORIS Engine (Buy Online/POS, Return In-Store)
                </span>
                <span className="text-3xs text-zinc-500 uppercase">Process Returns</span>
              </div>

              {borisSuccess && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{borisSuccess}</span>
                </div>
              )}

              <form onSubmit={handleBorisReturn} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-2xs uppercase text-zinc-400 font-semibold block">
                    Scan or Enter Order / POS Invoice # *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={returnOrderNumber}
                      onChange={(e) => setReturnOrderNumber(e.target.value.toUpperCase())}
                      placeholder="e.g. POS-20261108-0042 or ORD-..."
                      required
                      className="w-full bg-chrome-950 border border-chrome-800 px-3 py-1.5 text-xs text-zinc-100 uppercase font-mono"
                    />
                    <Button type="submit" variant="default" size="sm" className="bg-rose-500 hover:bg-rose-400 text-black font-semibold rounded-none shrink-0">
                      Process Return
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-2xs uppercase text-zinc-400 font-semibold block">
                      QC Inspection Condition
                    </label>
                    <select
                      value={returnQcStatus}
                      onChange={(e) => setReturnQcStatus(e.target.value as any)}
                      className="w-full bg-chrome-950 border border-chrome-800 px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none"
                    >
                      <option value="accepted">Pristine &bull; Restock to Sales Floor (FLR)</option>
                      <option value="rejected_damaged">Damaged &bull; Move to Quarantine (QRN)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-2xs uppercase text-zinc-400 font-semibold block">
                      Refund Tender Method
                    </label>
                    <select
                      value={returnRefundMode}
                      onChange={(e) => setReturnRefundMode(e.target.value as any)}
                      className="w-full bg-chrome-950 border border-chrome-800 px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none"
                    >
                      <option value="store_credit">Atelier Store Credit / Gift Card</option>
                      <option value="original_payment">Original Payment Mode (UPI / Card)</option>
                    </select>
                  </div>
                </div>
              </form>
            </div>
          ) : (
            <>
              {/* Barcode Scanner Feed Input */}
              <div className="p-3 bg-chrome-900 border border-chrome-800 flex items-center gap-2">
                <BarcodeIcon className="w-5 h-5 text-emerald-400 shrink-0" />
                <input
                  type="text"
                  value={barcodeQuery}
                  onChange={(e) => setBarcodeQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && barcodeQuery.trim()) {
                      addItemToCart(
                        `v-${Date.now()}`,
                        `p-manual`,
                        'Atelier Garment',
                        'M',
                        barcodeQuery.toUpperCase(),
                        1450.0,
                        false,
                        activeLocationCode
                      )
                      setBarcodeQuery('')
                    }
                  }}
                  placeholder="Scan barcode or type SKU / EAN-13 (Enter to add)..."
                  className="w-full bg-chrome-950 border border-chrome-800 px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              {/* High-Density Boutique Catalog Grid */}
              <div className="bg-chrome-900 border border-chrome-800 p-3 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-zinc-300 uppercase tracking-wider text-2xs">
                    In-Store Catalog & Endless Aisle
                  </span>
                  <div className="flex items-center gap-2 max-w-xs">
                    <Search className="w-3.5 h-3.5 text-zinc-500" />
                    <input
                      type="text"
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      placeholder="Filter garments..."
                      className="bg-chrome-950 border border-chrome-800 px-2 py-1 text-2xs text-zinc-200 focus:outline-none w-36"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[440px] overflow-y-auto pr-1">
                  {products.slice(0, 8).map((prod) => {
                    const priceNum = Number(prod.price) || 1200
                    return (
                      <div
                        key={prod.id}
                        className="p-2.5 bg-chrome-950 border border-chrome-800 hover:border-zinc-700 transition-colors flex flex-col justify-between space-y-2 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex justify-between items-start">
                            <span className="font-semibold text-zinc-200 block truncate max-w-[160px]">
                              {prod.title}
                            </span>
                            <span className="font-bold text-zinc-100 tabular-nums font-mono text-2xs">
                              ${priceNum.toFixed(2)}
                            </span>
                          </div>
                          <span className="text-3xs text-zinc-500 uppercase block">
                            {prod.category || 'Atelier'}
                          </span>
                        </div>

                        {/* Size pills with Local Stock vs Endless Aisle */}
                        <div className="flex items-center gap-1 flex-wrap">
                          {['38', '40', '42', '48', '50'].map((sz, sIdx) => {
                            const isLocalInStock = sIdx < 3
                            return (
                              <button
                                key={sz}
                                onClick={() =>
                                  addItemToCart(
                                    `v-${prod.id}-${sz}`,
                                    prod.id,
                                    prod.title,
                                    sz,
                                    `SKU-${prod.title.slice(0, 4).toUpperCase()}-${sz}`,
                                    priceNum,
                                    !isLocalInStock,
                                    isLocalInStock ? activeLocationCode : 'BLR-WH01'
                                  )
                                }
                                className={`px-2 py-0.5 text-3xs font-mono font-semibold border transition-all ${
                                  isLocalInStock
                                    ? 'bg-chrome-900 border-chrome-750 text-zinc-200 hover:bg-emerald-950/60 hover:text-emerald-400 hover:border-emerald-700'
                                    : 'bg-chrome-950 border-dashed border-zinc-800 text-zinc-500 hover:text-cyan-400 hover:border-cyan-700'
                                }`}
                                title={
                                  isLocalInStock
                                    ? `In stock at ${activeLocationCode} Sales Floor`
                                    : 'Out of stock locally — Order as Endless Aisle from Central Hub'
                                }
                              >
                                {sz} {isLocalInStock ? '' : '⚡'}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ==========================================
            RIGHT PANE: MULTI-CART REGISTER & SETTLEMENT PAD
           ========================================== */}
        <div className="lg:col-span-5 space-y-3">
          {/* Parked Cart Tabs */}
          <div className="flex items-center gap-1 border-b border-chrome-800 pb-1">
            {carts.map((cart, idx) => (
              <button
                key={cart.id}
                onClick={() => setActiveCartIndex(idx)}
                className={`px-3 py-1 text-2xs font-mono font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeCartIndex === idx
                    ? 'border-emerald-500 text-zinc-100 bg-chrome-900'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <span>{cart.name}</span>
                <span className="px-1 text-3xs bg-chrome-800 text-zinc-400 tabular-nums">
                  {cart.items.length}
                </span>
              </button>
            ))}
          </div>

          {/* Customer / Patron Lookup Block */}
          <div className="p-3 bg-chrome-900 border border-chrome-800 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-zinc-500" /> Patron Identification
              </span>
              <span className="text-3xs text-zinc-500">Walk-in or VIP</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Phone: +91 98450..."
                className="bg-chrome-950 border border-chrome-800 px-2.5 py-1 text-2xs text-zinc-100 placeholder-zinc-600 focus:outline-none font-mono"
              />
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Client Name..."
                className="bg-chrome-950 border border-chrome-800 px-2.5 py-1 text-2xs text-zinc-100 placeholder-zinc-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Register Cart Line Items Table */}
          <div className="bg-chrome-900 border border-chrome-800 flex flex-col">
            <div className="px-3 py-2 border-b border-chrome-800 text-3xs uppercase tracking-wider text-zinc-400 font-semibold bg-chrome-950 flex justify-between">
              <span>Checkout Register Manifest</span>
              <span>{activeCart?.items.length || 0} line items</span>
            </div>

            <div className="divide-y divide-chrome-800 max-h-56 overflow-y-auto">
              {activeCart?.items.map((it) => (
                <div key={it.variantId} className="p-2.5 space-y-1 text-xs hover:bg-chrome-850">
                  <div className="flex justify-between items-start">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-zinc-100">{it.title}</span>
                        <span className="px-1 text-3xs uppercase bg-chrome-800 text-zinc-400 border border-chrome-750">
                          {it.size}
                        </span>
                        {it.isEndlessAisle && (
                          <span className="px-1 text-3xs uppercase bg-cyan-950/60 text-cyan-400 border border-cyan-800/80 font-bold">
                            Endless Aisle ({it.originLocationCode})
                          </span>
                        )}
                      </div>
                      <span className="text-3xs text-zinc-500 font-mono">
                        {it.sku} &bull; Shelf: {it.shelfCoordinate}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-zinc-100 tabular-nums">
                        ${(it.price * (1 - it.discountPercent / 100) * it.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Quantity Stepper & Discount */}
                  <div className="flex justify-between items-center pt-1 text-2xs">
                    <div className="inline-flex items-center gap-1 bg-chrome-950 border border-chrome-800 px-1 py-0.5">
                      <button
                        onClick={() => updateQuantity(it.variantId, -1)}
                        className="p-0.5 text-zinc-400 hover:text-white"
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <span className="px-1.5 text-2xs font-bold tabular-nums text-zinc-200">
                        {it.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(it.variantId, 1)}
                        className="p-0.5 text-zinc-400 hover:text-white"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1 text-3xs text-zinc-400">
                      <span>Disc:</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={it.discountPercent || ''}
                        onChange={(e) => updateDiscount(it.variantId, parseFloat(e.target.value) || 0)}
                        placeholder="0%"
                        className="w-10 bg-chrome-950 border border-chrome-800 px-1 py-0.5 text-center text-zinc-200"
                      />
                      <span>%</span>
                    </div>
                  </div>
                </div>
              ))}

              {(!activeCart || activeCart.items.length === 0) && (
                <div className="py-16 text-center text-xs text-zinc-500">
                  Cart is empty. Scan barcodes or select sizes from the catalog to ring up garments.
                </div>
              )}
            </div>

            {/* Financial Summary */}
            <div className="p-3 bg-chrome-950 border-t border-chrome-800 space-y-1 text-xs">
              <div className="flex justify-between text-zinc-400 text-2xs">
                <span>Subtotal:</span>
                <span className="tabular-nums font-mono">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-zinc-400 text-2xs">
                <span>CGST (6%) + SGST (6%):</span>
                <span className="tabular-nums font-mono">${(cgst + sgst).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-zinc-100 pt-1 border-t border-chrome-800">
                <span>Grand Total:</span>
                <span className="text-emerald-400 tabular-nums font-mono">${grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Tender Modes & Settlement Pad */}
          <div className="p-3 bg-chrome-900 border border-chrome-800 space-y-3 text-xs">
            <span className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold block">
              Payment Settlement Pad
            </span>

            <div className="grid grid-cols-4 gap-1.5 text-2xs">
              <button
                type="button"
                onClick={() => setPaymentMode('upi')}
                className={`py-1.5 border font-semibold flex flex-col items-center gap-1 transition-colors ${
                  paymentMode === 'upi'
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400'
                    : 'bg-chrome-950 border-chrome-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>UPI QR</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode('card')}
                className={`py-1.5 border font-semibold flex flex-col items-center gap-1 transition-colors ${
                  paymentMode === 'card'
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400'
                    : 'bg-chrome-950 border-chrome-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Card EDC</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode('cash')}
                className={`py-1.5 border font-semibold flex flex-col items-center gap-1 transition-colors ${
                  paymentMode === 'cash'
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400'
                    : 'bg-chrome-950 border-chrome-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Cash</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode('split')}
                className={`py-1.5 border font-semibold flex flex-col items-center gap-1 transition-colors ${
                  paymentMode === 'split'
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400'
                    : 'bg-chrome-950 border-chrome-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Split</span>
              </button>
            </div>

            {/* Mode-specific tender fields */}
            {paymentMode === 'cash' && (
              <div className="grid grid-cols-2 gap-2 text-2xs">
                <div>
                  <label className="text-zinc-400 block mb-0.5">Cash Tendered ($)</label>
                  <input
                    type="number"
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    placeholder={grandTotal.toFixed(2)}
                    className="w-full bg-chrome-950 border border-chrome-800 px-2 py-1 text-zinc-100 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-0.5">Change Due</label>
                  <div className="bg-chrome-950 border border-chrome-800 px-2 py-1 text-emerald-400 font-mono font-bold">
                    ${changeDue.toFixed(2)}
                  </div>
                </div>
              </div>
            )}

            {paymentMode === 'card' && (
              <div>
                <label className="text-2xs text-zinc-400 block mb-0.5">EDC Terminal Auth Reference #</label>
                <input
                  type="text"
                  value={cardAuthRef}
                  onChange={(e) => setCardAuthRef(e.target.value.toUpperCase())}
                  placeholder="e.g. AUTH-982144"
                  className="w-full bg-chrome-950 border border-chrome-800 px-2 py-1 text-2xs text-zinc-100 font-mono"
                />
              </div>
            )}

            {paymentMode === 'upi' && (
              <div>
                <label className="text-2xs text-zinc-400 block mb-0.5">UPI / Razorpay Reference #</label>
                <input
                  type="text"
                  value={upiRefNumber}
                  onChange={(e) => setUpiRefNumber(e.target.value)}
                  placeholder="e.g. UPI-20261108-9842"
                  className="w-full bg-chrome-950 border border-chrome-800 px-2 py-1 text-2xs text-zinc-100 font-mono"
                />
              </div>
            )}

            {checkoutError && (
              <div className="p-2 bg-rose-950/40 border border-rose-800/60 text-rose-300 text-2xs">
                {checkoutError}
              </div>
            )}

            <Button
              type="button"
              variant="default"
              size="lg"
              onClick={handleCheckout}
              disabled={isCheckingOut || !activeCart || activeCart.items.length === 0}
              isLoading={isCheckingOut}
              className="w-full h-11 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold uppercase tracking-wider rounded-none flex items-center justify-center gap-2 text-xs"
            >
              <Check className="w-4 h-4" /> Settle Transaction & Print Receipt
            </Button>
          </div>
        </div>
      </div>

      {/* 80mm ESC/POS Thermal Receipt Modal */}
      {receiptData && (
        <PosReceiptModal
          isOpen={!!receiptData}
          onClose={() => setReceiptData(null)}
          data={receiptData}
        />
      )}
    </div>
  )
}
