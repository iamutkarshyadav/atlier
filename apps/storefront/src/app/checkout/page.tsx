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
  Calendar,
  Clock,
  MapPin,
  AlertCircle,
  Sparkles,
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
    tax,
    itemCount,
    clearCart,
  } = useHydratedCart()

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

  // Customer Shipping Address Form (Indian Defaults)
  const [formData, setFormData] = useState({
    name: 'Aarav Sharma',
    email: 'aarav.sharma@atelier.in',
    phone: '+91 98765 43210',
    address: '100 Feet Road, HAL 2nd Stage, Indiranagar',
    suite: 'Penthouse 4B',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560038',
    country: 'India',
    notes: 'White-glove 45-minute doorstep try-on session. Call on arrival.',
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
            // Auto select first slot if none selected
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
        orderData: {
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
          shipping_address: fullAddress,
          delivery_notes: formData.notes,
        },
        items: items.map((it) => ({
          productId: it.productId || it.id,
          quantity: it.quantity,
          unitPrice: it.price,
          size: it.size,
        })),
      }

      // 4. Submit to local API route
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
    } catch (err) {
      console.warn('Checkout submission catch:', err)
    } finally {
      setIsSubmitting(false)
      setOrderReference(activeRef)
      setInvoiceNumber(activeInvoice)
      setTrackingBarcode(activeTracking)
      setConfirmedOrderType(isBoltSelected ? 'bolt_try_on' : 'standard')
      setConfirmedSlotLabel(slotLabel)
      setOrderPlaced(true)
      clearCart()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // --- ORDER SUCCESS CONFIRMATION STATE ---
  if (orderPlaced) {
    const isConfirmedBolt = confirmedOrderType === 'bolt_try_on'

    return (
      <div className="min-h-screen bg-[#212121] text-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-8 py-16 sm:py-24 text-center space-y-8">
          <div className="w-16 h-16 mx-auto bg-[#1A1B1D] border border-white/10 rounded-none flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-[#B91C1C]" />
          </div>

          <div className="space-y-3">
            <span className="text-xs uppercase tracking-[0.25em] text-[#B91C1C] font-mono font-bold block flex items-center justify-center gap-1.5">
              {isConfirmedBolt ? (
                <>
                  <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  BOLT ⚡ DOORSTEP SALON SCHEDULED
                </>
              ) : (
                'ORDER CONFIRMED • STANDARD DISPATCH'
              )}
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold uppercase text-white tracking-tight leading-tight font-display">
              THANK YOU FOR YOUR <span className="text-[#B91C1C]">{isConfirmedBolt ? 'TRY-ON BOOKING' : 'ORDER'}</span>
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 font-light leading-relaxed max-w-lg mx-auto">
              {isConfirmedBolt
                ? 'Our white-glove courier will arrive at your doorstep with the requested garments. Try them on in the comfort of your home, keep what fits, and return the rest instantly.'
                : 'Your garments have entered our dispatch queue. An official commercial receipt with tracking barcode has been generated for your record.'}
            </p>
          </div>

          {/* Order Receipt Card */}
          <div className="p-6 sm:p-8 border border-white/10 bg-[#1A1B1D] text-left space-y-4 font-mono text-xs shadow-xl rounded-none text-white">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <span className="text-neutral-400 uppercase tracking-wider text-[11px]">ORDER REFERENCE</span>
              <span className="font-bold text-white font-mono text-sm">{orderReference}</span>
            </div>

            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <span className="text-neutral-400 uppercase tracking-wider text-[11px]">COMMERCIAL INVOICE</span>
              <span className="font-bold text-neutral-200 font-mono text-xs bg-[#262629] px-2 py-0.5 border border-white/10 rounded-none">
                {invoiceNumber || `INV-2026-${orderReference.replace('ATL-', '')}`}
              </span>
            </div>

            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <span className="text-neutral-400 uppercase tracking-wider text-[11px]">SHIPMENT TRACKING</span>
              <span className="font-mono text-xs text-[#B91C1C] font-bold">
                {trackingBarcode || `ATL-TRK-${orderReference.replace('ATL-', '')}`}
              </span>
            </div>

            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <span className="text-neutral-400 uppercase tracking-wider text-[11px]">DELIVERY EXPERIENCE</span>
              <span className="font-bold text-white uppercase flex items-center gap-1">
                {isConfirmedBolt ? (
                  <>
                    <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> Bolt ⚡ Doorstep Try-On
                  </>
                ) : (
                  'Standard Insured Delivery'
                )}
              </span>
            </div>

            {isConfirmedBolt && confirmedSlotLabel && (
              <div className="flex justify-between items-center border-b border-white/10 pb-3 bg-amber-950/20 -mx-2 px-3 py-2 rounded-none">
                <span className="text-amber-300 uppercase tracking-wider text-[11px] font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> APPOINTMENT WINDOW
                </span>
                <span className="font-bold text-white font-mono text-xs">
                  {confirmedSlotLabel}
                </span>
              </div>
            )}

            <div className="flex justify-between items-baseline border-b border-white/10 pb-3">
              <span className="text-neutral-400 uppercase tracking-wider text-[11px]">DESTINATION</span>
              <span className="text-neutral-200 text-right max-w-[65%] font-mono text-xs font-medium">
                {formData.address}, {formData.city}, {formData.state} {formData.postalCode}
              </span>
            </div>

            <div className="flex justify-between items-center pt-1 text-sm font-bold">
              <span className="text-neutral-400 uppercase font-mono">
                {isConfirmedBolt ? 'CONVENIENCE FEE PAID' : 'TOTAL PAID'}
              </span>
              <span className="font-mono text-base text-white">
                ₹{immediateTotal.toFixed(2)} INR
              </span>
            </div>

            {isConfirmedBolt && (
              <div className="p-3 bg-[#262629] border border-white/10 rounded-none text-[11px] text-neutral-300 space-y-1">
                <div className="flex justify-between font-bold text-white">
                  <span>Garment Value (Payable after Try-On):</span>
                  <span>₹{subtotal.toLocaleString('en-IN')} INR</span>
                </div>
                <p className="text-[10px] text-neutral-400">
                  You will only be charged for the items you choose to keep after your 45-minute fitting salon.
                </p>
              </div>
            )}

            {/* Patron Actions */}
            <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row gap-2">
              <Link href="/orders" className="flex-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-10 border-white/15 hover:border-white/30 text-white font-mono font-bold text-xs uppercase rounded-none flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-[#B91C1C]" /> View Orders Dashboard
                </Button>
              </Link>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link href="/orders" className="w-full sm:w-auto">
              <Button
                size="lg"
                style={{ color: '#ffffff', backgroundColor: '#09090b' }}
                className="btn-dark w-full sm:w-auto px-8 h-14 hover:bg-[#27272A] dark:hover:bg-[#4A4B50] font-mono font-bold text-xs uppercase tracking-wider rounded-none border border-neutral-800 dark:border-white/15 shadow-xl cursor-pointer transition-all"
              >
                <span style={{ color: '#ffffff' }}>TRACK ORDER STATUS →</span>
              </Button>
            </Link>
            <Link href="/#collection" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto px-8 h-14 border border-white/20 hover:border-white text-white font-mono font-bold text-xs uppercase tracking-wider rounded-none cursor-pointer"
              >
                CONTINUE SHOPPING
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
      <div className="min-h-screen bg-[#212121] text-white flex items-center justify-center px-4">
        <div className="max-w-xl mx-auto py-28 text-center space-y-6">
          <h1 className="text-3xl font-extrabold uppercase tracking-tight text-white font-display">
            YOUR BAG IS EMPTY
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 font-light leading-relaxed">
            Please add garments to your bag before initiating checkout.
          </p>
          <Link href="/#collection" className="inline-block pt-2">
            <Button
              size="lg"
              style={{ color: '#ffffff', backgroundColor: '#09090b' }}
              className="btn-dark px-8 h-14 hover:bg-[#27272A] dark:hover:bg-[#4A4B50] font-mono font-bold text-xs uppercase tracking-wider rounded-none border border-neutral-800 dark:border-white/15 shadow-xl transition-all"
            >
              <span style={{ color: '#ffffff' }}>EXPLORE COLLECTION →</span>
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#212121] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-10 sm:py-16 space-y-10 sm:space-y-12">
        {/* Return to Bag Breadcrumb & Step Indicators */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/10 pb-6 gap-4">
          <Link
            href="/cart"
            className="inline-flex items-center gap-2 text-xs uppercase font-mono font-semibold tracking-wider text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#B91C1C]" /> Return to Bag
          </Link>

          {/* Step Indicator */}
          <div className="flex items-center gap-6 text-xs uppercase font-mono tracking-wider text-neutral-400">
            <button
              onClick={() => setActiveStep(1)}
              className={`transition-colors flex items-center gap-2 cursor-pointer ${
                activeStep === 1 ? 'text-white font-bold' : 'hover:text-white'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-none flex items-center justify-center text-[10px] font-bold ${
                  activeStep === 1 ? 'bg-[#B91C1C] text-white' : 'bg-[#262629] text-neutral-400 border border-white/10'
                }`}
              >
                1
              </span>
              <span>EXPERIENCE & TIME SLOTS</span>
            </button>
            <span className="text-neutral-600">→</span>
            <button
              onClick={() => {
                if (!isOverBoltLimit) setActiveStep(2)
              }}
              disabled={isOverBoltLimit}
              className={`transition-colors flex items-center gap-2 ${
                activeStep === 2
                  ? 'text-white font-bold'
                  : isOverBoltLimit
                  ? 'opacity-40 cursor-not-allowed'
                  : 'hover:text-white cursor-pointer'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-none flex items-center justify-center text-[10px] font-bold ${
                  activeStep === 2 ? 'bg-[#B91C1C] text-white' : 'bg-[#262629] text-neutral-400 border border-white/10'
                }`}
              >
                2
              </span>
              <span>SHIPPING ADDRESS</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
          {/* ========================================================= */}
          {/* LEFT COLUMN: INTERACTIVE CHECKOUT STEPS */}
          {/* ========================================================= */}
          <div className="lg:col-span-7 space-y-8">
            {/* Guest Note */}
            {isAuthenticated === false && (
              <div className="p-4 bg-[#262629] border border-white/10 rounded-none flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs font-mono">
                <div className="flex items-center gap-2.5">
                  <UserCheck className="w-4 h-4 text-[#B91C1C] shrink-0" />
                  <span className="text-neutral-300">
                    Checking out as guest. Sign in to save addresses to your account.
                  </span>
                </div>
                <Link
                  href="/login?callbackUrl=/checkout"
                  className="text-xs uppercase font-bold text-white hover:text-[#B91C1C] underline shrink-0"
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
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="space-y-1">
                  <span className="text-xs uppercase tracking-[0.25em] text-neutral-400 font-mono font-semibold block">
                    STEP 01
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-white font-display">
                    SELECT DELIVERY EXPERIENCE
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-400 font-light">
                    Choose between our flagship white-glove doorstep fitting salon or standard insured delivery.
                  </p>
                </div>

                {/* Delivery Option Tabs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Option A: Bolt Try-On Tab */}
                  <div
                    onClick={() => {
                      if (isServiceable) setDeliveryMode('bolt')
                    }}
                    className={`p-5 border-2 rounded-none transition-all space-y-3 relative ${
                      isServiceable
                        ? deliveryMode === 'bolt'
                          ? 'border-[#B91C1C] bg-[#1A1B1D] ring-1 ring-[#B91C1C] shadow-xl cursor-pointer'
                          : 'border-white/10 bg-[#262629] hover:border-white/20 cursor-pointer'
                        : 'border-dashed border-white/10 bg-[#1A1B1D]/40 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-9 h-9 bg-[#262629] rounded-none flex items-center justify-center text-amber-400 border border-white/10">
                        <Zap className="w-5 h-5 fill-amber-400" />
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-sm text-white font-bold block">
                          ₹99.00
                        </span>
                        <span className="text-[10px] uppercase font-mono text-neutral-400">
                          Convenience Fee
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-bold uppercase text-white font-mono">
                          Bolt ⚡ Try-On Salon
                        </h3>
                        <span className="bg-amber-950/60 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-1.5 py-0.5 rounded-none uppercase">
                          FLAGSHIP
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 font-light mt-1 leading-relaxed">
                        White-glove 45-min doorstep fitting. Try before you pay. Keep what fits, reject the rest immediately.
                      </p>
                    </div>

                    {isServiceable ? (
                      <div className="pt-2 text-[11px] font-mono text-[#B91C1C] flex items-center gap-1.5 font-bold">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Available in {boltCity || 'your area'} (PIN: {pincode})</span>
                      </div>
                    ) : (
                      <div className="pt-2 text-[11px] font-mono text-amber-400 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Check PIN in top banner to unlock Bolt ⚡</span>
                      </div>
                    )}
                  </div>

                  {/* Option B: Standard Delivery Tab */}
                  <div
                    onClick={() => setDeliveryMode('standard')}
                    className={`p-5 border-2 rounded-none cursor-pointer transition-all space-y-3 ${
                      deliveryMode === 'standard'
                        ? 'border-[#B91C1C] bg-[#1A1B1D] ring-1 ring-[#B91C1C] shadow-xl'
                        : 'border-white/10 bg-[#262629] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-9 h-9 bg-[#262629] rounded-none flex items-center justify-center text-[#B91C1C] border border-white/10">
                        <Truck className="w-4 h-4 text-[#B91C1C]" />
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-sm text-white font-bold block">
                          ₹150.00
                        </span>
                        <span className="text-[10px] uppercase font-mono text-neutral-400">
                          Shipping Fee
                        </span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold uppercase text-white font-mono">
                        Standard Delivery
                      </h3>
                      <p className="text-xs text-neutral-400 font-light mt-1 leading-relaxed">
                        Fully insured dispatch from atelier workshop to all PIN codes across India. Full cart value charged upfront.
                      </p>
                    </div>

                    <div className="pt-2 text-[11px] font-mono text-neutral-400 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Nationwide delivery in 3–5 business days</span>
                    </div>
                  </div>
                </div>

                {/* Bolt Max 5 Items Warning */}
                {isOverBoltLimit && (
                  <div className="p-4 bg-red-950/40 border border-[#B91C1C]/40 rounded-none text-red-200 text-xs font-mono flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-[#B91C1C] shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <strong className="block font-bold uppercase tracking-wider text-white">
                        Bolt ⚡ Try-On Limit Exceeded ({itemCount} / 5 pieces in bag)
                      </strong>
                      <p className="text-[11px] leading-relaxed text-neutral-300">
                        Our white-glove doorstep salon accommodates a maximum of <strong>5 garments</strong> per appointment to ensure focused, tailored fitting. Please return to your bag to adjust quantities, or switch to <strong>Standard Delivery</strong> above.
                      </p>
                      <Link href="/cart" className="inline-block pt-1 underline font-bold text-white hover:text-[#B91C1C]">
                        Adjust Bag Quantities →
                      </Link>
                    </div>
                  </div>
                )}

                {/* Time Slots Section (When Bolt is active) */}
                {isBoltSelected && (
                  <div className="border border-white/10 bg-[#1A1B1D] rounded-none p-5 sm:p-6 space-y-4 shadow-lg">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#B91C1C]" />
                        <h4 className="text-xs uppercase font-mono font-bold tracking-wider text-white">
                          SELECT BOLT ⚡ TIME SLOT WINDOW
                        </h4>
                      </div>
                      <span className="text-[11px] font-mono text-neutral-400">
                        IST Indian Standard Time
                      </span>
                    </div>

                    {loadingSlots ? (
                      <div className="py-8 text-center text-xs font-mono text-neutral-400">
                        Loading available fitting slots...
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {timeslots.map((slot) => {
                          const isSelected = selectedTimeslotId === slot.id
                          return (
                            <div
                              key={slot.id}
                              onClick={() => setSelectedTimeslotId(slot.id)}
                              className={`p-3.5 border rounded-none text-left cursor-pointer transition-all ${
                                isSelected
                                  ? 'border-[#B91C1C] bg-[#262629] text-white shadow-md ring-1 ring-[#B91C1C]'
                                  : 'border-white/10 bg-[#212121] hover:border-white/20 text-neutral-300'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-mono font-bold tracking-tight">
                                  {slot.label}
                                </span>
                                {isSelected && (
                                  <span className="w-2 h-2 rounded-none bg-amber-400 shrink-0" />
                                )}
                              </div>
                              <span
                                className={`text-[10px] font-mono block mt-1 ${
                                  isSelected ? 'text-neutral-400' : 'text-neutral-500'
                                }`}
                              >
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
                    style={{ color: '#ffffff', backgroundColor: '#09090b' }}
                    className="btn-dark w-full h-14 hover:bg-[#27272A] dark:hover:bg-[#4A4B50] font-mono font-bold text-xs uppercase tracking-wider rounded-none border border-neutral-800 dark:border-white/15 shadow-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <span style={{ color: '#ffffff' }}>CONTINUE TO SHIPPING ADDRESS</span> <ChevronRight className="w-4 h-4 text-[#B91C1C]" />
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
                <div className="flex justify-between items-baseline border-b border-white/10 pb-3">
                  <div className="space-y-1">
                    <span className="text-xs uppercase tracking-[0.25em] text-neutral-400 font-mono font-semibold block">
                      STEP 02
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-white font-display">
                      SHIPPING ADDRESS & DETAILS
                    </h2>
                  </div>
                  <button
                    onClick={() => setActiveStep(1)}
                    className="text-xs uppercase font-mono font-semibold text-neutral-400 hover:text-white underline underline-offset-4 cursor-pointer"
                  >
                    Edit Delivery Method
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
                      label="Mobile Number (Courier Coordination)"
                      variant="underline"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                    />
                    <Input
                      label="Country"
                      variant="underline"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <Input
                        label="Street Address / House No. / Building"
                        variant="underline"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Input
                        label="Apt / Floor / Landmark"
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
                        label="State"
                        variant="underline"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Input
                        label="PIN Code"
                        variant="underline"
                        value={formData.postalCode}
                        onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <Input
                    label="Delivery / Fitting Notes (Optional)"
                    variant="underline"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="e.g. Ring private door bell or call security gate on arrival."
                  />

                  {/* Save Address Checkbox */}
                  <div className="pt-2 flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="saveAddress"
                      checked={saveAddressToProfile}
                      onChange={(e) => setSaveAddressToProfile(e.target.checked)}
                      className="w-4 h-4 accent-[#B91C1C] rounded-none cursor-pointer"
                    />
                    <label htmlFor="saveAddress" className="text-xs text-neutral-400 font-mono cursor-pointer">
                      Save address to profile for one-click future checkouts
                    </label>
                  </div>

                  {/* Submit Order Button */}
                  <div className="pt-4 space-y-3">
                    <div className="p-3 bg-[#1A1B1D] border border-white/10 rounded-none text-xs text-neutral-300 font-mono flex items-center gap-2.5">
                      <Lock className="w-4 h-4 text-[#B91C1C] shrink-0" />
                      <span>
                        {isBoltSelected
                          ? 'Flat ₹99 convenience booking fee authorized today. Clothes charged only after your doorstep trial.'
                          : 'Secure encrypted checkout. Direct insured courier dispatch upon confirmation.'}
                      </span>
                    </div>

                    <Button
                      type="submit"
                      size="xl"
                      style={{ color: '#ffffff', backgroundColor: '#09090b' }}
                      className="btn-dark w-full h-14 hover:bg-[#27272A] dark:hover:bg-[#4A4B50] font-mono font-bold text-xs uppercase tracking-[0.2em] rounded-none border border-neutral-800 dark:border-white/15 shadow-xl flex items-center justify-center gap-3 cursor-pointer transition-all"
                      isLoading={isSubmitting}
                    >
                      <span style={{ color: '#ffffff' }}>
                        {isBoltSelected
                          ? `CONFIRM BOLT ⚡ TRY-ON • ₹${immediateTotal.toFixed(2)} INR`
                          : `CONFIRM ORDER • ₹${immediateTotal.toFixed(2)} INR`}
                      </span>
                      <span className="w-1.5 h-1.5 rounded-none bg-[#B91C1C]" />
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
            <div className="p-6 sm:p-8 border border-white/10 bg-[#1A1B1D] space-y-6 sticky top-28 shadow-xl rounded-none">
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <span className="text-xs uppercase tracking-[0.2em] text-neutral-400 font-mono font-bold">
                  SALON SELECTION
                </span>
                <span className="text-xs font-mono text-neutral-400 font-bold">
                  {items.length} {items.length === 1 ? 'PIECE' : 'PIECES'}
                  {isBoltSelected && ' (MAX 5)'}
                </span>
              </div>

              {/* Item list */}
              <div className="space-y-4 divide-y divide-white/10 max-h-72 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.id} className="pt-3 first:pt-0 flex gap-4 items-center">
                    <div className="relative h-16 w-14 overflow-hidden bg-[#262629] shrink-0 border border-white/10 rounded-none">
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        className="object-cover object-center"
                      />
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p className="text-xs font-bold uppercase text-white truncate font-mono">
                        {item.title}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] uppercase font-mono text-neutral-400">
                        <span>QTY: {item.quantity}</span>
                        {item.size && (
                          <span>
                            • SIZE: <span className="text-[#B91C1C] font-bold">{item.size}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="font-mono font-bold text-xs text-white shrink-0">
                      ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>

              {/* Selected Shipping Method Badge */}
              <div className="p-3 bg-[#262629] border border-white/10 rounded-none flex justify-between items-center text-xs font-mono">
                <span className="font-bold text-white uppercase flex items-center gap-1.5">
                  {isBoltSelected ? (
                    <>
                      <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> Bolt ⚡ Doorstep Try-On
                    </>
                  ) : (
                    <>
                      <Truck className="w-3.5 h-3.5 text-[#B91C1C]" /> Standard Insured Delivery
                    </>
                  )}
                </span>
                <span className="font-mono text-xs font-bold text-white">
                  {isBoltSelected ? '₹99.00' : '₹150.00'}
                </span>
              </div>

              {/* Calculations Breakdown */}
              <div className="border-t border-white/10 pt-4 space-y-2 text-xs font-mono">
                <div className="flex justify-between text-neutral-400">
                  <span>Garment Value</span>
                  <span className="font-bold text-white">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>

                {isBoltSelected ? (
                  <>
                    <div className="flex justify-between text-amber-300 bg-amber-950/30 p-2 border border-amber-500/20 rounded-none">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        Payable after Try-On:
                      </span>
                      <span className="font-bold font-mono">₹{subtotal.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-neutral-400">
                      <span>Doorstep Salon Convenience Fee</span>
                      <span className="font-bold text-white">₹99.00</span>
                    </div>
                    <div className="border-t border-white/10 pt-3 flex justify-between text-base font-bold text-white">
                      <span>Immediate Checkout Due</span>
                      <span className="text-lg font-mono text-white">₹99.00 INR</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-neutral-400">
                      <span>Shipping Dispatch</span>
                      <span className="font-bold text-white">₹150.00</span>
                    </div>
                    <div className="flex justify-between text-neutral-400">
                      <span>Estimated Tax (8%)</span>
                      <span className="font-bold text-white">₹{tax.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-white/10 pt-3 flex justify-between text-base font-bold text-white">
                      <span>Total Due Now</span>
                      <span className="text-lg font-mono text-white">₹{immediateTotal.toFixed(2)} INR</span>
                    </div>
                  </>
                )}
              </div>

              <div className="pt-2 flex items-center gap-2 text-[11px] uppercase tracking-wider text-neutral-400 font-mono justify-center">
                <ShieldCheck className="w-4 h-4 text-[#B91C1C]" />
                <span>Complimentary Returns & Doorstep Swaps</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
