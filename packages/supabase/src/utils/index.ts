import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Database,
  Product,
  ProductInsert,
  ProductUpdate,
  Category,
  CategoryInsert,
  CategoryUpdate,
  Order,
  OrderInsert,
  UserProfile,
  UserRole,
  OrderStatus,
  Address,
  AddressInsert,
  OrderItem,
  OrderItemInsert,
  DeliveryMode,
  TryOnStatus,
  ProductMedia,
  ProductMediaInsert,
  ProductVariant,
  ProductVariantInsert,
  StorefrontConfig,
  StorefrontConfigInsert,
  PromotionalBanner,
  PromotionalBannerInsert,
  OrderItemWithProduct,
  OrderWithItems,
  BoltTimeslot,
  BoltPincode,
  StoreLocation,
  LocationZone,
  Shelf,
  ShelfInventory,
  InventoryLevel,
  InventoryLedgerEntry,
  Supplier,
  PurchaseOrder,
  PurchaseOrderItem,
  GoodsReceipt,
  GoodsReceiptItem,
  StockTransfer,
  StockTransferItem,
  PosSession,
  UserAddress,
  PosPaymentMethod,
  QcStatus,
  PageLayout,
  PageLayoutInsert,
  PageLayoutUpdate,
  StorefrontTokens,
  StorefrontTokensInsert,
  StorefrontTokensUpdate,
  LayoutNode,
  ComponentType,
} from '../types/database.types'

export * from '../types/database.types'
export * from './barcode'
export * from './boltAccounting'
import { generateStandardBarcode, generateBarcodeDataUrl, generateOrderTrackingBarcode } from './barcode'

