import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer'
import { encodeCode128B, type OrderWithItems } from '@repo/supabase/utils'

// Luxury Monochrome Stylesheet for @react-pdf
const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#111111',
    backgroundColor: '#FFFFFF',
    lineHeight: 1.4,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
    paddingBottom: 16,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  brandTitle: {
    fontFamily: 'Times-Roman',
    fontSize: 20,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 3,
  },
  brandSubtitle: {
    fontSize: 7.5,
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  invoiceMeta: {
    alignItems: 'flex-end',
  },
  invoiceTitle: {
    fontFamily: 'Times-Roman',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 4,
  },
  metaLabel: {
    color: '#777777',
    fontSize: 8,
  },
  metaValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#444444',
    borderBottomWidth: 0.5,
    borderBottomColor: '#CCCCCC',
    paddingBottom: 4,
    marginBottom: 8,
  },
  addressGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  addressBlock: {
    width: '48%',
  },
  addressName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9.5,
    marginBottom: 2,
  },
  addressLine: {
    color: '#444444',
    fontSize: 8.5,
  },
  table: {
    width: '100%',
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderTopWidth: 1,
    borderTopColor: '#222222',
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableHeaderCell: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5E5',
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  colDescription: {
    width: '45%',
  },
  colSize: {
    width: '12%',
    textAlign: 'center',
  },
  colPrice: {
    width: '13%',
    textAlign: 'right',
  },
  colOutcome: {
    width: '18%',
    textAlign: 'center',
  },
  colTotal: {
    width: '12%',
    textAlign: 'right',
  },
  itemTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
  },
  itemSub: {
    color: '#777777',
    fontSize: 7,
  },
  statusKept: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: '#059669',
  },
  statusReturned: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: '#DC2626',
  },
  statusPending: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: '#D97706',
  },
  totalsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 20,
  },
  totalsBox: {
    width: '45%',
    borderTopWidth: 1,
    borderTopColor: '#222222',
    paddingTop: 6,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  totalsLabel: {
    color: '#666666',
    fontSize: 8,
  },
  totalsValue: {
    fontSize: 8.5,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#222222',
    marginTop: 4,
    paddingTop: 4,
  },
  grandTotalLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  grandTotalValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
  },
  barcodeSection: {
    marginTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5E5',
    paddingTop: 12,
    alignItems: 'center',
  },
  barcodeBars: {
    flexDirection: 'row',
    height: 34,
    alignItems: 'stretch',
    marginVertical: 4,
  },
  barcodeText: {
    fontFamily: 'Courier',
    fontSize: 8,
    letterSpacing: 2,
    marginTop: 2,
    color: '#333333',
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 36,
    right: 36,
    borderTopWidth: 0.5,
    borderTopColor: '#DDDDDD',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    color: '#888888',
    fontSize: 6.5,
  },
})

// Barcode bars renderer for @react-pdf using pure View elements
function PdfBarcodeView({ value }: { value: string }) {
  const { widths } = encodeCode128B(value)

  return (
    <View style={styles.barcodeBars}>
      {widths.map((w, idx) => (
        <View
          key={idx}
          style={{
            width: w * 1.2,
            backgroundColor: idx % 2 === 0 ? '#000000' : 'transparent',
            height: '100%',
          }}
        />
      ))}
    </View>
  )
}

