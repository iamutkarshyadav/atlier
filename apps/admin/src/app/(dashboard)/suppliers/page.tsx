'use client'

import React, { useEffect, useState } from 'react'
import {
  Building2,
  Plus,
  RefreshCw,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Phone,
  Mail,
  MapPin,
  Search,
} from 'lucide-react'
import { Button } from '@repo/ui'
import { createBrowserClient } from '@repo/supabase/browser'
import { getSuppliers, getPurchaseOrders, type Supplier } from '@repo/supabase/utils'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SlideOverDrawer } from '@/components/ui/SlideOverDrawer'

interface SupplierWithStats extends Supplier {
  activePoCount: number
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<SupplierWithStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Form State
  const [vendorCode, setVendorCode] = useState('')
  const [name, setName] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [gstin, setGstin] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [stateCode, setStateCode] = useState('29')
  const [pincode, setPincode] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('NET_30')
  const [leadTimeDays, setLeadTimeDays] = useState('14')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  const loadSuppliers = async () => {
    setIsLoading(true)
    try {
      const supabase = createBrowserClient()
      const [sups, pos] = await Promise.all([
        getSuppliers(supabase),
        getPurchaseOrders(supabase),
      ])

      const detailed: SupplierWithStats[] = sups.map((s) => {
        const active = pos.filter((p) => p.supplier_id === s.id && p.status !== 'cancelled').length
        return { ...s, activePoCount: active }
      })

      setSuppliers(detailed)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSuppliers()
  }, [])

  const openCreateDrawer = () => {
    setEditingSupplier(null)
    setVendorCode(`SUP-${Date.now().toString().slice(-4)}`)
    setName('')
    setContactPerson('')
    setEmail('')
    setPhone('')
    setGstin('')
    setAddressLine1('')
    setCity('Bengaluru')
    setState('Karnataka')
    setStateCode('29')
    setPincode('560001')
    setPaymentTerms('NET_30')
    setLeadTimeDays('14')
    setFormError(null)
    setFormSuccess(null)
    setDrawerOpen(true)
  }

  const openEditDrawer = (s: Supplier) => {
    setEditingSupplier(s)
    setVendorCode(s.vendor_code)
    setName(s.name)
    setContactPerson(s.contact_person || '')
    setEmail(s.email)
    setPhone(s.phone)
    setGstin(s.gstin)
    setAddressLine1(s.address_line1)
    setCity(s.city)
    setState(s.state)
    setStateCode(s.state_code)
    setPincode(s.pincode)
    setPaymentTerms(s.payment_terms)
    setLeadTimeDays(s.lead_time_days.toString())
    setFormError(null)
    setFormSuccess(null)
    setDrawerOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setFormError(null)
    setFormSuccess(null)

    try {
      const supabase = createBrowserClient()
      const payload = {
        vendor_code: vendorCode.trim().toUpperCase(),
        name: name.trim(),
        gstin: gstin.trim() || '29AAAAA0000A1Z5',
        contact_person: contactPerson.trim() || null,
        email: email.trim(),
        phone: phone.trim(),
        address_line1: addressLine1.trim() || 'Industrial Estate',
        city: city.trim() || 'Bengaluru',
        state: state.trim() || 'Karnataka',
        state_code: stateCode.trim() || '29',
        pincode: pincode.trim() || '560001',
        payment_terms: paymentTerms,
        lead_time_days: parseInt(leadTimeDays, 10) || 14,
        is_active: true,
      }

      if (editingSupplier) {
        const { error } = await supabase
          .from('suppliers')
          .update(payload)
          .eq('id', editingSupplier.id)
        if (error) throw error
        setFormSuccess('Supplier record updated successfully.')
      } else {
        const { error } = await supabase
          .from('suppliers')
          .insert(payload)
        if (error) throw error
        setFormSuccess('New supplier registered successfully.')
      }

      setTimeout(() => {
        setDrawerOpen(false)
        loadSuppliers()
      }, 800)
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save supplier')
    } finally {
      setIsSubmitting(false)
    }
  }

