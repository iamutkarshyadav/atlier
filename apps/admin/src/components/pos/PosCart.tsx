'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  User,
  Percent,
  X,
  Sparkles,
  Layers,
  Zap,
} from 'lucide-react'
import { type CartItem, type ParkedCart } from './PosTypes'

interface PosCartProps {
  carts: ParkedCart[]
  activeCartIndex: number
  onSelectCart: (index: number) => void
  onAddCart: () => void
  onClearCart: (index: number) => void
  onUpdateQuantity: (variantId: string, delta: number) => void
  onRemoveItem: (variantId: string) => void
  onUpdateLineDiscount: (variantId: string, percent: number) => void
  customerName: string
  customerPhone: string
  customerEmail: string
  customerGstin: string
  customerDiscountPercent: number
  onChangeCustomerName: (val: string) => void
  onChangeCustomerPhone: (val: string) => void
  onChangeCustomerEmail: (val: string) => void
  onChangeCustomerGstin: (val: string) => void
  onChangeCustomerDiscountPercent: (val: number) => void
}

export function PosCart({
  carts,
  activeCartIndex,
  onSelectCart,
  onAddCart,
  onClearCart,
  onUpdateQuantity,
  onRemoveItem,
  onUpdateLineDiscount,
  customerName,
  customerPhone,
  customerEmail,
  customerGstin,
  customerDiscountPercent,
  onChangeCustomerName,
  onChangeCustomerPhone,
  onChangeCustomerEmail,
  onChangeCustomerGstin,
  onChangeCustomerDiscountPercent,
}: PosCartProps) {
  const [showCustomerDetails, setShowCustomerDetails] = useState(false)
  const activeCart = carts[activeCartIndex] || carts[0]

  return (
    <div className="flex flex-col bg-chrome-900 border border-chrome-800 rounded-lg overflow-hidden select-none">
      {/* 1. Parked Cart Tabs */}
      <div className="px-3 pt-2.5 pb-2 bg-chrome-950 border-b border-chrome-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {carts.map((cart, idx) => {
            const isActive = activeCartIndex === idx
            return (
              <button
                key={cart.id}
                type="button"
                onClick={() => onSelectCart(idx)}
                className={`px-3 py-1.5 rounded-t text-2xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-chrome-900 text-zinc-100 border-t-2 border-emerald-500 shadow-sm'
                    : 'bg-chrome-950 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span>{cart.name}</span>
                <span
                  className={`px-1 py-0.2 text-3xs rounded font-bold tabular-nums ${
                    isActive
                      ? 'bg-zinc-800 text-emerald-400'
                      : 'bg-zinc-900 text-zinc-500'
                  }`}
                >
                  {cart.items.length}
                </span>
                {cart.customerName && (
                  <span className="text-3xs text-zinc-400 max-w-[70px] truncate">
                    ({cart.customerName})
                  </span>
                )}
              </button>
            )
          })}

          {carts.length < 5 && (
            <button
              type="button"
              onClick={onAddCart}
              className="px-2 py-1.5 text-2xs text-zinc-500 hover:text-zinc-200 font-mono flex items-center gap-1 hover:bg-zinc-900 rounded transition-colors"
              title="Park New Cart"
            >
              <Plus className="w-3 h-3" />
              <span>Park</span>
            </button>
          )}
        </div>

        {activeCart && activeCart.items.length > 0 && (
          <button
            type="button"
            onClick={() => onClearCart(activeCartIndex)}
            className="text-3xs font-mono text-zinc-500 hover:text-rose-400 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-rose-950/40 transition-colors"
            title="Clear Cart Items"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* 2. Patron CRM Card */}
      <div className="p-3 bg-chrome-950/70 border-b border-chrome-800 space-y-2">
        <div className="flex items-center justify-between text-2xs">
          <div className="flex items-center gap-1.5 font-semibold text-zinc-300">
            <User className="w-3.5 h-3.5 text-zinc-400" />
            <span>Patron Profile</span>
            {customerDiscountPercent > 0 && (
              <span className="px-1.5 py-0.2 text-3xs font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 rounded font-bold">
                VIP -{customerDiscountPercent}%
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowCustomerDetails((prev) => !prev)}
            className="text-3xs font-mono text-zinc-400 hover:text-zinc-200 underline decoration-dotted"
          >
            {showCustomerDetails ? 'Simple CRM' : 'More Fields (GSTIN/Email)'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-2xs">
          <input
            type="text"
            value={customerPhone}
            onChange={(e) => onChangeCustomerPhone(e.target.value)}
            placeholder="Mobile: +91 98450..."
            className="bg-chrome-900 border border-chrome-800 rounded px-2.5 py-1 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/80 font-mono"
          />
          <input
            type="text"
            value={customerName}
            onChange={(e) => onChangeCustomerName(e.target.value)}
            placeholder="Client Name (Walk-in)..."
            className="bg-chrome-900 border border-chrome-800 rounded px-2.5 py-1 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/80"
          />
        </div>

        {showCustomerDetails && (
          <div className="grid grid-cols-2 gap-2 text-2xs pt-1 border-t border-chrome-800/60">
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => onChangeCustomerEmail(e.target.value)}
              placeholder="Client Email (eReceipt)..."
              className="bg-chrome-900 border border-chrome-800 rounded px-2.5 py-1 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/80 font-mono"
            />
            <input
              type="text"
              value={customerGstin}
              onChange={(e) => onChangeCustomerGstin(e.target.value.toUpperCase())}
              placeholder="B2B GSTIN # (Tax Credit)..."
              className="bg-chrome-900 border border-chrome-800 rounded px-2.5 py-1 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/80 font-mono uppercase"
            />
          </div>
        )}

        {/* Quick VIP Discount Presets */}
        <div className="flex items-center gap-1.5 pt-1">
          <span className="text-3xs text-zinc-500 font-mono">Tiers:</span>
          {[
            { label: 'Standard (0%)', val: 0 },
            { label: 'VIP (10%)', val: 10 },
            { label: 'Press (15%)', val: 15 },
            { label: 'Staff (20%)', val: 20 },
          ].map((preset) => (
            <button
              key={preset.val}
              type="button"
              onClick={() => onChangeCustomerDiscountPercent(preset.val)}
              className={`px-2 py-0.5 rounded text-3xs font-mono transition-colors ${
                customerDiscountPercent === preset.val
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-700 font-bold'
                  : 'bg-chrome-900 text-zinc-400 hover:text-zinc-200 border border-chrome-800'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Register Manifest / Line Items List */}
      <div className="divide-y divide-chrome-800/80 max-h-72 overflow-y-auto">
        {activeCart.items.length === 0 ? (
          <div className="py-14 text-center text-zinc-500 space-y-2 p-4">
            <ShoppingBag className="w-8 h-8 stroke-1 mx-auto text-zinc-600" />
            <p className="text-xs font-medium text-zinc-400">Register is empty.</p>
            <p className="text-3xs text-zinc-600">
              Scan garment barcode or tap sizes from the catalog to ring up pieces.
            </p>
          </div>
        ) : (
          activeCart.items.map((item) => {
            const effectiveDiscount = Math.max(item.discountPercent, customerDiscountPercent)
            const unitFinal = item.price * (1 - effectiveDiscount / 100)
            const lineTotal = unitFinal * item.quantity

            return (
              <div
                key={item.variantId}
                className="p-3 hover:bg-chrome-850/60 transition-colors space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  {/* Left: Thumbnail & Garment Description */}
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="relative w-10 h-10 rounded overflow-hidden bg-zinc-900 border border-zinc-800 shrink-0">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.title}
                          fill
                          unoptimized
                          sizes="40px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xs text-zinc-600">
                          HD
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h5 className="text-xs font-semibold text-zinc-100 truncate">
                          {item.title}
                        </h5>
                        <span className="px-1.5 py-0.2 text-3xs font-mono font-bold bg-zinc-800 text-zinc-200 border border-zinc-700 rounded">
                          {item.size}
                        </span>
                        {item.isEndlessAisle && (
                          <span className="px-1.5 py-0.2 text-3xs font-mono font-bold bg-cyan-950/80 text-cyan-400 border border-cyan-800 rounded flex items-center gap-0.5">
                            <Zap className="w-2.5 h-2.5" /> Endless Aisle ({item.originLocationCode})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-3xs font-mono text-zinc-400 mt-0.5">
                        <span>{item.sku}</span>
                        <span>&bull;</span>
                        <span className="text-zinc-500">Shelf: {item.shelfCoordinate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Line Subtotal */}
                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-sm text-zinc-100 tabular-nums block">
                      ${lineTotal.toFixed(2)}
                    </span>
                    {effectiveDiscount > 0 && (
                      <span className="text-3xs font-mono text-emerald-400 line-through">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Row: Stepper, Line Discount, Trash */}
                <div className="flex items-center justify-between text-2xs pt-1">
                  {/* Quantity Stepper */}
                  <div className="inline-flex items-center gap-1.5 bg-chrome-950 border border-chrome-800 rounded px-1.5 py-0.5">
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.variantId, -1)}
                      className="p-0.5 text-zinc-400 hover:text-white transition-colors"
                      title="Decrease quantity"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-mono font-bold tabular-nums text-xs px-1 text-zinc-100">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.variantId, 1)}
                      className="p-0.5 text-zinc-400 hover:text-white transition-colors"
                      title="Increase quantity"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Line Discount & Delete */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-3xs text-zinc-400 font-mono">
                      <span>Disc:</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={item.discountPercent || ''}
                        onChange={(e) =>
                          onUpdateLineDiscount(
                            item.variantId,
                            parseFloat(e.target.value) || 0
                          )
                        }
                        placeholder="0"
                        className="w-10 bg-chrome-950 border border-chrome-800 rounded px-1 py-0.5 text-center text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                      <span>%</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.variantId)}
                      className="text-zinc-500 hover:text-rose-400 p-1 hover:bg-rose-950/30 rounded transition-colors"
                      title="Remove line item"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