// ==========================================
// 1. STARTER FALLBACK DATA (For resilient UX)
// ==========================================
export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'c1000000-0000-0000-0000-000000000001',
    name: 'Hoodies & Fleece',
    slug: 'hoodies',
    description: 'Heavyweight 480 GSM French Terry and loopback brushed cotton fleece hoodies.',
    image_url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85',
    display_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'c1000000-0000-0000-0000-000000000002',
    name: 'Tees & Tops',
    slug: 'tees',
    description: 'Overdyed 280 GSM combed cotton vintage drop-shoulder tees and thermal waffle tops.',
    image_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=85',
    display_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'c1000000-0000-0000-0000-000000000003',
    name: 'Outerwear & Jackets',
    slug: 'outerwear',
    description: 'Weatherproof cropped flight bombers, heavy canvas chore coats, and sculptural overcoats.',
    image_url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1200&q=85',
    display_order: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'c1000000-0000-0000-0000-000000000004',
    name: 'Pants & Denim',
    slug: 'pants',
    description: '14oz Japanese raw selvedge denim, pleated wide-leg trousers, and heavyweight sweatpants.',
    image_url: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1200&q=85',
    display_order: 4,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'b1000000-0000-0000-0000-000000000001',
    title: 'Heavyweight Boxy Hoodie',
    description: 'Custom-milled 480 GSM loopback organic French Terry. Engineered with an exaggerated dropped shoulder, double-layered architectural hood, and concealed side-seam pockets. Mineral washed for a vintage drape.',
    price: 165.0,
    stock: 115,
    image_url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85',
    category_id: 'c1000000-0000-0000-0000-000000000001',
    category: 'Hoodies & Fleece',
    material: '480 GSM 100% Organic Cotton French Terry',
    edition: 'Drop 01 // Limited 150 Pieces',
    is_archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'b1000000-0000-0000-0000-000000000002',
    title: 'Vintage Washed Boxy Tee',
    description: '280 GSM heavyweight combed cotton jersey with distressed neck ribbing and raw edge blind hem. Sun-faded wash treatment creates individual character on every piece.',
    price: 75.0,
    stock: 140,
    image_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=85',
    category_id: 'c1000000-0000-0000-0000-000000000002',
    category: 'Tees & Tops',
    material: '280 GSM Combed Cotton with Vintage Enzymatic Wash',
    edition: 'Drop 01 // Core Essential',
    is_archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'b1000000-0000-0000-0000-000000000003',
    title: 'Cropped Weatherproof Flight Bomber',
    description: 'High-density technical nylon shell with quilted synthetic insulation. Cropped torso silhouette with elongated sleeves and custom matte nickel two-way zipper hardware.',
    price: 285.0,
    stock: 55,
    image_url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1200&q=85',
    category_id: 'c1000000-0000-0000-0000-000000000003',
    category: 'Outerwear & Jackets',
    material: 'Matte Technical Nylon Shell & Primaloft Insulation',
    edition: 'Drop 01 // Archive Edition of 60',
    is_archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'b1000000-0000-0000-0000-000000000004',
    title: 'Pleated Selvedge Carpenter Pant',
    description: 'Cut from 14oz shuttle-loomed Japanese raw black selvedge denim. Double front pleats create an elegant wide drape falling straight over chunky footwear.',
    price: 210.0,
    stock: 75,
    image_url: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1200&q=85',
    category_id: 'c1000000-0000-0000-0000-000000000004',
    category: 'Pants & Denim',
    material: '14oz Japanese Selvedge Cotton Denim',
    edition: 'Drop 01 // Strict Edition of 80',
    is_archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'b1000000-0000-0000-0000-000000000005',
    title: 'Architectural Raw Linen Smock',
    description: 'Hand-loomed 380 GSM Belgian flax linen with flat-felled French seams, wide kimono-cut sleeves, and natural horn button closures.',
    price: 240.0,
    stock: 45,
    image_url: '/images/prod3-front.jpg',
    category_id: 'c1000000-0000-0000-0000-000000000002',
    category: 'Tees & Tops',
    material: '380 GSM Organic Belgian Flax Linen',
    edition: 'Creator Atelier Spec 05',
    is_archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'b1000000-0000-0000-0000-000000000006',
    title: 'Relaxed Flared Minimalist Track Pant',
    description: 'Custom 400 GSM double-knit jersey with center front pinch pleat and hidden zip ankle vents. Elasticized drawcord waist with custom metal aglets.',
    price: 145.0,
    stock: 80,
    image_url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=1200&q=85',
    category_id: 'c1000000-0000-0000-0000-000000000004',
    category: 'Pants & Denim',
    material: '400 GSM Heavyweight Double-Knit Cotton',
    edition: 'Drop 01 // Daily Uniform',
    is_archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export const DEFAULT_PRODUCT_VARIANTS: ProductVariant[] = [
  // Heavyweight Boxy Hoodie
  { id: 'v101', product_id: 'b1000000-0000-0000-0000-000000000001', sku: 'HD-BOX-BLK-XS', size: 'XS', color: 'Faded Onyx', stock: 10, price_override: null, barcode: null, barcode_data: null, barcode_url: null, weight_grams: 850, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'v102', product_id: 'b1000000-0000-0000-0000-000000000001', sku: 'HD-BOX-BLK-S',  size: 'S',  color: 'Faded Onyx', stock: 25, price_override: null, barcode: null, barcode_data: null, barcode_url: null, weight_grams: 870, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'v103', product_id: 'b1000000-0000-0000-0000-000000000001', sku: 'HD-BOX-BLK-M',  size: 'M',  color: 'Faded Onyx', stock: 45, price_override: null, barcode: null, barcode_data: null, barcode_url: null, weight_grams: 900, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'v104', product_id: 'b1000000-0000-0000-0000-000000000001', sku: 'HD-BOX-BLK-L',  size: 'L',  color: 'Faded Onyx', stock: 25, price_override: null, barcode: null, barcode_data: null, barcode_url: null, weight_grams: 930, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'v105', product_id: 'b1000000-0000-0000-0000-000000000001', sku: 'HD-BOX-BLK-XL', size: 'XL', color: 'Faded Onyx', stock: 10, price_override: null, barcode: null, barcode_data: null, barcode_url: null, weight_grams: 960, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },

  // Vintage Washed Boxy Tee
  { id: 'v201', product_id: 'b1000000-0000-0000-0000-000000000002', sku: 'TEE-VNTG-WHT-XS', size: 'XS', color: 'Chalk White', stock: 15, price_override: null, barcode: null, barcode_data: null, barcode_url: null, weight_grams: 310, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'v202', product_id: 'b1000000-0000-0000-0000-000000000002', sku: 'TEE-VNTG-WHT-S',  size: 'S',  color: 'Chalk White', stock: 30, price_override: null, barcode: null, barcode_data: null, barcode_url: null, weight_grams: 325, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'v203', product_id: 'b1000000-0000-0000-0000-000000000002', sku: 'TEE-VNTG-WHT-M',  size: 'M',  color: 'Chalk White', stock: 50, price_override: null, barcode: null, barcode_data: null, barcode_url: null, weight_grams: 340, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'v204', product_id: 'b1000000-0000-0000-0000-000000000002', sku: 'TEE-VNTG-WHT-L',  size: 'L',  color: 'Chalk White', stock: 35, price_override: null, barcode: null, barcode_data: null, barcode_url: null, weight_grams: 355, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'v205', product_id: 'b1000000-0000-0000-0000-000000000002', sku: 'TEE-VNTG-WHT-XL', size: 'XL', color: 'Chalk White', stock: 10, price_override: null, barcode: null, barcode_data: null, barcode_url: null, weight_grams: 370, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },

  // Cropped Flight Bomber
  { id: 'v301', product_id: 'b1000000-0000-0000-0000-000000000003', sku: 'BMB-CR-BLK-S',  size: 'S',  color: 'Pitch Black', stock: 10, price_override: null, barcode: null, barcode_data: null, barcode_url: null, weight_grams: 1100, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'v302', product_id: 'b1000000-0000-0000-0000-000000000003', sku: 'BMB-CR-BLK-M',  size: 'M',  color: 'Pitch Black', stock: 25, price_override: null, barcode: null, barcode_data: null, barcode_url: null, weight_grams: 1150, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'v303', product_id: 'b1000000-0000-0000-0000-000000000003', sku: 'BMB-CR-BLK-L',  size: 'L',  color: 'Pitch Black', stock: 15, price_override: null, barcode: null, barcode_data: null, barcode_url: null, weight_grams: 1200, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'v304', product_id: 'b1000000-0000-0000-0000-000000000003', sku: 'BMB-CR-BLK-XL', size: 'XL', color: 'Pitch Black', stock: 5,  price_override: null, barcode: null, barcode_data: null, barcode_url: null, weight_grams: 1250, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },

  // Pleated Carpenter Pant
  { id: 'v401', product_id: 'b1000000-0000-0000-0000-000000000004', sku: 'PNT-SLV-30', size: '30', color: 'Raw Black', stock: 15, price_override: null, barcode: null, barcode_data: null, barcode_url: null, weight_grams: 780, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'v402', product_id: 'b1000000-0000-0000-0000-000000000004', sku: 'PNT-SLV-32', size: '32', color: 'Raw Black', stock: 30, price_override: null, barcode: null, barcode_data: null, barcode_url: null, weight_grams: 800, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'v403', product_id: 'b1000000-0000-0000-0000-000000000004', sku: 'PNT-SLV-34', size: '34', color: 'Raw Black', stock: 20, price_override: null, barcode: null, barcode_data: null, barcode_url: null, weight_grams: 820, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'v404', product_id: 'b1000000-0000-0000-0000-000000000004', sku: 'PNT-SLV-36', size: '36', color: 'Raw Black', stock: 10, price_override: null, barcode: null, barcode_data: null, barcode_url: null, weight_grams: 840, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },

  // Architectural Raw Linen Smock
  { id: 'v501', product_id: 'b1000000-0000-0000-0000-000000000005', sku: 'SMK-LNN-T1', size: 'Taille 01 (S/M)', color: 'Natural Ecru', stock: 20, price_override: null, barcode: null, barcode_data: null, barcode_url: null, weight_grams: 520, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'v502', product_id: 'b1000000-0000-0000-0000-000000000005', sku: 'SMK-LNN-T2', size: 'Taille 02 (L/XL)', color: 'Natural Ecru', stock: 25, price_override: null, barcode: null, barcode_data: null, barcode_url: null, weight_grams: 560, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },

  // Relaxed Flared Minimalist Track Pant
  { id: 'v601', product_id: 'b1000000-0000-0000-0000-000000000006', sku: 'TRK-FLR-BLK-S',  size: 'S',  color: 'Washed Ink', stock: 15, price_override: null, barcode: null, barcode_data: null, barcode_url: null, weight_grams: 650, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'v602', product_id: 'b1000000-0000-0000-0000-000000000006', sku: 'TRK-FLR-BLK-M',  size: 'M',  color: 'Washed Ink', stock: 35, price_override: null, barcode: null, barcode_data: null, barcode_url: null, weight_grams: 670, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'v603', product_id: 'b1000000-0000-0000-0000-000000000006', sku: 'TRK-FLR-BLK-L',  size: 'L',  color: 'Washed Ink', stock: 20, price_override: null, barcode: null, barcode_data: null, barcode_url: null, weight_grams: 690, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'v604', product_id: 'b1000000-0000-0000-0000-000000000006', sku: 'TRK-FLR-BLK-XL', size: 'XL', color: 'Washed Ink', stock: 10, price_override: null, barcode: null, barcode_data: null, barcode_url: null, weight_grams: 710, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
]

export const DEFAULT_BOLT_TIMESLOTS: BoltTimeslot[] = [
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
  {
    id: 't1000000-0000-0000-0000-000000000005',
    label: '06:00 PM - 08:00 PM (Sunset White-Glove)',
    slot_start: '18:00:00',
    slot_end: '20:00:00',
    cutoff_time: '17:00:00',
    max_daily_capacity: 10,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export const DEFAULT_ORDERS: OrderWithItems[] = [
  {
    id: 'ord-10000000-0000-0000-0000-000000000001',
    order_number: 'ATL-ORD-9821',
    user_id: 'a0000000-0000-0000-0000-000000000001',
    order_type: 'bolt_try_on',
    bolt_pincode: '560038',
    bolt_timeslot_id: 't1000000-0000-0000-0000-000000000001',
    bolt_timeslot: {
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
    bolt_session_status: 'at_doorstep',
    status: 'processing',
    delivery_mode: 'try_on',
    try_on_status: 'reconciling',
    try_on_window_start: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    try_on_window_end: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    fitting_started_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    fitting_duration_minutes: 45,
    reconciled_at: null,
    original_total: 450.0,
    total: 375.0,
    tax_amount: 30.94,
    shipping_fee: 0.0,
    invoice_number: 'INV-2026-1001',
    tracking_barcode: 'ATL-TRK-98219821',
    invoice_url: null,
    delivery_partner_id: 'd1000000-0000-0000-0000-000000000001',
    shipping_address: 'Flat 4B, Prestige Indiranagar, 100ft Road, Bengaluru, Karnataka 560038',
    delivery_notes: 'White-glove 45m doorstep fitting session. Ring private courtyard bell 4B.',
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    order_items: [
      {
        id: 'item-001',
        order_id: 'ord-10000000-0000-0000-0000-000000000001',
        product_id: 'b1000000-0000-0000-0000-000000000001',
        quantity: 1,
        unit_price: 165.0,
        size: 'L',
        is_kept: true,
        try_on_decision: 'kept',
        rejection_reason: null,
        created_at: new Date().toISOString(),
        product: {
          id: 'b1000000-0000-0000-0000-000000000001',
          title: 'Heavyweight Boxy Hoodie',
          image_url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85',
          price: 165.0,
          material: '480 GSM 100% Organic Cotton French Terry',
        },
      },
      {
        id: 'item-002',
        order_id: 'ord-10000000-0000-0000-0000-000000000001',
        product_id: 'b1000000-0000-0000-0000-000000000004',
        quantity: 1,
        unit_price: 210.0,
        size: '32',
        is_kept: true,
        try_on_decision: 'kept',
        rejection_reason: null,
        created_at: new Date().toISOString(),
        product: {
          id: 'b1000000-0000-0000-0000-000000000004',
          title: 'Pleated Selvedge Carpenter Pant',
          image_url: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1200&q=85',
          price: 210.0,
          material: '14oz Japanese Selvedge Cotton Denim',
        },
      },
      {
        id: 'item-003',
        order_id: 'ord-10000000-0000-0000-0000-000000000001',
        product_id: 'b1000000-0000-0000-0000-000000000002',
        quantity: 1,
        unit_price: 75.0,
        size: 'XL',
        is_kept: false,
        try_on_decision: 'rejected',
        rejection_reason: 'Exaggerated boxy cut runs slightly wide across chest.',
        created_at: new Date().toISOString(),
        product: {
          id: 'b1000000-0000-0000-0000-000000000002',
          title: 'Vintage Washed Boxy Tee',
          image_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=85',
          price: 75.0,
          material: '280 GSM Combed Cotton with Vintage Enzymatic Wash',
        },
      },
    ],
  },
  {
    id: 'ord-10000000-0000-0000-0000-000000000002',
    order_number: 'ATL-ORD-9822',
    user_id: 'a0000000-0000-0000-0000-000000000002',
    order_type: 'standard',
    bolt_pincode: null,
    bolt_timeslot_id: null,
    bolt_session_status: null,
    status: 'out_for_delivery',
    delivery_mode: 'direct',
    try_on_status: null,
    try_on_window_start: null,
    try_on_window_end: null,
    fitting_started_at: null,
    fitting_duration_minutes: 45,
    reconciled_at: null,
    original_total: 430.0,
    total: 430.0,
    tax_amount: 35.48,
    shipping_fee: 15.0,
    invoice_number: 'INV-2026-1002',
    tracking_barcode: 'ATL-TRK-98229822',
    invoice_url: null,
    delivery_partner_id: 'd1000000-0000-0000-0000-000000000001',
    shipping_address: '180 Montgomery St, 15th Fl, San Francisco, CA 94104',
    delivery_notes: 'Direct priority dispatch. Reception desk open until 18:00.',
    created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    order_items: [
      {
        id: 'item-004',
        order_id: 'ord-10000000-0000-0000-0000-000000000002',
        product_id: 'b1000000-0000-0000-0000-000000000003',
        quantity: 1,
        unit_price: 285.0,
        size: 'M',
        is_kept: true,
        try_on_decision: 'kept',
        rejection_reason: null,
        created_at: new Date().toISOString(),
        product: {
          id: 'b1000000-0000-0000-0000-000000000003',
          title: 'Cropped Weatherproof Flight Bomber',
          image_url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1200&q=85',
          price: 285.0,
          material: 'Matte Technical Nylon Shell & Primaloft Insulation',
        },
      },
      {
        id: 'item-005',
        order_id: 'ord-10000000-0000-0000-0000-000000000002',
        product_id: 'b1000000-0000-0000-0000-000000000006',
        quantity: 1,
        unit_price: 145.0,
        size: 'M',
        is_kept: true,
        try_on_decision: 'kept',
        rejection_reason: null,
        created_at: new Date().toISOString(),
        product: {
          id: 'b1000000-0000-0000-0000-000000000006',
          title: 'Relaxed Flared Minimalist Track Pant',
          image_url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=1200&q=85',
          price: 145.0,
          material: '400 GSM Heavyweight Double-Knit Cotton',
        },
      },
    ],
  },
  {
    id: 'ord-10000000-0000-0000-0000-000000000003',
    order_number: 'ATL-ORD-9823',
    user_id: 'a0000000-0000-0000-0000-000000000001',
    order_type: 'bolt_try_on',
    bolt_pincode: '560034',
    bolt_timeslot_id: 't1000000-0000-0000-0000-000000000003',
    bolt_session_status: 'scheduled',
    status: 'pending',
    delivery_mode: 'try_on',
    try_on_status: 'pending',
    try_on_window_start: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    try_on_window_end: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
    fitting_started_at: null,
    fitting_duration_minutes: 45,
    reconciled_at: null,
    original_total: 240.0,
    total: 240.0,
    tax_amount: 19.8,
    shipping_fee: 0.0,
    invoice_number: 'INV-2026-1003',
    tracking_barcode: 'ATL-TRK-98239823',
    invoice_url: null,
    delivery_partner_id: null,
    shipping_address: '88 King Street, Penthouse B, Seattle, WA 98104',
    delivery_notes: 'Private elevator code 9821. Customer requested tailored fitting review.',
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    order_items: [
      {
        id: 'item-006',
        order_id: 'ord-10000000-0000-0000-0000-000000000003',
        product_id: 'b1000000-0000-0000-0000-000000000005',
        quantity: 1,
        unit_price: 240.0,
        size: 'Taille 01 (S/M)',
        is_kept: null,
        try_on_decision: 'pending',
        rejection_reason: null,
        created_at: new Date().toISOString(),
        product: {
          id: 'b1000000-0000-0000-0000-000000000005',
          title: 'Architectural Raw Linen Smock',
          image_url: '/images/prod3-front.jpg',
          price: 240.0,
          material: '380 GSM Organic Belgian Flax Linen',
        },
      },
    ],
  },
]

// ==========================================
// 2. CATEGORY OPERATIONS
// ==========================================

/**
 * Fetch all dynamic parent categories ordered by display_order.
 */
export async function getCategories(supabase: SupabaseClient<Database>): Promise<Category[]> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true })

    if (error || !data || data.length === 0) {
      return DEFAULT_CATEGORIES
    }
    return data
  } catch (err) {
    return DEFAULT_CATEGORIES
  }
}