  const filtered = suppliers.filter((s) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    return (
      s.name.toLowerCase().includes(q) ||
      s.vendor_code.toLowerCase().includes(q) ||
      s.gstin.toLowerCase().includes(q) ||
      (s.contact_person && s.contact_person.toLowerCase().includes(q))
    )
  })

  return (
    <div className="space-y-4 font-mono pb-16">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-chrome-800 pb-3">
        <div>
          <h1 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <span>Supplier & Manufacturing Partner Registry</span>
          </h1>
          <p className="text-2xs text-zinc-400">
            Authoritative vendor directory, GST compliance, mill terms, and lead times
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="terminal"
            size="sm"
            onClick={loadSuppliers}
            isLoading={isLoading}
            className="h-7 px-2.5 text-2xs flex items-center gap-1.5"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={openCreateDrawer}
            className="h-7 px-3 text-2xs bg-zinc-100 hover:bg-white text-zinc-950 font-semibold flex items-center gap-1.5 rounded-none"
          >
            <Plus className="w-3.5 h-3.5" /> Add Supplier
          </Button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-2 bg-chrome-900 border border-chrome-800 flex items-center justify-between gap-3 text-xs">
        <div className="flex-1 max-w-sm relative">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search vendor code, supplier name, GSTIN..."
            className="w-full bg-chrome-950 border border-chrome-800 pl-8 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
          />
        </div>
        <div className="text-2xs text-zinc-500 tabular-nums">
          Showing {filtered.length} of {suppliers.length} vendors
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-chrome-900 border border-chrome-800 overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-chrome-800 bg-chrome-950 text-3xs uppercase tracking-wider text-zinc-400">
              <th className="py-2.5 px-3 font-semibold">Vendor Code</th>
              <th className="py-2.5 px-3 font-semibold">Supplier Name</th>
              <th className="py-2.5 px-3 font-semibold">GSTIN</th>
              <th className="py-2.5 px-3 font-semibold">State Code</th>
              <th className="py-2.5 px-3 font-semibold">Contact Person</th>
              <th className="py-2.5 px-3 font-semibold">Phone & Email</th>
              <th className="py-2.5 px-3 font-semibold text-center">Lead Time</th>
              <th className="py-2.5 px-3 font-semibold">Terms</th>
              <th className="py-2.5 px-3 font-semibold text-center">Active POs</th>
              <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-chrome-800">
            {filtered.map((sup) => (
              <tr key={sup.id} className="hover:bg-chrome-850 transition-colors">
                <td className="py-2.5 px-3 font-bold text-zinc-100 tabular-nums">
                  {sup.vendor_code}
                </td>
                <td className="py-2.5 px-3 font-semibold text-zinc-200">
                  {sup.name}
                </td>
                <td className="py-2.5 px-3 text-2xs text-zinc-400 font-mono tabular-nums">
                  {sup.gstin}
                </td>
                <td className="py-2.5 px-3 text-2xs text-zinc-300 font-mono">
                  {sup.state_code}
                </td>
                <td className="py-2.5 px-3 text-2xs text-zinc-300">
                  {sup.contact_person || 'Representative'}
                </td>
                <td className="py-2.5 px-3 text-2xs text-zinc-400">
                  <div>{sup.email}</div>
                  <div className="text-3xs text-zinc-500 tabular-nums">{sup.phone}</div>
                </td>
                <td className="py-2.5 px-3 text-center font-bold text-zinc-300 tabular-nums">
                  {sup.lead_time_days}d
                </td>
                <td className="py-2.5 px-3 text-2xs text-zinc-400 font-mono">
                  {sup.payment_terms}
                </td>
                <td className="py-2.5 px-3 text-center">
                  <span className="px-2 py-0.5 text-2xs bg-chrome-800 text-emerald-400 border border-chrome-750 tabular-nums font-semibold">
                    {sup.activePoCount} POs
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right">
                  <button
                    onClick={() => openEditDrawer(sup)}
                    className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-chrome-800 transition-colors"
                    title="Edit Supplier Record"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && !isLoading && (
              <tr>
                <td colSpan={10} className="py-12 text-center text-xs text-zinc-500">
                  No suppliers matching filter criteria. Click &quot;Add Supplier&quot; to register a vendor.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Slide-Over Drawer: Create / Edit Supplier */}
      <SlideOverDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingSupplier ? `Edit Supplier: ${editingSupplier.vendor_code}` : 'Register Manufacturing Supplier'}
        description="Authoritative master record of manufacturing vendor, GST registration, and corporate terms."
        width="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{formSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold block">
                Vendor Code *
              </label>
              <input
                type="text"
                value={vendorCode}
                onChange={(e) => setVendorCode(e.target.value.toUpperCase())}
                placeholder="SUP-CERRUTI-01"
                required
                className="w-full bg-chrome-950 border border-chrome-800 px-3 py-1.5 text-xs text-zinc-100 focus:outline-none uppercase"
              />
            </div>
            <div className="space-y-1">
              <label className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold block">
                Company Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Lanificio F.lli Cerruti"
                required
                className="w-full bg-chrome-950 border border-chrome-800 px-3 py-1.5 text-xs text-zinc-100 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold block">
                GSTIN Tax ID *
              </label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="29AAAAA0000A1Z5"
                required
                className="w-full bg-chrome-950 border border-chrome-800 px-3 py-1.5 text-xs text-zinc-100 focus:outline-none uppercase font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold block">
                State Code (GST) *
              </label>
              <input
                type="text"
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value)}
                placeholder="29"
                required
                className="w-full bg-chrome-950 border border-chrome-800 px-3 py-1.5 text-xs text-zinc-100 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold block">
                Contact Person
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="Marco Rossi"
                className="w-full bg-chrome-950 border border-chrome-800 px-3 py-1.5 text-xs text-zinc-100 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold block">
                Phone Number *
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 80 4000 0000"
                required
                className="w-full bg-chrome-950 border border-chrome-800 px-3 py-1.5 text-xs text-zinc-100 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold block">
              Official Orders Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="orders@cerruti.it"
              required
              className="w-full bg-chrome-950 border border-chrome-800 px-3 py-1.5 text-xs text-zinc-100 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold block">
              Factory / Corporate Street Address
            </label>
            <input
              type="text"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              placeholder="Via Vergnasco 2, Industrial Sector"
              className="w-full bg-chrome-950 border border-chrome-800 px-3 py-1.5 text-xs text-zinc-100 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold block">
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Bengaluru"
                className="w-full bg-chrome-950 border border-chrome-800 px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold block">
                State
              </label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="Karnataka"
                className="w-full bg-chrome-950 border border-chrome-800 px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold block">
                PIN / Postal Code
              </label>
              <input
                type="text"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="560001"
                className="w-full bg-chrome-950 border border-chrome-800 px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold block">
                Payment Terms
              </label>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full bg-chrome-950 border border-chrome-800 px-3 py-1.5 text-xs text-zinc-100 focus:outline-none"
              >
                <option value="IMMEDIATE">Immediate / Advance</option>
                <option value="NET_15">Net 15 Days</option>
                <option value="NET_30">Net 30 Days</option>
                <option value="NET_45">Net 45 Days</option>
                <option value="NET_60">Net 60 Days</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold block">
                Lead Time (Days)
              </label>
              <input
                type="number"
                min="1"
                max="180"
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(e.target.value)}
                className="w-full bg-chrome-950 border border-chrome-800 px-3 py-1.5 text-xs text-zinc-100 focus:outline-none tabular-nums"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-chrome-800">
            <Button
              type="button"
              variant="terminal"
              size="sm"
              onClick={() => setDrawerOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              isLoading={isSubmitting}
              className="bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-none"
            >
              {editingSupplier ? 'Save Updates' : 'Register Supplier'}
            </Button>
          </div>
        </form>
      </SlideOverDrawer>
    </div>
  )
}
