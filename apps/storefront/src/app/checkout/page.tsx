'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Truck,
  ShieldCheck,
  ChevronRight,
  Zap,
  Lock,
  UserCheck,
  FileText,
  Calendar,
  Clock,
  MapPin,
  AlertCircle,
  Sparkles,
  Check,
} from 'lucide-react'
import { Button, Input } from '@repo/ui'
import { createBrowserClient } from '@repo/supabase/browser'
import type { BoltTimeslot } from '@repo/supabase/types'
import { useHydratedCart } from '../../store/useCartStore'
import { useHydratedBolt } from '../../store/useBoltStore'

export default function LuxuryCheckoutPage() {
  const {
    items,
    isHydrated: isCartHydrated,
    subtotal,
    discount,
    discountedSubtotal,
    tax,
    itemCount,
    appliedCouponCode,
    clearCart,
  } = useHydratedCart()

  const catalogSavings = items.reduce((acc, item) => {
    if (item.originalPrice && item.originalPrice > item.price) {
      return acc + (item.originalPrice - item.price) * item.quantity
    }
    return acc
  }, 0)
  const totalCombinedSavings = discount + catalogSavings

  const {
    pincode,
    city: boltCity,
    isServiceable,
    selectedTimeslotId,
    setSelectedTimeslotId,
    isHydrated: isBoltHydrated,
  } = useHydratedBolt()

  // Checkout flow state
  const [activeStep, setActiveStep] = useState<1 | 2>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [orderReference, setOrderReference] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [trackingBarcode, setTrackingBarcode] = useState('')
  const [confirmedOrderType, setConfirmedOrderType] = useState<'standard' | 'bolt_try_on'>('standard')
  const [confirmedSlotLabel, setConfirmedSlotLabel] = useState<string>('')
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [saveAddressToProfile, setSaveAddressToProfile] = useState(true)

  // Delivery Mode: 'bolt' or 'standard'
  const [deliveryMode, setDeliveryMode] = useState<'standard' | 'bolt'>('bolt')

  // Available Time Slots for Bolt Try-On
  const [timeslots, setTimeslots] = useState<BoltTimeslot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  // Customer Shipping Address Form
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    suite: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
    notes: '',
  })

  // Sync postal code & city from Bolt store into address form if available
  useEffect(() => {
    if (pincode) {
      setFormData((prev) => ({
        ...prev,
        postalCode: pincode,
        city: boltCity || prev.city,
      }))
    }
  }, [pincode, boltCity])

  // Automatically default to Bolt if serviceable, otherwise standard
  useEffect(() => {
    if (isBoltHydrated) {
      if (isServiceable) {
        setDeliveryMode('bolt')
      } else {
        setDeliveryMode('standard')
      }
    }
  }, [isBoltHydrated, isServiceable])

  // Check auth session
  useEffect(() => {
    const supabase = createBrowserClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(Boolean(session))
      if (session?.user?.email) {
        setUserEmail(session.user.email)
        setFormData((prev) => ({
          ...prev,
          email: session.user.email!,
          name: session.user.user_metadata?.name || prev.name,
        }))
      }
    })
  }, [])

  // Load available time slots for Bolt
  useEffect(() => {
    if (deliveryMode === 'bolt') {
      setLoadingSlots(true)
      fetch('/api/bolt/timeslots')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.timeslots)) {
            setTimeslots(data.timeslots)
            if (!selectedTimeslotId && data.timeslots.length > 0) {
              setSelectedTimeslotId(data.timeslots[0].id)
            }
          }
        })
        .catch((err) => console.warn('Could not load slots:', err))
        .finally(() => setLoadingSlots(false))
    }
  }, [deliveryMode, selectedTimeslotId, setSelectedTimeslotId])

  // Calculations
  const isBoltSelected = deliveryMode === 'bolt' && isServiceable
  const isOverBoltLimit = isBoltSelected && itemCount > 5
  const boltConvenienceFee = 99.0
  const standardShippingFee = 150.0

  // Immediate due amount
  const immediateTotal = isBoltSelected
    ? boltConvenienceFee
    : subtotal + standardShippingFee + tax

  const handleProceedToAddress = () => {
    if (isOverBoltLimit) return
    setActiveStep(2)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Handle Order Placement
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isOverBoltLimit) return

    setIsSubmitting(true)
    const randomHex = Math.random().toString(36).substring(2, 7).toUpperCase()
    const generatedRef = `ATL-${randomHex}`
    const generatedInvoice = `INV-2026-${randomHex}`
    const generatedTracking = `ATL-TRK-${randomHex}`

    const fullAddress = `${formData.address}${formData.suite ? `, ${formData.suite}` : ''}, ${formData.city}, ${formData.state} ${formData.postalCode}, ${formData.country}`

    const chosenSlot = timeslots.find((s) => s.id === selectedTimeslotId)
    const slotLabel = chosenSlot ? chosenSlot.label : '10:00 AM - 12:00 PM IST'

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

      // 3. Construct Order Payload
      const orderPayload = {
        customer_email: formData.email,
        coupon_code: appliedCouponCode || undefined,
        orderData: {
          name: formData.name,
          user_id: currentUserId,
          order_number: generatedRef,
          invoice_number: generatedInvoice,
          tracking_barcode: generatedTracking,
          order_type: isBoltSelected ? 'bolt_try_on' : 'standard',
          bolt_pincode: isBoltSelected ? (pincode || formData.postalCode) : null,
          bolt_timeslot_id: isBoltSelected ? selectedTimeslotId : null,
          bolt_session_status: isBoltSelected ? 'scheduled' : null,
          delivery_mode: isBoltSelected ? 'try_on' : 'direct',
          try_on_status: isBoltSelected ? 'pending' : null,
          tax_amount: isBoltSelected ? 0.0 : tax,
          shipping_fee: isBoltSelected ? boltConvenienceFee : standardShippingFee,
          original_total: subtotal,
          total: immediateTotal,
          status: 'pending',
          shipping_address: `${fullAddress} [Patron: ${formData.email} | Tel: ${formData.phone}]`,
          delivery_notes: formData.notes,
        },
        items: items.map((it) => ({
          productId: it.productId || it.id,
          variantId: (it as any).variantId || undefined,
          quantity: it.quantity,
          unitPrice: it.price,
          size: it.size,
          color: (it as any).color || undefined,
        })),
      }

      // 4. Submit to local API route
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      })
      const data = await res.json()

      if (res.status === 409 || data?.code === 'INSUFFICIENT_STOCK') {
        const oosMsg = data?.error || 'One or more items in your cart are currently out of stock. Please adjust quantities before proceeding.'
        setCheckoutError(oosMsg)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }

      if (data?.success && data?.order) {
        activeRef = data.orderNumber || data.order.order_number || generatedRef
        activeInvoice = data.invoiceNumber || data.order.invoice_number || generatedInvoice
        activeTracking = data.trackingBarcode || data.order.tracking_barcode || generatedTracking

        try {
          if (typeof window !== 'undefined') {
            const rawRecent = localStorage.getItem('patron_recent_orders')
            const recentList: string[] = rawRecent ? JSON.parse(rawRecent) : []
            if (!recentList.includes(activeRef)) {
              recentList.unshift(activeRef)
              localStorage.setItem('patron_recent_orders', JSON.stringify(recentList.slice(0, 10)))
            }
          }
        } catch {}

        setOrderReference(activeRef)
        setInvoiceNumber(activeInvoice)
        setTrackingBarcode(activeTracking)
        setConfirmedOrderType(isBoltSelected ? 'bolt_try_on' : 'standard')
        setConfirmedSlotLabel(slotLabel)
        setOrderPlaced(true)
        clearCart()
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        const errorMsg = data?.error || 'Could not place order. Please verify your details and try again.'
        setCheckoutError(errorMsg)
      }
    } catch (err: any) {
      console.warn('Checkout submission catch:', err)
      setCheckoutError(err?.message || 'Network error occurred while submitting order.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // --- ORDER SUCCESS CONFIRMATION STATE ---
  if (orderPlaced) {
    const isConfirmedBolt = confirmedOrderType === 'bolt_try_on'

    return (
      <div className="min-h-screen bg-white text-[#14293a] font-sans">
        <div className="max-w-2xl mx-auto px-4 sm:px-8 py-16 text-center space-y-6">
          <div className="w-16 h-16 mx-auto bg-[#ecfdf5] border border-[#a7f3d0] rounded-full flex items-center justify-center text-[#065f46]">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>

          <div className="space-y-2">
            <span className="text-xs uppercase tracking-wider text-[#b91c1c] font-bold block flex items-center justify-center gap-1.5">
              {isConfirmedBolt ? (
                <>
                  <Zap className="w-4 h-4 fill-[#b91c1c] text-[#b91c1c]" />
                  BOLT DOORSTEP TRY-ON SCHEDULED
                </>
              ) : (
                'ORDER CONFIRMED • STANDARD DISPATCH'
              )}
            </span>
            <h1 className="text-2xl sm:text-4xl font-sans font-black text-[#14293a] tracking-tight">
              THANK YOU FOR YOUR {isConfirmedBolt ? 'TRY-ON BOOKING' : 'ORDER'}
            </h1>
            <p className="text-xs sm:text-sm text-[#6c7079] leading-relaxed max-w-lg mx-auto">
              {isConfirmedBolt
                ? 'Our white-glove courier will arrive at your doorstep with the requested garments. Try them on in the comfort of your home, keep what fits, and return the rest instantly.'
                : 'Your garments have entered our dispatch queue. An official commercial receipt with tracking barcode has been generated for your record.'}
            </p>
          </div>

          {/* Order Receipt Card */}
          <div className="p-6 border border-[#d3d6db] bg-[#f8f8f8] text-left space-y-3.5 text-xs shadow-xs rounded-sm">
            <div className="flex justify-between items-center border-b border-[#e5e7eb] pb-2.5">
              <span className="text-[#6c7079] uppercase tracking-wider font-medium text-[11px]">ORDER REFERENCE</span>
              <span className="font-bold text-[#14293a] text-sm">{orderReference}</span>
            </div>

            <div className="flex justify-between items-center border-b border-[#e5e7eb] pb-2.5">
              <span className="text-[#6c7079] uppercase tracking-wider font-medium text-[11px]">COMMERCIAL INVOICE</span>
              <span className="font-bold text-[#14293a] bg-white px-2 py-0.5 border border-[#d3d6db] rounded-sm">
                {invoiceNumber || `INV-2026-${orderReference.replace('ATL-', '')}`}
              </span>
            </div>

            <div className="flex justify-between items-center border-b border-[#e5e7eb] pb-2.5">
              <span className="text-[#6c7079] uppercase tracking-wider font-medium text-[11px]">SHIPMENT TRACKING</span>
              <span className="text-xs text-[#b91c1c] font-bold">
                {trackingBarcode || `ATL-TRK-${orderReference.replace('ATL-', '')}`}
              </span>
            </div>

            <div className="flex justify-between items-center border-b border-[#e5e7eb] pb-2.5">
              <span className="text-[#6c7079] uppercase tracking-wider font-medium text-[11px]">DELIVERY EXPERIENCE</span>
              <span className="font-bold text-[#14293a] uppercase flex items-center gap-1">
                {isConfirmedBolt ? (
                  <>
                    <Zap className="w-3.5 h-3.5 fill-[#b91c1c] text-[#b91c1c]" /> Bolt Doorstep Try-On
                  </>
                ) : (
                  'Standard Insured Delivery'
                )}
              </span>
            </div>

            {isConfirmedBolt && confirmedSlotLabel && (
              <div className="flex justify-between items-center border-b border-[#e5e7eb] pb-2.5 bg-[#fef2f2] -mx-2 px-3 py-2 rounded-sm">
                <span className="text-[#b91c1c] uppercase tracking-wider text-[11px] font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> APPOINTMENT WINDOW
                </span>
                <span className="font-bold text-[#14293a]">
                  {confirmedSlotLabel}
                </span>
              </div>
            )}

            <div className="flex justify-between items-baseline border-b border-[#e5e7eb] pb-2.5">
              <span className="text-[#6c7079] uppercase tracking-wider font-medium text-[11px]">DESTINATION</span>
              <span className="text-[#14293a] text-right max-w-[65%] font-medium">
                {formData.address}, {formData.city}, {formData.state} {formData.postalCode}
              </span>
            </div>

            <div className="flex justify-between items-center pt-1 text-sm font-bold">
              <span className="text-[#6c7079] uppercase">
                {isConfirmedBolt ? 'CONVENIENCE FEE PAID' : 'TOTAL PAID'}
              </span>
              <span className="text-base font-bold tabular-nums text-[#14293a]">
                ₹{Math.round(immediateTotal).toLocaleString('en-IN')}
              </span>
            </div>

            {isConfirmedBolt && (
              <div className="p-3 bg-white border border-[#d3d6db] rounded-sm text-xs text-[#6c7079] space-y-1">
                <div className="flex justify-between font-bold text-[#14293a]">
                  <span>Garment Value (Payable after Try-On):</span>
                  <span>₹{subtotal.toLocaleString('en-IN')} INR</span>
                </div>
                <p className="text-[11px]">
                  You will only be charged for the items you choose to keep after your 45-minute fitting salon.
                </p>
              </div>
            )}
          </div>

          <div className="pt-2 flex flex-col sm:flex-row justify-center items-center gap-3">
            <Link href="/orders" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto px-6 py-2.5 bg-[#14293a] hover:bg-[#b91c1c] text-white text-xs font-bold uppercase tracking-wider rounded-sm transition-colors shadow-sm"
              >
                <span>Track Order Status →</span>
              </Button>
            </Link>
            <Link href="/shop" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto px-6 py-2.5 border border-[#d3d6db] hover:border-[#14293a] text-[#14293a] text-xs font-bold uppercase tracking-wider rounded-sm"
              >
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // --- EMPTY CART GUARD ---
  if (isCartHydrated && items.length === 0) {
    return (
      <div className="min-h-screen bg-white text-[#14293a] flex items-center justify-center px-4 font-sans">
        <div className="max-w-xl mx-auto py-24 text-center space-y-4">
          <h1 className="font-sans text-2xl sm:text-3xl font-bold tracking-tight text-[#14293a]">
            YOUR BAG IS EMPTY
          </h1>
          <p className="text-xs sm:text-sm text-[#6c7079] leading-relaxed">
            Please add garments to your bag before initiating checkout.
          </p>
          <Link href="/shop" className="inline-block pt-2">
            <Button
              size="lg"
              className="px-6 py-2.5 bg-[#14293a] hover:bg-[#b91c1c] text-white text-xs font-bold uppercase tracking-wider rounded-sm shadow-sm transition-colors"
            >
              <span>Explore Collection →</span>
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-[#14293a] font-sans pb-24">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-12 space-y-6">
        {/* Row 1: Breadcrumb */}
        <nav className="text-xs text-[#6c7079] mb-2 font-sans" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-[#14293a] transition-colors">Home</Link>
          <span> / </span>
          <Link href="/cart" className="hover:text-[#14293a] transition-colors">Shopping Bag</Link>
          <span> / </span>
          <span className="text-[#14293a]">Checkout</span>
        </nav>

        {/* Row 2: Single Flex Bar */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#e5e7eb] pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#14293a] tracking-tight flex items-baseline">
              Checkout
              <span className="text-sm font-normal text-[#6c7079] ml-2">
                ({itemCount} {itemCount === 1 ? 'item' : 'items'})
              </span>
            </h1>
            <div className="text-xs text-[#6c7079] mt-1 flex items-center gap-2">
              <span>Secure Checkout</span>
              <span>·</span>
              <span>{isBoltSelected ? 'Bolt 45-Min Doorstep Try-On' : 'Pan-India Delivery'}</span>
            </div>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-3 text-xs font-medium">
            <button
              onClick={() => setActiveStep(1)}
              className={`flex items-center gap-1.5 cursor-pointer transition-colors ${
                activeStep === 1 ? 'text-[#14293a] font-bold' : 'text-[#8a909a] hover:text-[#14293a]'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  activeStep === 1 ? 'bg-[#14293a] text-white' : 'bg-[#e5e7eb] text-[#6c7079]'
                }`}
              >
                1
              </span>
              <span>Delivery &amp; Slots</span>
            </button>
            <span className="text-[#d3d6db]">/</span>
            <button
              onClick={() => {
                if (!isOverBoltLimit) setActiveStep(2)
              }}
              disabled={isOverBoltLimit}
              className={`flex items-center gap-1.5 transition-colors ${
                activeStep === 2
                  ? 'text-[#14293a] font-bold'
                  : isOverBoltLimit
                  ? 'opacity-40 cursor-not-allowed'
                  : 'text-[#8a909a] hover:text-[#14293a] cursor-pointer'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  activeStep === 2 ? 'bg-[#14293a] text-white' : 'bg-[#e5e7eb] text-[#6c7079]'
                }`}
              >
                2
              </span>
              <span>Shipping Address</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ========================================================= */}
          {/* LEFT COLUMN: INTERACTIVE CHECKOUT STEPS */}
          {/* ========================================================= */}
          <div className="lg:col-span-8 space-y-6">
            {/* Guest Note */}
            {isAuthenticated === false && (
              <div className="p-3.5 bg-[#f8f8f8] border border-[#d3d6db] rounded-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#b91c1c] shrink-0" />
                  <span className="text-[#6c7079]">
                    Checking out as guest. Sign in to save addresses to your account.
                  </span>
                </div>
                <Link
                  href="/login?callbackUrl=/checkout"
                  className="text-xs font-bold text-[#b91c1c] hover:underline shrink-0"
                >
                  Sign In →
                </Link>
              </div>
            )}

            {/* ========================================================= */}
            {/* STEP 1: EXPERIENCE SELECTION & TIME SLOTS */}
            {/* ========================================================= */}
            {activeStep === 1 && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#b91c1c] block">
                    STEP 01
                  </span>
                  <h2 className="text-xl sm:text-2xl font-sans font-bold text-[#14293a]">
                    SELECT DELIVERY METHOD
                  </h2>
                  <p className="text-xs text-[#6c7079]">
                    Choose between our flagship white-glove doorstep fitting salon or standard direct delivery.
                  </p>
                </div>

                {/* Delivery Option Tabs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Option A: Bolt Try-On Tab */}
                  <div
                    onClick={() => {
                      if (isServiceable) setDeliveryMode('bolt')
                    }}
                    className={`p-4 border rounded-sm transition-all space-y-2 relative ${
                      isServiceable
                        ? deliveryMode === 'bolt'
                          ? 'border-[#b91c1c] bg-[#fef2f2] ring-1 ring-[#b91c1c] shadow-xs cursor-pointer'
                          : 'border-[#d3d6db] bg-white hover:border-[#14293a] cursor-pointer'
                        : 'border-dashed border-[#d3d6db] bg-[#f8f8f8] cursor-not-allowed opacity-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-[#b91c1c] border border-[#fecaca]">
                        <Zap className="w-4 h-4 fill-[#b91c1c]" />
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-[#14293a] font-bold block">
                          ₹99.00
                        </span>
                        <span className="text-[10px] text-[#6c7079]">
                          Convenience Hold
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#14293a]">
                          Bolt Try-On Service
                        </h3>
                        <span className="bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca] text-[9px] font-bold px-1 py-0.2 rounded-sm uppercase">
                          POPULAR
                        </span>
                      </div>
                      <p className="text-xs text-[#6c7079] mt-1 leading-relaxed">
                        White-glove 45-min doorstep fitting. Try before you pay. Keep what fits, reject the rest immediately.
                      </p>
                    </div>

                    {isServiceable ? (
                      <div className="pt-2 text-[11px] text-[#065f46] flex items-center gap-1 font-semibold">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Available in {boltCity || 'your area'} (PIN: {pincode})</span>
                      </div>
                    ) : (
                      <div className="pt-2 text-[11px] text-amber-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Enter PIN in top banner to unlock Bolt</span>
                      </div>
                    )}
                  </div>

                  {/* Option B: Standard Delivery Tab */}
                  <div
                    onClick={() => setDeliveryMode('standard')}
                    className={`p-4 border rounded-sm cursor-pointer transition-all space-y-2 ${
                      deliveryMode === 'standard'
                        ? 'border-[#14293a] bg-[#f8f8f8] ring-1 ring-[#14293a] shadow-xs'
                        : 'border-[#d3d6db] bg-white hover:border-[#14293a]'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-[#14293a] border border-[#d3d6db]">
                        <Truck className="w-4 h-4 text-[#14293a]" />
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-[#14293a] font-bold block">
                          ₹150.00
                        </span>
                        <span className="text-[10px] text-[#6c7079]">
                          Shipping Fee
                        </span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#14293a]">
                        Standard Delivery
                      </h3>
                      <p className="text-xs text-[#6c7079] mt-1 leading-relaxed">
                        Fully insured dispatch to all PIN codes across India. Full cart value charged upfront.
                      </p>
                    </div>

                    <div className="pt-2 text-[11px] text-[#6c7079] flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Nationwide dispatch in 2–4 business days</span>
                    </div>
                  </div>
                </div>

                {/* Bolt Max 5 Items Warning */}
                {isOverBoltLimit && (
                  <div className="p-4 bg-[#fef2f2] border border-[#fecaca] rounded-sm text-[#b91c1c] text-xs flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-[#b91c1c] shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <strong className="block font-bold">
                        Bolt Try-On Limit Exceeded ({itemCount} / 5 pieces in bag)
                      </strong>
                      <p className="text-[11px] text-[#991b1b]">
                        Doorstep Salon accommodates a maximum of 5 garments per appointment. Please adjust bag quantities or select Standard Delivery above.
                      </p>
                      <Link href="/cart" className="inline-block pt-1 underline font-bold hover:text-[#14293a]">
                        Adjust Bag Quantities →
                      </Link>
                    </div>
                  </div>
                )}

                {/* Time Slots Section (When Bolt is active) */}
                {isBoltSelected && (
                  <div className="border border-[#d3d6db] bg-[#f8f8f8] rounded-sm p-4 sm:p-5 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between border-b border-[#d3d6db] pb-2.5">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#b91c1c]" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#14293a]">
                          SELECT BOLT FITTING WINDOW
                        </h4>
                      </div>
                      <span className="text-[11px] text-[#6c7079]">
                        IST (Indian Standard Time)
                      </span>
                    </div>

                    {loadingSlots ? (
                      <div className="py-6 text-center text-xs text-[#6c7079]">
                        Loading available fitting slots...
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {timeslots.map((slot) => {
                          const isSelected = selectedTimeslotId === slot.id
                          return (
                            <div
                              key={slot.id}
                              onClick={() => setSelectedTimeslotId(slot.id)}
                              className={`p-3 border rounded-sm text-left cursor-pointer transition-all ${
                                isSelected
                                  ? 'border-[#b91c1c] bg-white text-[#14293a] shadow-xs ring-1 ring-[#b91c1c]'
                                  : 'border-[#d3d6db] bg-white hover:border-[#14293a] text-[#14293a]'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold">
                                  {slot.label}
                                </span>
                                {isSelected && (
                                  <span className="w-2 h-2 rounded-full bg-[#b91c1c] shrink-0" />
                                )}
                              </div>
                              <span className="text-[10px] text-[#6c7079] block mt-0.5">
                                Capacity: {slot.max_daily_capacity} Doorstep Salons Daily
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Continue to Address Button */}
                <div className="pt-2">
                  <Button
                    onClick={handleProceedToAddress}
                    disabled={isOverBoltLimit}
                    size="xl"
                    className="w-full h-12 bg-[#14293a] hover:bg-[#b91c1c] text-white font-sans font-bold text-xs uppercase tracking-wider rounded-sm shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    <span>Continue to Shipping Address</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ========================================================= */}
            {/* STEP 2: SHIPPING ADDRESS FORM */}
            {/* ========================================================= */}
            {activeStep === 2 && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-baseline border-b border-[#d3d6db] pb-3">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#b91c1c] block">
                      STEP 02
                    </span>
                    <h2 className="text-xl sm:text-2xl font-sans font-bold text-[#14293a]">
                      SHIPPING ADDRESS &amp; DETAILS
                    </h2>
                  </div>
                  <button
                    onClick={() => setActiveStep(1)}
                    className="text-xs font-semibold text-[#b91c1c] hover:underline cursor-pointer"
                  >
                    Edit Delivery Method
                  </button>
                </div>

                <form onSubmit={handleSubmitOrder} className="space-y-4">
                  {checkoutError && (
                    <div className="p-3 bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] text-xs flex items-center gap-2 rounded-sm">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{checkoutError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Full Name"
                      autoComplete="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                    <Input
                      label="Email Address"
                      type="email"
                      autoComplete="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Mobile Number (Courier Coordination)"
                      autoComplete="tel"
                      inputMode="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                    />
                    <Input
                      label="Country"
                      autoComplete="country-name"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <Input
                        label="Street Address / House No. / Building"
                        autoComplete="street-address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Input
                        label="Apt / Floor / Landmark"
                        autoComplete="address-line2"
                        value={formData.suite}
                        onChange={(e) => setFormData({ ...formData, suite: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Input
                        label="City"
                        autoComplete="address-level2"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Input
                        label="State"
                        autoComplete="address-level1"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Input
                        label="PIN Code"
                        autoComplete="postal-code"
                        inputMode="numeric"
                        value={formData.postalCode}
                        onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <Input
                    label="Delivery / Fitting Notes (Optional)"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="e.g. Ring private door bell or call security gate on arrival."
                  />

                  {/* Save Address Checkbox */}
                  <div className="pt-1 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="saveAddress"
                      checked={saveAddressToProfile}
                      onChange={(e) => setSaveAddressToProfile(e.target.checked)}
                      className="w-4 h-4 accent-[#b91c1c] rounded-sm cursor-pointer"
                    />
                    <label htmlFor="saveAddress" className="text-xs text-[#6c7079] cursor-pointer">
                      Save address to profile for one-click future checkouts
                    </label>
                  </div>

                  {/* Submit Order Button */}
                  <div className="pt-4 space-y-3">
                    <div className="p-3 bg-[#f8f8f8] border border-[#d3d6db] rounded-sm text-xs text-[#6c7079] flex items-center gap-2">
                      <Lock className="w-4 h-4 text-[#b91c1c] shrink-0" />
                      <span>
                        {isBoltSelected
                          ? 'Flat ₹99 convenience booking fee authorized today. Clothes charged only after your doorstep trial.'
                          : 'Secure encrypted checkout. Direct insured courier dispatch upon confirmation.'}
                      </span>
                    </div>

                    <Button
                      type="submit"
                      size="xl"
                      className="w-full h-12 bg-[#14293a] hover:bg-[#b91c1c] text-white font-sans font-bold text-xs uppercase tracking-wider rounded-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-colors"
                      isLoading={isSubmitting}
                    >
                      <span>
                        {isBoltSelected
                          ? `Confirm Bolt Try-On Booking • ₹${Math.round(immediateTotal).toLocaleString('en-IN')}`
                          : `Confirm Order • ₹${Math.round(immediateTotal).toLocaleString('en-IN')}`}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}
          </div>

          {/* ========================================================= */}
          {/* RIGHT COLUMN: ORDER SUMMARY SIDEBAR */}
          {/* ========================================================= */}
          <div className="lg:col-span-4 space-y-5">
            {/* Prominent Savings Banner */}
            {totalCombinedSavings > 0 && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-sm text-xs text-emerald-950 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold block">
                      You are saving ₹{totalCombinedSavings.toLocaleString('en-IN')} on this order
                    </span>
                    <span className="text-[11px] text-emerald-800">
                      {discount > 0 && catalogSavings > 0
                        ? `Includes ₹${catalogSavings.toLocaleString('en-IN')} catalog markdown + ₹${discount.toLocaleString('en-IN')} code ${appliedCouponCode}`
                        : discount > 0
                        ? `Privilege code ${appliedCouponCode} active`
                        : 'Seasonal markdown discount applied'}
                    </span>
                  </div>
                </div>
                <span className="text-2xs font-mono font-bold uppercase tracking-wider bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-full">
                  SAVED
                </span>
              </div>
            )}

            <div className="p-6 border border-[#d3d6db] bg-[#f8f8f8] space-y-4 sticky top-28 shadow-sm rounded-sm">
              <div className="flex justify-between items-center border-b border-[#d3d6db] pb-3">
                <span className="text-xs uppercase tracking-wider font-bold text-[#14293a]">
                  ORDER SUMMARY
                </span>
                <span className="text-xs text-[#6c7079]">
                  {items.length} {items.length === 1 ? 'item' : 'items'}
                  {isBoltSelected && ' (max 5)'}
                </span>
              </div>

              {/* Items list */}
              <div className="space-y-3 divide-y divide-[#e5e7eb] max-h-64 overflow-y-auto pr-1 filter-card-scroll">
                {items.map((item) => (
                  <div key={item.id} className="pt-2.5 first:pt-0 flex gap-3 items-center">
                    <div className="relative h-14 w-12 overflow-hidden bg-white shrink-0 border border-[#d3d6db] rounded-sm">
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        className="object-cover object-center"
                      />
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p className="text-xs font-bold text-[#14293a] truncate">
                        {item.title}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-[#6c7079]">
                        <span>Qty: {item.quantity}</span>
                        {item.size && (
                          <span>
                            • Size: <strong className="text-[#14293a]">{item.size}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-[#14293a] block tabular-nums">
                        ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                      </span>
                      {item.originalPrice && item.originalPrice > item.price && (
                        <span className="text-[10px] text-[#8a909a] line-through block tabular-nums">
                          ₹{(item.originalPrice * item.quantity).toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Selected Delivery Badge */}
              <div className="p-3 bg-white border border-[#d3d6db] rounded-sm flex justify-between items-center text-xs">
                <span className="font-bold text-[#14293a] flex items-center gap-1.5">
                  {isBoltSelected ? (
                    <>
                      <Zap className="w-3.5 h-3.5 fill-[#b91c1c] text-[#b91c1c]" /> Bolt Try-On Service
                    </>
                  ) : (
                    <>
                      <Truck className="w-3.5 h-3.5 text-[#14293a]" /> Standard Delivery
                    </>
                  )}
                </span>
                <span className="font-bold text-[#14293a]">
                  {isBoltSelected ? '₹99.00' : '₹150.00'}
                </span>
              </div>

              {/* Price Calculations Breakdown */}
              <div className="border-t border-[#d3d6db] pt-3 space-y-2 text-xs">
                {catalogSavings > 0 && (
                  <div className="flex justify-between text-[#8a909a] text-xs">
                    <span>Total MRP</span>
                    <span className="line-through tabular-nums">
                      ₹{(subtotal + catalogSavings).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-[#6c7079]">
                  <span>Garments Subtotal</span>
                  <span className="font-bold text-[#14293a]">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>

                {isBoltSelected ? (
                  <>
                    <div className="flex justify-between text-[#b91c1c] bg-[#fef2f2] p-2 border border-[#fecaca] rounded-sm">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-[#b91c1c]" />
                        Payable after Try-On:
                      </span>
                      <span className="font-bold">₹{subtotal.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-[#6c7079]">
                      <span>Bolt Convenience Hold</span>
                      <span className="font-bold text-[#14293a]">₹99.00</span>
                    </div>
                    <div className="border-t border-[#d3d6db] pt-3 flex justify-between text-base font-bold text-[#14293a]">
                      <span>Immediate Checkout Due</span>
                      <span className="text-lg text-[#b91c1c]">₹99.00</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-[#6c7079]">
                      <span>Shipping Dispatch</span>
                      <span className="font-bold tabular-nums text-[#14293a]">₹150</span>
                    </div>
                    <div className="flex justify-between text-[#6c7079]">
                      <span>Estimated Tax (8%)</span>
                      <span className="font-bold tabular-nums text-[#14293a]">₹{Math.round(tax).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="border-t border-[#d3d6db] pt-3 flex justify-between text-base font-bold text-[#14293a]">
                      <span>Total Due Now</span>
                      <span className="text-lg tabular-nums">₹{Math.round(immediateTotal).toLocaleString('en-IN')}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="pt-2 flex items-center gap-1.5 text-[11px] text-[#6c7079] justify-center">
                <ShieldCheck className="w-3.5 h-3.5 text-[#b91c1c]" />
                <span>Complimentary Returns &amp; Doorstep Swaps</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