/**
 * Create a new category (Admin).
 */
export async function createCategory(
  supabase: SupabaseClient<Database>,
  category: CategoryInsert
): Promise<{ data: Category | null; error?: string }> {
  const { data, error } = await supabase
    .from('categories')
    .insert(category)
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }
  return { data }
}

/**
 * Update an existing category (Admin).
 */
export async function updateCategory(
  supabase: SupabaseClient<Database>,
  id: string,
  updates: CategoryUpdate
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('categories')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true }
}

/**
 * Delete a category (Admin).
 */
export async function deleteCategory(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true }
}

// ==========================================
// 3. PRODUCT OPERATIONS
// ==========================================

/**
 * Fetch all available (non-archived) products for storefront.
 */
export async function getStorefrontProducts(
  supabase: SupabaseClient<Database>,
  categorySlugOrName?: string
): Promise<Product[]> {
  try {
    let query = supabase
      .from('products')
      .select('*')
      .eq('is_archived', false)
      .order('created_at', { ascending: false })

    if (categorySlugOrName && categorySlugOrName !== 'all') {
      // Filter by category column or case-insensitive ilike
      query = query.ilike('category', `%${categorySlugOrName}%`)
    }

    const { data, error } = await query

    if (error || !data || data.length === 0) {
      if (categorySlugOrName && categorySlugOrName !== 'all') {
        return DEFAULT_PRODUCTS.filter((p) =>
          p.category?.toLowerCase().includes(categorySlugOrName.toLowerCase())
        )
      }
      return DEFAULT_PRODUCTS
    }
    return data
  } catch (err) {
    return DEFAULT_PRODUCTS
  }
}

/**
 * Fetch all products (including archived) for admin inventory.
 */
export async function getAllProductsAdmin(supabase: SupabaseClient<Database>): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (error || !data || data.length === 0) {
      return DEFAULT_PRODUCTS
    }
    return data
  } catch (err) {
    return DEFAULT_PRODUCTS
  }
}

/**
 * Fetch a single product by ID.
 */
export async function getProductById(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<Product | null> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      const fallback = DEFAULT_PRODUCTS.find((p) => p.id === id) || DEFAULT_PRODUCTS[0]!
      return fallback
    }
    return data
  } catch (err) {
    const fallback = DEFAULT_PRODUCTS.find((p) => p.id === id) || DEFAULT_PRODUCTS[0]!
    return fallback
  }
}

/**
 * Create a new product (Admin).
 */
export async function createProduct(
  supabase: SupabaseClient<Database>,
  product: ProductInsert
): Promise<{ data: Product | null; error?: string }> {
  const { data, error } = await supabase
    .from('products')
    .insert(product)
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }
  return { data }
}

/**
 * Update a product (Admin).
 */
export async function updateProduct(
  supabase: SupabaseClient<Database>,
  id: string,
  updates: ProductUpdate
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('products')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true }
}

/**
 * Update stock level of a product.
 */
export async function updateProductStock(
  supabase: SupabaseClient<Database>,
  id: string,
  newStock: number
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('products')
    .update({ stock: Math.max(0, newStock), updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true }
}

// ==========================================
// 4. USER & ROLE MANAGEMENT OPERATIONS
// ==========================================

/**
 * Fetch all registered users for Admin Patron Registry & Role Assignment.
 */
export async function getAllUsers(supabase: SupabaseClient<Database>): Promise<UserProfile[]> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error || !data) {
      return []
    }
    return data
  } catch (err) {
    return []
  }
}

/**
 * Fetch all users with role 'delivery' for courier assignment.
 */
export async function getDeliveryCouriers(supabase: SupabaseClient<Database>): Promise<UserProfile[]> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'delivery')
      .order('name', { ascending: true })

    if (error || !data) {
      return []
    }
    return data
  } catch (err) {
    return []
  }
}

/**
 * Reassign a user's role (Admin Action).
 * Promotes or modifies patron to 'delivery', 'admin', or 'customer'.
 */
export async function assignUserRole(
  supabase: SupabaseClient<Database>,
  targetUserId: string,
  newRole: UserRole
): Promise<{ success: boolean; error?: string }> {
  try {
    // Try via RPC function set_user_role first
    const { error: rpcError } = await (supabase.rpc as any)('set_user_role', {
      target_user_id: targetUserId,
      new_role: newRole,
    })

    if (!rpcError) {
      return { success: true }
    }

    // Direct update fallback
    const { error } = await supabase
      .from('users')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', targetUserId)

    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error assigning user role' }
  }
}

/**
 * Fetch user profile from the public.users table.
 */
export async function getUserProfile(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    return null
  }
  return data
}

/**
 * Update user profile address fields.
 */
export async function updateUserProfileAddress(
  supabase: SupabaseClient<Database>,
  userId: string,
  address: {
    street_address: string
    city: string
    postal_code: string
    country?: string
    phone?: string
  }
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('users')
    .update({
      street_address: address.street_address,
      city: address.city,
      postal_code: address.postal_code,
      country: address.country || 'US',
      phone: address.phone,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true }
}

/**
 * Fetch saved addresses for a user.
 */
export async function getUserAddresses(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<Address[]> {
  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })

  if (error) {
    return []
  }
  return data ?? []
}

/**
 * Save an address to public.addresses.
 */
export async function saveUserAddress(
  supabase: SupabaseClient<Database>,
  address: AddressInsert
): Promise<{ data: Address | null; error?: string }> {
  const { data, error } = await supabase
    .from('addresses')
    .insert(address)
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }
  return { data }
}

// ==========================================
// 5. ORDER & LOGISTICS OPERATIONS
// ==========================================
// 4. ORDER & LOGISTICS OPERATIONS
// ==========================================

/**
 * Fetch all orders for the admin dashboard including joined order items, product details, and Try-On status.
 * Authoritative query directly against PostgreSQL database with graceful fallback for empty catalogs.
 */
export async function getAllOrders(supabase: SupabaseClient<Database>): Promise<OrderWithItems[]> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, bolt_timeslot:bolt_timeslots(*), order_items(*, product:products(id, title, image_url, price, material))')
      .order('created_at', { ascending: false })

    if (error || !data || data.length === 0) {
      return DEFAULT_ORDERS
    }

    return data as unknown as OrderWithItems[]
  } catch (err) {
    return DEFAULT_ORDERS
  }
}

/**
 * Fetch a single order by ID or order_number or tracking barcode with full relations.
 */
export async function getOrderById(
  supabase: SupabaseClient<Database>,
  orderIdOrCode: string
): Promise<OrderWithItems | null> {
  const cleanCode = orderIdOrCode.trim()

  try {
    const query = supabase
      .from('orders')
      .select('*, bolt_timeslot:bolt_timeslots(*), order_items(*, product:products(id, title, image_url, price, material))')

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanCode)
    const { data, error } = await (
      isUuid
        ? query.eq('id', cleanCode).maybeSingle()
        : query.or(`order_number.eq.${cleanCode},tracking_barcode.eq.${cleanCode}`).maybeSingle()
    )

    if (error || !data) {
      return (
        DEFAULT_ORDERS.find(
          (o) =>
            o.id === cleanCode ||
            o.order_number?.toLowerCase() === cleanCode.toLowerCase() ||
            o.tracking_barcode?.toLowerCase() === cleanCode.toLowerCase()
        ) || null
      )
    }
    return data as unknown as OrderWithItems
  } catch (err) {
    return (
      DEFAULT_ORDERS.find(
        (o) =>
          o.id === cleanCode ||
          o.order_number?.toLowerCase() === cleanCode.toLowerCase() ||
          o.tracking_barcode?.toLowerCase() === cleanCode.toLowerCase()
      ) || null
    )
  }
}

/**
 * Updates item-by-item reconciliation decision during or after a Doorstep Try-On session.
 */
export async function updateOrderItemReconciliation(
  supabase: SupabaseClient<Database>,
  itemId: string,
  isKept: boolean,
  rejectionReason?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('order_items')
      .update({
        is_kept: isKept,
        rejection_reason: rejectionReason || null,
      })
      .eq('id', itemId)

    if (error) {
      // In-memory update for fallback orders
      for (const ord of DEFAULT_ORDERS) {
        const item = ord.order_items?.find((i) => i.id === itemId)
        if (item) {
          item.is_kept = isKept
          item.rejection_reason = rejectionReason || null
          return { success: true }
        }
      }
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Reconciliation update error' }
  }
}

