'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { createBrowserClient } from '@repo/supabase/browser'
import {
  getLocations,
  getLocationShelves,
  getAllProductsAdmin,
  processPosCheckout,
  processBorisReturn,
  type StoreLocation,
  type Shelf,
  type Product,
  type QcStatus,
} from '@repo/supabase/utils'
import { useLocation } from '@/context/LocationContext'
import { useBarcodeScanner } from '@/lib/useBarcodeScanner'
import { PosReceiptModal, type PosReceiptData } from '@/components/ui/PrintTemplates'

// Modular Luxury POS UI Components
import { type CartItem, type ParkedCart, type PaymentMethod } from '@/components/pos/PosTypes'
import { PosHeader } from '@/components/pos/PosHeader'
import { PosCatalog } from '@/components/pos/PosCatalog'
import { PosCart } from '@/components/pos/PosCart'
import { PosSettlement } from '@/components/pos/PosSettlement'
import { PosBorisModal } from '@/components/pos/PosBorisModal'
import { PosShiftModal } from '@/components/pos/PosShiftModal'
import { PosShortcutsModal } from '@/components/pos/PosShortcutsModal'

export default function PosTerminalPage() {
  const {
    locations,
    activeLocation,
    setActiveLocation,
    activeLocationCode,
    activePosSession,
  } = useLocation()

  // 1. Terminal & Shift State
  const [terminalId] = useState('REG-01')
  const [cashierName] = useState('Staff Cashier')
  const [openingFloat] = useState(500.0)
  const [cashSales, setCashSales] = useState(0)
  const [cardSales, setCardSales] = useState(0)
  const [upiSales, setUpiSales] = useState(0)

  // 2. Hardware Scanner Heartbeat
  const [scannerActive, setScannerActive] = useState(false)
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null)

  // 3. Modals & Mode Controls
  const [borisModalOpen, setBorisModalOpen] = useState(false)
  const [shiftModalOpen, setShiftModalOpen] = useState(false)
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false)
  const [receiptData, setReceiptData] = useState<PosReceiptData | null>(null)

  // 4. Catalog & Physical Shelves State
  const [products, setProducts] = useState<Product[]>([])
  const [boutiqueShelves, setBoutiqueShelves] = useState<Shelf[]>([])

  // 5. Multi-Cart Parking System
  const [activeCartIndex, setActiveCartIndex] = useState(0)
  const [carts, setCarts] = useState<ParkedCart[]>([
    {
      id: 'cart-1',
      name: 'Register 1',
      items: [],
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      customerGstin: '',
      customerDiscountPercent: 0,
    },
    {
      id: 'cart-2',
      name: 'Parked A',
      items: [],
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      customerGstin: '',
      customerDiscountPercent: 0,
    },
    {
      id: 'cart-3',
      name: 'Parked B',
      items: [],
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      customerGstin: '',
      customerDiscountPercent: 0,
    },
  ])

  // 6. Payment Settlement State
  const [paymentMode, setPaymentMode] = useState<PaymentMethod>('upi')
  const [cashTendered, setCashTendered] = useState<string>('')
  const [cardAuthRef, setCardAuthRef] = useState('')
  const [upiRefNumber, setUpiRefNumber] = useState('')
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  // Active Cart Reference
  const activeCart = carts[activeCartIndex] || carts[0]

  // Primary Sales Floor Shelf Reference
  const floorShelf = useMemo(() => {
    return boutiqueShelves.find((s) => s.coordinate.includes('FLR')) || boutiqueShelves[0]
  }, [boutiqueShelves])

  const floorShelfCoordinate = floorShelf?.coordinate || 'FLR-A-01-A1'
  const floorShelfId = floorShelf?.id || 's1000000-0000-0000-0000-000000000002'

  // Load Catalog & Shelves
  const loadPosData = useCallback(async () => {
    try {
      const supabase = createBrowserClient()
      const prods = await getAllProductsAdmin(supabase)
      setProducts(prods)

      const targetLocId =
        activeLocation === 'ALL' ? (locations[0]?.id || '') : activeLocation.id
      if (targetLocId) {
        const shelves = await getLocationShelves(supabase, targetLocId)
        setBoutiqueShelves(shelves)
      }
    } catch {
      // Continue gracefully
    }
  }, [activeLocation, locations])

  useEffect(() => {
    loadPosData()
  }, [loadPosData])

  // Add Item to Cart
  const handleAddToCart = (
    variantId: string,
    productId: string,
    title: string,
    size: string,
    sku: string,
    price: number,
    imageUrl?: string | null,
    category?: string | null,
    material?: string | null,
    isEndlessAisle = false,
    originLocCode = activeLocationCode
  ) => {
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

        const newItem: CartItem = {
          variantId,
          productId,
          title,
          size,
          sku,
          price,
          quantity: 1,
          discountPercent: 0,
          shelfId: floorShelfId,
          shelfCoordinate: floorShelfCoordinate,
          imageUrl,
          category,
          material,
          isEndlessAisle,
          originLocationCode: originLocCode,
        }

        return {
          ...cart,
          items: [...cart.items, newItem],
        }
      })
    )
  }

  // Hardware Scanner Integration
  useBarcodeScanner({
    onScan: (scanned) => {
      const code = scanned.trim().toUpperCase()
      setScannerActive(true)
      setLastScannedBarcode(code)
      setTimeout(() => setScannerActive(false), 1500)

      // Try matching against product titles or SKUs
      const matched = products.find(
        (p) =>
          p.title.toUpperCase().includes(code) ||
          p.id.toUpperCase().includes(code)
      )

      if (matched) {
        handleAddToCart(
          `v-${matched.id}-M`,
          matched.id,
          matched.title,
          'M',
          `SKU-${matched.title.slice(0, 4).toUpperCase()}-M`,
          Number(matched.price) || 1200,
          matched.image_url,
          matched.category,
          matched.material,
          false,
          activeLocationCode
        )
      } else {
        // Fallback generic garment item
        handleAddToCart(
          `v-${code}`,
          `p-${code}`,
          `Atelier Piece [${code}]`,
          'M',
          code,
          1450.0,
          undefined,
          'Atelier',
          undefined,
          false,
          activeLocationCode
        )
      }
    },
  })

  // Cart Quantities & Modifications
  const handleUpdateQuantity = (variantId: string, delta: number) => {
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

  const handleRemoveItem = (variantId: string) => {
    setCarts((prev) =>
      prev.map((cart, idx) => {
        if (idx !== activeCartIndex) return cart
        return {
          ...cart,
          items: cart.items.filter((it) => it.variantId !== variantId),
        }
      })
    )
  }

  const handleUpdateLineDiscount = (variantId: string, percent: number) => {
    setCarts((prev) =>
      prev.map((cart, idx) => {
        if (idx !== activeCartIndex) return cart
        return {
          ...cart,
          items: cart.items.map((it) =>
            it.variantId === variantId
              ? { ...it, discountPercent: Math.min(100, Math.max(0, percent)) }
              : it
          ),
        }
      })
    )
  }

  const handleClearCart = (index: number) => {
    setCarts((prev) =>
      prev.map((cart, idx) => {
        if (idx !== index) return cart
        return {
          ...cart,
          items: [],
          customerName: '',
          customerPhone: '',
          customerEmail: '',
          customerGstin: '',
          customerDiscountPercent: 0,
        }
      })
    )
  }

  const handleAddCart = () => {
    if (carts.length >= 5) return
    const newIdx = carts.length + 1
    const newCart: ParkedCart = {
      id: `cart-${Date.now()}`,
      name: `Parked ${String.fromCharCode(64 + newIdx)}`,
      items: [],
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      customerGstin: '',
      customerDiscountPercent: 0,
    }
    setCarts((prev) => [...prev, newCart])
    setActiveCartIndex(carts.length)
  }

  // Patron Data Mutators
  const handleChangeCustomerName = (val: string) => {
    setCarts((prev) =>
      prev.map((c, idx) => (idx === activeCartIndex ? { ...c, customerName: val } : c))
    )
  }
  const handleChangeCustomerPhone = (val: string) => {
    setCarts((prev) =>
      prev.map((c, idx) => (idx === activeCartIndex ? { ...c, customerPhone: val } : c))
    )
  }
  const handleChangeCustomerEmail = (val: string) => {
    setCarts((prev) =>
      prev.map((c, idx) => (idx === activeCartIndex ? { ...c, customerEmail: val } : c))
    )
  }
  const handleChangeCustomerGstin = (val: string) => {
    setCarts((prev) =>
      prev.map((c, idx) => (idx === activeCartIndex ? { ...c, customerGstin: val } : c))
    )
  }
  const handleChangeCustomerDiscountPercent = (val: number) => {
    setCarts((prev) =>
      prev.map((c, idx) =>
        idx === activeCartIndex ? { ...c, customerDiscountPercent: val } : c
      )
    )
  }

  // Cart Financials
  const { subtotal, discountAmount, grandTotal, cgst, sgst } = useMemo(() => {
    if (!activeCart || activeCart.items.length === 0) {
      return { subtotal: 0, discountAmount: 0, grandTotal: 0, cgst: 0, sgst: 0 }
    }

    let gross = 0
    let discounted = 0

    activeCart.items.forEach((it) => {
      const lineGross = it.price * it.quantity
      gross += lineGross

      const effectiveDisc = Math.max(it.discountPercent, activeCart.customerDiscountPercent)
      const lineNet = lineGross * (1 - effectiveDisc / 100)
      discounted += lineNet
    })

    const discTotal = Math.max(0, gross - discounted)
    const tax = discounted * 0.12 // 12% total GST (6% CGST + 6% SGST)
    const halfTax = tax / 2
    const total = discounted + tax

    return {
      subtotal: gross,
      discountAmount: discTotal,
      grandTotal: total,
      cgst: halfTax,
      sgst: halfTax,
    }
  }, [activeCart])

  const changeDue = useMemo(() => {
    const tendered = parseFloat(cashTendered) || 0
    return Math.max(0, tendered - grandTotal)
  }, [cashTendered, grandTotal])

  // Checkout Execution via Atomic PostgreSQL RPC
  const handleCheckout = useCallback(async () => {
    if (!activeCart || activeCart.items.length === 0) return
    setIsCheckingOut(true)
    setCheckoutError(null)

    try {
      const supabase = createBrowserClient()
      const targetLocId =
        activeLocation === 'ALL'
          ? (locations[0]?.id || 'l1000000-0000-0000-0000-000000000002')
          : activeLocation.id

      const res = await processPosCheckout(supabase, {
        locationId: targetLocId,
        posSessionId: activePosSession?.id || 'pos-sess-01',
        cashierId: cashierName,
        customerId: null,
        customerInfo: {
          name: activeCart.customerName || 'Walk-in Client',
          phone: activeCart.customerPhone || '9999999999',
          email: activeCart.customerEmail || undefined,
          gstin: activeCart.customerGstin || undefined,
        },
        cartItems: activeCart.items.map((it) => {
          const effectiveDisc = Math.max(it.discountPercent, activeCart.customerDiscountPercent)
          const discountAmt = it.price * (effectiveDisc / 100)
          return {
            variant_id: it.variantId,
            quantity: it.quantity,
            shelf_id: it.shelfId || floorShelfId,
            unit_price: it.price,
            discount: discountAmt,
            hsn_code: '6201.11',
          }
        }),
        paymentMethod: paymentMode as any,
        paymentDetails: {
          tendered:
            paymentMode === 'cash'
              ? parseFloat(cashTendered) || grandTotal
              : grandTotal,
          change: changeDue,
          cardRef: cardAuthRef || undefined,
          upiRef: upiRefNumber || undefined,
        },
        subtotal,
        taxAmount: cgst + sgst,
        discountAmount,
        total: grandTotal,
        isEndlessAisle: activeCart.items.some((it) => it.isEndlessAisle),
      })

      if (!res.success) {
        throw new Error(res.error || 'Checkout failed')
      }

      // Record Shift Totals
      if (paymentMode === 'cash') {
        setCashSales((prev) => prev + grandTotal)
      } else if (paymentMode === 'card') {
        setCardSales((prev) => prev + grandTotal)
      } else if (paymentMode === 'upi') {
        setUpiSales((prev) => prev + grandTotal)
      } else {
        setCardSales((prev) => prev + grandTotal / 2)
        setCashSales((prev) => prev + grandTotal / 2)
      }

      // Open Instant 80mm ESC/POS Thermal Receipt
      const receipt: PosReceiptData = {
        receiptNumber:
          res.orderNumber || `POS-20261108-${Math.floor(1000 + Math.random() * 9000)}`,
        invoiceNumber:
          res.invoiceNumber || `INV-20261108-${Math.floor(1000 + Math.random() * 9000)}`,
        storeName:
          activeLocation === 'ALL'
            ? 'Atelier Flagship Boutique'
            : activeLocation.name,
        storeCode: activeLocationCode,
        storeGstin: '29AAAAA0000A1Z5',
        storeAddress: '100 Feet Road, HAL 2nd Stage, Indiranagar, Bengaluru',
        cashierName,
        terminalId,
        timestamp: new Date().toLocaleString(),
        customerName: activeCart.customerName || 'Walk-in Client',
        customerPhone: activeCart.customerPhone || undefined,
        customerGstin: activeCart.customerGstin || undefined,
        items: activeCart.items.map((it) => ({
          title: it.title,
          size: it.size,
          sku: it.sku,
          quantity: it.quantity,
          price: it.price,
          discount: Math.max(it.discountPercent, activeCart.customerDiscountPercent),
          hsn: '6201.11',
        })),
        subtotal,
        cgst,
        sgst,
        grandTotal,
        paymentMode,
        tenderedAmount:
          paymentMode === 'cash'
            ? parseFloat(cashTendered) || grandTotal
            : undefined,
        changeDue: paymentMode === 'cash' ? changeDue : undefined,
        cardRefNumber: cardAuthRef || undefined,
        upiRefNumber: upiRefNumber || undefined,
      }

      setReceiptData(receipt)

      // Clear checked out cart & reset inputs
      handleClearCart(activeCartIndex)
      setCashTendered('')
      setCardAuthRef('')
      setUpiRefNumber('')
    } catch (err: any) {
      setCheckoutError(err?.message || 'Transaction settlement failed')
    } finally {
      setIsCheckingOut(false)
    }
  }, [
    activeCart,
    activeLocation,
    activeLocationCode,
    activePosSession,
    cashierName,
    cashTendered,
    changeDue,
    cardAuthRef,
    cgst,
    discountAmount,
    floorShelfId,
    grandTotal,
    locations,
    paymentMode,
    sgst,
    subtotal,
    terminalId,
    upiRefNumber,
    activeCartIndex,
  ])

  // Handle BORIS Return Execution
  const handleBorisSubmit = async (
    orderNumber: string,
    qcCondition: QcStatus,
    refundMode: 'store_credit' | 'original_payment',
    notes: string
  ) => {
    const supabase = createBrowserClient()
    const targetLocId =
      activeLocation === 'ALL' ? (locations[0]?.id || '') : activeLocation.id

    const res = await processBorisReturn(supabase, {
      orderId: `ord-${orderNumber}`,
      orderItemId: `item-ret-1`,
      locationId: targetLocId || 'l1000000-0000-0000-0000-000000000002',
      targetShelfId: floorShelfId,
      condition: qcCondition,
      refundMode,
      operatorId: cashierName,
      notes,
    })

    if (!res.success) {
      return { success: false, message: res.error || 'BORIS return failed' }
    }

    return {
      success: true,
      message: `Return settled! Restocked to ${floorShelfCoordinate}. Refund Mode: ${refundMode}.`,
    }
  }

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘ + Enter or Ctrl + Enter -> Settle Transaction
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        if (activeCart?.items.length > 0 && !isCheckingOut) {
          handleCheckout()
        }
      }
      // Ctrl + 1..3 -> Switch Cart
      if (e.ctrlKey && e.key >= '1' && e.key <= '5') {
        const targetIdx = parseInt(e.key, 10) - 1
        if (targetIdx < carts.length) {
          e.preventDefault()
          setActiveCartIndex(targetIdx)
        }
      }
      // ? -> Shortcuts cheat sheet
      if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes((e.target as any)?.tagName)) {
        e.preventDefault()
        setShortcutsModalOpen((prev) => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeCart, isCheckingOut, handleCheckout, carts.length])

  return (
    <div className="space-y-3 font-sans pb-12 select-none">
      {/* 1. Sleek Modern Header Bar */}
      <PosHeader
        locations={locations}
        activeLocation={activeLocation}
        activeLocationCode={activeLocationCode}
        setActiveLocation={setActiveLocation}
        terminalId={terminalId}
        cashierName={cashierName}
        openingFloat={openingFloat}
        scannerActive={scannerActive}
        lastScannedBarcode={lastScannedBarcode}
        borisMode={borisModalOpen}
        onToggleBoris={() => setBorisModalOpen((prev) => !prev)}
        onOpenShiftModal={() => setShiftModalOpen(true)}
        onOpenShortcutsModal={() => setShortcutsModalOpen(true)}
      />

      {/* 2. Main High-Speed Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
        {/* Left Column: Garment Catalog & Filter Matrix (60% width) */}
        <div className="lg:col-span-7 xl:col-span-7 h-[calc(100vh-140px)] min-h-[580px]">
          <PosCatalog
            products={products}
            boutiqueShelves={boutiqueShelves}
            activeLocationCode={activeLocationCode}
            onAddToCart={handleAddToCart}
            onBarcodeScanSubmit={(code) => {
              setScannerActive(true)
              setLastScannedBarcode(code)
              setTimeout(() => setScannerActive(false), 1200)

              handleAddToCart(
                `v-${code}`,
                `p-${code}`,
                `Atelier Garment [${code}]`,
                'M',
                code,
                1450.0,
                undefined,
                'Atelier',
                undefined,
                false,
                activeLocationCode
              )
            }}
          />
        </div>

        {/* Right Column: Register Manifest & Payment Settlement (40% width) */}
        <div className="lg:col-span-5 xl:col-span-5 space-y-3">
          {/* Active Cart & Patron Manager */}
          <PosCart
            carts={carts}
            activeCartIndex={activeCartIndex}
            onSelectCart={setActiveCartIndex}
            onAddCart={handleAddCart}
            onClearCart={handleClearCart}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onUpdateLineDiscount={handleUpdateLineDiscount}
            customerName={activeCart?.customerName || ''}
            customerPhone={activeCart?.customerPhone || ''}
            customerEmail={activeCart?.customerEmail || ''}
            customerGstin={activeCart?.customerGstin || ''}
            customerDiscountPercent={activeCart?.customerDiscountPercent || 0}
            onChangeCustomerName={handleChangeCustomerName}
            onChangeCustomerPhone={handleChangeCustomerPhone}
            onChangeCustomerEmail={handleChangeCustomerEmail}
            onChangeCustomerGstin={handleChangeCustomerGstin}
            onChangeCustomerDiscountPercent={handleChangeCustomerDiscountPercent}
          />

          {/* Payment Settlement Pad & Atomic RPC Trigger */}
          <PosSettlement
            subtotal={subtotal}
            discountAmount={discountAmount}
            cgst={cgst}
            sgst={sgst}
            grandTotal={grandTotal}
            paymentMode={paymentMode}
            onChangePaymentMode={setPaymentMode}
            cashTendered={cashTendered}
            onChangeCashTendered={setCashTendered}
            changeDue={changeDue}
            cardAuthRef={cardAuthRef}
            onChangeCardAuthRef={setCardAuthRef}
            upiRefNumber={upiRefNumber}
            onChangeUpiRefNumber={setUpiRefNumber}
            isCheckingOut={isCheckingOut}
            checkoutError={checkoutError}
            onCheckout={handleCheckout}
            hasItems={Boolean(activeCart?.items && activeCart.items.length > 0)}
          />
        </div>
      </div>

      {/* 3. ESC/POS 80mm Thermal Receipt Modal */}
      {receiptData && (
        <PosReceiptModal
          isOpen={Boolean(receiptData)}
          onClose={() => setReceiptData(null)}
          data={receiptData}
        />
      )}

      {/* 4. BORIS Return Modal */}
      <PosBorisModal
        isOpen={borisModalOpen}
        onClose={() => setBorisModalOpen(false)}
        activeLocationCode={activeLocationCode}
        floorShelfCoordinate={floorShelfCoordinate}
        onSubmitReturn={handleBorisSubmit}
      />

      {/* 5. Shift & Cash Drawer Reconciliation Modal */}
      <PosShiftModal
        isOpen={shiftModalOpen}
        onClose={() => setShiftModalOpen(false)}
        terminalId={terminalId}
        cashierName={cashierName}
        openingFloat={openingFloat}
        cashSales={cashSales}
        cardSales={cardSales}
        upiSales={upiSales}
      />

      {/* 6. Keyboard Shortcuts Cheat Sheet */}
      <PosShortcutsModal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />
    </div>
  )
}
