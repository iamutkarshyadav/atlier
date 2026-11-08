'use client'

import React from 'react'
import { Barcode, Button } from '@repo/ui'
import { Printer, X } from 'lucide-react'

// ==========================================
// 1. 80mm ESC/POS THERMAL RECEIPT
// ==========================================
export interface PosReceiptData {
  receiptNumber: string
  invoiceNumber: string
  storeName: string
  storeCode: string
  storeGstin: string
  storeAddress: string
  cashierName: string
  terminalId: string
  timestamp: string
  customerName?: string
  customerPhone?: string
  customerGstin?: string
  items: Array<{
    title: string
    size: string
    sku: string
    quantity: number
    price: number
    discount?: number
    hsn?: string
  }>
  subtotal: number
  cgst: number
  sgst: number
  igst?: number
  grandTotal: number
  paymentMode: string
  tenderedAmount?: number
  changeDue?: number
  cardRefNumber?: string
  upiRefNumber?: string
}

export function PosReceiptModal({
  isOpen,
  onClose,
  data,
}: {
  isOpen: boolean
  onClose: () => void
  data: PosReceiptData
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-chrome-900 border border-chrome-800 p-4 max-w-sm w-full font-mono text-xs space-y-4 shadow-2xl">
        <div className="flex justify-between items-center border-b border-chrome-800 pb-2">
          <span className="font-semibold text-zinc-100 flex items-center gap-1.5">
            <Printer className="w-4 h-4 text-emerald-400" /> 80mm Thermal Receipt
          </span>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Receipt Paper Container */}
        <div
          id="pos-thermal-receipt"
          className="bg-white text-black p-4 text-[11px] leading-tight space-y-2 select-none shadow font-mono"
          style={{ width: '76mm', margin: '0 auto' }}
        >
          {/* Header */}
          <div className="text-center space-y-0.5 border-b border-dashed border-zinc-400 pb-2">
            <h2 className="text-sm font-bold tracking-wider">ATELIER HAUTE COUTURE</h2>
            <p className="text-[10px] uppercase font-semibold">{data.storeName} ({data.storeCode})</p>
            <p className="text-[9px] text-zinc-700">{data.storeAddress}</p>
            <p className="text-[9px] font-bold">GSTIN: {data.storeGstin}</p>
          </div>

          {/* Meta Info */}
          <div className="text-[9px] space-y-0.5 border-b border-dashed border-zinc-400 pb-1.5">
            <div className="flex justify-between">
              <span>Receipt: <strong className="font-bold">{data.receiptNumber}</strong></span>
              <span>Inv: {data.invoiceNumber}</span>
            </div>
            <div className="flex justify-between text-zinc-700">
              <span>Date: {data.timestamp}</span>
              <span>Term: {data.terminalId}</span>
            </div>
            <div className="flex justify-between text-zinc-700">
              <span>Cashier: {data.cashierName}</span>
              <span>Client: {data.customerName || 'Walk-in'}</span>
            </div>
            {data.customerGstin && (
              <div className="text-zinc-800 font-bold">Client GSTIN: {data.customerGstin}</div>
            )}
          </div>

          {/* Items Table */}
          <div className="space-y-1 border-b border-dashed border-zinc-400 pb-2">
            <div className="flex justify-between font-bold text-[9px] border-b border-zinc-300 pb-0.5">
              <span className="w-1/2">Item Description</span>
              <span className="w-1/6 text-center">Qty</span>
              <span className="w-1/3 text-right">Amount</span>
            </div>
            {data.items.map((item, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="flex justify-between text-[10px]">
                  <span className="w-1/2 font-semibold truncate">{item.title}</span>
                  <span className="w-1/6 text-center tabular-nums">{item.quantity}</span>
                  <span className="w-1/3 text-right tabular-nums font-bold">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
                <div className="text-[8px] text-zinc-600 flex justify-between">
                  <span>Size {item.size} &bull; {item.sku}</span>
                  <span>@ ${item.price.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Tax Breakdown & Totals */}
          <div className="space-y-0.5 text-[9px] border-b border-dashed border-zinc-400 pb-1.5">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="tabular-nums">${data.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>CGST (6%):</span>
              <span className="tabular-nums">${data.cgst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>SGST (6%):</span>
              <span className="tabular-nums">${data.sgst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs font-black border-t border-black pt-1">
              <span>GRAND TOTAL:</span>
              <span className="tabular-nums">${data.grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Settlement Tender */}
          <div className="text-[9px] space-y-0.5 border-b border-dashed border-zinc-400 pb-1.5">
            <div className="flex justify-between font-semibold">
              <span>Payment Mode:</span>
              <span className="uppercase">{data.paymentMode}</span>
            </div>
            {data.tenderedAmount !== undefined && (
              <>
                <div className="flex justify-between text-zinc-600">
                  <span>Cash Tendered:</span>
                  <span className="tabular-nums">${data.tenderedAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Change Return:</span>
                  <span className="tabular-nums">${(data.changeDue || 0).toFixed(2)}</span>
                </div>
              </>
            )}
            {data.cardRefNumber && (
              <div className="text-[8px] text-zinc-600">Card Auth: {data.cardRefNumber}</div>
            )}
            {data.upiRefNumber && (
              <div className="text-[8px] text-zinc-600">UPI Ref: {data.upiRefNumber}</div>
            )}
          </div>

          {/* Return Barcode */}
          <div className="text-center pt-1 space-y-1">
            <div className="flex justify-center bg-white">
              <Barcode value={data.receiptNumber} height={30} width={1.5} displayValue={false} />
            </div>
            <p className="text-[8px] font-mono tracking-widest">{data.receiptNumber}</p>
            <p className="text-[7.5px] text-zinc-600 leading-tight">
              Returns & exchanges accepted within 14 days at any boutique with original tags attached.
            </p>
          </div>
        </div>

        {/* Print Buttons */}
        <div className="flex justify-end gap-2 pt-2 border-t border-chrome-800">
          <Button variant="terminal" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => window.print()}
            className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-none flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" /> Print 80mm Receipt
          </Button>
        </div>
      </div>
    </div>
  )
}

// ==========================================
// 2. 4x6" THERMAL SHIPPING LABEL
// ==========================================
export interface ShippingLabelData {
  orderNumber: string
  awbNumber: string
  carrierName: string
  deliveryMode: string
  originHub: string
  recipientName: string
  recipientPhone: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  pincode: string
  weightKg: number
  itemCount: number
}

export function ShippingLabelModal({
  isOpen,
  onClose,
  data,
}: {
  isOpen: boolean
  onClose: () => void
  data: ShippingLabelData
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-chrome-900 border border-chrome-800 p-4 max-w-md w-full font-mono text-xs space-y-4 shadow-2xl">
        <div className="flex justify-between items-center border-b border-chrome-800 pb-2">
          <span className="font-semibold text-zinc-100 flex items-center gap-1.5">
            <Printer className="w-4 h-4 text-cyan-400" /> 4x6&quot; Thermal Shipping Label
          </span>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 4x6" Label Surface */}
        <div
          id="shipping-label-4x6"
          className="bg-white text-black p-4 border-2 border-black font-mono space-y-3 select-none shadow"
          style={{ width: '100mm', minHeight: '140mm', margin: '0 auto' }}
        >
          {/* Top Carrier Bar */}
          <div className="flex justify-between items-center border-b-2 border-black pb-2">
            <div>
              <span className="text-xs font-black tracking-widest block uppercase">
                {data.carrierName}
              </span>
              <span className="text-[9px] bg-black text-white px-1.5 py-0.5 font-bold uppercase inline-block mt-0.5">
                {data.deliveryMode}
              </span>
            </div>
            <div className="text-right text-[10px]">
              <span className="font-bold block">ORIGIN: {data.originHub}</span>
              <span className="text-zinc-700">PKG: {data.weightKg} KG &bull; {data.itemCount} PCS</span>
            </div>
          </div>

          {/* Ship To Address Block */}
          <div className="border-b-2 border-black pb-2 space-y-1">
            <span className="text-[9px] uppercase font-bold text-zinc-600 block">DELIVER TO:</span>
            <div className="text-sm font-black">{data.recipientName}</div>
            <div className="text-xs">{data.recipientPhone}</div>
            <div className="text-xs text-zinc-800 leading-tight">
              {data.addressLine1}
              {data.addressLine2 ? `, ${data.addressLine2}` : ''}
            </div>
            <div className="text-xs text-zinc-800">
              {data.city}, {data.state}
            </div>
            <div className="text-2xl font-black tracking-widest pt-1">
              PIN: {data.pincode}
            </div>
          </div>

          {/* Giant AWB Barcode */}
          <div className="text-center border-b-2 border-black pb-3 pt-1 space-y-1">
            <div className="flex justify-center bg-white">
              <Barcode value={data.awbNumber} height={50} width={2.2} displayValue={false} />
            </div>
            <div className="text-xs font-black tracking-widest">AWB: {data.awbNumber}</div>
          </div>

          {/* Order Ref & Footer */}
          <div className="flex justify-between items-center text-[10px]">
            <div>
              <span className="text-zinc-600 block">ORDER ID:</span>
              <strong className="font-bold text-xs">{data.orderNumber}</strong>
            </div>
            <div className="text-right">
              <span className="text-zinc-600 block">AUTHENTICATED</span>
              <span className="font-bold">ATELIER DISPATCH</span>
            </div>
          </div>
        </div>

        {/* Print Buttons */}
        <div className="flex justify-end gap-2 pt-2 border-t border-chrome-800">
          <Button variant="terminal" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => window.print()}
            className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold rounded-none flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" /> Print 4x6&quot; Label
          </Button>
        </div>
      </div>
    </div>
  )
}

// ==========================================
// 3. A4 COMMERCIAL PURCHASE ORDER / CHALLAN
// ==========================================
export interface PurchaseOrderPrintData {
  poNumber: string
  createdDate: string
  expectedDate: string
  vendorCode: string
  vendorName: string
  vendorGstin: string
  vendorAddress: string
  deliveryLocationCode: string
  deliveryLocationName: string
  deliveryGstin: string
  deliveryAddress: string
  items: Array<{
    sku: string
    title: string
    size: string
    hsn: string
    quantity: number
    unitCost: number
    gstPercent: number
    lineTotal: number
  }>
  subtotal: number
  taxAmount: number
  totalAmount: number
  notes?: string
}

export function PurchaseOrderPrintModal({
  isOpen,
  onClose,
  data,
}: {
  isOpen: boolean
  onClose: () => void
  data: PurchaseOrderPrintData
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-chrome-900 border border-chrome-800 p-4 max-w-3xl w-full font-mono text-xs space-y-4 shadow-2xl">
        <div className="flex justify-between items-center border-b border-chrome-800 pb-2">
          <span className="font-semibold text-zinc-100 flex items-center gap-1.5">
            <Printer className="w-4 h-4 text-amber-400" /> A4 Commercial Purchase Order
          </span>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* A4 Document Surface */}
        <div
          id="po-a4-document"
          className="bg-white text-black p-6 border border-zinc-300 font-sans text-xs space-y-4 select-none shadow"
          style={{ width: '100%', minHeight: '260mm', margin: '0 auto' }}
        >
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-black pb-4">
            <div>
              <h1 className="text-2xl font-serif font-black tracking-widest">ATELIER</h1>
              <p className="text-xs font-semibold text-zinc-700 font-mono">SUPPLY CHAIN & LOGISTICS DIVISION</p>
              <p className="text-2xs text-zinc-500">Corporate Master Procurement Manifest</p>
            </div>
            <div className="text-right font-mono">
              <div className="text-lg font-bold">{data.poNumber}</div>
              <div className="text-2xs text-zinc-600">PO Date: {data.createdDate}</div>
              <div className="text-2xs text-zinc-600">Expected Delivery: {data.expectedDate}</div>
            </div>
          </div>

          {/* Supplier vs Delivery Addresses */}
          <div className="grid grid-cols-2 gap-6 border-b border-zinc-200 pb-4 text-2xs">
            <div className="space-y-1">
              <span className="font-bold text-zinc-600 uppercase block font-mono">VENDOR / SUPPLIER:</span>
              <div className="font-bold text-xs">{data.vendorName} ({data.vendorCode})</div>
              <div className="text-zinc-700">{data.vendorAddress}</div>
              <div className="font-mono font-semibold">GSTIN: {data.vendorGstin}</div>
            </div>
            <div className="space-y-1">
              <span className="font-bold text-zinc-600 uppercase block font-mono">CONSIGNEE / SHIP TO:</span>
              <div className="font-bold text-xs">{data.deliveryLocationName} ({data.deliveryLocationCode})</div>
              <div className="text-zinc-700">{data.deliveryAddress}</div>
              <div className="font-mono font-semibold">GSTIN: {data.deliveryGstin}</div>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-2">
            <table className="w-full text-left border-collapse text-2xs">
              <thead>
                <tr className="border-b-2 border-black font-mono font-bold uppercase text-3xs">
                  <th className="py-2">Item / Garment</th>
                  <th className="py-2">Size</th>
                  <th className="py-2">HSN</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-right">Unit Rate</th>
                  <th className="py-2 text-center">GST %</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {data.items.map((it, idx) => (
                  <tr key={idx} className="font-mono">
                    <td className="py-2">
                      <span className="font-bold text-zinc-900 block font-sans">{it.title}</span>
                      <span className="text-3xs text-zinc-500">{it.sku}</span>
                    </td>
                    <td className="py-2">{it.size}</td>
                    <td className="py-2">{it.hsn}</td>
                    <td className="py-2 text-center font-bold tabular-nums">{it.quantity}</td>
                    <td className="py-2 text-right tabular-nums">${it.unitCost.toFixed(2)}</td>
                    <td className="py-2 text-center tabular-nums">{it.gstPercent}%</td>
                    <td className="py-2 text-right font-bold tabular-nums">${it.lineTotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="flex justify-end pt-4 border-t-2 border-black">
            <div className="w-64 space-y-1 font-mono text-xs">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="tabular-nums">${data.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-zinc-600 text-2xs">
                <span>GST Tax (IGST/CGST+SGST):</span>
                <span className="tabular-nums">${data.taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm border-t border-black pt-1">
                <span>GRAND TOTAL:</span>
                <span className="tabular-nums">${data.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Barcode Footer & Signoff */}
          <div className="pt-8 border-t border-zinc-200 flex justify-between items-end">
            <div className="space-y-1 font-mono">
              <Barcode value={data.poNumber} height={32} width={1.8} displayValue={false} />
              <span className="text-3xs text-zinc-500 block">{data.poNumber}</span>
            </div>
            <div className="text-right text-2xs space-y-8">
              <span className="text-zinc-600 block">For ATELIER APPAREL ENTERPRISE</span>
              <span className="border-t border-black pt-1 px-8 block font-semibold">Authorised Signatory</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-2 border-t border-chrome-800">
          <Button variant="terminal" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => window.print()}
            className="bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold rounded-none flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" /> Print Commercial PO
          </Button>
        </div>
      </div>
    </div>
  )
}