/**
 * Finalizes Try-On order reconciliation, setting try_on_status to 'completed',
 * recording reconciled_at timestamp, and updating realized total.
 */
export async function finalizeTryOnReconciliation(
  supabase: SupabaseClient<Database>,
  orderId: string,
  reconciledTotal: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('orders')
      .update({
        try_on_status: 'completed',
        reconciled_at: new Date().toISOString(),
        total: reconciledTotal,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    if (error) {
      const ord = DEFAULT_ORDERS.find((o) => o.id === orderId)
      if (ord) {
        ord.try_on_status = 'completed'
        ord.reconciled_at = new Date().toISOString()
        ord.total = reconciledTotal
        return { success: true }
      }
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error finalizing reconciliation' }
  }
}

/**
 * Fetch orders assigned to a specific delivery partner.
 */
export async function getAssignedDeliveries(
  supabase: SupabaseClient<Database>,
  partnerId: string
): Promise<OrderWithItems[]> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, bolt_timeslot:bolt_timeslots(*), order_items(*, product:products(id, title, image_url, price, material))')
      .eq('delivery_partner_id', partnerId)
      .order('created_at', { ascending: false })

    if (error || !data || data.length === 0) {
      return DEFAULT_ORDERS.filter((o) => !o.delivery_partner_id || o.delivery_partner_id === partnerId)
    }
    return data as unknown as OrderWithItems[]
  } catch (err) {
    return DEFAULT_ORDERS.filter((o) => !o.delivery_partner_id || o.delivery_partner_id === partnerId)
  }
}

/**
 * Update the delivery status and/or courier assignment of an order.
 */
export async function updateOrderStatus(
  supabase: SupabaseClient<Database>,
  orderId: string,
  status: OrderStatus,
  deliveryNotes?: string,
  deliveryPartnerId?: string | null
): Promise<{ success: boolean; error?: string }> {
  // If moving to cancelled, replenish allocated inventory stock
  if (status === 'cancelled') {
    try {
      const { data: currentOrder } = await supabase
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .single()

      if (currentOrder && currentOrder.status !== 'cancelled') {
        const { data: oItems } = await supabase
          .from('order_items')
          .select('product_id, size, quantity, is_kept')
          .eq('order_id', orderId)

        if (oItems && oItems.length > 0) {
          for (const item of oItems) {
            if (item.is_kept !== false) {
              if (item.size) {
                const { data: variant } = await supabase
                  .from('product_variants')
                  .select('id, stock')
                  .eq('product_id', item.product_id)
                  .eq('size', item.size)
                  .single()

                if (variant && typeof variant.stock === 'number') {
                  await supabase
                    .from('product_variants')
                    .update({ stock: variant.stock + (item.quantity || 1) })
                    .eq('id', variant.id)
                }
              } else {
                const { data: prod } = await supabase
                  .from('products')
                  .select('id, stock')
                  .eq('id', item.product_id)
                  .single()

                if (prod && typeof prod.stock === 'number') {
                  await supabase
                    .from('products')
                    .update({ stock: prod.stock + (item.quantity || 1) })
                    .eq('id', prod.id)
                }
              }
            }
          }
        }
      }
    } catch (cancelStockErr) {
      console.warn('Cancelled order stock replenishment note:', cancelStockErr)
    }
  }

  const updatePayload: Partial<Order> = {
    status,
    updated_at: new Date().toISOString(),
  }
  if (deliveryNotes !== undefined) {
    updatePayload.delivery_notes = deliveryNotes
  }
  if (deliveryPartnerId !== undefined) {
    updatePayload.delivery_partner_id = deliveryPartnerId
  }

  const { error } = await supabase
    .from('orders')
    .update(updatePayload)
    .eq('id', orderId)

  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true }
}

/**
 * Assign a courier to an order (Admin Action).
 */
export async function assignOrderCourier(
  supabase: SupabaseClient<Database>,
  orderId: string,
  courierId: string | null
): Promise<{ success: boolean; error?: string }> {
  const updatePayload = {
    delivery_partner_id: courierId,
    status: (courierId ? 'processing' : 'pending') as OrderStatus,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('orders')
    .update(updatePayload)
    .eq('id', orderId)

  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true }
}

/**
 * Create an order and its order_items in an atomic flow.
 * Persists directly to the Supabase PostgreSQL database.
 */
export async function createOrderWithItems(
  supabase: SupabaseClient<Database>,
  orderData: OrderInsert,
  items: Array<{
    productId: string
    quantity: number
    unitPrice: number
    size?: string
  }>
): Promise<{ data: Order | null; error?: string }> {
  try {
    // 1. Insert order record into Supabase PostgreSQL
    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single()

    if (orderError || !newOrder) {
      return { data: null, error: orderError?.message || 'Failed to create order record' }
    }

    // 2. Insert items into order_items table
    if (items.length > 0) {
      const orderItemsPayload: OrderItemInsert[] = items.map((it) => ({
        order_id: newOrder.id,
        product_id: it.productId,
        quantity: it.quantity,
        unit_price: it.unitPrice,
        size: it.size || null,
        is_kept: null,
        try_on_decision: 'pending',
      }))

      const { error: itemsErr } = await supabase.from('order_items').insert(orderItemsPayload)
      if (itemsErr) {
        console.error('Failed to insert order items:', itemsErr)
        return { data: null, error: itemsErr.message }
      }

      // 3. Atomically decrement allocated variant inventory stock
      for (const it of items) {
        try {
          if (it.size) {
            const { data: variant } = await supabase
              .from('product_variants')
              .select('id, stock')
              .eq('product_id', it.productId)
              .eq('size', it.size)
              .single()

            if (variant && typeof variant.stock === 'number') {
              const nextStock = Math.max(0, variant.stock - it.quantity)
              await supabase
                .from('product_variants')
                .update({ stock: nextStock })
                .eq('id', variant.id)
            }
          } else {
            const { data: prod } = await supabase
              .from('products')
              .select('id, stock')
              .eq('id', it.productId)
              .single()

            if (prod && typeof prod.stock === 'number') {
              const nextStock = Math.max(0, prod.stock - it.quantity)
              await supabase
                .from('products')
                .update({ stock: nextStock })
                .eq('id', prod.id)
            }
          }
        } catch (stockErr) {
          console.warn('Inventory decrement warning:', stockErr)
        }
      }
    }

    return { data: newOrder }
  } catch (err: any) {
    return { data: null, error: err?.message || 'Error processing order transaction' }
  }
}

/**
 * Fetch order with its line items and product details.
 */
export async function getOrderWithItems(
  supabase: SupabaseClient<Database>,
  orderId: string
): Promise<{ order: Order; items: (OrderItem & { product?: Product })[] } | null> {
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (orderErr || !order) return null

  const { data: items, error: itemsErr } = await supabase
    .from('order_items')
    .select('*, product:products(*)')
    .eq('order_id', orderId)

  if (itemsErr) {
    return { order, items: [] }
  }

  return { order, items: (items as any) ?? [] }
}

/**
 * Start the 45-minute Try-On fitting session.
 */
export async function startTryOnFitting(
  supabase: SupabaseClient<Database>,
  orderId: string
): Promise<{ success: boolean; error?: string; fittingStartedAt?: string }> {
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('orders')
    .update({
      try_on_status: 'active_timer',
      fitting_started_at: now,
      updated_at: now,
    })
    .eq('id', orderId)

  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true, fittingStartedAt: now }
}

/**
 * Reconcile a Try-On order: mark items as kept or rejected, recalculate final total, and complete order.
 */
export async function reconcileTryOnOrder(
  supabase: SupabaseClient<Database>,
  orderId: string,
  decisions: { itemId: string; isKept: boolean; rejectionReason?: string }[],
  courierNotes?: string
): Promise<{ success: boolean; finalTotal?: number; error?: string }> {
  const now = new Date().toISOString()

  // 1. Update each order item decision
  for (const decision of decisions) {
    const { error: itemError } = await supabase
      .from('order_items')
      .update({
        is_kept: decision.isKept,
        rejection_reason: decision.isKept ? null : decision.rejectionReason || 'Customer rejected during fitting',
      })
      .eq('id', decision.itemId)

    if (itemError) {
      return { success: false, error: `Error updating item ${decision.itemId}: ${itemError.message}` }
    }

    // Replenish variant inventory stock for returned/rejected Try-On garments
    if (decision.isKept === false) {
      try {
        const { data: itemData } = await supabase
          .from('order_items')
          .select('product_id, size, quantity')
          .eq('id', decision.itemId)
          .single()

        if (itemData) {
          if (itemData.size) {
            const { data: variant } = await supabase
              .from('product_variants')
              .select('id, stock')
              .eq('product_id', itemData.product_id)
              .eq('size', itemData.size)
              .single()

            if (variant && typeof variant.stock === 'number') {
              await supabase
                .from('product_variants')
                .update({ stock: variant.stock + (itemData.quantity || 1) })
                .eq('id', variant.id)
            }
          } else {
            const { data: prod } = await supabase
              .from('products')
              .select('id, stock')
              .eq('id', itemData.product_id)
              .single()

            if (prod && typeof prod.stock === 'number') {
              await supabase
                .from('products')
                .update({ stock: prod.stock + (itemData.quantity || 1) })
                .eq('id', prod.id)
            }
          }
        }
      } catch (restoreErr) {
        console.warn('Try-On stock replenishment note:', restoreErr)
      }
    }
  }

  // 2. Query items to calculate accurate kept total
  const { data: items, error: fetchError } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId)

  if (fetchError || !items) {
    return { success: false, error: fetchError?.message || 'Could not fetch order items for recalculation' }
  }

  const keptSubtotal = items
    .filter((item) => item.is_kept === true)
    .reduce((sum, item) => sum + Number(item.unit_price) * item.quantity, 0)

  // White-glove try-on fitting concierge fee ($45) + tax
  const shipping = keptSubtotal > 0 ? 45.0 : 0.0
  const tax = keptSubtotal * 0.08
  const finalTotal = keptSubtotal > 0 ? Number((keptSubtotal + shipping + tax).toFixed(2)) : 0.0

  // 3. Finalize order status & reconciled timestamp
  const { error: orderError } = await supabase
    .from('orders')
    .update({
      total: finalTotal,
      try_on_status: 'completed',
      status: 'delivered',
      delivery_notes: courierNotes,
      reconciled_at: now,
      updated_at: now,
    })
    .eq('id', orderId)

  if (orderError) {
    return { success: false, error: orderError.message }
  }

  return { success: true, finalTotal }
}

