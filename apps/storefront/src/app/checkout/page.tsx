'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle,
  Truck,
  ShieldCheck,
  ChevronRight,
  Zap,
  Lock,
  UserCheck,
  Calendar,
  Clock,
  MapPin,
  AlertCircle,
  Check,
  CreditCard,
  Smartphone,
  Banknote,
} from 'lucide-react'
import { Button, Input } from '@repo/ui'
import { createBrowserClient } from '@repo/supabase/browser'
import type { BoltTimeslot } from '@repo/supabase/types'
import { useHydratedCart } from '../../store/useCartStore'
import { useHydratedBolt } from '../../store/useBoltStore'
import {
  BOLT_HOLD_FEE,
  STANDARD_SHIPPING_FEE,
  isFreeStandardShipping,
  resolveShippingFee,
} from '../../store/cartSubtotal'
import { ProductImage } from '@/components/ui/ProductImage'
import { PriceDetailsBox } from '@/components/cart/PriceDetailsBox'
import {
  getIstDateOptions,
  getCustomerSlotAvailability,
  resolveInitialBoltDateAndSlot,
} from '@/utils/boltSlots'

type PaymentMethod = 'online' | 'cod'

export default function LuxuryCheckoutPage() {
  const {
    items,
    isHydrated: isCartHydrated,
    subtotal,
    discount,
    discountedSubtotal,
    tax,
    shippingFee,
    estimatedTotal,
    itemCount,
    appliedCouponCode,
    deliveryMode: cartDeliveryMode,
    setDeliveryMode: setCartDeliveryMode,
    setTryOnWindow,
    recalculatePromotions,
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

  // 3-step stepper state
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1)
  const [showModeSwitcher, setShowModeSwitcher] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('online')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [orderReference, setOrderReference] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [trackingBarcode, setTrackingBarcode] = useState('')
  const [confirmedOrderType, setConfirmedOrderType] = useState<'standard' | 'bolt_try_on'>('standard')
  const [confirmedSlotLabel, setConfirmedSlotLabel] = useState<string>('')
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [saveAddressToProfile, setSaveAddressToProfile] = useState(true)

  // Bolt 3-day IST date + slot selection
  const istDates = useMemo(() => getIstDateOptions(), [])
  const [selectedDayOffset, setSelectedDayOffset] = useState<0 | 1 | 2>(0)
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

  // Ensure pricing evaluation matches server before payment step
  useEffect(() => {
    if (isCartHydrated && items.length > 0) {
      recalculatePromotions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCartHydrated])

  // Sync postal code & city from Bolt store into address form
  useEffect(() => {
    if (pincode) {
      setFormData((prev) => ({
        ...prev,
        postalCode: pincode,
        city: boltCity || prev.city,
      }))
    }
  }, [pincode, boltCity])

  // Check auth session
  useEffect(() => {
    const supabase = createBrowserClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(Boolean(session))
      if (session?.user?.email) {
        setFormData((prev) => ({
          ...prev,
          email: session.user.email!,
          name: session.user.user_metadata?.name || prev.name,
        }))
      }
    })
  }, [])

  const isBoltSelected = cartDeliveryMode === 'try_on' && isServiceable
  const isOverBoltLimit = isBoltSelected && itemCount > 5

  // Load available Bolt time slots and auto-advance Today -> Tomorrow if today's slots closed
  useEffect(() => {
    if (!isBoltSelected) return
    setLoadingSlots(true)
    fetch('/api/bolt/timeslots')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.timeslots)) {
          const loaded: BoltTimeslot[] = data.timeslots
          setTimeslots(loaded)
          const initial = resolveInitialBoltDateAndSlot(loaded)
          setSelectedDayOffset(initial.dayOffset)
          if (
            !selectedTimeslotId ||
            !loaded.some(
              (s) =>
                s.id === selectedTimeslotId &&
                !getCustomerSlotAvailability(s, initial.dayOffset).disabled
            )
          ) {
            if (initial.slotId) {
              setSelectedTimeslotId(initial.slotId)
            }
          }
        }
      })
      .catch((err) => console.warn('Could not load slots:', err))
      .finally(() => setLoadingSlots(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBoltSelected])

  const handleSelectDateOffset = (dayOffset: 0 | 1 | 2) => {
    setSelectedDayOffset(dayOffset)
    const currentStillOpen = timeslots.some(
      (s) =>
        s.id === selectedTimeslotId &&
        !getCustomerSlotAvailability(s, dayOffset).disabled
    )
    if (!currentStillOpen) {
      const firstOpen = timeslots.find(
        (s) => !getCustomerSlotAvailability(s, dayOffset).disabled
      )
      setSelectedTimeslotId(firstOpen?.id ?? null)
    }
  }

  // Exact totals aligned with POST /api/orders
  const qualifiesFreeShipping = isFreeStandardShipping(subtotal)
  const resolvedDirectShipping =
    cartDeliveryMode === 'direct' ? shippingFee : resolveShippingFee(subtotal, 'direct')
  const resolvedBoltShipping =
    cartDeliveryMode === 'try_on' ? shippingFee : BOLT_HOLD_FEE
  const activeShippingFee = isBoltSelected ? resolvedBoltShipping : resolvedDirectShipping
  const immediateTotal = isBoltSelected
    ? activeShippingFee
    : estimatedTotal > 0
      ? estimatedTotal
      : Math.max(0, discountedSubtotal) + activeShippingFee + tax

  const selectedDateOption =
    istDates.find((d) => d.dayOffset === selectedDayOffset) || istDates[0]!
  const chosenSlot = timeslots.find((s) => s.id === selectedTimeslotId) || null
  const formattedAppointmentWindow = chosenSlot
    ? `${selectedDateOption.shortLabel} (${selectedDateOption.subLabel}) · ${chosenSlot.label}`
    : `${selectedDateOption.shortLabel} (${selectedDateOption.subLabel})`

  const handleContinueFromStep1 = () => {
    if (isOverBoltLimit) return
    if (isBoltSelected && !selectedTimeslotId && timeslots.length > 0) {
      setCheckoutError('Please select an available fitting window before continuing.')
      return
    }
    setCheckoutError(null)
    setActiveStep(2)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleContinueFromStep2 = (e: React.FormEvent) => {
    e.preventDefault()
    setCheckoutError(null)
    setActiveStep(3)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Submit Order on Step 3
  const handleConfirmOrder = async () => {
    if (isOverBoltLimit) return

    setIsSubmitting(true)
    setCheckoutError(null)
    const randomHex = Math.random().toString(36).substring(2, 7).toUpperCase()
    const generatedRef = `ATL-${randomHex}`
    const generatedInvoice = `INV-2026-${randomHex}`
    const generatedTracking = `ATL-TRK-${randomHex}`

    const fullAddress = `${formData.address}${formData.suite ? `, ${formData.suite}` : ''}, ${formData.city}, ${formData.state} ${formData.postalCode}, ${formData.country}`

    let activeRef = generatedRef
    let activeInvoice = generatedInvoice
    let activeTracking = generatedTracking

    try {
      const supabase = createBrowserClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const currentUserId = session?.user?.id || 'a0000000-0000-0000-0000-000000000001'

      if (isBoltSelected) {
        setTryOnWindow({
          date: `${selectedDateOption.shortLabel}, ${selectedDateOption.subLabel}`,
          timeSlot: chosenSlot?.label || 'Doorstep Fitting Slot',
        })
      }

      // 1. Save address to addresses table
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

      // 2. Sync to user profile if authenticated
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

      const combinedNotes = [
        formData.notes?.trim(),
        isBoltSelected ? `Bolt Window: ${formattedAppointmentWindow}` : `Payment: ${paymentMethod.toUpperCase()}`,
      ]
        .filter(Boolean)
        .join(' | ')

      // 3. Authoritative Order Payload
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
          shipping_fee: activeShippingFee,
          original_total: subtotal,
          total: immediateTotal,
          status: 'pending',
          shipping_address: `${fullAddress} [Patron: ${formData.email} | Tel: ${formData.phone}]`,
          delivery_notes: combinedNotes,
        },
        items: items.map((it) => ({
          productId: it.productId || it.id,
          variantId: it.variantId || undefined,
          quantity: it.quantity,
          unitPrice: it.price,
          size: it.size,
          color: it.color || undefined,
        })),
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      })
      const data = await res.json()

      if (res.status === 409 || data?.code === 'INSUFFICIENT_STOCK') {
        const oosMsg =
          data?.error ||
          'One or more items in your cart are currently out of stock. Please adjust quantities before proceeding.'
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
        setConfirmedSlotLabel(formattedAppointmentWindow)
        setOrderPlaced(true)
        clearCart()
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        setCheckoutError(
          data?.error || 'Could not place order. Please verify your details and try again.'
        )
      }
    } catch (err: any) {
      console.warn('Checkout submission catch:', err)
      setCheckoutError(err?.message || 'Network error occurred while submitting order.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isCartHydrated || !isBoltHydrated) {
    return (
      <div className="min-h-[70vh] bg-white text-[#14293a] flex flex-col items-center justify-center px-6 py-24 text-center font-sans">
        <div className="w-8 h-8 border-2 border-[#d3d6db] border-t-[#b91c1c] rounded-full animate-spin mb-4" />
        <span className="text-xs uppercase tracking-wider text-[#6c7079] font-medium">
          Preparing Secure Checkout...
        </span>
      </div>
    )
  }

  // --- ORDER SUCCESS CONFIRMATION ---
  if (orderPlaced) {
    const isConfirmedBolt = confirmedOrderType === 'bolt_try_on'

    return (
      <div className="min-h-screen bg-white text-[#14293a] font-sans">
        <div className="max-w-2xl mx-auto px-4 sm:px-8 py-14 text-center space-y-6">
          <div className="w-16 h-16 mx-auto bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-emerald-700" strokeWidth={1.75} />
          </div>

          <div className="space-y-2">
            <span className="text-xs uppercase tracking-wider text-[#b91c1c] font-bold flex items-center justify-center gap-1.5">
              {isConfirmedBolt ? (
                <>
                  <Zap className="w-4 h-4 fill-[#b91c1c] text-[#b91c1c]" strokeWidth={1.75} />
                  <span>Bolt Doorstep Try-On Scheduled</span>
                </>
              ) : (
                <span>Order Confirmed · Standard Dispatch</span>
              )}
            </span>
            <h1 className="text-2xl sm:text-3xl font-sans font-bold text-[#14293a] tracking-tight">
              Thank You for Your {isConfirmedBolt ? 'Try-On Booking' : 'Order'}
            </h1>
            <p className="text-xs sm:text-sm text-[#6c7079] leading-relaxed max-w-lg mx-auto">
              {isConfirmedBolt
                ? 'Our courier will arrive at your doorstep with your selected garments. Try them in home comfort, keep what fits, and return the rest on the spot.'
                : 'Your pieces have entered our dispatch queue. A commercial invoice and tracking barcode have been generated for your order.'}
            </p>
          </div>

          <div className="p-6 border border-[#d3d6db] bg-[#f8f8f8] text-left space-y-3.5 text-xs rounded-sm">
            <div className="flex justify-between items-center border-b border-[#e5e7eb] pb-2.5">
              <span className="text-[#6c7079] uppercase tracking-wider font-medium text-[11px]">
                Order Reference
              </span>
              <span className="font-bold text-[#14293a] text-sm">{orderReference}</span>
            </div>

            <div className="flex justify-between items-center border-b border-[#e5e7eb] pb-2.5">
              <span className="text-[#6c7079] uppercase tracking-wider font-medium text-[11px]">
                Commercial Invoice
              </span>
              <span className="font-bold text-[#14293a] bg-white px-2 py-0.5 border border-[#d3d6db] rounded-sm">
                {invoiceNumber || `INV-2026-${orderReference.replace('ATL-', '')}`}
              </span>
            </div>

            <div className="flex justify-between items-center border-b border-[#e5e7eb] pb-2.5">
              <span className="text-[#6c7079] uppercase tracking-wider font-medium text-[11px]">
                Shipment Tracking
              </span>
              <span className="text-xs text-[#b91c1c] font-bold">
                {trackingBarcode || `ATL-TRK-${orderReference.replace('ATL-', '')}`}
              </span>
            </div>

            {isConfirmedBolt && confirmedSlotLabel && (
              <div className="flex justify-between items-center border-b border-[#e5e7eb] pb-2.5 bg-[#fef2f2] -mx-2 px-3 py-2 rounded-sm">
                <span className="text-[#b91c1c] uppercase tracking-wider text-[11px] font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" strokeWidth={1.75} /> Appointment Window
                </span>
                <span className="font-bold text-[#14293a]">{confirmedSlotLabel}</span>
              </div>
            )}

            <div className="flex justify-between items-baseline border-b border-[#e5e7eb] pb-2.5">
              <span className="text-[#6c7079] uppercase tracking-wider font-medium text-[11px]">
                Destination
              </span>
              <span className="text-[#14293a] text-right max-w-[65%] font-medium">
                {formData.address}, {formData.city}, {formData.state} {formData.postalCode}
              </span>
            </div>

            <div className="flex justify-between items-center pt-1 text-sm font-bold">
              <span className="text-[#6c7079] uppercase">
                {isConfirmedBolt ? 'Hold Authorized' : 'Total Payable'}
              </span>
              <span className="text-base font-bold tabular-nums text-[#14293a]">
                ₹{Math.round(immediateTotal).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row justify-center items-center gap-3">
            <Link href={`/orders/${encodeURIComponent(orderReference)}`} className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto px-6 py-2.5 bg-[#14293a] hover:bg-[#b91c1c] text-white text-xs font-bold uppercase tracking-wider rounded-sm transition-colors"
              >
                <span>Track Order Live</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" strokeWidth={1.75} />
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
  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] bg-white text-[#14293a] flex items-center justify-center px-4 font-sans">
        <div className="max-w-xl mx-auto py-24 text-center space-y-4">
          <h1 className="font-sans text-2xl font-bold tracking-tight text-[#14293a]">
            Your Bag is Empty
          </h1>
          <p className="text-xs sm:text-sm text-[#6c7079] leading-relaxed">
            Add garments to your shopping bag before proceeding to checkout.
          </p>
          <Link href="/shop" className="inline-block pt-2">
            <Button
              size="lg"
              className="px-6 py-2.5 bg-[#14293a] hover:bg-[#b91c1c] text-white text-xs font-bold uppercase tracking-wider rounded-sm transition-colors"
            >
              <span>Explore Collection</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" strokeWidth={1.75} />
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-[#14293a] font-sans pb-24">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12 space-y-6">
        {/* Accurate 3-Step Checkout Stepper */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5e7eb] pb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#14293a] tracking-tight">
              Checkout{' '}
              <span className="text-sm font-normal text-[#6c7079] ml-1">
                ({itemCount} {itemCount === 1 ? 'item' : 'items'})
              </span>
            </h1>
          </div>

          <nav aria-label="Checkout steps" className="flex items-center flex-wrap gap-2 sm:gap-3 text-xs font-medium">
            {[
              { step: 1 as const, label: 'Delivery & Slots' },
              { step: 2 as const, label: 'Shipping Address' },
              { step: 3 as const, label: 'Payment' },
            ].map((item, index) => {
              const isCurrent = activeStep === item.step
              const isCompleted = activeStep > item.step
              const canJump = isCompleted || (item.step === 2 && !isOverBoltLimit && activeStep >= 2)

              return (
                <React.Fragment key={item.step}>
                  {index > 0 && <span className="text-[#d3d6db]">/</span>}
                  <button
                    type="button"
                    disabled={!canJump && !isCurrent}
                    onClick={() => {
                      if (canJump) setActiveStep(item.step)
                    }}
                    className={`flex items-center gap-1.5 transition-colors ${
                      isCurrent
                        ? 'text-[#14293a] font-bold'
                        : isCompleted
                          ? 'text-emerald-700 font-semibold hover:text-[#14293a] cursor-pointer'
                          : 'text-[#8a909a] cursor-default'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isCurrent
                          ? 'bg-[#14293a] text-white'
                          : isCompleted
                            ? 'bg-emerald-700 text-white'
                            : 'bg-[#e5e7eb] text-[#6c7079]'
                      }`}
                    >
                      {isCompleted ? <Check className="w-3 h-3" strokeWidth={2.25} /> : item.step}
                    </span>
                    <span>{item.label}</span>
                  </button>
                </React.Fragment>
              )
            })}
          </nav>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: 3-STEP CHECKOUT FLOW */}
          <div className="lg:col-span-8 space-y-6">
            {isAuthenticated === false && (
              <div className="p-3.5 bg-[#f8f8f8] border border-[#d3d6db] rounded-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#b91c1c] shrink-0" strokeWidth={1.75} />
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

            {checkoutError && (
              <div className="p-3.5 bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] text-xs flex items-center gap-2 rounded-sm">
                <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                <span>{checkoutError}</span>
              </div>
            )}

            {/* ===================================================== */}
            {/* STEP 1: PRE-SELECTED DELIVERY SUMMARY & BOLT SLOTS    */}
            {/* ===================================================== */}
            {activeStep === 1 && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Pre-Selected Delivery Summary Card (carries useCartStore.deliveryMode directly) */}
                <div className="border border-[#d3d6db] bg-white rounded-sm p-5 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-sm border flex items-center justify-center shrink-0 ${
                          isBoltSelected
                            ? 'bg-[#fef2f2] border-[#fecaca] text-[#b91c1c]'
                            : 'bg-[#f8f8f8] border-[#d3d6db] text-[#14293a]'
                        }`}
                      >
                        {isBoltSelected ? (
                          <Zap className="w-4 h-4 fill-[#b91c1c]" strokeWidth={1.75} />
                        ) : (
                          <Truck className="w-4 h-4" strokeWidth={1.75} />
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-[#14293a]">
                            {isBoltSelected ? 'Bolt 45-Min Doorstep Try-On' : 'Standard Express Delivery'}
                          </span>
                          <span className="text-[11px] font-semibold px-2 py-0.5 border border-[#e5e7eb] bg-[#f8f8f8] rounded-sm text-[#52565e]">
                            {isBoltSelected
                              ? `₹${BOLT_HOLD_FEE} Hold`
                              : qualifiesFreeShipping
                                ? 'FREE'
                                : `₹${STANDARD_SHIPPING_FEE}`}
                          </span>
                        </div>
                        <p className="text-xs text-[#6c7079] leading-relaxed">
                          {isBoltSelected
                            ? `Selected from your bag for ${boltCity || 'your area'} (${pincode}). Try at home before paying; the ₹${BOLT_HOLD_FEE} hold credits toward kept pieces.`
                            : cartDeliveryMode === 'try_on' && !isServiceable
                              ? 'Bolt Try-On is unavailable for your current PIN code. Switched to tracked Pan-India Standard Express Delivery.'
                              : 'Tracked insured courier delivery across India in 2–4 business days.'}
                        </p>
                      </div>
                    </div>

                    {isServiceable && (
                      <button
                        type="button"
                        onClick={() => setShowModeSwitcher((prev) => !prev)}
                        className="text-xs font-semibold text-[#b91c1c] hover:underline shrink-0 cursor-pointer"
                      >
                        {showModeSwitcher ? 'Done' : 'Change'}
                      </button>
                    )}
                  </div>

                  {showModeSwitcher && isServiceable && (
                    <div className="pt-3 border-t border-[#e5e7eb] grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setCartDeliveryMode('try_on')
                          setShowModeSwitcher(false)
                        }}
                        className={`p-3 border rounded-sm text-left text-xs transition-colors cursor-pointer ${
                          cartDeliveryMode === 'try_on'
                            ? 'border-[#b91c1c] bg-[#fef2f2] font-semibold'
                            : 'border-[#d3d6db] bg-white hover:border-[#14293a]'
                        }`}
                      >
                        <span className="flex items-center justify-between">
                          <span className="font-bold text-[#14293a]">Bolt 45-Min Try-On</span>
                          <span className="text-[#b91c1c] font-bold">₹{BOLT_HOLD_FEE} Hold</span>
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setCartDeliveryMode('direct')
                          setShowModeSwitcher(false)
                        }}
                        className={`p-3 border rounded-sm text-left text-xs transition-colors cursor-pointer ${
                          cartDeliveryMode === 'direct'
                            ? 'border-[#14293a] bg-[#f8f8f8] font-semibold'
                            : 'border-[#d3d6db] bg-white hover:border-[#14293a]'
                        }`}
                      >
                        <span className="flex items-center justify-between">
                          <span className="font-bold text-[#14293a]">Standard Delivery</span>
                          <span className="font-bold">
                            {qualifiesFreeShipping ? (
                              <span className="text-emerald-700">FREE</span>
                            ) : (
                              `₹${STANDARD_SHIPPING_FEE}`
                            )}
                          </span>
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Bolt Max 5 Items Warning */}
                {isOverBoltLimit && (
                  <div className="p-4 bg-[#fef2f2] border border-[#fecaca] rounded-sm text-[#b91c1c] text-xs flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-[#b91c1c] shrink-0 mt-0.5" strokeWidth={1.75} />
                    <div className="space-y-1">
                      <strong className="block font-bold">
                        Bolt Try-On Limit Exceeded ({itemCount} / 5 pieces in bag)
                      </strong>
                      <p className="text-[11px] text-[#991b1b]">
                        Doorstep Try-On accommodates up to 5 garments per session. Adjust quantities in your bag or switch to Standard Delivery.
                      </p>
                      <Link href="/cart" className="inline-block underline font-bold hover:text-[#14293a]">
                        Adjust Bag Quantities →
                      </Link>
                    </div>
                  </div>
                )}

                {/* 3-Day IST Date Picker + Time Slots (When Bolt is active) */}
                {isBoltSelected && (
                  <div className="border border-[#d3d6db] bg-[#f8f8f8] rounded-sm p-4 sm:p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-2.5">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#b91c1c]" strokeWidth={1.75} />
                        <h2 className="text-xs font-bold uppercase tracking-wider text-[#14293a]">
                          Select Bolt Fitting Window
                        </h2>
                      </div>
                      <span className="text-[11px] text-[#6c7079]">IST</span>
                    </div>

                    {/* 3-Day IST Date Picker */}
                    <div className="grid grid-cols-3 gap-2">
                      {istDates.map((dateOpt) => {
                        const isActiveDate = selectedDayOffset === dateOpt.dayOffset
                        const allClosedForDay =
                          timeslots.length > 0 &&
                          timeslots.every(
                            (s) => getCustomerSlotAvailability(s, dateOpt.dayOffset).disabled
                          )
                        return (
                          <button
                            key={dateOpt.isoDate}
                            type="button"
                            disabled={allClosedForDay}
                            onClick={() => handleSelectDateOffset(dateOpt.dayOffset)}
                            className={`p-2.5 border rounded-sm text-left transition-colors ${
                              allClosedForDay
                                ? 'bg-[#f5f5f4] border-[#e5e7eb] text-[#9ca3af] cursor-not-allowed opacity-60'
                                : isActiveDate
                                  ? 'bg-[#14293a] text-white border-[#14293a] cursor-pointer'
                                  : 'bg-white text-[#14293a] border-[#d3d6db] hover:border-[#14293a] cursor-pointer'
                            }`}
                          >
                            <span className="text-xs font-bold block">{dateOpt.shortLabel}</span>
                            <span
                              className={`text-[11px] block ${
                                isActiveDate ? 'text-white/80' : 'text-[#6c7079]'
                              }`}
                            >
                              {allClosedForDay ? 'Slots closed' : dateOpt.subLabel}
                            </span>
                          </button>
                        )
                      })}
                    </div>

                    {loadingSlots ? (
                      <div className="py-6 text-center text-xs text-[#6c7079]">
                        Loading available fitting windows...
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {timeslots.map((slot) => {
                          const availability = getCustomerSlotAvailability(slot, selectedDayOffset)
                          const isSelected = !availability.disabled && selectedTimeslotId === slot.id

                          return (
                            <button
                              key={slot.id}
                              type="button"
                              disabled={availability.disabled}
                              onClick={() => setSelectedTimeslotId(slot.id)}
                              className={`p-3 border rounded-sm text-left transition-colors ${
                                availability.disabled
                                  ? 'border-[#e5e7eb] bg-[#f5f5f4] text-[#9ca3af] cursor-not-allowed opacity-60'
                                  : isSelected
                                    ? 'border-[#b91c1c] bg-white text-[#14293a] ring-1 ring-[#b91c1c] cursor-pointer'
                                    : 'border-[#d3d6db] bg-white hover:border-[#14293a] text-[#14293a] cursor-pointer'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold">{slot.label}</span>
                                {isSelected && (
                                  <span className="w-2 h-2 rounded-full bg-[#b91c1c] shrink-0" />
                                )}
                              </div>
                              <span
                                className={`text-[11px] font-medium block mt-1 ${
                                  availability.tone === 'limited'
                                    ? 'text-amber-700'
                                    : availability.tone === 'full'
                                      ? 'text-[#8a909a]'
                                      : 'text-emerald-700'
                                }`}
                              >
                                {availability.statusText}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-1">
                  <Button
                    type="button"
                    onClick={handleContinueFromStep1}
                    disabled={isOverBoltLimit}
                    size="xl"
                    className="w-full h-12 bg-[#14293a] hover:bg-[#b91c1c] text-white font-sans font-bold text-xs uppercase tracking-wider rounded-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    <span>Continue to Shipping Address</span>
                    <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ===================================================== */}
            {/* STEP 2: SHIPPING ADDRESS FORM                         */}
            {/* ===================================================== */}
            {activeStep === 2 && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-baseline border-b border-[#d3d6db] pb-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#b91c1c] block">
                      Step 02
                    </span>
                    <h2 className="text-lg sm:text-xl font-sans font-bold text-[#14293a]">
                      Shipping Address &amp; Contact
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveStep(1)}
                    className="text-xs font-semibold text-[#b91c1c] hover:underline cursor-pointer"
                  >
                    Back to Delivery
                  </button>
                </div>

                <form onSubmit={handleContinueFromStep2} className="space-y-4">
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
                    <Input
                      label="City"
                      autoComplete="address-level2"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      required
                    />
                    <Input
                      label="State"
                      autoComplete="address-level1"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      required
                    />
                    <Input
                      label="PIN Code"
                      autoComplete="postal-code"
                      inputMode="numeric"
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                      required
                    />
                  </div>

                  <Input
                    label="Delivery / Fitting Notes (Optional)"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="e.g. Ring private doorbell or call security gate on arrival."
                  />

                  <div className="pt-1 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="saveAddress"
                      checked={saveAddressToProfile}
                      onChange={(e) => setSaveAddressToProfile(e.target.checked)}
                      className="w-4 h-4 accent-[#14293a] rounded-sm cursor-pointer"
                    />
                    <label htmlFor="saveAddress" className="text-xs text-[#6c7079] cursor-pointer">
                      Save address to profile for faster future checkouts
                    </label>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      size="xl"
                      className="w-full h-12 bg-[#14293a] hover:bg-[#b91c1c] text-white font-sans font-bold text-xs uppercase tracking-wider rounded-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <span>Continue to Payment</span>
                      <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* ===================================================== */}
            {/* STEP 3: PAYMENT & FINAL REVIEW                        */}
            {/* ===================================================== */}
            {activeStep === 3 && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-baseline border-b border-[#d3d6db] pb-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#b91c1c] block">
                      Step 03
                    </span>
                    <h2 className="text-lg sm:text-xl font-sans font-bold text-[#14293a]">
                      Payment &amp; Order Review
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveStep(2)}
                    className="text-xs font-semibold text-[#b91c1c] hover:underline cursor-pointer"
                  >
                    Edit Address
                  </button>
                </div>

                {/* Review Summary Strips */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 border border-[#e5e7eb] bg-[#f8f8f8] rounded-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold uppercase tracking-wider text-[10px] text-[#6c7079]">
                        Delivering To
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveStep(2)}
                        className="text-[11px] font-semibold text-[#b91c1c] hover:underline cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                    <p className="font-bold text-[#14293a]">{formData.name}</p>
                    <p className="text-[#52565e] leading-snug">
                      {formData.address}
                      {formData.suite ? `, ${formData.suite}` : ''}, {formData.city}, {formData.state} {formData.postalCode}
                    </p>
                    <p className="text-[#6c7079]">Tel: {formData.phone}</p>
                  </div>

                  <div className="p-4 border border-[#e5e7eb] bg-[#f8f8f8] rounded-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold uppercase tracking-wider text-[10px] text-[#6c7079]">
                        Delivery Schedule
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveStep(1)}
                        className="text-[11px] font-semibold text-[#b91c1c] hover:underline cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                    <p className="font-bold text-[#14293a] flex items-center gap-1.5">
                      {isBoltSelected ? (
                        <>
                          <Zap className="w-3.5 h-3.5 text-[#b91c1c] fill-[#b91c1c]" strokeWidth={1.75} />
                          <span>Bolt 45-Min Try-On</span>
                        </>
                      ) : (
                        <>
                          <Truck className="w-3.5 h-3.5 text-[#14293a]" strokeWidth={1.75} />
                          <span>Standard Express Delivery</span>
                        </>
                      )}
                    </p>
                    <p className="text-[#52565e]">
                      {isBoltSelected ? formattedAppointmentWindow : 'Estimated 2–4 business days dispatch'}
                    </p>
                  </div>
                </div>

                {/* Payment Method Cards */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#14293a]">
                    Select Payment Method
                  </h3>

                  {isBoltSelected ? (
                    <div className="p-4 border border-[#b91c1c] bg-[#fef2f2]/40 rounded-sm space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#14293a] flex items-center gap-2">
                          <Smartphone className="w-4 h-4 text-[#b91c1c]" strokeWidth={1.75} />
                          <span>UPI / Card Hold Authorization (₹{BOLT_HOLD_FEE})</span>
                        </span>
                        <span className="font-bold text-[#b91c1c] tabular-nums">
                          ₹{Math.round(immediateTotal).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <p className="text-[#52565e] leading-relaxed">
                        Only the ₹{BOLT_HOLD_FEE} doorstep convenience hold is due now and credited toward kept pieces. Pay for kept garments after your 45-minute home trial.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('online')}
                        className={`w-full p-4 border rounded-sm text-left flex items-center justify-between gap-4 transition-colors cursor-pointer ${
                          paymentMethod === 'online'
                            ? 'border-[#14293a] bg-[#f8f8f8] ring-1 ring-[#14293a]'
                            : 'border-[#d3d6db] bg-white hover:border-[#14293a]'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <CreditCard className="w-4 h-4 text-[#14293a] mt-0.5 shrink-0" strokeWidth={1.75} />
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-[#14293a] block">
                              UPI, Credit / Debit Card &amp; NetBanking
                            </span>
                            <span className="text-[11px] text-[#6c7079]">
                              Instant confirmation with encrypted checkout
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-bold tabular-nums text-[#14293a]">
                          ₹{Math.round(immediateTotal).toLocaleString('en-IN')}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('cod')}
                        className={`w-full p-4 border rounded-sm text-left flex items-center justify-between gap-4 transition-colors cursor-pointer ${
                          paymentMethod === 'cod'
                            ? 'border-[#14293a] bg-[#f8f8f8] ring-1 ring-[#14293a]'
                            : 'border-[#d3d6db] bg-white hover:border-[#14293a]'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Banknote className="w-4 h-4 text-[#14293a] mt-0.5 shrink-0" strokeWidth={1.75} />
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-[#14293a] block">
                              Pay on Delivery (Cash / UPI at Doorstep)
                            </span>
                            <span className="text-[11px] text-[#6c7079]">
                              Settle upon insured courier handover
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-bold tabular-nums text-[#14293a]">
                          ₹{Math.round(immediateTotal).toLocaleString('en-IN')}
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Final Confirm Button */}
                <div className="pt-2 space-y-3">
                  <div className="p-3 bg-[#f8f8f8] border border-[#e5e7eb] rounded-sm text-xs text-[#6c7079] flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-[#14293a] shrink-0" strokeWidth={1.75} />
                    <span>
                      256-bit encrypted transaction. Totals are verified against catalog &amp; promotion rules at order creation.
                    </span>
                  </div>

                  <Button
                    type="button"
                    onClick={handleConfirmOrder}
                    size="xl"
                    className="w-full h-12 bg-[#14293a] hover:bg-[#b91c1c] text-white font-sans font-bold text-xs uppercase tracking-wider rounded-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    isLoading={isSubmitting}
                  >
                    <span>
                      {isBoltSelected
                        ? `Confirm Bolt Try-On Booking · ₹${Math.round(immediateTotal).toLocaleString('en-IN')}`
                        : `Confirm Order · ₹${Math.round(immediateTotal).toLocaleString('en-IN')}`}
                    </span>
                    <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
                  </Button>
                </div>
              </motion.div>
            )}
          </div>

          {/* RIGHT COLUMN: ITEMIZED ORDER SUMMARY */}
          <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-24">
            {/* Compact Bag Items Preview */}
            <div className="p-4 border border-[#d3d6db] bg-white rounded-sm space-y-3">
              <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#14293a]">
                  In Your Bag ({itemCount})
                </span>
                <Link href="/cart" className="text-[11px] font-semibold text-[#b91c1c] hover:underline">
                  Edit Bag
                </Link>
              </div>
              <div className="space-y-3 divide-y divide-[#e5e7eb] max-h-60 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.id} className="pt-2.5 first:pt-0 flex gap-3 items-center">
                    <div className="relative h-14 w-11 overflow-hidden bg-[#f5f5f4] shrink-0 border border-[#e5e7eb] rounded-sm">
                      <ProductImage src={item.image} alt={item.title} fill sizes="44px" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p className="text-xs font-bold text-[#14293a] truncate">{item.title}</p>
                      <p className="text-[11px] text-[#6c7079]">
                        Qty: {item.quantity}
                        {item.size ? ` · Size ${item.size}` : ''}
                      </p>
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
            </div>

            <PriceDetailsBox
              items={items}
              subtotal={subtotal}
              discount={discount}
              discountedSubtotal={discountedSubtotal}
              tax={tax}
              shippingFee={activeShippingFee}
              estimatedTotal={immediateTotal}
              isBoltSelected={isBoltSelected}
              appliedCouponCode={appliedCouponCode}
              qualifiesForFreeShipping={qualifiesFreeShipping}
              standardShippingFee={STANDARD_SHIPPING_FEE}
              boltHoldFee={BOLT_HOLD_FEE}
            />

            <div className="pt-1 flex items-center gap-1.5 text-[11px] text-[#6c7079] justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-[#14293a]" strokeWidth={1.75} />
              <span>Complimentary Returns &amp; Doorstep Swaps</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
