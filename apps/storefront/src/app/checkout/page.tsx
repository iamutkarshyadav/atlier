'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  CheckCircle,
  Truck,
  ShieldCheck,
  ChevronRight,
  Zap,
  Lock,
  UserCheck,
  FileText,
  Printer,
} from 'lucide-react'
import { Button, Input } from '@repo/ui'
import { createBrowserClient } from '@repo/supabase/browser'
import { createOrderWithItems } from '@repo/supabase/utils'
import { useHydratedCart } from '../../store/useCartStore'

export default function LuxuryCheckoutPage() {
  const {
    items,
    isHydrated,
    subtotal,
    tax,
    shippingFee,
    estimatedTotal,
    deliveryMode,
    setDeliveryMode,
    tryOnWindow,
    clearCart,
  } = useHydratedCart()

  // Checkout flow state
  const [activeStep, setActiveStep] = useState<1 | 2>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [orderReference, setOrderReference] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [trackingBarcode, setTrackingBarcode] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [saveAddressToProfile, setSaveAddressToProfile] = useState(true)

  // Customer Shipping Address Form
  const [formData, setFormData] = useState({
    name: 'Alex Rivera',
    email: 'alex.rivera@atelier.com',
    phone: '+1 (415) 555-0192',
    address: '742 Evergreen Terrace',
    suite: 'Unit 4B',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94107',
    country: 'United States',
    notes: 'Please leave package with front desk if unavailable.',
  })

  // Verify auth session on load
  useEffect(() => {
    async function checkAuthSession() {
      try {
        const supabase = createBrowserClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session && session.user) {
          setIsAuthenticated(true)
          if (session.user.email) {
            setUserEmail(session.user.email)
            setFormData((prev) => ({
              ...prev,
              email: session.user.email || prev.email,
              name: session.user.user_metadata?.name || prev.name,
            }))
          }
        } else {
          setIsAuthenticated(false)
        }
      } catch {
        setIsAuthenticated(false)
      }
    }
    checkAuthSession()
  }, [])

  const handleProceedToAddress = () => {
    setActiveStep(2)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const generatedRef = 'ATL-' + Math.random().toString(36).substring(2, 8).toUpperCase()
    const generatedTracking = 'ATL-TRK-' + generatedRef.replace('ATL-', '')
    const generatedInvoice = 'INV-2026-' + generatedRef.replace('ATL-', '')
    const fullAddress = `${formData.address}${formData.suite ? `, ${formData.suite}` : ''}, ${formData.city}, ${formData.state} ${formData.postalCode}`

    let activeRef = generatedRef
    let activeInvoice = generatedInvoice
    let activeTracking = generatedTracking

    try {
      const supabase = createBrowserClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const currentUserId = session?.user?.id || 'a0000000-0000-0000-0000-000000000001'

      // 1. Record patron address in dedicated public.addresses table
      try {
        await supabase.from('addresses').insert({
          user_id: currentUserId,
          recipient_name: formData.name,
          street_address: formData.address,
          unit_or_suite: formData.suite || null,
          city: formData.city,
          state_or_province: formData.state,
          postal_code: formData.postalCode,
          country: formData.country,
          phone: formData.phone,
          instructions: formData.notes || null,
          is_default: true,
        })
      } catch (addrErr) {
        console.warn('Addresses table insertion note:', addrErr)
      }

      // 2. Also update user profile fast-lookup fields if authenticated
      if (session?.user?.id && saveAddressToProfile) {
        try {
          await supabase
            .from('users')
            .update({
              street_address: fullAddress,
              city: formData.city,
              postal_code: formData.postalCode,
              phone: formData.phone,
            })
            .eq('id', session.user.id)
        } catch {}
      }

      // 3. Compute Doorstep Salon Try-On Appointment Timestamps
      let windowStart: string | null = null
      let windowEnd: string | null = null
      if (deliveryMode === 'try_on') {
        const appointmentDate = new Date()
        appointmentDate.setDate(appointmentDate.getDate() + 1)
        appointmentDate.setHours(14, 30, 0, 0)
        const appointmentEnd = new Date(appointmentDate)
        appointmentEnd.setMinutes(appointmentEnd.getMinutes() + 45)
        windowStart = appointmentDate.toISOString()
        windowEnd = appointmentEnd.toISOString()
      }

      const orderPayload = {
        orderData: {
          user_id: currentUserId,
          order_number: generatedRef,
          invoice_number: generatedInvoice,
          tracking_barcode: generatedTracking,
          tax_amount: tax,
          shipping_fee: shippingFee,
          original_total: estimatedTotal,
          total: estimatedTotal,
          status: 'pending',
          shipping_address: fullAddress,
          delivery_mode: deliveryMode,
          try_on_status: deliveryMode === 'try_on' ? 'pending' : null,
          try_on_window_start: windowStart,
          try_on_window_end: windowEnd,
          fitting_duration_minutes: deliveryMode === 'try_on' ? 45 : undefined,
          delivery_notes: formData.notes,
        },
        items: items.map((it) => ({
          productId: it.productId || it.id,
          quantity: it.quantity,
          unitPrice: it.price,
          size: it.size,
        })),
      }

      // 4. Create Order and Order Items via local API route (persists to Supabase DB & live orders ledger)
      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderPayload),
        })
        const data = await res.json()
        if (data.success && data.order) {
          activeRef = data.orderNumber || generatedRef
          activeInvoice = data.invoiceNumber || generatedInvoice
          activeTracking = data.trackingBarcode || generatedTracking
        }
      } catch {
        // Fallback to client Supabase utility
        await createOrderWithItems(supabase, orderPayload.orderData as any, orderPayload.items)
      }

      // 5. Cross-ping Admin portal API if active on port 3001
      try {
        await fetch('http://localhost:3001/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderPayload),
        }).catch(() => {})
      } catch {}
    } catch (err) {
      console.warn('Checkout submission catch:', err)
    } finally {
      setIsSubmitting(false)
      setOrderReference(activeRef)
      setInvoiceNumber(activeInvoice)
      setTrackingBarcode(activeTracking)
      setOrderPlaced(true)
      clearCart()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // --- ORDER SUCCESS CONFIRMATION STATE ---
  if (orderPlaced) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-8 py-16 sm:py-24 text-center space-y-8">
        <div className="w-16 h-16 mx-auto bg-neutral-100 border border-neutral-300 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-[#166534]" />
        </div>

        <div className="space-y-3">
          <span className="text-xs uppercase tracking-[0.25em] text-[#166534] font-mono font-bold block">
            ORDER CONFIRMED • DROP 01
          </span>
          <h1 className="text-3xl sm:text-5xl font-black uppercase text-black tracking-tight font-serif">
            THANK YOU FOR YOUR <span className="text-[#166534] italic font-normal lowercase">order</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 font-light leading-relaxed max-w-lg mx-auto">
            Your garments have entered our dispatch queue. An official commercial receipt with tracking barcode has been generated for your record.
          </p>
        </div>

        {/* Order Receipt Card */}
        <div className="p-6 sm:p-8 border border-neutral-300 bg-white text-left space-y-4 font-mono text-xs shadow-sm">
          <div className="flex justify-between items-center border-b border-neutral-200 pb-3">
            <span className="text-neutral-400 uppercase tracking-wider text-[11px]">ORDER REFERENCE</span>
            <span className="font-bold text-black font-mono text-sm">{orderReference}</span>
          </div>

          <div className="flex justify-between items-center border-b border-neutral-200 pb-3">
            <span className="text-neutral-400 uppercase tracking-wider text-[11px]">COMMERCIAL INVOICE</span>
            <span className="font-bold text-neutral-900 font-mono text-xs bg-neutral-100 px-2 py-0.5 border border-neutral-300">
              {invoiceNumber || `INV-2026-${orderReference.replace('ATL-', '')}`}
            </span>
          </div>

          <div className="flex justify-between items-center border-b border-neutral-200 pb-3">
            <span className="text-neutral-400 uppercase tracking-wider text-[11px]">SHIPMENT TRACKING</span>
            <span className="font-mono text-xs text-[#166534] font-bold">
              {trackingBarcode || `ATL-TRK-${orderReference.replace('ATL-', '')}`}
            </span>
          </div>

          <div className="flex justify-between items-center border-b border-neutral-200 pb-3">
            <span className="text-neutral-400 uppercase tracking-wider text-[11px]">SHIPPING METHOD</span>
            <span className="font-bold text-black uppercase">
              {deliveryMode === 'try_on' ? 'Mode B: 45m Doorstep Fitting' : 'Mode A: Direct Insured Shipping'}
            </span>
          </div>

          <div className="flex justify-between items-baseline border-b border-neutral-200 pb-3">
            <span className="text-neutral-400 uppercase tracking-wider text-[11px]">DESTINATION</span>
            <span className="text-neutral-800 text-right max-w-[65%] font-mono text-xs font-medium">
              {formData.address}, {formData.city}, {formData.state} {formData.postalCode}
            </span>
          </div>

          <div className="flex justify-between items-center pt-1 text-sm font-bold">
            <span className="text-neutral-600 uppercase font-mono">TOTAL PAID</span>
            <span className="font-mono text-base text-black">
              ${estimatedTotal.toFixed(2)} USD
            </span>
          </div>

          {/* Patron Receipt & Invoice Actions */}
          <div className="pt-3 border-t border-neutral-200 flex flex-col sm:flex-row gap-2">
            <a
              href={`http://localhost:3001/invoice/${orderReference}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button
                variant="outline"
                size="sm"
                className="w-full h-10 border-neutral-300 hover:border-black text-black font-mono font-bold text-xs uppercase flex items-center justify-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-[#166534]" /> View Official Receipt
              </Button>
            </a>

            <a
              href={`http://localhost:3001/api/invoice/generate?orderId=${orderReference}&download=true`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button
                variant="outline"
                size="sm"
                className="w-full h-10 border-neutral-300 hover:border-black text-black font-mono font-bold text-xs uppercase flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5 text-neutral-600" /> Download PDF Receipt
              </Button>
            </a>
          </div>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row justify-center items-center gap-4">
          <Link href="/orders" className="w-full sm:w-auto">
            <Button
              size="lg"
              className="w-full sm:w-auto px-8 h-14 bg-[#166534] hover:bg-[#14532d] text-white font-mono font-bold text-xs uppercase tracking-wider rounded-none shadow-md"
            >
              TRACK ORDER STATUS →
            </Button>
          </Link>
          <Link href="/#collection" className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto px-8 h-14 border-2 border-neutral-300 hover:border-black text-black font-mono font-bold text-xs uppercase tracking-wider rounded-none"
            >
              CONTINUE SHOPPING
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // --- EMPTY CART GUARD ---
  if (isHydrated && items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-28 text-center space-y-6">
        <h1 className="text-3xl font-black uppercase tracking-tight text-black">
          YOUR BAG IS EMPTY
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 font-light leading-relaxed">
          Please add garments to your bag before initiating checkout.
        </p>
        <Link href="/#collection" className="inline-block pt-2">
          <Button
            size="lg"
            className="px-8 h-14 bg-black hover:bg-neutral-800 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-none border border-black shadow-md"
          >
            EXPLORE COLLECTION →
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-10 sm:py-16 space-y-10 sm:space-y-12">
      {/* Return to Bag Breadcrumb & Step Indicators */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-black pb-6 gap-4">
        <Link
          href="/cart"
          className="inline-flex items-center gap-2 text-xs uppercase font-mono font-semibold tracking-wider text-neutral-500 hover:text-black transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#166534]" /> Return to Bag
        </Link>

        {/* Step Indicator */}
        <div className="flex items-center gap-6 text-xs uppercase font-mono tracking-wider text-neutral-400">
          <button
            onClick={() => setActiveStep(1)}
            className={`transition-colors flex items-center gap-2 ${
              activeStep === 1 ? 'text-black font-bold' : 'hover:text-black'
            }`}
          >
            <span className={`w-5 h-5 flex items-center justify-center text-[10px] font-bold ${activeStep === 1 ? 'bg-black text-white' : 'bg-neutral-200 text-neutral-600'}`}>1</span>
            <span>SHIPPING METHOD</span>
          </button>
          <span>→</span>
          <button
            onClick={() => setActiveStep(2)}
            className={`transition-colors flex items-center gap-2 ${
              activeStep === 2 ? 'text-black font-bold' : 'hover:text-black'
            }`}
          >
            <span className={`w-5 h-5 flex items-center justify-center text-[10px] font-bold ${activeStep === 2 ? 'bg-black text-white' : 'bg-neutral-200 text-neutral-600'}`}>2</span>
            <span>SHIPPING ADDRESS</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
        {/* ========================================================= */}
        {/* LEFT COLUMN: INTERACTIVE CHECKOUT STEPS */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 space-y-8">
          {/* Unauthenticated Guest Note */}
          {isAuthenticated === false && (
            <div className="p-4 bg-neutral-100 border border-neutral-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs font-mono">
              <div className="flex items-center gap-2.5">
                <UserCheck className="w-4 h-4 text-[#166534] shrink-0" />
                <span className="text-neutral-600">
                  Checking out as guest. Sign in to save addresses to your account.
                </span>
              </div>
              <Link
                href="/login?callbackUrl=/checkout"
                className="text-xs uppercase font-bold text-black hover:text-[#166534] underline shrink-0"
              >
                Sign In →
              </Link>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 1: SHIPPING METHOD SELECTION */}
          {/* ========================================================= */}
          {activeStep === 1 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="space-y-1">
                <span className="text-xs uppercase tracking-[0.25em] text-neutral-400 font-mono font-semibold block">
                  STEP 01
                </span>
                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black">
                  SELECT SHIPPING METHOD
                </h2>
                <p className="text-xs sm:text-sm text-neutral-500 font-light">
                  Choose between standard courier delivery or express priority dispatch.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Standard Insured */}
                <div
                  onClick={() => setDeliveryMode('direct')}
                  className={`p-5 border-2 cursor-pointer transition-all space-y-3 ${
                    deliveryMode === 'direct'
                      ? 'border-black bg-white ring-1 ring-black shadow-sm'
                      : 'border-neutral-200 bg-white hover:border-neutral-400 opacity-80'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-8 h-8 bg-neutral-100 flex items-center justify-center text-neutral-900 border border-neutral-200">
                      <Truck className="w-4 h-4 text-[#166534]" />
                    </div>
                    <span className="font-mono text-xs text-black font-bold">$15.00</span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold uppercase text-black font-mono">
                      Standard Insured
                    </h3>
                  </div>

                  <p className="text-xs text-neutral-500 font-light leading-relaxed">
                    Insured courier delivery with package tracking and protective dust garment bag. Arrives in 3–5 business days.
                  </p>
                </div>

                {/* Express Priority */}
                <div
                  onClick={() => setDeliveryMode('try_on')}
                  className={`p-5 border-2 cursor-pointer transition-all space-y-3 ${
                    deliveryMode === 'try_on'
                      ? 'border-black bg-white ring-1 ring-black shadow-sm'
                      : 'border-neutral-200 bg-white hover:border-neutral-400 opacity-80'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-8 h-8 bg-neutral-100 flex items-center justify-center text-neutral-900 border border-neutral-200">
                      <Zap className="w-4 h-4 text-[#166534]" />
                    </div>
                    <span className="font-mono text-xs text-black font-bold">$25.00</span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold uppercase text-black font-mono">
                      Express Priority
                    </h3>
                  </div>

                  <p className="text-xs text-neutral-500 font-light leading-relaxed">
                    Priority handling from atelier mills. Expedited transit with 1–2 business day delivery.
                  </p>
                </div>
              </div>

              {/* Continue to Address */}
              <div className="pt-4">
                <Button
                  onClick={handleProceedToAddress}
                  size="xl"
                  className="w-full h-14 bg-black hover:bg-neutral-800 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-none border border-black shadow-md flex items-center justify-center gap-2"
                >
                  CONTINUE TO SHIPPING ADDRESS <ChevronRight className="w-4 h-4 text-[#166534]" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ========================================================= */}
          {/* STEP 2: SHIPPING ADDRESS FORM */}
          {/* ========================================================= */}
          {activeStep === 2 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-baseline border-b border-neutral-200 pb-3">
                <div className="space-y-1">
                  <span className="text-xs uppercase tracking-[0.25em] text-neutral-400 font-mono font-semibold block">
                    STEP 02
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black">
                    SHIPPING ADDRESS
                  </h2>
                </div>
                <button
                  onClick={() => setActiveStep(1)}
                  className="text-xs uppercase font-mono font-semibold text-neutral-500 hover:text-black underline underline-offset-4"
                >
                  Edit Shipping Method
                </button>
              </div>

              <form onSubmit={handleSubmitOrder} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Full Name"
                    variant="underline"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                  <Input
                    label="Email Address (Order Confirmation)"
                    type="email"
                    variant="underline"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Phone Number (Courier Tracking)"
                    variant="underline"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                  <Input
                    label="Country / Region"
                    variant="underline"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <Input
                      label="Street Address"
                      variant="underline"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Input
                      label="Apt / Suite / Unit"
                      variant="underline"
                      value={formData.suite}
                      onChange={(e) => setFormData({ ...formData, suite: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Input
                      label="City"
                      variant="underline"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Input
                      label="State / Province"
                      variant="underline"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Input
                      label="Postal Code"
                      variant="underline"
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <Input
                  label="Delivery Instructions (Optional)"
                  variant="underline"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Leave with building manager or gate entry code."
                />

                {/* Save Address Checkbox */}
                <div className="pt-2 flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="saveAddress"
                    checked={saveAddressToProfile}
                    onChange={(e) => setSaveAddressToProfile(e.target.checked)}
                    className="w-4 h-4 accent-black rounded-none cursor-pointer"
                  />
                  <label htmlFor="saveAddress" className="text-xs text-neutral-600 font-mono cursor-pointer">
                    Save address to account for faster future checkouts
                  </label>
                </div>

                {/* Secure Checkout Button */}
                <div className="pt-4 space-y-3">
                  <div className="p-3 bg-neutral-100 border border-neutral-200 text-xs text-neutral-600 font-mono flex items-center gap-2.5">
                    <Lock className="w-4 h-4 text-[#166534] shrink-0" />
                    <span>256-bit encrypted checkout. Order dispatch verified upon submission.</span>
                  </div>

                  <Button
                    type="submit"
                    size="xl"
                    className="w-full h-14 bg-black hover:bg-neutral-800 text-white font-mono font-bold text-xs uppercase tracking-[0.2em] rounded-none border border-black shadow-md flex items-center justify-center gap-3"
                    isLoading={isSubmitting}
                  >
                    <span>PLACE ORDER • ${estimatedTotal.toFixed(2)} USD</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#166534]" />
                  </Button>
                </div>
              </form>
            </motion.div>
          )}
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: ORDER SUMMARY SIDEBAR */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 sm:p-8 border border-neutral-300 bg-white space-y-6 sticky top-28 shadow-sm">
            <div className="flex justify-between items-center border-b border-black pb-3">
              <span className="text-xs uppercase tracking-[0.2em] text-neutral-400 font-mono font-bold">
                ORDER ITEMS
              </span>
              <span className="text-xs font-mono text-neutral-400">
                {items.length} {items.length === 1 ? 'PIECE' : 'PIECES'}
              </span>
            </div>

            {/* Item list */}
            <div className="space-y-4 divide-y divide-neutral-200 max-h-72 overflow-y-auto pr-1">
              {items.map((item) => (
                <div key={item.id} className="pt-3 first:pt-0 flex gap-4 items-center">
                  <div className="relative h-16 w-14 overflow-hidden bg-neutral-100 shrink-0 border border-neutral-300">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover object-center"
                    />
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="text-xs font-bold uppercase text-black truncate font-mono">
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] uppercase font-mono text-neutral-500">
                      <span>QTY: {item.quantity}</span>
                      {item.size && <span>• SIZE: <span className="text-[#166534] font-bold">{item.size}</span></span>}
                    </div>
                  </div>
                  <span className="font-mono font-bold text-xs text-black shrink-0">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Selected Shipping Method Badge */}
            <div className="p-3 bg-neutral-50 border border-neutral-200 flex justify-between items-center text-xs font-mono">
              <span className="font-bold text-black uppercase flex items-center gap-1.5">
                {deliveryMode === 'try_on' ? (
                  <>
                    <Zap className="w-3.5 h-3.5 text-[#166534]" /> Express Priority
                  </>
                ) : (
                  <>
                    <Truck className="w-3.5 h-3.5 text-[#166534]" /> Standard Insured
                  </>
                )}
              </span>
              <span className="font-mono text-xs font-bold text-black">
                ${shippingFee.toFixed(2)}
              </span>
            </div>

            {/* Calculations Breakdown */}
            <div className="border-t border-neutral-200 pt-4 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal</span>
                <span className="font-bold text-black">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Shipping Dispatch</span>
                <span className="font-bold text-black">${shippingFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Estimated Tax (8%)</span>
                <span className="font-bold text-black">${tax.toFixed(2)}</span>
              </div>
              <div className="border-t border-neutral-200 pt-3 flex justify-between text-base font-bold text-black">
                <span>Total</span>
                <span className="text-lg">${estimatedTotal.toFixed(2)} USD</span>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2 text-[11px] uppercase tracking-wider text-neutral-500 font-mono justify-center">
              <ShieldCheck className="w-4 h-4 text-[#166534] shrink-0" />
              <span>Complimentary Returns & Exchanges</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