export function LuxuryInvoiceDocument({ order }: { order: OrderWithItems }) {
  const items = order.order_items || []
  const trackingCode = order.tracking_barcode || `ATL-TRK-${order.id.slice(0, 8).toUpperCase()}`
  const invoiceNum = order.invoice_number || `INV-2026-${order.id.slice(0, 4).toUpperCase()}`
  const formattedDate = order.created_at
    ? new Date(order.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : new Date().toLocaleDateString('en-US')

  const recipientName = order.user?.name || (order.shipping_address ? order.shipping_address.split(',')[0] : 'Valued Patron')
  const recipientAddress = order.shipping_address || '742 Evergreen Terrace, Studio 4B, San Francisco, CA 94107'
  const isTryOn = order.delivery_mode === 'try_on'

  return (
    <Document title={`Invoice-${invoiceNum}`} author="Atelier Gustavo Paris">
      <Page size="A4" style={styles.page}>
        {/* Brand Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brandTitle}>ATELIER GUSTAVO</Text>
            <Text style={styles.brandSubtitle}>
              Haute Couture & Curated Wearable Works • Paris
            </Text>
          </View>
          <View style={styles.invoiceMeta}>
            <Text style={styles.invoiceTitle}>FACTURE / INVOICE</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Invoice №:</Text>
              <Text style={styles.metaValue}>{invoiceNum}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Order №:</Text>
              <Text style={styles.metaValue}>{order.order_number || `ATL-${order.id.slice(0, 6)}`}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Date Issued:</Text>
              <Text style={styles.metaValue}>{formattedDate}</Text>
            </View>
          </View>
        </View>

        {/* Addresses & Logistics Info */}
        <View style={styles.addressGrid}>
          <View style={styles.addressBlock}>
            <Text style={styles.sectionTitle}>Billed & Delivered To</Text>
            <Text style={styles.addressName}>{recipientName}</Text>
            <Text style={styles.addressLine}>{recipientAddress}</Text>
            {order.user?.phone && (
              <Text style={styles.addressLine}>Tel: {order.user.phone}</Text>
            )}
          </View>

          <View style={styles.addressBlock}>
            <Text style={styles.sectionTitle}>Logistics Specification</Text>
            <Text style={styles.addressName}>
              {isTryOn ? 'Mode B: 45m Doorstep Try-On Fitting' : 'Mode A: Direct Atelier Hand-Off'}
            </Text>
            <Text style={styles.addressLine}>
              Shipment Tracking: {trackingCode}
            </Text>
            <Text style={styles.addressLine}>
              Try-On Settlement: {order.try_on_status === 'reconciled' ? 'Finalized On-Site' : 'Direct Dispatch'}
            </Text>
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colDescription]}>Garment Piece & Silhouette</Text>
            <Text style={[styles.tableHeaderCell, styles.colSize]}>Size / Qty</Text>
            <Text style={[styles.tableHeaderCell, styles.colPrice]}>Unit Price</Text>
            <Text style={[styles.tableHeaderCell, styles.colOutcome]}>Try-On Disposition</Text>
            <Text style={[styles.tableHeaderCell, styles.colTotal]}>Realized</Text>
          </View>

          {items.map((item) => {
            const isKept = item.is_kept === true
            const isReturned = item.is_kept === false
            const isPending = item.is_kept === null
            const lineSubtotal = isKept
              ? Number(item.unit_price) * (item.quantity || 1)
              : 0

            return (
              <View key={item.id} style={styles.tableRow}>
                <View style={styles.colDescription}>
                  <Text style={styles.itemTitle}>{item.product?.title || 'Atelier Work'}</Text>
                  <Text style={styles.itemSub}>
                    {item.product?.material || '100% Organic French Terry'}
                  </Text>
                </View>

                <View style={styles.colSize}>
                  <Text>{item.size || 'M'} × {item.quantity || 1}</Text>
                </View>

                <View style={styles.colPrice}>
                  <Text>${Number(item.unit_price).toFixed(2)}</Text>
                </View>

                <View style={styles.colOutcome}>
                  {isKept && <Text style={styles.statusKept}>KEPT BY PATRON</Text>}
                  {isReturned && (
                    <View>
                      <Text style={styles.statusReturned}>RETURNED</Text>
                      {item.rejection_reason && (
                        <Text style={styles.itemSub}>{item.rejection_reason}</Text>
                      )}
                    </View>
                  )}
                  {isPending && <Text style={styles.statusPending}>PENDING FITTING</Text>}
                </View>

                <View style={styles.colTotal}>
                  <Text style={{ fontFamily: 'Helvetica-Bold' }}>
                    {isReturned ? '$0.00' : `$${lineSubtotal.toFixed(2)}`}
                  </Text>
                </View>
              </View>
            )
          })}
        </View>

        {/* Totals Breakdown */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Gross Order Value:</Text>
              <Text style={styles.totalsValue}>
                ${Number(order.original_total || order.total).toFixed(2)}
              </Text>
            </View>

            {order.original_total && order.original_total > order.total && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Returned Items Credit:</Text>
                <Text style={[styles.totalsValue, { color: '#DC2626' }]}>
                  -${(Number(order.original_total) - Number(order.total)).toFixed(2)}
                </Text>
              </View>
            )}

            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>VAT / Sales Tax (8.5%):</Text>
              <Text style={styles.totalsValue}>
                ${Number(order.tax_amount || 0).toFixed(2)}
              </Text>
            </View>

            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>White-Glove Courier Logistics:</Text>
              <Text style={[styles.totalsValue, { color: '#059669' }]}>
                {Number(order.shipping_fee) > 0
                  ? `$${Number(order.shipping_fee).toFixed(2)}`
                  : 'Complimentary'}
              </Text>
            </View>

            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Net Realized Total:</Text>
              <Text style={styles.grandTotalValue}>${Number(order.total).toFixed(2)} USD</Text>
            </View>
          </View>
        </View>

        {/* Embedded Barcode */}
        <View style={styles.barcodeSection}>
          <PdfBarcodeView value={trackingCode} />
          <Text style={styles.barcodeText}>{trackingCode}</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            Atelier Gustavo SAS • 42 Rue de Sèvres, 75007 Paris • SIRET 849 201 392 00018 • TVA FR 32 849201392
          </Text>
          <Text>Official Commercial Invoice • Stored on Atelier Cloud</Text>
        </View>
      </Page>
    </Document>
  )
}

/**
 * Generate a PDF buffer from an order for API response or storage upload.
 */
export async function generateInvoicePdfBuffer(order: OrderWithItems): Promise<Buffer> {
  return await renderToBuffer(<LuxuryInvoiceDocument order={order} />)
}