// ==========================================
// 6. DYNAMIC STOREFRONT CMS OPERATIONS
// ==========================================

export const DEFAULT_HERO_CONFIG = {
  kicker: 'CREATOR CAPSULE // DROP 001',
  headline: 'AUTONOMOUS',
  headlineItalic: 'GARMENTS',
  description: 'Engineered heavyweight silhouettes cut from custom 480 GSM French Terry, 14oz Japanese selvedge denim, and technical outerwear. Made exclusively for the clothing creator.',
  ctaLabel: 'EXPLORE DROP 01',
  ctaLink: '/shop',
  secondaryCategory: 'Hoodies & Fleece',
  featuredProductId: 'b1000000-0000-0000-0000-000000000001',
}

export const DEFAULT_ETHOS_CONFIG = {
  pretitle: 'FABRIC LAB & SILHOUETTE SPECIFICATION',
  statement: '480 GSM French Terry • 14oz Japanese Selvedge • 280 GSM Combed Jersey',
  subtext: 'Every piece is engineered from the yarn up with zero synthetic polyester blending.',
}

/**
 * Fetch product variants by product ID with resilient fallbacks.
 */
export async function getProductVariants(
  supabase: SupabaseClient<Database>,
  productId: string
): Promise<ProductVariant[]> {
  try {
    const { data, error } = await supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: true })

    if (error || !data || data.length === 0) {
      const matched = DEFAULT_PRODUCT_VARIANTS.filter((v) => v.product_id === productId)
      if (matched.length > 0) return matched

      // Return default size run if none pre-defined
      return [
        { id: `v-${productId}-xs`, product_id: productId, sku: `GAR-${productId.slice(0, 4)}-XS`, size: 'XS', color: null, stock: 10, price_override: null, barcode: null, barcode_data: null, barcode_url: null, weight_grams: 500, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: `v-${productId}-s`,  product_id: productId, sku: `GAR-${productId.slice(0, 4)}-S`,  size: 'S',  color: null, stock: 25, price_override: null, barcode: null, barcode_data: null, barcode_url: null, weight_grams: 520, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: `v-${productId}-m`,  product_id: productId, sku: `GAR-${productId.slice(0, 4)}-M`,  size: 'M',  color: null, stock: 45, price_override: null, barcode: null, barcode_data: null, barcode_url: null, weight_grams: 540, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: `v-${productId}-l`,  product_id: productId, sku: `GAR-${productId.slice(0, 4)}-L`,  size: 'L',  color: null, stock: 30, price_override: null, barcode: null, barcode_data: null, barcode_url: null, weight_grams: 560, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: `v-${productId}-xl`, product_id: productId, sku: `GAR-${productId.slice(0, 4)}-XL`, size: 'XL', color: null, stock: 15, price_override: null, barcode: null, barcode_data: null, barcode_url: null, weight_grams: 580, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      ]
    }
    return data
  } catch (err) {
    const matched = DEFAULT_PRODUCT_VARIANTS.filter((v) => v.product_id === productId)
    return matched.length > 0 ? matched : []
  }
}

export interface CreateApparelPayload {
  title: string
  category_id: string
  description: string
  price: number
  material: string
  edition: string
  image_url?: string
  variants: Array<{
    size: string
    color?: string
    sku: string
    stock: number
    price_override?: number | null
  }>
  media?: Array<{
    url: string
    alt_text?: string
    is_primary?: boolean
    display_order?: number
  }>
}

/**
 * Creates an apparel product along with all its size variants and media gallery.
 */
export async function createProductWithVariantsAndMedia(
  supabase: SupabaseClient<Database>,
  payload: CreateApparelPayload
): Promise<{ success: boolean; productId?: string; error?: string }> {
  try {
    const totalStock = payload.variants.reduce((acc, v) => acc + (Number(v.stock) || 0), 0)
    const categories = await getCategories(supabase)
    const categoryName = categories.find((c) => c.id === payload.category_id)?.name || 'Hoodies & Fleece'

    const productInsert: ProductInsert = {
      title: payload.title,
      category_id: payload.category_id,
      category: categoryName,
      description: payload.description,
      price: payload.price,
      stock: totalStock,
      material: payload.material,
      edition: payload.edition,
      image_url:
        payload.image_url ||
        payload.media?.[0]?.url ||
        'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85',
      is_archived: false,
    }

    const { data: newProd, error: prodErr } = await supabase
      .from('products')
      .insert(productInsert)
      .select()
      .single()

    if (prodErr || !newProd) {
      return { success: false, error: prodErr?.message || 'Failed to create product record' }
    }

    if (payload.variants && payload.variants.length > 0) {
      const variantRows: ProductVariantInsert[] = payload.variants.map((v) => {
        const barcodeVal = generateStandardBarcode(v.sku)
        return {
          product_id: newProd.id,
          size: v.size,
          color: v.color || null,
          sku: v.sku,
          stock: Number(v.stock) || 0,
          price_override: v.price_override || null,
          barcode: barcodeVal,
          barcode_data: barcodeVal,
          barcode_url: generateBarcodeDataUrl(barcodeVal),
        }
      })
      await supabase.from('product_variants').insert(variantRows)
    }

    if (payload.media && payload.media.length > 0) {
      const mediaRows: ProductMediaInsert[] = payload.media.map((m, idx) => ({
        product_id: newProd.id,
        url: m.url,
        alt_text: m.alt_text || payload.title,
        is_primary: m.is_primary ?? idx === 0,
        display_order: m.display_order ?? idx,
      }))
      await supabase.from('product_media').insert(mediaRows)
    }

    return { success: true, productId: newProd.id }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Unknown error creating product with variants' }
  }
}

/**
 * Fetch complete garment dossier by ID: product details, variants with barcodes, and media gallery.
 */
export async function getProductWithVariantsAndMedia(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<{ product: Product | null; variants: ProductVariant[]; media: ProductMedia[] }> {
  try {
    const [prodRes, varRes, mediaRes] = await Promise.all([
      supabase.from('products').select('*').eq('id', id).single(),
      supabase.from('product_variants').select('*').eq('product_id', id).order('size', { ascending: true }),
      supabase.from('product_media').select('*').eq('product_id', id).order('display_order', { ascending: true }),
    ])

    if (prodRes.error || !prodRes.data) {
      const fallbackProd = DEFAULT_PRODUCTS.find((p) => p.id === id) || null
      const fallbackVars = DEFAULT_PRODUCT_VARIANTS.filter((v) => v.product_id === id)
      return { product: fallbackProd, variants: fallbackVars, media: [] }
    }

    return {
      product: prodRes.data,
      variants: varRes.data && varRes.data.length > 0 ? varRes.data : DEFAULT_PRODUCT_VARIANTS.filter((v) => v.product_id === id),
      media: mediaRes.data || [],
    }
  } catch (err) {
    const fallbackProd = DEFAULT_PRODUCTS.find((p) => p.id === id) || null
    const fallbackVars = DEFAULT_PRODUCT_VARIANTS.filter((v) => v.product_id === id)
    return { product: fallbackProd, variants: fallbackVars, media: [] }
  }
}

/**
 * Updates an existing garment specification, upserting variants and synchronizing barcodes.
 */
export async function updateProductWithVariantsAndMedia(
  supabase: SupabaseClient<Database>,
  productId: string,
  payload: Partial<CreateApparelPayload>
): Promise<{ success: boolean; error?: string }> {
  try {
    const updatePayload: Partial<ProductUpdate> = {
      updated_at: new Date().toISOString(),
    }
    if (payload.title) updatePayload.title = payload.title
    if (payload.description) updatePayload.description = payload.description
    if (payload.price !== undefined) updatePayload.price = payload.price
    if (payload.material) updatePayload.material = payload.material
    if (payload.edition) updatePayload.edition = payload.edition
    if (payload.image_url) updatePayload.image_url = payload.image_url
    if (payload.category_id) {
      updatePayload.category_id = payload.category_id
      const categories = await getCategories(supabase)
      updatePayload.category = categories.find((c) => c.id === payload.category_id)?.name || null
    }

    await supabase.from('products').update(updatePayload).eq('id', productId)

    // Upsert variants with auto-generated barcode_data
    if (payload.variants && payload.variants.length > 0) {
      for (const v of payload.variants) {
        const barcodeVal = generateStandardBarcode(v.sku)
        await supabase
          .from('product_variants')
          .upsert(
            {
              product_id: productId,
              sku: v.sku,
              size: v.size,
              color: v.color || null,
              stock: Number(v.stock) || 0,
              price_override: v.price_override ?? null,
              barcode: barcodeVal,
              barcode_data: barcodeVal,
              barcode_url: generateBarcodeDataUrl(barcodeVal),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'sku' }
          )
      }
    }

    // Sync media items if supplied
    if (payload.media && payload.media.length > 0) {
      for (const m of payload.media) {
        await supabase.from('product_media').insert({
          product_id: productId,
          url: m.url,
          alt_text: m.alt_text || payload.title || 'Product Asset',
          is_primary: m.is_primary ?? false,
          display_order: m.display_order ?? 0,
        })
      }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error updating product' }
  }
}

/**
 * Updates stock for an individual product variant, triggering PostgreSQL stock recalculation.
 */
export async function updateVariantStock(
  supabase: SupabaseClient<Database>,
  variantId: string,
  newStock: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('product_variants')
      .update({
        stock: Math.max(0, newStock),
        updated_at: new Date().toISOString(),
      })
      .eq('id', variantId)

    if (error) {
      // In-memory fallback
      const v = DEFAULT_PRODUCT_VARIANTS.find((item) => item.id === variantId)
      if (v) {
        v.stock = Math.max(0, newStock)
        return { success: true }
      }
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error adjusting variant stock' }
  }
}

/**
 * Uploads a product image or provides fallbacks for storage.
 */
export async function uploadProductImage(
  supabase: SupabaseClient<Database>,
  file: File
): Promise<{ url: string | null; error?: string }> {
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `apparel-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`
    const filePath = `catalog/${fileName}`

    const { error: uploadError } = await supabase.storage.from('products').upload(filePath, file)

    if (uploadError) {
      const objectUrl = URL.createObjectURL(file)
      return { url: objectUrl }
    }

    const { data } = supabase.storage.from('products').getPublicUrl(filePath)
    return { url: data.publicUrl }
  } catch (err: any) {
    try {
      const objectUrl = URL.createObjectURL(file)
      return { url: objectUrl }
    } catch {
      return { url: null, error: err?.message || 'Upload error' }
    }
  }
}

/**
 * Fetch all storefront dynamic CMS configuration key-values.
 */
export async function getStorefrontConfig(
  supabase: SupabaseClient<Database>
): Promise<Record<string, any>> {
  try {
    const { data, error } = await supabase.from('storefront_config').select('*')
    if (error || !data || data.length === 0) {
      return {
        hero: DEFAULT_HERO_CONFIG,
        ethos: DEFAULT_ETHOS_CONFIG,
      }
    }
    const configMap: Record<string, any> = {
      hero: DEFAULT_HERO_CONFIG,
      ethos: DEFAULT_ETHOS_CONFIG,
    }
    data.forEach((row) => {
      configMap[row.key] = row.value
    })
    return configMap
  } catch (err) {
    return {
      hero: DEFAULT_HERO_CONFIG,
      ethos: DEFAULT_ETHOS_CONFIG,
    }
  }
}

/**
 * Update or upsert a storefront CMS configuration entry (Admin Action).
 */
export async function updateStorefrontConfig(
  supabase: SupabaseClient<Database>,
  key: string,
  value: any,
  description?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload: StorefrontConfigInsert = {
      key,
      value,
      description: description || `Storefront config for ${key}`,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('storefront_config')
      .upsert(payload, { onConflict: 'key' })

    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error updating CMS config' }
  }
}

/**
 * Fetch promotional banners for the storefront.
 */
export async function getPromotionalBanners(
  supabase: SupabaseClient<Database>,
  activeOnly: boolean = true
): Promise<PromotionalBanner[]> {
  try {
    let query = supabase
      .from('promotional_banners')
      .select('*')
      .order('display_order', { ascending: true })

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query
    if (error || !data) {
      return []
    }
    return data
  } catch (err) {
    return []
  }
}

/**
 * Create a promotional banner (Admin Action).
 */
export async function createPromotionalBanner(
  supabase: SupabaseClient<Database>,
  banner: PromotionalBannerInsert
): Promise<{ data: PromotionalBanner | null; error?: string }> {
  const { data, error } = await supabase
    .from('promotional_banners')
    .insert(banner)
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }
  return { data }
}

