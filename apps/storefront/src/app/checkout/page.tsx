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
  }, [isServiceable, isBoltHydrated])

  // Fetch active Bolt time slots
  useEffect(() => {
    async function fetchSlots() {
      setLoadingSlots(true)
      try {
        const res = await fetch('/api/bolt/timeslots')
        const data = await res.json()
        if (data.success && Array.isArray(data.timeslots) && data.timeslots.length > 0) {
          setTimeslots(data.timeslots)
          if (!selectedTimeslotId) {
            setSelectedTimeslotId(data.timeslots[0].id)
          }
        } else {
          // Fallback default slots
          const fallbackSlots: BoltTimeslot[] = [
            {
              id: 't1000000-0000-0000-0000-000000000001',
              label: '10:00 AM - 12:00 PM (Morning Priority)',
              slot_start: '10:00:00',
              slot_end: '12:00:00',
              cutoff_time: '09:00:00',
              max_daily_capacity: 12,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              id: 't1000000-0000-0000-0000-000000000002',
              label: '12:00 PM - 02:00 PM (Midday Salon)',
              slot_start: '12:00:00',
              slot_end: '14:00:00',
              cutoff_time: '11:00:00',
              max_daily_capacity: 12,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              id: 't1000000-0000-0000-0000-000000000003',
              label: '02:00 PM - 04:00 PM (Afternoon Fitting)',
              slot_start: '14:00:00',
              slot_end: '16:00:00',
              cutoff_time: '13:00:00',
              max_daily_capacity: 15,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              id: 't1000000-0000-0000-0000-000000000004',
              label: '04:00 PM - 06:00 PM (Evening Express)',
              slot_start: '16:00:00',
              slot_end: '18:00:00',
              cutoff_time: '15:00:00',
              max_daily_capacity: 15,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]
          setTimeslots(fallbackSlots)
          if (!selectedTimeslotId) {
            setSelectedTimeslotId(fallbackSlots[0].id)
          }
        }
      } catch {
        // graceful handle
      } finally {
        setLoadingSlots(false)
      }
    }

    fetchSlots()
  }, [selectedTimeslotId, setSelectedTimeslotId])

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

  // Price calculations based on mode
  const isBoltSelected = deliveryMode === 'bolt' && isServiceable
  const isOverBoltLimit = isBoltSelected && itemCount > 5

  const immediateTotal = isBoltSelected ? 99.0 : Number((subtotal + 150.0 + tax).toFixed(2))
  const standardShippingFee = 150.0
  const boltConvenienceFee = 99.0

  const handleProceedToAddress = () => {
    if (isOverBoltLimit) return
    setActiveStep(2)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isOverBoltLimit) return

    setIsSubmitting(true)

    const generatedRef = 'ATL-' + Math.random().toString(36).substring(2, 8).toUpperCase()
    const generatedTracking = 'ATL-TRK-' + generatedRef.replace('ATL-', '')
    const generatedInvoice = 'INV-2026-' + generatedRef.replace('ATL-', '')
    const fullAddress = `${formData.address}${formData.suite ? `, ${formData.suite}` : ''}, ${formData.city}, ${formData.state} ${formData.postalCode}`

    let activeRef = generatedRef
    let activeInvoice = generatedInvoice
    let activeTracking = generatedTracking

    const selectedSlotObj = timeslots.find((s) => s.id === selectedTimeslotId)
    const slotLabel = selectedSlotObj?.label || '10:00 AM - 12:00 PM (Morning Priority)'

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
      <div className="max-w-2xl mx-auto px-4 sm:px-8 py-16 sm:py-24 text-center space-y-8">
        <div className="w-16 h-16 mx-auto bg-neutral-100 border border-neutral-300 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-[#166534]" />
        </div>

        <div className="space-y-3">
          <span className="text-xs uppercase tracking-[0.25em] text-[#166534] font-mono font-bold block flex items-center justify-center gap-1.5">
            {isConfirmedBolt ? (
              <>
                <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                BOLT ⚡ DOORSTEP SALON SCHEDULED
              </>
            ) : (
              'ORDER CONFIRMED • STANDARD DISPATCH'
            )}
          </span>
          <h1 className="text-3xl sm:text-5xl font-black uppercase text-black tracking-tight font-serif">
            THANK YOU FOR YOUR <span className="text-[#166534] italic font-normal lowercase">{isConfirmedBolt ? 'try-on booking' : 'order'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 font-light leading-relaxed max-w-lg mx-auto">
            {isConfirmedBolt
              ? 'Our white-glove courier will arrive at your doorstep with the requested garments. Try them on in the comfort of your home, keep what fits, and return the rest instantly.'
              : 'Your garments have entered our dispatch queue. An official commercial receipt with tracking barcode has been generated for your record.'}
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
            <span className="text-neutral-400 uppercase tracking-wider text-[11px]">DELIVERY EXPERIENCE</span>
            <span className="font-bold text-black uppercase flex items-center gap-1">
              {isConfirmedBolt ? (
                <>
                  <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> Bolt ⚡ Doorstep Try-On
                </>
              ) : (
                'Standard Insured Delivery'
              )}
            </span>
          </div>

          {isConfirmedBolt && confirmedSlotLabel && (
            <div className="flex justify-between items-center border-b border-neutral-200 pb-3 bg-amber-50/50 -mx-2 px-2 py-1.5 rounded">
              <span className="text-amber-800 uppercase tracking-wider text-[11px] font-bold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> APPOINTMENT WINDOW
              </span>
              <span className="font-bold text-neutral-900 font-mono text-xs">
                {confirmedSlotLabel}
              </span>
            </div>
          )}

          <div className="flex justify-between items-baseline border-b border-neutral-200 pb-3">
            <span className="text-neutral-400 uppercase tracking-wider text-[11px]">DESTINATION</span>
            <span className="text-neutral-800 text-right max-w-[65%] font-mono text-xs font-medium">
              {formData.address}, {formData.city}, {formData.state} {formData.postalCode}
            </span>
          </div>

          <div className="flex justify-between items-center pt-1 text-sm font-bold">
            <span className="text-neutral-600 uppercase font-mono">
              {isConfirmedBolt ? 'CONVENIENCE FEE PAID' : 'TOTAL PAID'}
            </span>
            <span className="font-mono text-base text-black">
              ₹{immediateTotal.toFixed(2)} INR
            </span>
          </div>

          {isConfirmedBolt && (
            <div className="p-3 bg-neutral-50 border border-neutral-200 rounded text-[11px] text-neutral-600 space-y-1">
              <div className="flex justify-between font-bold text-neutral-800">
                <span>Garment Value (Payable after Try-On):</span>
                <span>₹{subtotal.toLocaleString('en-IN')} INR</span>
              </div>
              <p className="text-[10px] text-neutral-500">
                You will only be charged for the items you choose to keep after your 45-minute fitting salon.
              </p>
            </div>
          )}

          {/* Patron Actions */}
          <div className="pt-3 border-t border-neutral-200 flex flex-col sm:flex-row gap-2">
            <Link href="/orders" className="flex-1">
              <Button
                variant="outline"
                size="sm"
                className="w-full h-10 border-neutral-300 hover:border-black text-black font-mono font-bold text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-[#166534]" /> View Orders Dashboard
              </Button>
            </Link>
          </div>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row justify-center items-center gap-4">
          <Link href="/orders" className="w-full sm:w-auto">
            <Button
              size="lg"
              className="w-full sm:w-auto px-8 h-14 bg-[#166534] hover:bg-[#14532d] text-white font-mono font-bold text-xs uppercase tracking-wider rounded-none shadow-md cursor-pointer"
            >
              TRACK ORDER STATUS →
            </Button>
          </Link>
          <Link href="/#collection" className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto px-8 h-14 border-2 border-neutral-300 hover:border-black text-black font-mono font-bold text-xs uppercase tracking-wider rounded-none cursor-pointer"
            >
              CONTINUE SHOPPING
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // --- EMPTY CART GUARD ---
  if (isCartHydrated && items.length === 0) {
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
            className={`transition-colors flex items-center gap-2 cursor-pointer ${
              activeStep === 1 ? 'text-black font-bold' : 'hover:text-black'
            }`}
          >
            <span
              className={`w-5 h-5 flex items-center justify-center text-[10px] font-bold ${
                activeStep === 1 ? 'bg-black text-white' : 'bg-neutral-200 text-neutral-600'
              }`}
            >
              1
            </span>
            <span>EXPERIENCE & TIME SLOTS</span>
          </button>
          <span>→</span>
          <button
            onClick={() => {
              if (!isOverBoltLimit) setActiveStep(2)
            }}
            disabled={isOverBoltLimit}
            className={`transition-colors flex items-center gap-2 ${
              activeStep === 2
                ? 'text-black font-bold'
                : isOverBoltLimit
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:text-black cursor-pointer'
            }`}
          >
            <span
              className={`w-5 h-5 flex items-center justify-center text-[10px] font-bold ${
                activeStep === 2 ? 'bg-black text-white' : 'bg-neutral-200 text-neutral-600'
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
                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black">
                  SELECT DELIVERY EXPERIENCE
                </h2>
                <p className="text-xs sm:text-sm text-neutral-500 font-light">
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
                  className={`p-5 border-2 transition-all space-y-3 relative ${
                    isServiceable
                      ? deliveryMode === 'bolt'
                        ? 'border-black bg-white ring-1 ring-black shadow-md cursor-pointer'
                        : 'border-neutral-200 bg-white hover:border-neutral-400 cursor-pointer'
                      : 'border-dashed border-neutral-300 bg-neutral-50/80 cursor-not-allowed opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-9 h-9 bg-neutral-900 flex items-center justify-center text-amber-400 border border-neutral-800">
                      <Zap className="w-5 h-5 fill-amber-400" />
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-sm text-black font-bold block">
                        ₹99.00
                      </span>
                      <span className="text-[10px] uppercase font-mono text-neutral-400">
                        Convenience Fee
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-bold uppercase text-black font-mono">
                        Bolt ⚡ Try-On Salon
                      </h3>
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-300">
                        FLAGSHIP
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 font-light mt-1 leading-relaxed">
                      White-glove 45-min doorstep fitting. Try before you pay. Keep what fits, reject the rest immediately.
                    </p>
                  </div>

                  {isServiceable ? (
                    <div className="pt-2 text-[11px] font-mono text-[#166534] flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Available in {boltCity || 'your area'} (PIN: {pincode})</span>
                    </div>
                  ) : (
                    <div className="pt-2 text-[11px] font-mono text-amber-700 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Check PIN in top banner to unlock Bolt ⚡</span>
                    </div>
                  )}
                </div>

                {/* Option B: Standard Delivery Tab */}
                <div
                  onClick={() => setDeliveryMode('standard')}
                  className={`p-5 border-2 cursor-pointer transition-all space-y-3 ${
                    deliveryMode === 'standard'
                      ? 'border-black bg-white ring-1 ring-black shadow-md'
                      : 'border-neutral-200 bg-white hover:border-neutral-400 opacity-90'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-9 h-9 bg-neutral-100 flex items-center justify-center text-neutral-900 border border-neutral-200">
                      <Truck className="w-4 h-4 text-[#166534]" />
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-sm text-black font-bold block">
                        ₹150.00
                      </span>
                      <span className="text-[10px] uppercase font-mono text-neutral-400">
                        Shipping Fee
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold uppercase text-black font-mono">
                      Standard Delivery
                    </h3>
                    <p className="text-xs text-neutral-500 font-light mt-1 leading-relaxed">
                      Fully insured dispatch from atelier workshop to all PIN codes across India. Full cart value charged upfront.
                    </p>
                  </div>

                  <div className="pt-2 text-[11px] font-mono text-neutral-500 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Nationwide delivery in 3–5 business days</span>
                  </div>
                </div>
              </div>

              {/* Bolt Max 5 Items Warning */}
              {isOverBoltLimit && (
                <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-none text-amber-900 text-xs font-mono flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <strong className="block font-bold uppercase tracking-wider text-amber-950">
                      Bolt ⚡ Try-On Limit Exceeded ({itemCount} / 5 pieces in bag)
                    </strong>
                    <p className="text-[11px] leading-relaxed text-amber-800">
                      Our white-glove doorstep salon accommodates a maximum of <strong>5 garments</strong> per appointment to ensure focused, tailored fitting. Please return to your bag to adjust quantities, or switch to <strong>Standard Delivery</strong> above.
                    </p>
                    <Link href="/cart" className="inline-block pt-1 underline font-bold text-amber-950 hover:text-black">
                      Adjust Bag Quantities →
                    </Link>
                  </div>
                </div>
              )}

              {/* Time Slots Section (When Bolt is active) */}
              {isBoltSelected && (
                <div className="border border-neutral-300 bg-white p-5 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#166534]" />
                      <h4 className="text-xs uppercase font-mono font-bold tracking-wider text-black">
                        SELECT BOLT ⚡ TIME SLOT WINDOW
                      </h4>
                    </div>
                    <span className="text-[11px] font-mono text-neutral-500">
                      IST Indian Standard Time
                    </span>
                  </div>

                  {loadingSlots ? (
                    <div className="py-8 text-center text-xs font-mono text-neutral-500">
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
                            className={`p-3.5 border text-left cursor-pointer transition-all ${
                              isSelected
                                ? 'border-black bg-neutral-900 text-white shadow-sm'
                                : 'border-neutral-200 bg-neutral-50 hover:border-neutral-400 text-neutral-800'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono font-bold tracking-tight">
                                {slot.label}
                              </span>
                              {isSelected && (
                                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
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
                  className="w-full h-14 bg-black hover:bg-neutral-800 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-none border border-black shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                    SHIPPING ADDRESS & DETAILS
                  </h2>
                </div>
                <button
                  onClick={() => setActiveStep(1)}
                  className="text-xs uppercase font-mono font-semibold text-neutral-500 hover:text-black underline underline-offset-4 cursor-pointer"
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
                    className="w-4 h-4 accent-black rounded-none cursor-pointer"
                  />
                  <label htmlFor="saveAddress" className="text-xs text-neutral-600 font-mono cursor-pointer">
                    Save address to profile for one-click future checkouts
                  </label>
                </div>

                {/* Submit Order Button */}
                <div className="pt-4 space-y-3">
                  <div className="p-3 bg-neutral-100 border border-neutral-200 text-xs text-neutral-600 font-mono flex items-center gap-2.5">
                    <Lock className="w-4 h-4 text-[#166534] shrink-0" />
                    <span>
                      {isBoltSelected
                        ? 'Flat ₹99 convenience booking fee authorized today. Clothes charged only after your doorstep trial.'
                        : 'Secure encrypted checkout. Direct insured courier dispatch upon confirmation.'}
                    </span>
                  </div>

                  <Button
                    type="submit"
                    size="xl"
                    className="w-full h-14 bg-black hover:bg-neutral-800 text-white font-mono font-bold text-xs uppercase tracking-[0.2em] rounded-none border border-black shadow-md flex items-center justify-center gap-3 cursor-pointer"
                    isLoading={isSubmitting}
                  >
                    <span>
                      {isBoltSelected
                        ? `CONFIRM BOLT ⚡ TRY-ON • ₹${immediateTotal.toFixed(2)} INR`
                        : `CONFIRM ORDER • ₹${immediateTotal.toFixed(2)} INR`}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
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
                SALON SELECTION
              </span>
              <span className="text-xs font-mono text-neutral-400 font-bold">
                {items.length} {items.length === 1 ? 'PIECE' : 'PIECES'}
                {isBoltSelected && ' (MAX 5)'}
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
                      {item.size && (
                        <span>
                          • SIZE: <span className="text-[#166534] font-bold">{item.size}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="font-mono font-bold text-xs text-black shrink-0">
                    ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>

            {/* Selected Shipping Method Badge */}
            <div className="p-3 bg-neutral-50 border border-neutral-200 flex justify-between items-center text-xs font-mono">
              <span className="font-bold text-black uppercase flex items-center gap-1.5">
                {isBoltSelected ? (
                  <>
                    <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> Bolt ⚡ Doorstep Try-On
                  </>
                ) : (
                  <>
                    <Truck className="w-3.5 h-3.5 text-[#166534]" /> Standard Insured Delivery
                  </>
                )}
              </span>
              <span className="font-mono text-xs font-bold text-black">
                {isBoltSelected ? '₹99.00' : '₹150.00'}
              </span>
            </div>

            {/* Calculations Breakdown */}
            <div className="border-t border-neutral-200 pt-4 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-neutral-600">
                <span>Garment Value</span>
                <span className="font-bold text-black">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>

              {isBoltSelected ? (
                <>
                  <div className="flex justify-between text-amber-900 bg-amber-50/70 p-2 border border-amber-200 rounded">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-600" />
                      Payable after Try-On:
                    </span>
                    <span className="font-bold font-mono">₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>Doorstep Salon Convenience Fee</span>
                    <span className="font-bold text-black">₹99.00</span>
                  </div>
                  <div className="border-t border-neutral-200 pt-3 flex justify-between text-base font-bold text-black">
                    <span>Immediate Checkout Due</span>
                    <span className="text-lg font-mono text-black">₹99.00 INR</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-neutral-600">
                    <span>Shipping Dispatch</span>
                    <span className="font-bold text-black">₹150.00</span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>Estimated Tax (8%)</span>
                    <span className="font-bold text-black">₹{tax.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-neutral-200 pt-3 flex justify-between text-base font-bold text-black">
                    <span>Total Due Now</span>
                    <span className="text-lg font-mono">₹{immediateTotal.toFixed(2)} INR</span>
                  </div>
                </>
              )}
            </div>

            <div className="pt-2 flex items-center gap-2 text-[11px] uppercase tracking-wider text-neutral-500 font-mono justify-center">
              <ShieldCheck className="w-4 h-4 text-[#166534]" />
              <span>Complimentary Returns & Doorstep Swaps</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
