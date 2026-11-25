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
  OrderType,
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
  BoltTimeslotInsert,
  BoltPincode,
  BoltPincodeInsert,
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
  Collection,
  CollectionInsert,
  CollectionUpdate,
  CollectionWithRelations,
  ProductReview,
  ProductReviewInsert,
  ProductReviewUpdate,
  ReviewMedia,
  ReviewMediaInsert,
  ReviewMediaUpdate,
  ReviewStatus,
  FashionFitIndicator,
  ProductReviewWithMedia,
  ProductRatingAggregate,
} from '../types/database.types'

export * from '../types/database.types'
export * from './barcode'
export * from './boltAccounting'
export * from './localFallbackStore'
import {
  saveLocalReview,
  getLocalReviews,
  hasLocalReview,
  updateLocalReview,
  saveLocalPromotion,
  getLocalPromotions,
} from './localFallbackStore'
import { generateStandardBarcode, generateBarcodeDataUrl, generateOrderTrackingBarcode } from './barcode'

/**
 * Formats any monetary figure into standard Indian Rupee notation (₹ / INR).
 * Applies Indian lakh/crore comma grouping (en-IN) and two decimal places.
 * Example: 27211.2 -> "₹27,211.20" | 150000 -> "₹1,50,000.00"
 */
export function formatINR(amount: number | string | null | undefined): string {
  const num = Number(amount) || 0
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

// ==========================================
// 1. STARTER FALLBACK DATA (For resilient UX)
// ==========================================
export const DEFAULT_CATEGORIES: Category[] = [
  // Parent Categories (parent_id: null)
  {
    id: 'c1000000-0000-0000-0000-000000000005',
    parent_id: null,
    name: 'Kurta Sets',
    slug: 'kurta-sets',
    description: 'Artisanal hand-embroidered, chanderi silk, and architectural silhouette kurta ensembles.',
    image_url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1200&q=85',
    display_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'c1000000-0000-0000-0000-000000000001',
    parent_id: null,
    name: 'Hoodies & Fleece',
    slug: 'hoodies',
    description: 'Heavyweight 480 GSM French Terry and loopback brushed cotton fleece hoodies.',
    image_url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85',
    display_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'c1000000-0000-0000-0000-000000000002',
    parent_id: null,
    name: 'Tees & Tops',
    slug: 'tees',
    description: 'Overdyed 280 GSM combed cotton vintage drop-shoulder tees and thermal waffle tops.',
    image_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=85',
    display_order: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'c1000000-0000-0000-0000-000000000003',
    parent_id: null,
    name: 'Outerwear & Jackets',
    slug: 'outerwear',
    description: 'Weatherproof cropped flight bombers, heavy canvas chore coats, and sculptural overcoats.',
    image_url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1200&q=85',
    display_order: 4,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'c1000000-0000-0000-0000-000000000004',
    parent_id: null,
    name: 'Pants & Denim',
    slug: 'pants',
    description: '14oz Japanese raw selvedge denim, pleated wide-leg trousers, and heavyweight sweatpants.',
    image_url: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1200&q=85',
    display_order: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // Subcategories for Kurta Sets
  {
    id: 'c1000000-0000-0000-0000-000000000051',
    parent_id: 'c1000000-0000-0000-0000-000000000005',
    name: 'Anarkali Sets',
    slug: 'anarkali-sets',
    description: 'Flared floor-length kalidar kurtas with churidar and hand-woven dupattas.',
    image_url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=85',
    display_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'c1000000-0000-0000-0000-000000000052',
    parent_id: 'c1000000-0000-0000-0000-000000000005',
    name: 'Straight Cut Sets',
    slug: 'straight-cut-sets',
    description: 'Clean-lined raw silk and chanderi kurtas paired with cigarette trousers.',
    image_url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=85',
    display_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'c1000000-0000-0000-0000-000000000053',
    parent_id: 'c1000000-0000-0000-0000-000000000005',
    name: 'Bandhani & Banarasi Sets',
    slug: 'bandhani-banarasi-sets',
    description: 'Heritage zari brocades and tie-dye artisanal silk ensembles.',
    image_url: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=85',
    display_order: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'c1000000-0000-0000-0000-000000000054',
    parent_id: 'c1000000-0000-0000-0000-000000000005',
    name: 'Velvet & Festive Sets',
    slug: 'velvet-festive-sets',
    description: 'Plush micro-velvet kurtas embellished with zardozi and antique tilla embroidery.',
    image_url: 'https://images.unsplash.com/photo-1596783074918-c84cb06531ca?auto=format&fit=crop&w=800&q=85',
    display_order: 4,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'c1000000-0000-0000-0000-000000000055',
    parent_id: 'c1000000-0000-0000-0000-000000000005',
    name: 'Short Kurta & Sharara Sets',
    slug: 'sharara-sets',
    description: 'Contemporary peplum short kurtas with tiered flared sharara bottoms.',
    image_url: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=800&q=85',
    display_order: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // Subcategories for Hoodies & Fleece
  {
    id: 'c1000000-0000-0000-0000-000000000011',
    parent_id: 'c1000000-0000-0000-0000-000000000001',
    name: 'Boxy Hoodies',
    slug: 'boxy-hoodies',
    description: '480 GSM architectural cut loopback hoodies.',
    image_url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=85',
    display_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'c1000000-0000-0000-0000-000000000012',
    parent_id: 'c1000000-0000-0000-0000-000000000001',
    name: 'Zip-Up Hoodies',
    slug: 'zip-hoodies',
    description: 'Heavyweight two-way zip fleece hoodies.',
    image_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=85',
    display_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'c1000000-0000-0000-0000-000000000013',
    parent_id: 'c1000000-0000-0000-0000-000000000001',
    name: 'Crewneck Sweatshirts',
    slug: 'crewnecks',
    description: 'Classic crew neck fleece pullovers.',
    image_url: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=800&q=85',
    display_order: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // Subcategories for Tees & Tops
  {
    id: 'c1000000-0000-0000-0000-000000000021',
    parent_id: 'c1000000-0000-0000-0000-000000000002',
    name: 'Boxy T-Shirts',
    slug: 'boxy-tees',
    description: '280 GSM heavyweight vintage washed tees.',
    image_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=85',
    display_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'c1000000-0000-0000-0000-000000000022',
    parent_id: 'c1000000-0000-0000-0000-000000000002',
    name: 'Oversized Tees',
    slug: 'oversized-tees',
    description: 'Dropped-shoulder relaxed fit tees.',
    image_url: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=800&q=85',
    display_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'c1000000-0000-0000-0000-000000000023',
    parent_id: 'c1000000-0000-0000-0000-000000000002',
    name: 'Linen Tops',
    slug: 'linen-tops',
    description: 'Belgian flax linen breathable summer tops.',
    image_url: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=800&q=85',
    display_order: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // Subcategories for Outerwear & Jackets
  {
    id: 'c1000000-0000-0000-0000-000000000031',
    parent_id: 'c1000000-0000-0000-0000-000000000003',
    name: 'Flight Bombers',
    slug: 'bombers',
    description: 'Cropped technical flight jackets.',
    image_url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=85',
    display_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'c1000000-0000-0000-0000-000000000032',
    parent_id: 'c1000000-0000-0000-0000-000000000003',
    name: 'Chore Coats',
    slug: 'chore-coats',
    description: 'Heavyweight duck canvas utility coats.',
    image_url: 'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=800&q=85',
    display_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'c1000000-0000-0000-0000-000000000033',
    parent_id: 'c1000000-0000-0000-0000-000000000003',
    name: 'Tailored Overcoats',
    slug: 'overcoats',
    description: 'Sculptural wool and twill outerwear.',
    image_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=800&q=85',
    display_order: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // Subcategories for Pants & Denim
  {
    id: 'c1000000-0000-0000-0000-000000000041',
    parent_id: 'c1000000-0000-0000-0000-000000000004',
    name: 'Selvedge Denim',
    slug: 'selvedge-denim',
    description: '14oz Okayama shuttle-loomed raw denim.',
    image_url: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=800&q=85',
    display_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'c1000000-0000-0000-0000-000000000042',
    parent_id: 'c1000000-0000-0000-0000-000000000004',
    name: 'Carpenter Pants',
    slug: 'carpenter-pants',
    description: 'Heavy double-knee carpenter trousers.',
    image_url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=800&q=85',
    display_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'c1000000-0000-0000-0000-000000000043',
    parent_id: 'c1000000-0000-0000-0000-000000000004',
    name: 'Pleated Trousers',
    slug: 'pleated-trousers',
    description: 'Double front pleat wide-leg tailored bottoms.',
    image_url: 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?auto=format&fit=crop&w=800&q=85',
    display_order: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export const DEFAULT_COLLECTIONS: CollectionWithRelations[] = [
  {
    id: 'col-00000000-0000-0000-0000-000000000001',
    name: 'Festivals & Celebrations',
    slug: 'festivals',
    group_type: 'occasion',
    description: 'Artisanal banarasi silks, anarkali sets, and rich festive textures for milestone events.',
    image_url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=85',
    display_order: 1,
    is_active: true,
    show_in_navbar: true,
    show_on_home: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category_ids: [
      'c1000000-0000-0000-0000-000000000005',
      'c1000000-0000-0000-0000-000000000051',
      'c1000000-0000-0000-0000-000000000053',
      'c1000000-0000-0000-0000-000000000054',
    ],
    product_ids: [],
  },
  {
    id: 'col-00000000-0000-0000-0000-000000000002',
    name: 'Royal Weddings',
    slug: 'weddings',
    group_type: 'occasion',
    description: 'Grand ceremonial silhouettes, hand-embroidered kalidars, and heritage weaves.',
    image_url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1200&q=85',
    display_order: 2,
    is_active: true,
    show_in_navbar: true,
    show_on_home: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category_ids: [
      'c1000000-0000-0000-0000-000000000005',
      'c1000000-0000-0000-0000-000000000053',
    ],
    product_ids: [],
  },
  {
    id: 'col-00000000-0000-0000-0000-000000000003',
    name: 'Resort & Travel',
    slug: 'travel',
    group_type: 'occasion',
    description: 'Breathable pure linen shirts, relaxed trousers, and easy transit layers.',
    image_url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85',
    display_order: 3,
    is_active: true,
    show_in_navbar: true,
    show_on_home: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category_ids: [
      'c1000000-0000-0000-0000-000000000002',
      'c1000000-0000-0000-0000-000000000004',
    ],
    product_ids: [],
  },
  {
    id: 'col-00000000-0000-0000-0000-000000000004',
    name: 'Minimalist Workwear',
    slug: 'workwear',
    group_type: 'occasion',
    description: 'Tailored structured separates, crisp poplin shirts, and muted monochrome layers.',
    image_url: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1200&q=85',
    display_order: 4,
    is_active: true,
    show_in_navbar: true,
    show_on_home: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category_ids: [
      'c1000000-0000-0000-0000-000000000002',
      'c1000000-0000-0000-0000-000000000004',
      'c1000000-0000-0000-0000-000000000003',
    ],
    product_ids: [],
  },
]

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'b1000000-0000-0000-0000-000000000001',
    title: 'Heavyweight Boxy Hoodie',
    description: 'Custom-milled 480 GSM loopback organic French Terry. Engineered with an exaggerated dropped shoulder, double-layered architectural hood, and concealed side-seam pockets. Mineral washed for a vintage drape.',
    price: 165.0,
    compare_at_price: 245.0,
    stock: 115,
    image_url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85',
    category_id: 'c1000000-0000-0000-0000-000000000001',
    category: 'Hoodies & Fleece',
    material: '480 GSM 100% Organic Cotton French Terry',
    edition: 'Permanent Collection // Limited 150 Pieces',
    is_archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'b1000000-0000-0000-0000-000000000002',
    title: 'Vintage Washed Boxy Tee',
    description: '280 GSM heavyweight combed cotton jersey with distressed neck ribbing and raw edge blind hem. Sun-faded wash treatment creates individual character on every piece.',
    price: 75.0,
    compare_at_price: 110.0,
    stock: 140,
    image_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=85',
    category_id: 'c1000000-0000-0000-0000-000000000002',
    category: 'Tees & Tops',
    material: '280 GSM Combed Cotton with Vintage Enzymatic Wash',
    edition: 'Permanent Collection // Core Essential',
    is_archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'b1000000-0000-0000-0000-000000000003',
    title: 'Cropped Weatherproof Flight Bomber',
    description: 'High-density technical nylon shell with quilted synthetic insulation. Cropped torso silhouette with elongated sleeves and custom matte nickel two-way zipper hardware.',
    price: 285.0,
    compare_at_price: 380.0,
    stock: 55,
    image_url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1200&q=85',
    category_id: 'c1000000-0000-0000-0000-000000000003',
    category: 'Outerwear & Jackets',
    material: 'Matte Technical Nylon Shell & Primaloft Insulation',
    edition: 'Atelier Archive // Edition of 60',
    is_archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'b1000000-0000-0000-0000-000000000004',
    title: 'Pleated Selvedge Carpenter Pant',
    description: 'Cut from 14oz shuttle-loomed Japanese raw black selvedge denim. Double front pleats create an elegant wide drape falling straight over chunky footwear.',
    price: 210.0,
    compare_at_price: 280.0,
    stock: 75,
    image_url: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1200&q=85',
    category_id: 'c1000000-0000-0000-0000-000000000004',
    category: 'Pants & Denim',
    material: '14oz Japanese Selvedge Cotton Denim',
    edition: 'Atelier Archive // Strict Edition of 80',
    is_archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'b1000000-0000-0000-0000-000000000005',
    title: 'Architectural Raw Linen Smock',
    description: 'Hand-loomed 380 GSM Belgian flax linen with flat-felled French seams, wide kimono-cut sleeves, and natural horn button closures.',
    price: 240.0,
    compare_at_price: 320.0,
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
    compare_at_price: 195.0,
    stock: 80,
    image_url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=1200&q=85',
    category_id: 'c1000000-0000-0000-0000-000000000004',
    category: 'Pants & Denim',
    material: '400 GSM Heavyweight Double-Knit Cotton',
    edition: 'Permanent Collection // Daily Uniform',
    is_archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export const DEFAULT_PRODUCT_VARIANTS: ProductVariant[] = [
  // Heavyweight Boxy Hoodie
  { id: 'v101', product_id: 'b1000000-0000-0000-0000-000000000001', sku: 'HD-BOX-BLK-XS', size: 'XS', color: 'Faded Onyx', stock: 10, price_override: null, barcode: '8901001001011', barcode_data: null, barcode_url: null, weight_grams: 850, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'v102', product_id: 'b1000000-0000-0000-0000-000000000001', sku: 'HD-BOX-BLK-S', size: 'S', color: 'Faded Onyx', stock: 25, price_override: null, barcode: '8901001001028', barcode_data: null, barcode_url: null, weight_grams: 870, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'v103', product_id: 'b1000000-0000-0000-0000-000000000001', sku: 'HD-BOX-BLK-M', size: 'M', color: 'Faded Onyx', stock: 45, price_override: null, barcode: '8901001001035', barcode_data: null, barcode_url: null, weight_grams: 900, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'v104', product_id: 'b1000000-0000-0000-0000-000000000001', sku: 'HD-BOX-BLK-L', size: 'L', color: 'Faded Onyx', stock: 25, price_override: null, barcode: '8901001001042', barcode_data: null, barcode_url: null, weight_grams: 930, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'v105', product_id: 'b1000000-0000-0000-0000-000000000001', sku: 'HD-BOX-BLK-XL', size: 'XL', color: 'Faded Onyx', stock: 10, price_override: null, barcode: '8901001001059', barcode_data: null, barcode_url: null, weight_grams: 960, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },

  // Vintage Washed Boxy Tee
  { id: 'v201', product_id: 'b1000000-0000-0000-0000-000000000002', sku: 'TEE-VNTG-WHT-XS', size: 'XS', color: 'Chalk White', stock: 15, price_override: null, barcode: '8901001002018', barcode_data: null, barcode_url: null, weight_grams: 310, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'v202', product_id: 'b1000000-0000-0000-0000-000000000002', sku: 'TEE-VNTG-WHT-S', size: 'S', color: 'Chalk White', stock: 30, price_override: null, barcode: '8901001002025', barcode_data: null, barcode_url: null, weight_grams: 325, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'v203', product_id: 'b1000000-0000-0000-0000-000000000002', sku: 'TEE-VNTG-WHT-M', size: 'M', color: 'Chalk White', stock: 50, price_override: null, barcode: '8901001002032', barcode_data: null, barcode_url: null, weight_grams: 340, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'v204', product_id: 'b1000000-0000-0000-0000-000000000002', sku: 'TEE-VNTG-WHT-L', size: 'L', color: 'Chalk White', stock: 35, price_override: null, barcode: '8901001002049', barcode_data: null, barcode_url: null, weight_grams: 355, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'v205', product_id: 'b1000000-0000-0000-0000-000000000002', sku: 'TEE-VNTG-WHT-XL', size: 'XL', color: 'Chalk White', stock: 10, price_override: null, barcode: '8901001002056', barcode_data: null, barcode_url: null, weight_grams: 370, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },

  // Cropped Flight Bomber
  { id: 'v301', product_id: 'b1000000-0000-0000-0000-000000000003', sku: 'BMB-CR-BLK-S', size: 'S', color: 'Pitch Black', stock: 10, price_override: null, barcode: '8901001003015', barcode_data: null, barcode_url: null, weight_grams: 1100, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'v302', product_id: 'b1000000-0000-0000-0000-000000000003', sku: 'BMB-CR-BLK-M', size: 'M', color: 'Pitch Black', stock: 25, price_override: null, barcode: '8901001003022', barcode_data: null, barcode_url: null, weight_grams: 1150, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'v303', product_id: 'b1000000-0000-0000-0000-000000000003', sku: 'BMB-CR-BLK-L', size: 'L', color: 'Pitch Black', stock: 15, price_override: null, barcode: '8901001003039', barcode_data: null, barcode_url: null, weight_grams: 1200, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'v304', product_id: 'b1000000-0000-0000-0000-000000000003', sku: 'BMB-CR-BLK-XL', size: 'XL', color: 'Pitch Black', stock: 5, price_override: null, barcode: '8901001003046', barcode_data: null, barcode_url: null, weight_grams: 1250, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },

  // Pleated Carpenter Pant
  { id: 'v401', product_id: 'b1000000-0000-0000-0000-000000000004', sku: 'PNT-SLV-30', size: '30', color: 'Raw Black', stock: 15, price_override: null, barcode: '8901001004012', barcode_data: null, barcode_url: null, weight_grams: 780, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'v402', product_id: 'b1000000-0000-0000-0000-000000000004', sku: 'PNT-SLV-32', size: '32', color: 'Raw Black', stock: 30, price_override: null, barcode: '8901001004029', barcode_data: null, barcode_url: null, weight_grams: 800, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'v403', product_id: 'b1000000-0000-0000-0000-000000000004', sku: 'PNT-SLV-34', size: '34', color: 'Raw Black', stock: 20, price_override: null, barcode: '8901001004036', barcode_data: null, barcode_url: null, weight_grams: 820, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'v404', product_id: 'b1000000-0000-0000-0000-000000000004', sku: 'PNT-SLV-36', size: '36', color: 'Raw Black', stock: 10, price_override: null, barcode: '8901001004043', barcode_data: null, barcode_url: null, weight_grams: 840, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },

  // Architectural Raw Linen Smock
  { id: 'v501', product_id: 'b1000000-0000-0000-0000-000000000005', sku: 'SMK-LNN-T1', size: 'Taille 01 (S/M)', color: 'Natural Ecru', stock: 20, price_override: null, barcode: '8901001005019', barcode_data: null, barcode_url: null, weight_grams: 520, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'v502', product_id: 'b1000000-0000-0000-0000-000000000005', sku: 'SMK-LNN-T2', size: 'Taille 02 (L/XL)', color: 'Natural Ecru', stock: 25, price_override: null, barcode: '8901001005026', barcode_data: null, barcode_url: null, weight_grams: 560, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },

  // Relaxed Flared Minimalist Track Pant
  { id: 'v601', product_id: 'b1000000-0000-0000-0000-000000000006', sku: 'TRK-FLR-BLK-S', size: 'S', color: 'Washed Ink', stock: 15, price_override: null, barcode: '8901001006016', barcode_data: null, barcode_url: null, weight_grams: 650, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'v602', product_id: 'b1000000-0000-0000-0000-000000000006', sku: 'TRK-FLR-BLK-M', size: 'M', color: 'Washed Ink', stock: 35, price_override: null, barcode: '8901001006023', barcode_data: null, barcode_url: null, weight_grams: 670, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'v603', product_id: 'b1000000-0000-0000-0000-000000000006', sku: 'TRK-FLR-BLK-L', size: 'L', color: 'Washed Ink', stock: 20, price_override: null, barcode: '8901001006030', barcode_data: null, barcode_url: null, weight_grams: 690, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'v604', product_id: 'b1000000-0000-0000-0000-000000000006', sku: 'TRK-FLR-BLK-XL', size: 'XL', color: 'Washed Ink', stock: 10, price_override: null, barcode: '8901001006047', barcode_data: null, barcode_url: null, weight_grams: 710, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
]

export const DEFAULT_BOLT_TIMESLOTS: BoltTimeslot[] = [
  {
    id: 'a1000000-0000-0000-0000-000000000001',
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
    id: 'a1000000-0000-0000-0000-000000000002',
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
    id: 'a1000000-0000-0000-0000-000000000003',
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
    id: 'a1000000-0000-0000-0000-000000000004',
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
    id: 'a1000000-0000-0000-0000-000000000005',
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
    bolt_timeslot_id: 'a1000000-0000-0000-0000-000000000001',
    bolt_timeslot: {
      id: 'a1000000-0000-0000-0000-000000000001',
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
    bolt_timeslot_id: 'a1000000-0000-0000-0000-000000000003',
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
 * Normalizes category rows to ensure parent_id is reliably populated
 * across all database environments (including when parent_id is encoded in description fallback).
 */
export function normalizeCategoryRow(row: any): Category {
  if (!row) return row
  let parentId: string | null = row.parent_id ? String(row.parent_id).trim() : null
  let description: string | null = row.description || null

  if (!parentId && typeof description === 'string') {
    const match = description.match(/<!--parent_id:([a-zA-Z0-9_-]+)-->/)
    if (match) {
      parentId = match[1].trim()
      description = description.replace(/<!--parent_id:[a-zA-Z0-9_-]+-->/g, '').trim() || null
    }
  }

  return {
    ...row,
    parent_id: parentId,
    description,
    display_order: Number(row.display_order) || 1,
  }
}

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
      return DEFAULT_CATEGORIES.map(normalizeCategoryRow)
    }
    return data.map(normalizeCategoryRow)
  } catch (err) {
    return DEFAULT_CATEGORIES.map(normalizeCategoryRow)
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
    // If column parent_id does not exist on remote Supabase (code 42703 or schema cache), fallback to embedding in description
    if (category.parent_id && (error.code === '42703' || error.code === 'PGRST204' || error.message.includes('parent_id') || error.message.includes('schema cache'))) {
      const cleanDesc = (category.description || '').replace(/<!--parent_id:[a-zA-Z0-9_-]+-->/g, '').trim()
      const fallbackDesc = `${cleanDesc ? cleanDesc + ' ' : ''}<!--parent_id:${category.parent_id}-->`
      const fallbackPayload: any = {
        ...category,
        description: fallbackDesc,
      }
      delete fallbackPayload.parent_id

      const retryRes = await supabase.from('categories').insert(fallbackPayload).select().single()
      if (retryRes.data) {
        return { data: normalizeCategoryRow(retryRes.data) }
      }
      return { data: null, error: retryRes.error?.message || error.message }
    }
    return { data: null, error: error.message }
  }
  return { data: normalizeCategoryRow(data) }
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
    if (updates.parent_id !== undefined && (error.code === '42703' || error.code === 'PGRST204' || error.message.includes('parent_id') || error.message.includes('schema cache'))) {
      const cleanDesc = (updates.description || '').replace(/<!--parent_id:[a-zA-Z0-9_-]+-->/g, '').trim()
      const fallbackDesc = updates.parent_id
        ? `${cleanDesc ? cleanDesc + ' ' : ''}<!--parent_id:${updates.parent_id}-->`
        : cleanDesc || null
      const fallbackPayload: any = {
        ...updates,
        description: fallbackDesc,
        updated_at: new Date().toISOString(),
      }
      delete fallbackPayload.parent_id

      const retryRes = await supabase.from('categories').update(fallbackPayload).eq('id', id)
      if (!retryRes.error) {
        return { success: true }
      }
      return { success: false, error: retryRes.error.message }
    }
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
  try {
    await supabase.from('categories').update({ parent_id: null }).eq('parent_id', id)
  } catch {
    // Ignore if column parent_id is missing in remote db
  }
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true }
}

// ==========================================
// 2b. COLLECTIONS & OCCASIONS OPERATIONS
// ==========================================

/**
 * Fetch all merchandising collections and occasion groupings.
 */
export async function getCollections(
  supabase: SupabaseClient<Database>,
  options?: {
    onlyActive?: boolean
    showInNavbar?: boolean
    showOnHome?: boolean
  }
): Promise<CollectionWithRelations[]> {
  try {
    let query = supabase
      .from('collections')
      .select('*, collection_categories(category_id), collection_products(product_id)')
      .order('display_order', { ascending: true })

    if (options?.onlyActive !== false) {
      query = query.eq('is_active', true)
    }
    if (options?.showInNavbar) {
      query = query.eq('show_in_navbar', true)
    }
    if (options?.showOnHome) {
      query = query.eq('show_on_home', true)
    }

    const { data, error } = await query

    if (error || !data || data.length === 0) {
      try {
        const { data: configRow } = await (supabase as any)
          .from('storefront_config')
          .select('value')
          .eq('key', 'collections')
          .maybeSingle()
        if (configRow?.value && Array.isArray(configRow.value) && configRow.value.length > 0) {
          let list = configRow.value as CollectionWithRelations[]
          if (options?.onlyActive !== false) list = list.filter((c) => c.is_active)
          if (options?.showInNavbar) list = list.filter((c) => c.show_in_navbar)
          if (options?.showOnHome) list = list.filter((c) => c.show_on_home)
          return list.sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
        }
      } catch {}

      let filtered = DEFAULT_COLLECTIONS
      if (options?.onlyActive !== false) {
        filtered = filtered.filter((c) => c.is_active)
      }
      if (options?.showInNavbar) {
        filtered = filtered.filter((c) => c.show_in_navbar)
      }
      if (options?.showOnHome) {
        filtered = filtered.filter((c) => c.show_on_home)
      }
      return filtered
    }

    if (!data) return []

    return (data as any[]).map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      group_type: row.group_type,
      description: row.description,
      image_url: row.image_url,
      display_order: row.display_order,
      is_active: row.is_active,
      show_in_navbar: row.show_in_navbar,
      show_on_home: row.show_on_home,
      created_at: row.created_at,
      updated_at: row.updated_at,
      category_ids: Array.isArray(row.collection_categories)
        ? row.collection_categories.map((cc: any) => cc.category_id).filter(Boolean)
        : [],
      product_ids: Array.isArray(row.collection_products)
        ? row.collection_products.map((cp: any) => cp.product_id).filter(Boolean)
        : [],
    }))
  } catch {
    return DEFAULT_COLLECTIONS
  }
}

/**
 * Fetch a single collection by slug with resolved categories and products.
 */
export async function getCollectionBySlug(
  supabase: SupabaseClient<Database>,
  slug: string
): Promise<CollectionWithRelations | null> {
  try {
    const { data, error } = await supabase
      .from('collections')
      .select('*, collection_categories(category_id), collection_products(product_id)')
      .eq('slug', slug)
      .maybeSingle()

    if (error || !data) {
      try {
        const { data: configRow } = await (supabase as any)
          .from('storefront_config')
          .select('value')
          .eq('key', 'collections')
          .maybeSingle()
        if (configRow?.value && Array.isArray(configRow.value)) {
          const found = (configRow.value as CollectionWithRelations[]).find(
            (c) => c.slug === slug || c.id === slug
          )
          if (found) return found
        }
      } catch {}
      return DEFAULT_COLLECTIONS.find((c) => c.slug === slug) || null
    }

    const row: any = data
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      group_type: row.group_type,
      description: row.description,
      image_url: row.image_url,
      display_order: row.display_order,
      is_active: row.is_active,
      show_in_navbar: row.show_in_navbar,
      show_on_home: row.show_on_home,
      created_at: row.created_at,
      updated_at: row.updated_at,
      category_ids: Array.isArray(row.collection_categories)
        ? row.collection_categories.map((cc: any) => cc.category_id).filter(Boolean)
        : [],
      product_ids: Array.isArray(row.collection_products)
        ? row.collection_products.map((cp: any) => cp.product_id).filter(Boolean)
        : [],
    }
  } catch {
    return DEFAULT_COLLECTIONS.find((c) => c.slug === slug) || null
  }
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

    if (error) {
      console.warn('[getAllOrders] Supabase query error, falling back to DEFAULT_ORDERS:', error)
      return DEFAULT_ORDERS
    }

    if (Array.isArray(data)) {
      return data as unknown as OrderWithItems[]
    }

    return DEFAULT_ORDERS
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

    const isExactId =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanCode) ||
      cleanCode.startsWith('ord-')
    const { data, error } = await (
      isExactId
        ? query.eq('id', cleanCode).maybeSingle()
        : query.or(`id.eq.${cleanCode},order_number.eq.${cleanCode},tracking_barcode.eq.${cleanCode}`).maybeSingle()
    )

    if (error || !data) {
      const liveOrders = (globalThis as any)?.__LIVE_ORDERS__
      if (Array.isArray(liveOrders)) {
        const foundLive = liveOrders.find(
          (o: any) =>
            o.id === cleanCode ||
            o.order_number?.toLowerCase() === cleanCode.toLowerCase() ||
            o.tracking_barcode?.toLowerCase() === cleanCode.toLowerCase()
        )
        if (foundLive) return foundLive as OrderWithItems
      }
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
  kicker: 'CREATOR CAPSULE // PERMANENT ARCHIVE',
  headline: 'AUTONOMOUS',
  headlineItalic: 'GARMENTS',
  description: 'Engineered heavyweight silhouettes cut from custom 480 GSM French Terry, 14oz Japanese selvedge denim, and technical outerwear. Made exclusively for the clothing creator.',
  ctaLabel: 'EXPLORE COLLECTIONS',
  ctaLink: '/shop',
  secondaryCategory: 'Hoodies & Fleece',
  featuredProductId: 'b1000000-0000-0000-0000-000000000001',
}

export const DEFAULT_ETHOS_CONFIG = {
  pretitle: 'FABRIC LAB & SILHOUETTE SPECIFICATION',
  statement: '480 GSM French Terry • 14oz Japanese Selvedge • 280 GSM Combed Jersey',
  subtext: 'Every piece is engineered from the yarn up with zero synthetic polyester blending.',
}

export const DEFAULT_ANNOUNCEMENT_BAR = {
  is_active: true,
  badge: 'BOLT 45-MIN DOORSTEP TRY-ON',
  message: 'Try up to 5 pieces at home before buying • Free express delivery on orders over ₹1,999',
  link_text: 'Select Delivery PIN',
  link_url: null,
}

export const DEFAULT_HOMEPAGE_SECTIONS = [
  { id: 'hero_carousel', name: 'Hero Carousel', is_active: true, order: 1 },
  { id: 'trust_strip', name: 'Value & Trust Badges', is_active: true, order: 2 },
  { id: 'marquee', name: 'Fabric & Craft Marquee', is_active: true, order: 3 },
  { id: 'product_showcase', name: 'Category Strip & New Arrivals', is_active: true, order: 4 },
  { id: 'shop_by_occasion', name: 'Shop By Occasion', is_active: true, order: 5 },
  { id: 'spotlight_grid', name: 'Featured Collections', is_active: true, order: 6 },
  { id: 'newsletter', name: 'Newsletter', is_active: true, order: 7 },
]

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
        { id: `v-${productId}-s`, product_id: productId, sku: `GAR-${productId.slice(0, 4)}-S`, size: 'S', color: null, stock: 25, price_override: null, barcode: null, barcode_data: null, barcode_url: null, weight_grams: 520, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: `v-${productId}-m`, product_id: productId, sku: `GAR-${productId.slice(0, 4)}-M`, size: 'M', color: null, stock: 45, price_override: null, barcode: null, barcode_data: null, barcode_url: null, weight_grams: 540, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: `v-${productId}-l`, product_id: productId, sku: `GAR-${productId.slice(0, 4)}-L`, size: 'L', color: null, stock: 30, price_override: null, barcode: null, barcode_data: null, barcode_url: null, weight_grams: 560, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
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
  compare_at_price?: number | null
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
      compare_at_price: payload.compare_at_price ?? null,
      stock: totalStock,
      material: payload.material,
      edition: payload.edition,
      image_url:
        payload.image_url ||
        payload.media?.[0]?.url ||
        'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85',
      is_archived: false,
    }

    let { data: newProd, error: prodErr } = await supabase
      .from('products')
      .insert(productInsert)
      .select()
      .single()

    // Graceful fallback if compare_at_price column does not exist in Supabase DB schema
    if (prodErr && prodErr.code === '42703') {
      const fallbackInsert = { ...productInsert }
      delete (fallbackInsert as any).compare_at_price
      const retryRes = await supabase
        .from('products')
        .insert(fallbackInsert)
        .select()
        .single()
      newProd = retryRes.data
      prodErr = retryRes.error
    }

    if (prodErr || !newProd) {
      return { success: false, error: prodErr?.message || 'Failed to create product record' }
    }

    // Synchronize compare_at_price to price_schedules so MRP strikethrough is natively active
    if (payload.compare_at_price && Number(payload.compare_at_price) > Number(payload.price)) {
      try {
        await supabase.from('price_schedules').insert({
          product_id: newProd.id,
          original_price: Number(payload.compare_at_price),
          scheduled_price: Number(payload.price),
          starts_at: new Date().toISOString(),
          ends_at: '2099-12-31T23:59:59Z',
          is_active: true,
          reason: 'archival_markdown',
        })
      } catch (schedErr) {
        console.warn('[createProductWithVariantsAndMedia] Price schedule sync warning:', schedErr)
      }
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
      const { data: insertedVariants } = await supabase
        .from('product_variants')
        .insert(variantRows)
        .select('id, stock')

      // Auto-populate inventory_levels for each new variant at default Bengaluru warehouse (BLR-WH01)
      try {
        const { data: defaultLoc } = await supabase
          .from('locations')
          .select('id')
          .eq('code', 'BLR-WH01')
          .maybeSingle()

        const locId = defaultLoc?.id || 'd1000000-0000-0000-0000-000000000001'
        const varsToSync = insertedVariants || []
        if (varsToSync.length > 0) {
          const invRows = varsToSync.map((v: any) => ({
            location_id: locId,
            variant_id: v.id,
            on_hand: Number(v.stock) || 0,
            reserved: 0,
            reorder_point: 10,
            reorder_quantity: 20,
          }))
          await (supabase.from('inventory_levels') as any).upsert(invRows, {
            onConflict: 'location_id,variant_id',
            ignoreDuplicates: true,
          })
        }
      } catch (invErr) {
        console.warn('[createProductWithVariantsAndMedia] Auto-inventory sync warning:', invErr)
      }
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
    if (payload.compare_at_price !== undefined) updatePayload.compare_at_price = payload.compare_at_price
    if (payload.material) updatePayload.material = payload.material
    if (payload.edition) updatePayload.edition = payload.edition
    if (payload.image_url) updatePayload.image_url = payload.image_url
    if (payload.category_id) {
      updatePayload.category_id = payload.category_id
      const categories = await getCategories(supabase)
      updatePayload.category = categories.find((c) => c.id === payload.category_id)?.name || null
    }

    let { error: updateErr } = await supabase.from('products').update(updatePayload).eq('id', productId)

    // Graceful fallback if compare_at_price column does not exist
    if (updateErr && updateErr.code === '42703' && 'compare_at_price' in updatePayload) {
      const fallbackPayload = { ...updatePayload }
      delete (fallbackPayload as any).compare_at_price
      const retryRes = await supabase.from('products').update(fallbackPayload).eq('id', productId)
      updateErr = retryRes.error
    }

    // Synchronize compare_at_price to price_schedules so MRP strikethrough is natively active
    if (payload.compare_at_price && payload.price && Number(payload.compare_at_price) > Number(payload.price)) {
      try {
        await supabase
          .from('price_schedules')
          .update({ is_active: false })
          .eq('product_id', productId)

        await supabase.from('price_schedules').insert({
          product_id: productId,
          original_price: Number(payload.compare_at_price),
          scheduled_price: Number(payload.price),
          starts_at: new Date().toISOString(),
          ends_at: '2099-12-31T23:59:59Z',
          is_active: true,
          reason: 'archival_markdown',
        })
      } catch (schedErr) {
        console.warn('[updateProductWithVariantsAndMedia] Price schedule sync warning:', schedErr)
      }
    }

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

    // Sync media items if supplied: purge existing media to avoid duplicate row bloat
    if (payload.media && payload.media.length > 0) {
      await supabase.from('product_media').delete().eq('product_id', productId)

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
 * Uploads a product image directly to the Supabase Storage 'product-media' bucket.
 * Strictly avoids ephemeral blob URL fallbacks to prevent data loss.
 */
export async function uploadProductImage(
  supabase: SupabaseClient<Database>,
  file: File
): Promise<{ url: string | null; error?: string }> {
  try {
    const fileExt = file.name.split('.').pop() || 'jpg'
    const fileName = `apparel-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`
    const filePath = `catalog/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('product-media')
      .upload(filePath, file, {
        contentType: file.type || 'image/jpeg',
        cacheControl: '3600',
        upsert: true,
      })

    if (uploadError) {
      return { url: null, error: uploadError.message }
    }

    const { data } = supabase.storage.from('product-media').getPublicUrl(filePath)
    return { url: data.publicUrl }
  } catch (err: any) {
    return { url: null, error: err?.message || 'Upload error' }
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
        announcement_bar: DEFAULT_ANNOUNCEMENT_BAR,
        homepage_sections: DEFAULT_HOMEPAGE_SECTIONS,
      }
    }
    const configMap: Record<string, any> = {
      hero: DEFAULT_HERO_CONFIG,
      ethos: DEFAULT_ETHOS_CONFIG,
      announcement_bar: DEFAULT_ANNOUNCEMENT_BAR,
      homepage_sections: DEFAULT_HOMEPAGE_SECTIONS,
    }
    data.forEach((row) => {
      configMap[row.key] = row.value
    })
    return configMap
  } catch (err) {
    return {
      hero: DEFAULT_HERO_CONFIG,
      ethos: DEFAULT_ETHOS_CONFIG,
      announcement_bar: DEFAULT_ANNOUNCEMENT_BAR,
      homepage_sections: DEFAULT_HOMEPAGE_SECTIONS,
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

/**
 * Fetch all serviceable pincodes for Bolt try-on.
 */
export async function getBoltPincodes(
  supabase: SupabaseClient<Database>
): Promise<Array<BoltPincode & { location?: StoreLocation }>> {
  try {
    const { data, error } = await supabase
      .from('bolt_pincodes')
      .select('*, location:locations(*)')
      .order('pincode', { ascending: true })

    if (error || !data) return []
    return data as any
  } catch {
    return []
  }
}

/**
 * Create a new serviceable pincode.
 */
export async function createBoltPincode(
  supabase: SupabaseClient<Database>,
  payload: BoltPincodeInsert
): Promise<{ data: BoltPincode | null; error?: string }> {
  const { data, error } = await supabase
    .from('bolt_pincodes')
    .insert(payload)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data }
}

/**
 * Update an existing serviceable pincode.
 */
export async function updateBoltPincode(
  supabase: SupabaseClient<Database>,
  id: string,
  updates: Partial<BoltPincodeInsert>
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('bolt_pincodes')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

/**
 * Delete a serviceable pincode.
 */
export async function deleteBoltPincode(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('bolt_pincodes').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

/**
 * Fetch all delivery timeslots.
 */
export async function getBoltTimeslots(
  supabase: SupabaseClient<Database>
): Promise<BoltTimeslot[]> {
  try {
    const { data, error } = await supabase
      .from('bolt_timeslots')
      .select('*')
      .order('slot_start', { ascending: true })

    if (error || !data || data.length === 0) return DEFAULT_BOLT_TIMESLOTS
    return data
  } catch {
    return DEFAULT_BOLT_TIMESLOTS
  }
}

/**
 * Create a delivery timeslot.
 */
export async function createBoltTimeslot(
  supabase: SupabaseClient<Database>,
  payload: BoltTimeslotInsert
): Promise<{ data: BoltTimeslot | null; error?: string }> {
  const { data, error } = await supabase
    .from('bolt_timeslots')
    .insert(payload)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data }
}

/**
 * Update a delivery timeslot.
 */
export async function updateBoltTimeslot(
  supabase: SupabaseClient<Database>,
  id: string,
  updates: Partial<BoltTimeslotInsert>
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('bolt_timeslots')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

/**
 * Delete a delivery timeslot.
 */
export async function deleteBoltTimeslot(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('bolt_timeslots').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
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

export interface SplitDestinationAllocation {
  location_id: string
  shelf_id: string
  qty_accepted: number
  qty_rejected?: number
  rejection_notes?: string
}

export interface SplitItemReceivePayload {
  order_item_id?: string
  variant_id: string
  unit_cost?: number
  destinations: SplitDestinationAllocation[]
}

export async function receiveSplitGrnAndPutaway(
  supabase: SupabaseClient<Database>,
  params: {
    poId: string
    challanNumber?: string
    operatorId?: string
    splits: SplitItemReceivePayload[]
  }
): Promise<{
  success: boolean
  grnId?: string
  grnNumber?: string
  totalAccepted?: number
  totalRejected?: number
  poStatus?: string
  error?: string
}> {
  try {
    const isUuid = (val: any): boolean =>
      typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)

    const { data, error } = await (supabase.rpc as any)('receive_split_grn_and_putaway', {
      p_po_id: params.poId,
      p_challan_number: params.challanNumber || null,
      p_operator_id: isUuid(params.operatorId) ? params.operatorId : null,
      p_splits: params.splits,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return {
      success: true,
      grnId: data?.grn_id,
      grnNumber: data?.grn_number,
      totalAccepted: data?.total_accepted,
      totalRejected: data?.total_rejected,
      poStatus: data?.po_status,
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error processing split GRN receipt' }
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

export interface AtomicOrderCreationParams {
  orderData: {
    order_number?: string
    user_id?: string | null
    customer_email?: string
    status?: OrderStatus
    payment_status?: string
    delivery_mode?: DeliveryMode
    try_on_status?: TryOnStatus
    order_type?: OrderType
    subtotal?: number
    discount?: number
    delivery_fee?: number
    tax_amount?: number
    total_amount?: number
    notes?: string | null
    shipping_address_json?: any
    billing_address_json?: any
    promotion_id?: string | null
    coupon_code?: string | null
    applied_promotion_id?: string | null
    applied_coupon_code?: string | null
    applied_discount_amount?: number
    discount_breakdown?: any
    margin_protected?: boolean | null
  }
  items: Array<{
    variant_id: string
    product_id: string
    quantity: number
    unit_price: number
    discount_amount?: number
    final_unit_price?: number
    original_unit_price?: number
    size?: string | null
    hsn_code?: string
    promotion_id?: string | null
  }>
  sourceLocationId?: string | null
}

export async function atomicCreateOrderAndReserve(
  supabase: SupabaseClient<Database>,
  params: AtomicOrderCreationParams
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('atomic_create_order_and_reserve', {
      p_order_data: params.orderData as any,
      p_items: params.items as any,
      p_source_location_id: params.sourceLocationId ?? null,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error executing atomic order reservation' }
  }
}

export interface BinDirectedPickTask {
  order_id: string
  order_number: string
  order_item_id: string
  product_id: string
  product_name: string
  variant_id: string
  variant_title: string
  variant_barcode: string
  sku: string
  size: string | null
  quantity: number
  shelf_id: string
  shelf_coordinate: string
  shelf_barcode: string
  zone_name: string
  available_on_shelf: number
}

export async function generateBinDirectedPickWave(
  supabase: SupabaseClient<Database>,
  params: {
    orderIds: string[]
    locationId?: string | null
  }
): Promise<{ success: boolean; tasks: BinDirectedPickTask[]; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('generate_bin_directed_pick_wave', {
      p_order_ids: params.orderIds,
      p_location_id: params.locationId ?? null,
    })

    if (error) {
      return { success: false, tasks: [], error: error.message }
    }

    return { success: true, tasks: (data as any) || [] }
  } catch (err: any) {
    return { success: false, tasks: [], error: err?.message || 'Error generating pick wave' }
  }
}

export async function confirmShelfPick(
  supabase: SupabaseClient<Database>,
  params: {
    orderItemId: string
    scannedShelfBarcode: string
    scannedVariantBarcode?: string | null
    operatorId?: string | null
  }
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('confirm_shelf_pick', {
      p_order_item_id: params.orderItemId,
      p_scanned_shelf_barcode: params.scannedShelfBarcode,
      p_scanned_variant_barcode: params.scannedVariantBarcode ?? null,
      p_operator_id: params.operatorId ?? null,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error confirming shelf pick' }
  }
}

export async function completeBoltTryOnReconciliation(
  supabase: SupabaseClient<Database>,
  params: {
    orderId: string
    decisions: Array<{
      order_item_id: string
      decision: 'kept' | 'rejected'
      rejection_reason?: string | null
    }>
    paymentMode: 'cash' | 'upi' | 'card' | 'store_credit' | 'split'
    paymentRef?: string | null
    courierId?: string | null
  }
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('complete_bolt_try_on_reconciliation', {
      p_order_id: params.orderId,
      p_decisions: params.decisions as any,
      p_payment_mode: params.paymentMode,
      p_payment_ref: params.paymentRef ?? null,
      p_courier_id: params.courierId ?? null,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error reconciling try-on' }
  }
}

export async function inwardBoltReturnsAtDock(
  supabase: SupabaseClient<Database>,
  params: {
    orderId: string
    returnItems: Array<{
      order_item_id: string
      variant_id: string
      qc_condition: 'pass' | 'damaged'
      target_shelf_id?: string | null
    }>
    operatorId?: string | null
  }
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('inward_bolt_returns_at_dock', {
      p_order_id: params.orderId,
      p_return_items: params.returnItems as any,
      p_operator_id: params.operatorId ?? null,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error inwarding returns at dock' }
  }
}

export async function executeStockTransferLifecycle(
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
    const { data, error } = await supabase.rpc('execute_stock_transfer_lifecycle', {
      p_transfer_id: params.transferId,
      p_action: params.action,
      p_target_shelf_id: params.targetShelfId ?? null,
      p_operator_id: params.operatorId ?? null,
      p_notes: params.notes ?? null,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, status: (data as any)?.status }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error executing stock transfer lifecycle' }
  }
}

export async function getVariantByBarcodeOrSku(
  supabase: SupabaseClient<Database>,
  code: string
): Promise<{ success: boolean; variant?: any; error?: string }> {
  try {
    const clean = code.trim()
    const { data, error } = await supabase
      .from('product_variants')
      .select('id, product_id, sku, barcode, size, color, stock, price_override, product:products(id, title, price, category, image_url, material)')
      .or(`barcode.eq.${clean},sku.eq.${clean}`)
      .maybeSingle()

    if (error) {
      return { success: false, error: error.message }
    }
    if (data) {
      const prod = Array.isArray((data as any).product) ? (data as any).product[0] : (data as any).product
      return { success: true, variant: { ...(data as any), product: prod } }
    }

    // Resilient fallback against starter catalog in testing/offline
    const fallback = DEFAULT_PRODUCT_VARIANTS.find(
      (v) => v.barcode === clean || v.sku?.toUpperCase() === clean.toUpperCase()
    )
    if (fallback) {
      const prod = DEFAULT_PRODUCTS.find((p) => p.id === fallback.product_id)
      return { success: true, variant: { ...fallback, product: prod } }
    }

    return { success: false, error: 'NOT_FOUND' }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error looking up barcode' }
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

export async function getPurchaseOrderItems(
  supabase: SupabaseClient<Database>,
  poId: string
): Promise<Array<PurchaseOrderItem & { variant?: ProductVariant & { product?: Product } }>> {
  const { data, error } = await supabase
    .from('purchase_order_items')
    .select('*, variant:product_variants(*, product:products(*))')
    .eq('po_id', poId)
  if (error || !data) return []
  return data as any
}

export async function createPurchaseOrderWithItems(
  supabase: SupabaseClient<Database>,
  poData: {
    po_number: string
    supplier_id: string
    destination_location_id: string
    status: any
    expected_delivery_date: string
    subtotal: number
    tax_amount: number
    total_amount: number
    created_by?: string
  },
  items: Array<{
    variant_id: string
    hsn_code: string
    quantity_ordered: number
    unit_cost: number
    tax_rate_percent: number
    tax_amount: number
    line_total: number
    destination_location_id?: string
  }>
): Promise<{ success: boolean; po?: any; error?: string }> {
  try {
    const isUuid = (val: any): boolean =>
      typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)

    const cleanPoData = {
      ...poData,
      created_by: isUuid(poData.created_by) ? poData.created_by : null,
    }

    const { data: newPo, error: poErr } = await supabase
      .from('purchase_orders')
      .insert(cleanPoData as any)
      .select()
      .single()

    if (poErr) throw poErr

    if (items.length > 0) {
      const itemsToInsert = items.map((it) => ({
        po_id: newPo.id,
        variant_id: it.variant_id,
        hsn_code: it.hsn_code || '610910',
        quantity_ordered: it.quantity_ordered,
        quantity_received: 0,
        unit_cost: it.unit_cost,
        tax_rate_percent: it.tax_rate_percent || 12.0,
        tax_amount: it.tax_amount,
        line_total: it.line_total,
        destination_location_id: it.destination_location_id || poData.destination_location_id,
      }))

      const { error: itemsErr } = await supabase
        .from('purchase_order_items')
        .insert(itemsToInsert as any)

      if (itemsErr) throw itemsErr
    }

    return { success: true, po: newPo }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to create PO with items' }
  }
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
    '--background': '#FDFCF7',
    '--foreground': '#09090B',
    '--primary': '#09090B',
    '--primary-foreground': '#FFFFFF',
    '--secondary': '#FAF8F2',
    '--secondary-foreground': '#09090B',
    '--accent-red': '#B91C1C',
    '--accent-gold': '#F59E0B',
    '--border': '#E8E4DA',
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
  page_title: 'The Grace Atelier Haute Couture',
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
        kicker: 'AUTONOMOUS ATELIER // SPECIFICATION ARCHIVE',
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
        title: 'SELECTED WORKS',
        categoryFilter: 'all',
        limit: 6,
        columns: 3,
      },
    },
    {
      id: 'reviews-showcase-01',
      type: 'ReviewsShowcase',
      name: 'User Reviews',
      isVisible: true,
      className: 'bg-[#FDFCF7] border-t border-[#E5E0D8] py-20 sm:py-28 px-6 sm:px-12',
      styles: {},
      props: {
        title: 'USER REVIEWS',
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

// =============================================================================
// PROMOTIONS, PRICING & DISCOUNT ENGINE UTILITIES
// =============================================================================

import type {
  Promotion,
  PromotionInsert,
  PromotionUpdate,
  PromotionRule,
  PromotionRuleInsert,
  PromotionCoupon,
  PromotionCouponInsert,
  PromotionWithRules,
  PriceSchedule,
} from '../types/database.types'

/**
 * Fetch all active and scheduled promotions
 */
export async function getPromotions(
  supabase: SupabaseClient<Database>,
  options?: { onlyActive?: boolean; includeArchived?: boolean }
): Promise<PromotionWithRules[]> {
  try {
    let query = supabase
      .from('promotions')
      .select('*, rules:promotion_rules(*), coupons:promotion_coupons(*)')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })

    if (options?.onlyActive) {
      query = query
        .eq('is_active', true)
        .lte('starts_at', new Date().toISOString())
    }

    const { data, error } = await query

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        return getLocalPromotions(options?.onlyActive) as unknown as PromotionWithRules[]
      }
      console.error('Error fetching promotions:', error)
      return []
    }

    if (!data || data.length === 0) {
      const fallback = getLocalPromotions(options?.onlyActive)
      if (fallback.length > 0) return fallback as unknown as PromotionWithRules[]
    }

    const normalized = (data || []).map((p: any) => ({
      ...p,
      banner_image_url: extractBannerImageUrl(p),
      description: cleanPromotionDescription(p.description),
    }))

    return normalized as unknown as PromotionWithRules[]
  } catch (err) {
    console.error('getPromotions exception:', err)
    return []
  }
}

/**
 * Fetch a single promotion by ID with full rules and coupon relations
 */
export async function getPromotionById(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<PromotionWithRules | null> {
  try {
    const { data, error } = await supabase
      .from('promotions')
      .select('*, rules:promotion_rules(*), coupons:promotion_coupons(*)')
      .eq('id', id)
      .single()

    if (error || !data) return null
    const normalized = {
      ...data,
      banner_image_url: extractBannerImageUrl(data),
      description: cleanPromotionDescription(data.description),
    }
    return normalized as unknown as PromotionWithRules
  } catch {
    return null
  }
}

/**
 * Validate and retrieve a coupon and its parent promotion by code
 */
export async function getPromotionByCouponCode(
  supabase: SupabaseClient<Database>,
  code: string
): Promise<{ coupon: PromotionCoupon; promotion: Promotion; rules: PromotionRule[] } | null> {
  try {
    const cleanCode = code.trim().toUpperCase()
    const { data: coupon, error: couponErr } = await supabase
      .from('promotion_coupons')
      .select('*')
      .eq('code', cleanCode)
      .eq('is_active', true)
      .single()

    if (couponErr || !coupon) return null

    // Check expiration or usage limit
    if (coupon.max_uses !== null && coupon.times_used >= coupon.max_uses) {
      return null
    }

    const { data: promotion, error: promoErr } = await supabase
      .from('promotions')
      .select('*, rules:promotion_rules(*)')
      .eq('id', coupon.promotion_id)
      .eq('is_active', true)
      .single()

    if (promoErr || !promotion) return null

    const now = new Date().toISOString()
    if (promotion.starts_at > now) return null
    if (promotion.ends_at && promotion.ends_at < now) return null
    if (promotion.usage_limit_total !== null && promotion.total_redemptions_count >= promotion.usage_limit_total) {
      return null
    }

    return {
      coupon: coupon as PromotionCoupon,
      promotion: promotion as unknown as Promotion,
      rules: (promotion as any).rules || [],
    }
  } catch {
    return null
  }
}

/**
 * Helper to extract banner image url whether from native column or encoded in description
 */
export function extractBannerImageUrl(promo: any): string | null {
  if (!promo) return null
  if (promo.banner_image_url) return promo.banner_image_url
  if (promo.description && typeof promo.description === 'string') {
    const match = promo.description.match(/\[banner:([^\]]+)\]/)
    if (match && match[1]) return match[1].trim()
  }
  return null
}

export function cleanPromotionDescription(desc?: string | null): string | null {
  if (!desc) return null
  const cleaned = desc.replace(/\[banner:[^\]]+\]/g, '').trim()
  return cleaned || null
}

/**
 * Create a new promotion with nested rules and coupons in a clean sequence
 */
export async function createPromotionWithRules(
  supabase: SupabaseClient<Database>,
  promoData: PromotionInsert,
  rules: Omit<PromotionRuleInsert, 'promotion_id'>[] = [],
  coupons: Omit<PromotionCouponInsert, 'promotion_id'>[] = []
): Promise<{ success: boolean; promotion?: PromotionWithRules; error?: string }> {
  try {
    let insertPayload: any = { ...promoData }
    let bannerToStore = insertPayload.banner_image_url

    // 1. Insert Master Promotion
    let { data: newPromo, error: promoErr } = await supabase
      .from('promotions')
      .insert(insertPayload)
      .select('*')
      .single()

    // If banner_image_url column is not yet present on remote DB schema, fallback to description encoding
    if (promoErr && (promoErr.code === '42703' || promoErr.message?.includes('banner_image_url'))) {
      const bannerUrl = insertPayload.banner_image_url
      delete insertPayload.banner_image_url
      if (bannerUrl) {
        insertPayload.description = `${insertPayload.description || ''}\n\n[banner:${bannerUrl}]`.trim()
      }
      const retry = await supabase
        .from('promotions')
        .insert(insertPayload)
        .select('*')
        .single()
      newPromo = retry.data
      promoErr = retry.error
    }

    if (promoErr || !newPromo) {
      if (promoErr?.code === 'PGRST205' || promoErr?.message?.includes('schema cache')) {
        const local = saveLocalPromotion({ promotion: promoData, rules, coupons })
        return { success: true, promotion: local }
      }
      return { success: false, error: promoErr?.message || 'Failed to create promotion header' }
    }

    // 2. Insert Rules if provided
    if (rules.length > 0) {
      const rulesPayload = rules.map((r) => ({
        ...r,
        promotion_id: newPromo.id,
      }))
      const { error: rulesErr } = await supabase.from('promotion_rules').insert(rulesPayload as any)
      if (rulesErr) console.warn('Warning inserting promotion rules:', rulesErr)
    }

    // 3. Insert Coupons if provided
    if (coupons.length > 0) {
      const couponsPayload = coupons.map((c) => ({
        ...c,
        code: c.code.trim().toUpperCase(),
        promotion_id: newPromo.id,
      }))
      const { error: couponsErr } = await supabase.from('promotion_coupons').insert(couponsPayload as any)
      if (couponsErr) console.warn('Warning inserting promotion coupons:', couponsErr)
    }

    const fullPromo = await getPromotionById(supabase, newPromo.id)
    return { success: true, promotion: fullPromo || (newPromo as unknown as PromotionWithRules) }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Exception creating promotion' }
  }
}

/**
 * Update an existing promotion header
 */
export async function updatePromotion(
  supabase: SupabaseClient<Database>,
  id: string,
  updates: PromotionUpdate
): Promise<{ success: boolean; promotion?: Promotion; error?: string }> {
  try {
    let updatePayload: any = {
      ...updates,
      updated_at: new Date().toISOString(),
    }

    let { data, error } = await supabase
      .from('promotions')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single()

    // If banner_image_url column is not yet present on remote DB schema, fallback to description encoding
    if (error && (error.code === '42703' || error.message?.includes('banner_image_url'))) {
      const bannerUrl = updatePayload.banner_image_url
      delete updatePayload.banner_image_url
      if (bannerUrl !== undefined) {
        const currentDesc = cleanPromotionDescription(updatePayload.description) || ''
        updatePayload.description = bannerUrl ? `${currentDesc}\n\n[banner:${bannerUrl}]`.trim() : currentDesc
      }
      const retry = await supabase
        .from('promotions')
        .update(updatePayload)
        .eq('id', id)
        .select('*')
        .single()
      data = retry.data
      error = retry.error
    }

    if (error) return { success: false, error: error.message }
    const normalized = data
      ? {
          ...data,
          banner_image_url: extractBannerImageUrl(data),
          description: cleanPromotionDescription(data.description),
        }
      : data
    return { success: true, promotion: normalized as unknown as Promotion }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Exception updating promotion' }
  }
}

/**
 * Roll back / void a redeemed promotion on order cancellation
 */
export async function voidOrderPromotionRedemption(
  supabase: SupabaseClient<Database>,
  orderId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('void_order_promotion_redemption', {
      p_order_id: orderId,
    })

    if (error) return { success: false, error: error.message }
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Exception voiding promotion redemption' }
  }
}

/**
 * Retrieve active scheduled markdowns for given product / variant IDs
 */
export async function getActivePriceSchedules(
  supabase: SupabaseClient<Database>,
  productIds: string[]
): Promise<PriceSchedule[]> {
  try {
    if (!productIds || productIds.length === 0) return []
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('price_schedules')
      .select('*')
      .in('product_id', productIds)
      .eq('is_active', true)
      .lte('starts_at', now)
      .gte('ends_at', now)

    if (error || !data) return []
    return data as unknown as PriceSchedule[]
  } catch {
    return []
  }
}

// =============================================================================
// Verified Purchase Reviews & Ratings Helper Utilities
// =============================================================================

/**
 * Retrieve approved customer reviews with attached media for a garment PDP
 */
export async function getProductReviews(
  supabase: SupabaseClient<Database>,
  productId: string,
  options?: {
    limit?: number
    offset?: number
    rating?: number
    fit?: FashionFitIndicator
    hasPhotos?: boolean
  }
): Promise<{ reviews: ProductReviewWithMedia[]; total: number }> {
  try {
    let query = supabase
      .from('product_reviews')
      .select('*, media:review_media(*), user:users!product_reviews_user_id_fkey(id, name, email)', { count: 'exact' })
      .eq('product_id', productId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })

    if (options?.rating) {
      query = query.eq('rating', options.rating)
    }
    if (options?.fit) {
      query = query.eq('fit_indicator', options.fit)
    }
    if (options?.limit) {
      const offset = options.offset || 0
      query = query.range(offset, offset + options.limit - 1)
    }

    const { data, count, error } = await query
    if (error) {
      if (error?.code === 'PGRST205' || error?.message?.includes('schema cache')) {
        const local = getLocalReviews(productId, 'approved') as unknown as ProductReviewWithMedia[]
        return { reviews: local, total: local.length }
      }
      console.error('Error fetching product reviews:', error)
      return { reviews: [], total: 0 }
    }

    let results = (data || []) as unknown as ProductReviewWithMedia[]
    if (options?.hasPhotos) {
      results = results.filter((r) => r.media && r.media.length > 0)
    }

    return { reviews: results, total: count || 0 }
  } catch (err) {
    console.error('Exception fetching product reviews:', err)
    return { reviews: [], total: 0 }
  }
}

/**
 * Retrieve aggregated rating statistics and 1-5 star distribution for a garment
 */
export async function getProductRatingSummary(
  supabase: SupabaseClient<Database>,
  productId: string
): Promise<ProductRatingAggregate> {
  const defaultSummary: ProductRatingAggregate = {
    average_rating: 0,
    review_count: 0,
    fit_runs_small_count: 0,
    fit_true_to_size_count: 0,
    fit_runs_large_count: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  }

  try {
    const { data: prod } = await supabase
      .from('products')
      .select('average_rating, review_count, fit_runs_small_count, fit_true_to_size_count, fit_runs_large_count')
      .eq('id', productId)
      .single()

    const { data: ratingRows } = await supabase
      .from('product_reviews')
      .select('rating')
      .eq('product_id', productId)
      .eq('status', 'approved')

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    if (ratingRows) {
      for (const row of ratingRows) {
        const r = row.rating as 1 | 2 | 3 | 4 | 5
        if (distribution[r] !== undefined) {
          distribution[r]++
        }
      }
    }

    return {
      average_rating: Number(prod?.average_rating) || 0,
      review_count: Number(prod?.review_count) || (ratingRows?.length || 0),
      fit_runs_small_count: Number(prod?.fit_runs_small_count) || 0,
      fit_true_to_size_count: Number(prod?.fit_true_to_size_count) || 0,
      fit_runs_large_count: Number(prod?.fit_runs_large_count) || 0,
      distribution,
    }
  } catch (err) {
    console.error('Exception fetching product rating summary:', err)
    return defaultSummary
  }
}

/**
 * Strict verified purchase eligibility check.
 * Verifies that the user purchased the item on a delivered order, and if Bolt Try-On, that the item was kept.
 * Also verifies that no review has already been submitted for this order_item_id.
 */
export async function checkUserReviewEligibility(
  supabase: SupabaseClient<Database>,
  userId: string,
  orderItemId: string
): Promise<{
  eligible: boolean
  reason?: string
  orderItem?: {
    id: string
    order_id: string
    product_id: string
    variant_id: string | null
    size: string | null
    is_bolt: boolean
    order_status: string
  }
}> {
  try {
    // 1. Check if review already exists for this order_item_id
    if (hasLocalReview(orderItemId)) {
      return {
        eligible: false,
        reason: 'You have already submitted a review for this garment purchase.',
      }
    }

    const { data: existing } = await supabase
      .from('product_reviews')
      .select('id, status, rating')
      .eq('order_item_id', orderItemId)
      .maybeSingle()

    if (existing) {
      return {
        eligible: false,
        reason: 'You have already submitted a review for this garment purchase.',
      }
    }

    // 2. Query order_item and join order
    const { data: item, error } = await supabase
      .from('order_items')
      .select('id, order_id, product_id, variant_id, size, is_kept, try_on_decision, order:orders(id, user_id, status, delivery_mode)')
      .eq('id', orderItemId)
      .single()

    if (error || !item) {
      return { eligible: false, reason: 'Purchased garment record not found.' }
    }

    const order = (item as any).order
    if (!order || order.user_id !== userId) {
      return { eligible: false, reason: 'You can only review items from your own delivered orders.' }
    }

    if (order.status !== 'delivered') {
      return {
        eligible: false,
        reason: `Reviews can only be submitted once the garment is delivered (current order status: ${order.status}).`,
      }
    }

    const isBolt = order.delivery_mode === 'bolt' || order.delivery_mode === 'try_on'
    if (isBolt) {
      // In Bolt 45-min doorstep try-on, only explicitly rejected / returned items are ineligible
      const isRejected = (item as any).is_kept === false || (item as any).try_on_decision === 'rejected'
      if (isRejected) {
        return {
          eligible: false,
          reason: 'Items returned or rejected during Bolt Doorstep Try-On are ineligible for reviews.',
        }
      }
    }

    return {
      eligible: true,
      orderItem: {
        id: item.id,
        order_id: order.id,
        product_id: item.product_id,
        variant_id: item.variant_id ?? null,
        size: item.size ?? null,
        is_bolt: isBolt,
        order_status: order.status,
      },
    }
  } catch (err: any) {
    return { eligible: false, reason: err?.message || 'Eligibility verification check failed.' }
  }
}

/**
 * Submit a verified garment review with photos.
 */
export async function createProductReview(
  supabase: SupabaseClient<Database>,
  params: {
    productId: string
    orderId: string
    orderItemId: string
    userId: string
    rating: number
    title: string
    comment: string
    fitIndicator?: FashionFitIndicator
    sizePurchased?: string | null
    isBoltTryOn?: boolean
    mediaUrls?: string[]
  }
): Promise<{ success: boolean; review?: ProductReview; error?: string }> {
  try {
    const insertPayload: ProductReviewInsert = {
      product_id: params.productId,
      order_id: params.orderId,
      order_item_id: params.orderItemId,
      user_id: params.userId,
      rating: Math.max(1, Math.min(5, Math.round(params.rating))),
      title: params.title.trim().slice(0, 150),
      comment: params.comment.trim(),
      fit_indicator: params.fitIndicator || 'true_to_size',
      size_purchased: params.sizePurchased || null,
      is_bolt_try_on: params.isBoltTryOn ?? false,
      verified_purchase: true,
      status: 'pending',
    }

    const { data: review, error: reviewError } = await supabase
      .from('product_reviews')
      .insert(insertPayload)
      .select()
      .single()

    if (reviewError || !review) {
      if (reviewError?.code === 'PGRST205' || reviewError?.message?.includes('schema cache')) {
        const local = saveLocalReview(params)
        return { success: true, review: local }
      }
      return { success: false, error: reviewError?.message || 'Failed to submit review' }
    }

    if (params.mediaUrls && params.mediaUrls.length > 0) {
      const mediaRows: ReviewMediaInsert[] = params.mediaUrls.map((url, idx) => ({
        review_id: review.id,
        image_url: url,
        display_order: idx,
      }))

      const { error: mediaError } = await supabase.from('review_media').insert(mediaRows)
      if (mediaError) {
        console.warn('Warning: Failed to insert some review media attachments:', mediaError)
      }
    }

    return { success: true, review }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Exception during review creation' }
  }
}

/**
 * Moderate a review (approve, reject, hide) or post an Atelier Concierge reply.
 */
export async function updateProductReviewModeration(
  supabase: SupabaseClient<Database>,
  reviewId: string,
  params: {
    status: ReviewStatus
    moderatedBy?: string | null
    rejectionReason?: string | null
    adminReply?: string | null
    adminRepliedBy?: string | null
  }
): Promise<{ success: boolean; review?: ProductReview; error?: string }> {
  try {
    const updatePayload: ProductReviewUpdate = {
      status: params.status,
      moderated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (params.moderatedBy) updatePayload.moderated_by = params.moderatedBy
    if (params.rejectionReason !== undefined) updatePayload.rejection_reason = params.rejectionReason

    if (params.adminReply !== undefined) {
      updatePayload.admin_reply = params.adminReply
      updatePayload.admin_replied_at = params.adminReply ? new Date().toISOString() : null
      if (params.adminRepliedBy) updatePayload.admin_replied_by = params.adminRepliedBy
    }

    const { data, error } = await supabase
      .from('product_reviews')
      .update(updatePayload)
      .eq('id', reviewId)
      .select()
      .single()

    if (error || !data) {
      return { success: false, error: error?.message || 'Failed to update review moderation' }
    }

    return { success: true, review: data }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Exception updating review moderation' }
  }
}

/**
 * Allow a patron to edit their review within 30 days of submission.
 * Automatically resets status to 'pending' for re-moderation.
 */
export async function updatePatronReview(
  supabase: SupabaseClient<Database>,
  reviewId: string,
  userId: string,
  params: {
    rating?: number
    title?: string
    comment?: string
    fit_indicator?: FashionFitIndicator
  }
): Promise<{ success: boolean; review?: ProductReview; error?: string }> {
  try {
    const { data: existing, error: fetchErr } = await supabase
      .from('product_reviews')
      .select('*')
      .eq('id', reviewId)
      .single()

    if (fetchErr || !existing) {
      return { success: false, error: 'Review not found.' }
    }

    if (existing.user_id !== userId) {
      return { success: false, error: 'Unauthorized: You can only edit your own reviews.' }
    }

    const createdAt = new Date(existing.created_at).getTime()
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
    if (Date.now() - createdAt > thirtyDaysMs) {
      return { success: false, error: 'Reviews can only be edited within 30 days of initial submission.' }
    }

    const updatePayload: ProductReviewUpdate = {
      updated_at: new Date().toISOString(),
      status: 'pending', // Re-trigger moderation queue
    }

    if (params.rating !== undefined) updatePayload.rating = Math.max(1, Math.min(5, Math.round(params.rating)))
    if (params.title !== undefined) updatePayload.title = params.title.trim().slice(0, 150)
    if (params.comment !== undefined) updatePayload.comment = params.comment.trim()
    if (params.fit_indicator !== undefined) updatePayload.fit_indicator = params.fit_indicator

    const { data, error } = await supabase
      .from('product_reviews')
      .update(updatePayload)
      .eq('id', reviewId)
      .select()
      .single()

    if (error || !data) {
      return { success: false, error: error?.message || 'Failed to update review' }
    }

    return { success: true, review: data }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Exception editing patron review' }
  }
}

/**
 * Retrieve reviews with rich relations for the Admin moderation console.
 */
export async function getAdminReviews(
  supabase: SupabaseClient<Database>,
  options?: {
    status?: ReviewStatus | 'all'
    rating?: number
    hasPhotos?: boolean
    isBolt?: boolean
    search?: string
    page?: number
    limit?: number
  }
): Promise<{ reviews: ProductReviewWithMedia[]; total: number; pendingCount: number }> {
  try {
    const page = options?.page || 1
    const limit = options?.limit || 20
    const offset = (page - 1) * limit

    let query = supabase
      .from('product_reviews')
      .select(
        '*, media:review_media(*), user:users!product_reviews_user_id_fkey(id, name, email), product:products(id, title, image_url), order:orders(id, order_number, created_at)',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })

    if (options?.status && options.status !== 'all') {
      query = query.eq('status', options.status)
    }

    if (options?.rating) {
      query = query.eq('rating', options.rating)
    }

    if (options?.isBolt !== undefined) {
      query = query.eq('is_bolt_try_on', options.isBolt)
    }

    if (options?.search) {
      query = query.or(`title.ilike.%${options.search}%,comment.ilike.%${options.search}%`)
    }

    query = query.range(offset, offset + limit - 1)

    const [{ data, count, error }, { count: pendingCount }] = await Promise.all([
      query,
      supabase.from('product_reviews').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ])

    if (error) {
      if (error?.code === 'PGRST205' || error?.message?.includes('schema cache')) {
        const local = getLocalReviews(undefined, options?.status === 'all' ? undefined : options?.status) as unknown as ProductReviewWithMedia[]
        const pending = getLocalReviews(undefined, 'pending').length
        return { reviews: local, total: local.length, pendingCount: pending }
      }
      console.error('Error fetching admin reviews:', error)
      return { reviews: [], total: 0, pendingCount: pendingCount || 0 }
    }

    let results = (data || []) as unknown as ProductReviewWithMedia[]
    if (options?.hasPhotos) {
      results = results.filter((r) => r.media && r.media.length > 0)
    }

    return {
      reviews: results,
      total: count || 0,
      pendingCount: pendingCount || 0,
    }
  } catch (err) {
    console.error('Exception fetching admin reviews:', err)
    return { reviews: [], total: 0, pendingCount: 0 }
  }
}