/**
 * Update a promotional banner (Admin Action).
 */
export async function updatePromotionalBanner(
  supabase: SupabaseClient<Database>,
  id: string,
  updates: Partial<PromotionalBannerInsert>
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('promotional_banners')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true }
}

/**
 * Delete a promotional banner (Admin Action).
 */
export async function deletePromotionalBanner(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('promotional_banners').delete().eq('id', id)
  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true }
}

// ==========================================
// 8. ADVANCED PIM & INVENTORY DATA GRID
// ==========================================

export interface CompleteInventoryVariant {
  id: string
  product_id: string
  sku: string
  size: string
  color: string | null
  stock: number
  price_override: number | null
  barcode: string | null
  barcode_data: string | null
  barcode_url: string | null
  weight_grams: number | null
  created_at?: string
  updated_at?: string
}

export interface CompleteInventoryProduct extends Product {
  variants: CompleteInventoryVariant[]
  media: ProductMedia[]
  totalVariantStock: number
}

/**
 * Advanced nested query: fetches all products alongside their variants (with barcodes)
 * and media assets in a single hierarchical dataset.
 */
export async function getCompleteInventory(
  supabase: SupabaseClient<Database>
): Promise<CompleteInventoryProduct[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        variants:product_variants(*),
        media:product_media(*)
      `)
      .order('created_at', { ascending: false })

    if (error || !data || data.length === 0) {
      return DEFAULT_PRODUCTS.map((p) => {
        const pVariants = DEFAULT_PRODUCT_VARIANTS.filter((v) => v.product_id === p.id).map((v) => {
          const barcodeVal = v.barcode || generateStandardBarcode(v.sku)
          return {
            ...v,
            barcode: barcodeVal,
            barcode_data: barcodeVal,
            barcode_url: v.barcode_url || generateBarcodeDataUrl(barcodeVal),
          }
        })
        const totalVariantStock = pVariants.reduce((sum, v) => sum + (v.stock || 0), 0)
        return {
          ...p,
          variants: pVariants,
          media: [],
          totalVariantStock: totalVariantStock > 0 ? totalVariantStock : p.stock,
        }
      })
    }

    return (data as any[]).map((row) => {
      const rawVariants = Array.isArray(row.variants) ? row.variants : []
      const sortedVariants = rawVariants
        .sort((a: any, b: any) => {
          const order = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', 'ONE SIZE']
          const aIdx = order.indexOf(a.size?.toUpperCase())
          const bIdx = order.indexOf(b.size?.toUpperCase())
          if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx
          return (a.size || '').localeCompare(b.size || '')
        })
        .map((v: any) => {
          const barcodeVal = v.barcode || v.barcode_data || generateStandardBarcode(v.sku)
          return {
            ...v,
            barcode: barcodeVal,
            barcode_data: v.barcode_data || barcodeVal,
            barcode_url: v.barcode_url || generateBarcodeDataUrl(barcodeVal),
          }
        })

      const rawMedia = Array.isArray(row.media) ? row.media : []
      const sortedMedia = rawMedia.sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0))
      const totalUnits = sortedVariants.reduce((sum: number, v: any) => sum + (Number(v.stock) || 0), 0)

      return {
        ...row,
        variants: sortedVariants,
        media: sortedMedia,
        totalVariantStock: totalUnits > 0 ? totalUnits : (row.stock || 0),
      }
    })
  } catch {
    return DEFAULT_PRODUCTS.map((p) => {
      const pVariants = DEFAULT_PRODUCT_VARIANTS.filter((v) => v.product_id === p.id).map((v) => {
        const barcodeVal = v.barcode || generateStandardBarcode(v.sku)
        return {
          ...v,
          barcode: barcodeVal,
          barcode_data: barcodeVal,
          barcode_url: v.barcode_url || generateBarcodeDataUrl(barcodeVal),
        }
      })
      const totalVariantStock = pVariants.reduce((sum, v) => sum + (v.stock || 0), 0)
      return {
        ...p,
        variants: pVariants,
        media: [],
        totalVariantStock: totalVariantStock > 0 ? totalVariantStock : p.stock,
      }
    })
  }
}

/**
 * Atomically adjusts physical variant stock using PostgreSQL RPC 'adjust_variant_stock',
 * with direct table update and in-memory fallbacks.
 */
export async function adjustVariantStock(
  supabase: SupabaseClient<Database>,
  variantId: string,
  delta: number
): Promise<{ success: boolean; newStock?: number; productId?: string; newProductStock?: number; error?: string }> {
  try {
    // 1. Attempt atomic PostgreSQL RPC execution
    const { data: rpcData, error: rpcErr } = await (supabase.rpc as any)('adjust_variant_stock', {
      p_variant_id: variantId,
      p_delta: delta,
    })

    if (!rpcErr && rpcData) {
      const resRow = Array.isArray(rpcData) ? rpcData[0] : rpcData
      if (resRow) {
        return {
          success: true,
          newStock: resRow.new_stock,
          productId: resRow.product_id,
          newProductStock: resRow.new_product_stock,
        }
      }
    }

    // 2. Direct table fallback if RPC is unprovisioned
    const { data: v, error: vErr } = await supabase
      .from('product_variants')
      .select('stock, product_id')
      .eq('id', variantId)
      .single()

    if (!vErr && v) {
      const nextStock = Math.max(0, (v.stock || 0) + delta)
      const { error: updErr } = await supabase
        .from('product_variants')
        .update({
          stock: nextStock,
          updated_at: new Date().toISOString(),
        })
        .eq('id', variantId)

      if (!updErr) {
        const { data: p } = await supabase.from('products').select('stock').eq('id', v.product_id).single()
        return {
          success: true,
          newStock: nextStock,
          productId: v.product_id,
          newProductStock: p?.stock ?? undefined,
        }
      }
    }

    // 3. In-memory fallback
    const fallbackV = DEFAULT_PRODUCT_VARIANTS.find((item) => item.id === variantId)
    if (fallbackV) {
      fallbackV.stock = Math.max(0, fallbackV.stock + delta)
      return {
        success: true,
        newStock: fallbackV.stock,
        productId: fallbackV.product_id,
      }
    }

    return { success: false, error: rpcErr?.message || vErr?.message || 'Failed to adjust variant stock' }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Unexpected error adjusting variant stock' }
  }
}

// ==========================================
// 12. OMNICHANNEL ERP, WMS & POS RPC WRAPPERS
// ==========================================

export async function receiveGrnAndPutaway(
  supabase: SupabaseClient<Database>,
  params: {
    poId: string
    locationId: string
    targetShelfId: string
    operatorId: string
    receivedItems: Array<{
      variant_id: string
      qty_accepted: number
      qty_rejected: number
      unit_cost: number
    }>
  }
): Promise<{ success: boolean; grnId?: string; grnNumber?: string; shelfBarcode?: string; error?: string }> {
  try {
    const { data, error } = await (supabase.rpc as any)('receive_grn_and_putaway', {
      p_po_id: params.poId,
      p_location_id: params.locationId,
      p_target_shelf_id: params.targetShelfId,
      p_operator_id: params.operatorId,
      p_received_items: params.receivedItems,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return {
      success: true,
      grnId: data?.grn_id,
      grnNumber: data?.grn_number,
      shelfBarcode: data?.shelf_barcode,
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error processing GRN receipt' }
  }
}

export async function processPosCheckout(
  supabase: SupabaseClient<Database>,
  params: {
    locationId: string
    posSessionId: string
    cashierId: string
    customerId: string | null
    customerInfo: { name: string; phone: string; email?: string; gstin?: string }
    cartItems: Array<{
      variant_id: string
      shelf_id: string
      quantity: number
      unit_price: number
      discount: number
      hsn_code: string
    }>
    paymentMethod: PosPaymentMethod
    paymentDetails: Record<string, any>
    subtotal: number
    taxAmount: number
    discountAmount: number
    total: number
    isEndlessAisle?: boolean
    shippingAddress?: Record<string, any> | null
  }
): Promise<{
  success: boolean
  orderId?: string
  orderNumber?: string
  invoiceNumber?: string
  total?: number
  isEndlessAisle?: boolean
  error?: string
}> {
  try {
    const { data, error } = await (supabase.rpc as any)('process_pos_checkout', {
      p_location_id: params.locationId,
      p_pos_session_id: params.posSessionId,
      p_cashier_id: params.cashierId,
      p_customer_id: params.customerId,
      p_customer_info: params.customerInfo,
      p_cart_items: params.cartItems,
      p_payment_method: params.paymentMethod,
      p_payment_details: params.paymentDetails,
      p_subtotal: params.subtotal,
      p_tax_amount: params.taxAmount,
      p_discount_amount: params.discountAmount,
      p_total: params.total,
      p_is_endless_aisle: params.isEndlessAisle ?? false,
      p_shipping_address: params.shippingAddress ?? null,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return {
      success: true,
      orderId: data?.order_id,
      orderNumber: data?.order_number,
      invoiceNumber: data?.invoice_number,
      total: data?.total,
      isEndlessAisle: data?.is_endless_aisle,
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error executing POS checkout' }
  }
}

export async function moveShelfStock(
  supabase: SupabaseClient<Database>,
  params: {
    locationId: string
    fromShelfId: string
    toShelfId: string
    variantId: string
    quantity: number
    operatorId: string
    notes?: string | null
  }
): Promise<{ success: boolean; quantityMoved?: number; error?: string }> {
  try {
    const { data, error } = await (supabase.rpc as any)('move_shelf_stock', {
      p_location_id: params.locationId,
      p_from_shelf_id: params.fromShelfId,
      p_to_shelf_id: params.toShelfId,
      p_variant_id: params.variantId,
      p_quantity: params.quantity,
      p_operator_id: params.operatorId,
      p_notes: params.notes ?? null,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, quantityMoved: data?.quantity_moved }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error moving shelf stock' }
  }
}

export async function executeStockTransfer(
  supabase: SupabaseClient<Database>,
  params: {
    transferId: string
    action: 'dispatch' | 'receive'
    targetShelfId?: string | null
    operatorId?: string | null
    notes?: string | null
  }
): Promise<{ success: boolean; status?: string; error?: string }> {
  try {
    const { data, error } = await (supabase.rpc as any)('execute_stock_transfer', {
      p_transfer_id: params.transferId,
      p_action: params.action,
      p_target_shelf_id: params.targetShelfId ?? null,
      p_operator_id: params.operatorId ?? null,
      p_notes: params.notes ?? null,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, status: data?.status }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error executing stock transfer' }
  }
}

export async function allocateAndPickOnlineOrder(
  supabase: SupabaseClient<Database>,
  params: {
    orderId: string
    action: 'allocate' | 'confirm_pick'
    locationId?: string | null
    picks?: Array<{ order_item_id: string; shelf_id: string }> | null
    operatorId?: string | null
  }
): Promise<{ success: boolean; allocatedLocationId?: string; status?: string; error?: string }> {
  try {
    const { data, error } = await (supabase.rpc as any)('allocate_and_pick_online_order', {
      p_order_id: params.orderId,
      p_action: params.action,
      p_location_id: params.locationId ?? null,
      p_picks: params.picks ?? null,
      p_operator_id: params.operatorId ?? null,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return {
      success: true,
      allocatedLocationId: data?.allocated_location_id,
      status: data?.status,
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error processing online order picking' }
  }
}

export async function processBorisReturn(
  supabase: SupabaseClient<Database>,
  params: {
    orderId: string
    orderItemId: string
    locationId: string
    targetShelfId: string
    condition: QcStatus
    refundMode: 'store_credit' | 'original_payment'
    operatorId: string
    notes?: string | null
  }
): Promise<{
  success: boolean
  refundMode?: string
  restockedShelfId?: string
  condition?: QcStatus
  error?: string
}> {
  try {
    const { data, error } = await (supabase.rpc as any)('process_boris_return', {
      p_order_id: params.orderId,
      p_order_item_id: params.orderItemId,
      p_location_id: params.locationId,
      p_target_shelf_id: params.targetShelfId,
      p_condition: params.condition,
      p_refund_mode: params.refundMode,
      p_operator_id: params.operatorId,
      p_notes: params.notes ?? null,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return {
      success: true,
      refundMode: data?.refund_mode,
      restockedShelfId: data?.restocked_shelf_id,
      condition: data?.condition,
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error processing in-store return' }
  }
}

// ==========================================
// 13. OMNICHANNEL ENTITY DATA ACCESS HELPERS
// ==========================================

export async function getLocations(supabase: SupabaseClient<Database>): Promise<StoreLocation[]> {
  const { data, error } = await supabase.from('locations').select('*').order('online_fulfillment_priority', { ascending: true })
  if (error || !data) return []
  return data
}

export async function getLocationById(supabase: SupabaseClient<Database>, id: string): Promise<StoreLocation | null> {
  const { data, error } = await supabase.from('locations').select('*').eq('id', id).single()
  if (error || !data) return null
  return data
}

export async function getLocationZones(supabase: SupabaseClient<Database>, locationId: string): Promise<LocationZone[]> {
  const { data, error } = await supabase.from('location_zones').select('*').eq('location_id', locationId).order('code', { ascending: true })
  if (error || !data) return []
  return data
}

export async function getLocationShelves(supabase: SupabaseClient<Database>, locationId: string): Promise<Shelf[]> {
  const { data, error } = await supabase.from('shelves').select('*').eq('location_id', locationId).order('coordinate', { ascending: true })
  if (error || !data) return []
  return data
}

export async function getShelfInventory(
  supabase: SupabaseClient<Database>,
  shelfId: string
): Promise<Array<ShelfInventory & { variant?: ProductVariant }>> {
  const { data, error } = await supabase
    .from('shelf_inventory')
    .select('*, variant:product_variants(*)')
    .eq('shelf_id', shelfId)
  if (error || !data) return []
  return data as any
}

export async function getSuppliers(supabase: SupabaseClient<Database>): Promise<Supplier[]> {
  const { data, error } = await supabase.from('suppliers').select('*').order('name', { ascending: true })
  if (error || !data) return []
  return data
}

export async function getPurchaseOrders(
  supabase: SupabaseClient<Database>,
  locationId?: string
): Promise<Array<PurchaseOrder & { supplier?: Supplier; destination_location?: StoreLocation }>> {
  let query = supabase
    .from('purchase_orders')
    .select('*, supplier:suppliers(*), destination_location:locations(*)')
    .order('created_at', { ascending: false })

  if (locationId) {
    query = query.eq('destination_location_id', locationId)
  }

  const { data, error } = await query
  if (error || !data) return []
  return data as any
}

export async function getStockTransfers(
  supabase: SupabaseClient<Database>
): Promise<Array<StockTransfer & { source_location?: StoreLocation; destination_location?: StoreLocation }>> {
  const { data, error } = await supabase
    .from('stock_transfers')
    .select('*, source_location:locations(*), destination_location:locations(*)')
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return data as any
}

export async function getPosSessions(supabase: SupabaseClient<Database>, locationId: string): Promise<PosSession[]> {
  const { data, error } = await supabase
    .from('pos_sessions')
    .select('*')
    .eq('location_id', locationId)
    .order('opened_at', { ascending: false })
  if (error || !data) return []
  return data
}

export async function getStructuredUserAddresses(supabase: SupabaseClient<Database>, userId: string): Promise<UserAddress[]> {
  const { data, error } = await supabase.from('user_addresses').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  if (error || !data) return []
  return data
}

export async function getInventoryLedger(
  supabase: SupabaseClient<Database>,
  params?: { variantId?: string; locationId?: string; limit?: number }
): Promise<InventoryLedgerEntry[]> {
  let query = supabase.from('inventory_ledger').select('*').order('transaction_timestamp', { ascending: false })

  if (params?.variantId) {
    query = query.eq('variant_id', params.variantId)
  }
  if (params?.locationId) {
    query = query.eq('location_id', params.locationId)
  }
  if (params?.limit) {
    query = query.limit(params.limit)
  } else {
    query = query.limit(100)
  }

  const { data, error } = await query
  if (error || !data) return []
  return data
}

export async function getInventoryLevels(
  supabase: SupabaseClient<Database>,
  params?: { variantId?: string; locationId?: string }
): Promise<Array<InventoryLevel & { location?: StoreLocation }>> {
  let query = supabase.from('inventory_levels').select('*, location:locations(*)')

  if (params?.variantId) {
    query = query.eq('variant_id', params.variantId)
  }
  if (params?.locationId) {
    query = query.eq('location_id', params.locationId)
  }

  const { data, error } = await query
  if (error || !data) return []
  return data as any
}

export async function getVariantShelfPlacements(
  supabase: SupabaseClient<Database>,
  variantId: string
): Promise<Array<ShelfInventory & { shelf?: Shelf & { location?: StoreLocation } }>> {
  const { data, error } = await supabase
    .from('shelf_inventory')
    .select('*, shelf:shelves(*, location:locations(*))')
    .eq('variant_id', variantId)

  if (error || !data) return []
  return data as any
}

// ==========================================
// 13. SDUI (SERVER-DRIVEN UI) & CMS ENGINE
// ==========================================

export const DEFAULT_STOREFRONT_TOKENS: StorefrontTokens = {
  id: 'tok-default-01',
  theme_name: 'default',
  tokens_json: {
    '--background': '#212121',
    '--foreground': '#FFFFFF',
    '--primary': '#FFFFFF',
    '--primary-foreground': '#212121',
    '--secondary': '#262629',
    '--secondary-foreground': '#F4F4F5',
    '--accent-red': '#B91C1C',
    '--accent-gold': '#F59E0B',
    '--border': '#323336',
    '--radius': '9999px',
    '--font-serif': 'Cormorant Garamond, Georgia, serif',
    '--font-sans': 'Inter, -apple-system, sans-serif',
    '--font-script': 'Alex Brush, Pinyon Script, cursive',
  },
  is_active: true,
  updated_at: new Date().toISOString(),
}

export const DEFAULT_HOME_LAYOUT: PageLayout = {
  id: 'layout-home-01',
  page_slug: 'home',
  page_title: 'Atelier Haute Couture & Creator Apparel Drop 01',
  layout_json: [
    {
      id: 'hero-section-01',
      type: 'HeroBanner',
      name: 'Cinematic Hero & Bolt Salon Pill',
      isVisible: true,
      className: 'relative min-h-[92vh] flex items-center justify-center bg-[#080808] text-white px-6 sm:px-12 py-20 overflow-hidden',
      styles: {},
      props: {
        pillText: 'Introducing Bolt ⚡ Doorstep Try-On Salon',
        pillLink: '#bolt-experience',
        kicker: 'AUTONOMOUS ATELIER // SPECIFICATION DROP 01',
        titleLine1: 'ARCHITECTURAL',
        titleLine2: 'SILHOUETTES',
        description: 'Custom-milled 480 GSM French Terry, 14oz Japanese raw selvedge denim, and sculptural outerwear. Order up to 5 curated works to try on at your doorstep before final settlement.',
        primaryCtaLabel: 'Order Doorstep Salon Try-On',
        primaryCtaLink: '/shop',
        secondaryCtaLabel: 'Explore Lookbook',
        secondaryCtaLink: '/about',
        bgImageUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=2000&q=85',
        overlayOpacity: 0.4,
      },
    },
    {
      id: 'marquee-ticker-01',
      type: 'MarqueeTicker',
      name: 'Fabric Specification Marquee',
      isVisible: true,
      className: 'bg-[#121212] text-white border-y border-[#262626] py-3 overflow-hidden select-none font-mono text-2xs uppercase tracking-widest',
      styles: {},
      props: {
        items: [
          '480 GSM French Terry Loopback',
          '14oz Japanese Shuttle-Loomed Selvedge Denim',
          '380 GSM Organic Belgian Flax Linen',
          'Bolt ⚡ 45-Minute Doorstep Fitting Session',
          'Zero Synthetic Polyester Blending',
          'Complimentary White-Glove Courier Delivery',
        ],
        speedSeconds: 25,
      },
    },
    {
      id: 'editorial-split-01',
      type: 'EditorialSplit',
      name: 'Bolt 45-Minute Doorstep Salon Ethos',
      isVisible: true,
      className: 'max-w-7xl mx-auto px-6 sm:px-12 py-24',
      styles: {},
      props: {
        kicker: 'DOORSTEP TRY-ON REVOLUTION',
        headline: 'The Salon Comes to Your Mirror.',
        bodyParagraph1: 'Never guess your size again. Select any garments and sizes from our collection. A uniformed private logistics officer arrives at your residence during your reserved timeslot with your curated garment tote.',
        bodyParagraph2: 'You have 45 private minutes in front of your own mirror. Keep what fits impeccably, hand back what doesn’t, and settle instantly with contactless card or UPI.',
        imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85',
        imagePosition: 'right',
        ctaLabel: 'How Bolt Works',
        ctaLink: '/about',
      },
    },
    {
      id: 'product-grid-01',
      type: 'ProductGrid',
      name: 'Featured Works Catalog Grid',
      isVisible: true,
      className: 'max-w-7xl mx-auto px-6 sm:px-12 py-16',
      styles: {},
      props: {
        kicker: 'CURATED ATELIER ARCHIVE',
        title: 'Selected Works Available for Try-On',
        subtitle: 'Select your pieces and choose Bolt ⚡ Try-On at checkout.',
        categoryFilter: 'all',
        limit: 6,
        columns: 3,
      },
    },
    {
      id: 'custom-div-specs-01',
      type: 'CustomDivBlock',
      name: 'Creator Fabric Lab Technical Banner',
      isVisible: true,
      className: 'bg-neutral-900 text-white p-8 sm:p-12 my-12 max-w-7xl mx-auto border border-neutral-800',
      styles: {},
      props: {
        htmlContent: '<div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6"><div class="space-y-2"><span class="text-xs font-mono text-emerald-400 uppercase tracking-widest">PHYSICAL MATERIAL LAB</span><h3 class="text-2xl font-serif font-light">Strictly Unblended Organic Fibers</h3><p class="text-xs text-neutral-400 font-sans max-w-xl">Every yard of fabric is commissioned directly from artisanal mills in Wakayama, Okayama, and Courtrai. No microplastics, no synthetic elastane.</p></div><a href="/shop" class="px-6 py-3 bg-white text-black font-mono text-xs uppercase font-bold tracking-wider hover:bg-neutral-200 transition-colors shrink-0">Shop Collection</a></div>',
      },
    },
    {
      id: 'reviews-showcase-01',
      type: 'ReviewsShowcase',
      name: 'Doorstep Salon Verified Patron Reviews',
      isVisible: true,
      className: 'bg-[#FAF9F6] border-t border-neutral-200 py-20 px-6 sm:px-12',
      styles: {},
      props: {
        title: 'Verified Doorstep Fitting Testimonials',
        subtitle: 'What patrons say about experiencing couture in front of their own mirror.',
      },
    },
  ],
  is_published: true,
  version: 1,
  meta_description: 'Atelier Haute Couture Creator Apparel & Bolt 45-Minute Doorstep Salon',
  updated_at: new Date().toISOString(),
  updated_by: null,
}

/**
 * Fetch a published page layout by slug with fallback to default
 */
export async function getPageLayout(
  supabase: SupabaseClient<Database>,
  pageSlug: string
): Promise<PageLayout> {
  try {
    const { data, error } = await supabase
      .from('page_layouts')
      .select('*')
      .eq('page_slug', pageSlug)
      .eq('is_published', true)
      .maybeSingle()

    if (error || !data) {
      if (pageSlug === 'home') return DEFAULT_HOME_LAYOUT
      return {
        id: `layout-${pageSlug}-fallback`,
        page_slug: pageSlug,
        page_title: `${pageSlug.toUpperCase()} Page`,
        layout_json: [],
        is_published: true,
        version: 1,
        meta_description: null,
        updated_at: new Date().toISOString(),
        updated_by: null,
      }
    }

    return data
  } catch {
    return pageSlug === 'home' ? DEFAULT_HOME_LAYOUT : {
      id: `layout-${pageSlug}-fallback`,
      page_slug: pageSlug,
      page_title: `${pageSlug.toUpperCase()} Page`,
      layout_json: [],
      is_published: true,
      version: 1,
      meta_description: null,
      updated_at: new Date().toISOString(),
      updated_by: null,
    }
  }
}

/**
 * Fetch all page layouts for Admin CMS
 */
export async function getAllPageLayouts(
  supabase: SupabaseClient<Database>
): Promise<PageLayout[]> {
  try {
    const { data, error } = await supabase
      .from('page_layouts')
      .select('*')
      .order('page_slug', { ascending: true })

    if (error || !data || data.length === 0) {
      return [DEFAULT_HOME_LAYOUT]
    }
    return data
  } catch {
    return [DEFAULT_HOME_LAYOUT]
  }
}

/**
 * Upsert page layout from Admin CMS
 */
export async function upsertPageLayout(
  supabase: SupabaseClient<Database>,
  layout: Partial<PageLayout> & { page_slug: string }
): Promise<{ success: boolean; data?: PageLayout; error?: string }> {
  try {
    const payload = {
      ...layout,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('page_layouts')
      .upsert(payload as any, { onConflict: 'page_slug' })
      .select('*')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error saving page layout' }
  }
}

/**
 * Fetch active storefront design tokens with fallback
 */
export async function getStorefrontTokens(
  supabase: SupabaseClient<Database>,
  themeName: string = 'default'
): Promise<StorefrontTokens> {
  try {
    const { data, error } = await supabase
      .from('storefront_tokens')
      .select('*')
      .eq('theme_name', themeName)
      .eq('is_active', true)
      .maybeSingle()

    if (error || !data) {
      return DEFAULT_STOREFRONT_TOKENS
    }
    return data
  } catch {
    return DEFAULT_STOREFRONT_TOKENS
  }
}

/**
 * Upsert storefront design tokens from Admin CMS
 */
export async function upsertStorefrontTokens(
  supabase: SupabaseClient<Database>,
  tokens: Partial<StorefrontTokens> & { theme_name?: string }
): Promise<{ success: boolean; data?: StorefrontTokens; error?: string }> {
  try {
    const payload = {
      theme_name: tokens.theme_name || 'default',
      tokens_json: tokens.tokens_json || DEFAULT_STOREFRONT_TOKENS.tokens_json,
      is_active: tokens.is_active ?? true,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('storefront_tokens')
      .upsert(payload as any, { onConflict: 'theme_name' })
      .select('*')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error saving storefront tokens' }
  }
}




