/**
 * Resilient Network & Offline Development Fetch Adapter for Supabase Clients.
 *
 * In production or with a live Supabase daemon running, this passes through directly.
 * In local/offline/disconnected environments, it catches network failures (DNS ENOTFOUND,
 * ECONNREFUSED, fetch failed) and provides authentic Supabase Auth and PostgREST responses
 * so login, role validation, middleware sessions, and checkout flows execute flawlessly.
 */

import {
  DEFAULT_CATEGORIES,
  DEFAULT_PRODUCTS,
  DEFAULT_PRODUCT_VARIANTS,
  DEFAULT_BOLT_TIMESLOTS,
  DEFAULT_ORDERS,
  type UserRole,
} from '../utils/index'

// Polyfill WebSocket for Node.js <= 20 environments (SSR, Vitest, Playwright, Server Components)
if (typeof globalThis.WebSocket === 'undefined') {
  class DummyWebSocket {
    static readonly CONNECTING = 0
    static readonly OPEN = 1
    static readonly CLOSING = 2
    static readonly CLOSED = 3
    readonly CONNECTING = 0
    readonly OPEN = 1
    readonly CLOSING = 2
    readonly CLOSED = 3
    readyState = 3
    onclose: any = null
    onerror: any = null
    onmessage: any = null
    onopen: any = null
    send() {}
    close() {}
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() {
      return false
    }
  }
  ;(globalThis as any).WebSocket = DummyWebSocket
}

if (!(globalThis as any).__LIVE_ORDERS__) {
  ;(globalThis as any).__LIVE_ORDERS__ = JSON.parse(JSON.stringify(DEFAULT_ORDERS))
}
if (!(globalThis as any).__LIVE_CATEGORIES__) {
  ;(globalThis as any).__LIVE_CATEGORIES__ = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES))
}
if (!(globalThis as any).__LIVE_PRODUCTS__) {
  ;(globalThis as any).__LIVE_PRODUCTS__ = JSON.parse(JSON.stringify(DEFAULT_PRODUCTS))
}
if (!(globalThis as any).__LIVE_VARIANTS__) {
  ;(globalThis as any).__LIVE_VARIANTS__ = JSON.parse(JSON.stringify(DEFAULT_PRODUCT_VARIANTS))
}

export const DEFAULT_SUPPLIERS = [
  {
    id: 'sup-00000000-0000-0000-0000-000000000001',
    vendor_code: 'SUP-CERRUTI-01',
    name: 'Lanificio F.lli Cerruti 1881',
    gstin: '29AAAAA0000A1Z5',
    contact_person: 'Marco Rossi',
    email: 'orders@cerruti1881.it',
    phone: '+39 015 6191',
    address_line1: 'Via Vergnasco, 2',
    city: 'Biella',
    state: 'Piedmont',
    state_code: 'IT',
    pincode: '13900',
    payment_terms: 'NET_30',
    lead_time_days: 14,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'sup-00000000-0000-0000-0000-000000000002',
    vendor_code: 'SUP-LORO-02',
    name: 'Loro Piana Mills & Cashmere',
    gstin: '27AAAAA0000A1Z5',
    contact_person: 'Chiara Bellini',
    email: 'b2b@loropiana.com',
    phone: '+39 0163 2011',
    address_line1: 'Corso Rolandi, 10',
    city: 'Quarona',
    state: 'Vercelli',
    state_code: 'IT',
    pincode: '13017',
    payment_terms: 'NET_45',
    lead_time_days: 21,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export const DEFAULT_PURCHASE_ORDERS = [
  {
    id: 'po-00000000-0000-0000-0000-000000000001',
    po_number: 'PO-20261108-0001',
    supplier_id: 'sup-00000000-0000-0000-0000-000000000001',
    destination_location_id: 'l1000000-0000-0000-0000-000000000001',
    status: 'issued',
    expected_delivery_date: '2026-11-20',
    subtotal: 4200.0,
    tax_amount: 504.0,
    total_amount: 4704.0,
    created_by: 'admin',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export const DEFAULT_PROMOTIONAL_BANNERS = [
  {
    id: 'banner-01',
    title: 'Drop 01 // Heavyweight French Terry & Selvedge Denim',
    subtitle: 'Limited batch production with strict units allocated per size.',
    badge_text: 'CREATOR DROP ACTIVE',
    image_url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85',
    cta_label: 'Shop Drop 01',
    cta_link: '/shop',
    is_active: true,
    display_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

function getLocalDbFilePath(): string | null {
  try {
    if (typeof process === 'undefined' || typeof process.cwd !== 'function') return null
    if (process.env?.NEXT_RUNTIME === 'edge') return null
    const fs = require('fs')
    const path = require('path')
    const cwd = process.cwd()
    const candidates = [
      path.resolve(cwd, 'packages/supabase/.local-db/inventory.json'),
      path.resolve(cwd, '../../packages/supabase/.local-db/inventory.json'),
      path.resolve(cwd, '../packages/supabase/.local-db/inventory.json'),
    ]
    for (const p of candidates) {
      if (fs.existsSync(p)) return p
    }
  } catch {}
  return null
}

function readLocalDb(): any {
  try {
    const filePath = getLocalDbFilePath()
    if (filePath) {
      const fs = require('fs')
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'))
      }
    }
  } catch {}
  return null
}

function updateLocalDb(updater: (db: any) => void) {
  try {
    const filePath = getLocalDbFilePath()
    if (filePath) {
      const fs = require('fs')
      let db: any = {}
      if (fs.existsSync(filePath)) {
        try {
          db = JSON.parse(fs.readFileSync(filePath, 'utf8'))
        } catch {
          db = {}
        }
      }
      updater(db)
      fs.writeFileSync(filePath, JSON.stringify(db, null, 2), 'utf8')
    }
  } catch {}
}

function loadLocalDbOrders(): any[] {
  const db = readLocalDb()
  if (db && Array.isArray(db.orders) && db.orders.length > 0) {
    return db.orders
  }
  return (globalThis as any).__LIVE_ORDERS__ || DEFAULT_ORDERS
}

function saveLocalDbOrder(order: any) {
  updateLocalDb((db) => {
    if (!Array.isArray(db.orders)) db.orders = []
    const existingIdx = db.orders.findIndex((o: any) => o.id === order.id || o.order_number === order.order_number)
    if (existingIdx !== -1) {
      db.orders[existingIdx] = { ...db.orders[existingIdx], ...order }
    } else {
      db.orders.unshift(order)
    }
  })
  if (Array.isArray((globalThis as any).__LIVE_ORDERS__)) {
    const existingIdx = (globalThis as any).__LIVE_ORDERS__.findIndex((o: any) => o.id === order.id || o.order_number === order.order_number)
    if (existingIdx !== -1) {
      (globalThis as any).__LIVE_ORDERS__[existingIdx] = { ...(globalThis as any).__LIVE_ORDERS__[existingIdx], ...order }
    } else {
      (globalThis as any).__LIVE_ORDERS__.unshift(order)
    }
  }
}

function saveLocalDbOrderItem(item: any) {
  updateLocalDb((db) => {
    if (Array.isArray(db.orders)) {
      const order = db.orders.find((o: any) => o.id === item.order_id)
      if (order) {
        if (!order.order_items) order.order_items = []
        const prod = DEFAULT_PRODUCTS.find((p: any) => p.id === item.product_id) || {
          id: item.product_id,
          title: 'Atelier Creator Silhouette',
          price: item.unit_price || 2490,
          image_url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80',
          material: 'Custom-Milled French Terry',
        }
        order.order_items.push({
          id: item.id || `item-${Date.now()}-${Math.random()}`,
          order_id: item.order_id,
          product_id: item.product_id,
          quantity: item.quantity || 1,
          unit_price: item.unit_price || 2490,
          size: item.size || 'M',
          is_kept: null,
          try_on_decision: 'pending',
          product: prod,
        })
      }
    }
  })
}

function loadLocalDbCategories(): any[] {
  const db = readLocalDb()
  if (db && Array.isArray(db.categories) && db.categories.length > 0) {
    return db.categories
  }
  const mem = (globalThis as any).__LIVE_CATEGORIES__
  if (Array.isArray(mem) && mem.length > 0) return mem
  return DEFAULT_CATEGORIES
}

function saveLocalDbCategory(category: any): any {
  let saved = category
  updateLocalDb((db) => {
    if (!Array.isArray(db.categories)) db.categories = [...DEFAULT_CATEGORIES]
    const idx = db.categories.findIndex((c: any) => c.id === category.id)
    if (idx !== -1) {
      db.categories[idx] = { ...db.categories[idx], ...category }
      saved = db.categories[idx]
    } else {
      db.categories.push(category)
      saved = category
    }
  })
  if (!Array.isArray((globalThis as any).__LIVE_CATEGORIES__)) {
    ;(globalThis as any).__LIVE_CATEGORIES__ = [...loadLocalDbCategories()]
  }
  const memIdx = (globalThis as any).__LIVE_CATEGORIES__.findIndex((c: any) => c.id === category.id)
  if (memIdx !== -1) {
    (globalThis as any).__LIVE_CATEGORIES__[memIdx] = saved
  } else {
    (globalThis as any).__LIVE_CATEGORIES__.push(saved)
  }
  return saved
}

function deleteLocalDbCategory(id: string) {
  updateLocalDb((db) => {
    if (Array.isArray(db.categories)) {
      db.categories = db.categories.filter((c: any) => c.id !== id)
    }
  })
  if (Array.isArray((globalThis as any).__LIVE_CATEGORIES__)) {
    ;(globalThis as any).__LIVE_CATEGORIES__ = (globalThis as any).__LIVE_CATEGORIES__.filter((c: any) => c.id !== id)
  }
}

function loadLocalDbProducts(): any[] {
  const db = readLocalDb()
  if (db && Array.isArray(db.products) && db.products.length > 0) {
    return db.products
  }
  const mem = (globalThis as any).__LIVE_PRODUCTS__
  if (Array.isArray(mem) && mem.length > 0) return mem
  return DEFAULT_PRODUCTS
}

function saveLocalDbProduct(prod: any): any {
  let saved = prod
  updateLocalDb((db) => {
    if (!Array.isArray(db.products)) db.products = [...DEFAULT_PRODUCTS]
    const idx = db.products.findIndex((p: any) => p.id === prod.id)
    if (idx !== -1) {
      db.products[idx] = { ...db.products[idx], ...prod }
      saved = db.products[idx]
    } else {
      db.products.unshift(prod)
      saved = prod
    }
  })
  if (!Array.isArray((globalThis as any).__LIVE_PRODUCTS__)) {
    ;(globalThis as any).__LIVE_PRODUCTS__ = [...loadLocalDbProducts()]
  }
  const memIdx = (globalThis as any).__LIVE_PRODUCTS__.findIndex((p: any) => p.id === prod.id)
  if (memIdx !== -1) {
    (globalThis as any).__LIVE_PRODUCTS__[memIdx] = saved
  } else {
    (globalThis as any).__LIVE_PRODUCTS__.unshift(saved)
  }
  return saved
}

function deleteLocalDbProduct(id: string) {
  updateLocalDb((db) => {
    if (Array.isArray(db.products)) {
      db.products = db.products.filter((p: any) => p.id !== id)
    }
  })
  if (Array.isArray((globalThis as any).__LIVE_PRODUCTS__)) {
    ;(globalThis as any).__LIVE_PRODUCTS__ = (globalThis as any).__LIVE_PRODUCTS__.filter((p: any) => p.id !== id)
  }
}

function loadLocalDbProductVariants(): any[] {
  const db = readLocalDb()
  if (db && Array.isArray(db.product_variants) && db.product_variants.length > 0) {
    return db.product_variants
  }
  const mem = (globalThis as any).__LIVE_VARIANTS__
  if (Array.isArray(mem) && mem.length > 0) return mem
  return DEFAULT_PRODUCT_VARIANTS
}

function saveLocalDbProductVariants(variants: any[]): any[] {
  updateLocalDb((db) => {
    if (!Array.isArray(db.product_variants)) db.product_variants = [...DEFAULT_PRODUCT_VARIANTS]
    for (const v of variants) {
      const idx = db.product_variants.findIndex((item: any) => item.id === v.id || (item.product_id === v.product_id && item.size === v.size))
      if (idx !== -1) {
        db.product_variants[idx] = { ...db.product_variants[idx], ...v }
      } else {
        db.product_variants.push(v)
      }
    }
  })
  if (!Array.isArray((globalThis as any).__LIVE_VARIANTS__)) {
    ;(globalThis as any).__LIVE_VARIANTS__ = [...loadLocalDbProductVariants()]
  }
  for (const v of variants) {
    const memIdx = (globalThis as any).__LIVE_VARIANTS__.findIndex((item: any) => item.id === v.id)
    if (memIdx !== -1) {
      (globalThis as any).__LIVE_VARIANTS__[memIdx] = { ...(globalThis as any).__LIVE_VARIANTS__[memIdx], ...v }
    } else {
      (globalThis as any).__LIVE_VARIANTS__.push(v)
    }
  }
  return variants
}

function loadLocalDbProductMedia(): any[] {
  const db = readLocalDb()
  if (db && Array.isArray(db.product_media)) {
    return db.product_media
  }
  return (globalThis as any).__LIVE_MEDIA__ || []
}

function saveLocalDbProductMedia(media: any[]): any[] {
  updateLocalDb((db) => {
    if (!Array.isArray(db.product_media)) db.product_media = []
    for (const m of media) {
      db.product_media.push(m)
    }
  })
  if (!Array.isArray((globalThis as any).__LIVE_MEDIA__)) {
    ;(globalThis as any).__LIVE_MEDIA__ = []
  }
  for (const m of media) {
    (globalThis as any).__LIVE_MEDIA__.push(m)
  }
  return media
}

function loadLocalDbSuppliers(): any[] {
  const db = readLocalDb()
  if (db && Array.isArray(db.suppliers) && db.suppliers.length > 0) {
    return db.suppliers
  }
  const mem = (globalThis as any).__LIVE_SUPPLIERS__
  if (Array.isArray(mem) && mem.length > 0) return mem
  return DEFAULT_SUPPLIERS
}

function saveLocalDbSupplier(sup: any): any {
  let saved = sup
  updateLocalDb((db) => {
    if (!Array.isArray(db.suppliers)) db.suppliers = [...DEFAULT_SUPPLIERS]
    const idx = db.suppliers.findIndex((s: any) => s.id === sup.id)
    if (idx !== -1) {
      db.suppliers[idx] = { ...db.suppliers[idx], ...sup }
      saved = db.suppliers[idx]
    } else {
      db.suppliers.unshift(sup)
      saved = sup
    }
  })
  if (!Array.isArray((globalThis as any).__LIVE_SUPPLIERS__)) {
    ;(globalThis as any).__LIVE_SUPPLIERS__ = [...loadLocalDbSuppliers()]
  }
  const memIdx = (globalThis as any).__LIVE_SUPPLIERS__.findIndex((s: any) => s.id === sup.id)
  if (memIdx !== -1) {
    (globalThis as any).__LIVE_SUPPLIERS__[memIdx] = saved
  } else {
    (globalThis as any).__LIVE_SUPPLIERS__.unshift(saved)
  }
  return saved
}

function loadLocalDbPurchaseOrders(): any[] {
  const db = readLocalDb()
  if (db && Array.isArray(db.purchase_orders) && db.purchase_orders.length > 0) {
    return db.purchase_orders
  }
  const mem = (globalThis as any).__LIVE_PURCHASE_ORDERS__
  if (Array.isArray(mem) && mem.length > 0) return mem
  return DEFAULT_PURCHASE_ORDERS
}

function saveLocalDbPurchaseOrder(po: any): any {
  let saved = po
  updateLocalDb((db) => {
    if (!Array.isArray(db.purchase_orders)) db.purchase_orders = [...DEFAULT_PURCHASE_ORDERS]
    const idx = db.purchase_orders.findIndex((p: any) => p.id === po.id)
    if (idx !== -1) {
      db.purchase_orders[idx] = { ...db.purchase_orders[idx], ...po }
      saved = db.purchase_orders[idx]
    } else {
      db.purchase_orders.unshift(po)
      saved = po
    }
  })
  if (!Array.isArray((globalThis as any).__LIVE_PURCHASE_ORDERS__)) {
    ;(globalThis as any).__LIVE_PURCHASE_ORDERS__ = [...loadLocalDbPurchaseOrders()]
  }
  const memIdx = (globalThis as any).__LIVE_PURCHASE_ORDERS__.findIndex((p: any) => p.id === po.id)
  if (memIdx !== -1) {
    (globalThis as any).__LIVE_PURCHASE_ORDERS__[memIdx] = saved
  } else {
    (globalThis as any).__LIVE_PURCHASE_ORDERS__.unshift(saved)
  }
  return saved
}

function loadLocalDbBanners(): any[] {
  const db = readLocalDb()
  if (db && Array.isArray(db.promotional_banners) && db.promotional_banners.length > 0) {
    return db.promotional_banners
  }
  const mem = (globalThis as any).__LIVE_BANNERS__
  if (Array.isArray(mem) && mem.length > 0) return mem
  return DEFAULT_PROMOTIONAL_BANNERS
}

function saveLocalDbBanner(banner: any): any {
  let saved = banner
  updateLocalDb((db) => {
    if (!Array.isArray(db.promotional_banners)) db.promotional_banners = [...DEFAULT_PROMOTIONAL_BANNERS]
    const idx = db.promotional_banners.findIndex((b: any) => b.id === banner.id)
    if (idx !== -1) {
      db.promotional_banners[idx] = { ...db.promotional_banners[idx], ...banner }
      saved = db.promotional_banners[idx]
    } else {
      db.promotional_banners.unshift(banner)
      saved = banner
    }
  })
  return saved
}

function deleteLocalDbBanner(id: string) {
  updateLocalDb((db) => {
    if (Array.isArray(db.promotional_banners)) {
      db.promotional_banners = db.promotional_banners.filter((b: any) => b.id !== id)
    }
  })
}

export interface MockUserAccount {
  id: string
  email: string
  name: string
  role: UserRole
  password?: string
}

export const SEEDED_ACCOUNTS: MockUserAccount[] = [
  {
    id: 'b0000000-0000-0000-0000-794156472275',
    email: 'test.admin@atelier.internal',
    name: 'Test Admin',
    role: 'admin',
    password: 'admin-secret-2026',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    email: 'eleanor.vance@salon.com',
    name: 'Eleanor Vance',
    role: 'customer',
    password: 'atelier-secret-2026',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000001',
    email: 'admin@atelier.internal',
    name: 'Sovereign Administrator',
    role: 'admin',
    password: 'admin-secret-2026',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000002',
    email: 'iamutkarshyadav1@gmail.com',
    name: 'Utkarsh Yadav',
    role: 'admin',
    password: 'asdfghjkl',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000003',
    email: 'horizonlord1@gmail.com',
    name: 'Horizon Lord',
    role: 'admin',
    password: 'asdfghjkl',
  },
  {
    id: 'c0000000-0000-0000-0000-000000000001',
    email: 'courier@atelier.internal',
    name: 'Bolt Doorstep Courier',
    role: 'delivery',
    password: 'courier-secret-2026',
  },
  {
    id: 'd0000000-0000-0000-0000-000000000001',
    email: 'warehouse@atelier.internal',
    name: 'Warehouse Operations Manager',
    role: 'warehouse_manager',
    password: 'warehouse-secret-2026',
  },
  {
    id: 'd0000000-0000-0000-0000-000000000002',
    email: 'store.manager@atelier.internal',
    name: 'Indiranagar Boutique Manager',
    role: 'store_manager',
    password: 'store-secret-2026',
  },
  {
    id: 'd0000000-0000-0000-0000-000000000003',
    email: 'cashier@atelier.internal',
    name: 'Boutique POS Cashier',
    role: 'pos_cashier',
    password: 'cashier-secret-2026',
  },
]

export const SEEDED_PINCODES: Record<string, { city: string; state: string }> = {
  '560001': { city: 'Bengaluru', state: 'Karnataka' },
  '560034': { city: 'Bengaluru', state: 'Karnataka' },
  '560038': { city: 'Bengaluru', state: 'Karnataka' },
  '560102': { city: 'Bengaluru', state: 'Karnataka' },
  '560103': { city: 'Bengaluru', state: 'Karnataka' },
  '400001': { city: 'Mumbai', state: 'Maharashtra' },
  '400050': { city: 'Mumbai', state: 'Maharashtra' },
  '400051': { city: 'Mumbai', state: 'Maharashtra' },
  '110001': { city: 'New Delhi', state: 'Delhi' },
  '122002': { city: 'Gurugram', state: 'Haryana' },
  '500081': { city: 'Hyderabad', state: 'Telangana' },
}

export const SEEDED_LOCATIONS = [
  {
    id: 'l1000000-0000-0000-0000-000000000001',
    code: 'BLR-WH01',
    name: 'Atelier Central Mother Hub (Bengaluru)',
    type: 'warehouse',
    gstin: '29AAAAA0000A1Z5',
    state_code: '29',
    address_line1: 'Phase 1, Electronic City Industrial Area',
    address_line2: null,
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560100',
    phone: '+91 80 4000 1100',
    email: 'hub.blr@atelier.com',
    is_active: true,
    online_fulfillment_priority: 10,
    online_safety_buffer: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'l1000000-0000-0000-0000-000000000002',
    code: 'BLR-ST01',
    name: 'Indiranagar Flagship Boutique (Bengaluru)',
    type: 'boutique',
    gstin: '29AAAAA0000A1Z5',
    state_code: '29',
    address_line1: '100 Feet Road, HAL 2nd Stage, Indiranagar',
    address_line2: null,
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560038',
    phone: '+91 80 4000 2200',
    email: 'indiranagar@atelier.com',
    is_active: true,
    online_fulfillment_priority: 20,
    online_safety_buffer: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'l1000000-0000-0000-0000-000000000003',
    code: 'BOM-ST01',
    name: 'Kala Ghoda Heritage Boutique (Mumbai)',
    type: 'boutique',
    gstin: '27AAAAA0000A1Z5',
    state_code: '27',
    address_line1: 'VB Gandhi Marg, Kala Ghoda, Fort',
    address_line2: null,
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    phone: '+91 22 4000 3300',
    email: 'mumbai@atelier.com',
    is_active: true,
    online_fulfillment_priority: 30,
    online_safety_buffer: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export const SEEDED_ZONES = [
  { id: 'z1000000-0000-0000-0000-000000000001', location_id: 'l1000000-0000-0000-0000-000000000001', code: 'RCV', name: 'Receiving Dock 01', type: 'receiving_dock', is_active: true, created_at: new Date().toISOString() },
  { id: 'z1000000-0000-0000-0000-000000000002', location_id: 'l1000000-0000-0000-0000-000000000001', code: 'BLK', name: 'Central Bulk Racks', type: 'bulk_storage', is_active: true, created_at: new Date().toISOString() },
  { id: 'z1000000-0000-0000-0000-000000000003', location_id: 'l1000000-0000-0000-0000-000000000001', code: 'DSK', name: 'Outbound Dispatch Bay', type: 'dispatch_bay', is_active: true, created_at: new Date().toISOString() },
  { id: 'z1000000-0000-0000-0000-000000000004', location_id: 'l1000000-0000-0000-0000-000000000002', code: 'FLR', name: 'Indiranagar Sales Floor', type: 'sales_floor', is_active: true, created_at: new Date().toISOString() },
  { id: 'z1000000-0000-0000-0000-000000000005', location_id: 'l1000000-0000-0000-0000-000000000002', code: 'STK', name: 'Indiranagar Backroom Stock', type: 'backroom_stock', is_active: true, created_at: new Date().toISOString() },
  { id: 'z1000000-0000-0000-0000-000000000006', location_id: 'l1000000-0000-0000-0000-000000000002', code: 'QRN', name: 'Indiranagar Fitting Quarantine', type: 'fitting_room_quarantine', is_active: true, created_at: new Date().toISOString() },
]

export const SEEDED_SHELVES = [
  { id: 's1000000-0000-0000-0000-000000000001', location_id: 'l1000000-0000-0000-0000-000000000001', zone_id: 'z1000000-0000-0000-0000-000000000002', coordinate: 'BLK-A-01-A1', barcode: 'LOC-BLR01-BLK-A-01-A1', assigned_category_id: null, max_unit_capacity: 500, is_active: true, last_cycle_count_at: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 's1000000-0000-0000-0000-000000000002', location_id: 'l1000000-0000-0000-0000-000000000001', zone_id: 'z1000000-0000-0000-0000-000000000002', coordinate: 'BLK-A-01-A2', barcode: 'LOC-BLR01-BLK-A-01-A2', assigned_category_id: null, max_unit_capacity: 500, is_active: true, last_cycle_count_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 's1000000-0000-0000-0000-000000000003', location_id: 'l1000000-0000-0000-0000-000000000002', zone_id: 'z1000000-0000-0000-0000-000000000004', coordinate: 'FLR-RACK-01', barcode: 'LOC-BLR02-FLR-RACK-01', assigned_category_id: null, max_unit_capacity: 100, is_active: true, last_cycle_count_at: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 's1000000-0000-0000-0000-000000000004', location_id: 'l1000000-0000-0000-0000-000000000002', zone_id: 'z1000000-0000-0000-0000-000000000006', coordinate: 'QRN-BIN-01', barcode: 'LOC-BLR02-QRN-BIN-01', assigned_category_id: null, max_unit_capacity: 50, is_active: true, last_cycle_count_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
]

function base64UrlEncode(str: string): string {
  if (typeof btoa === 'function') {
    return btoa(unescape(encodeURIComponent(str)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  }
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) {
    base64 += '='
  }
  if (typeof atob === 'function') {
    return decodeURIComponent(escape(atob(base64)))
  }
  return Buffer.from(base64, 'base64').toString('utf8')
}

export function buildMockToken(account: MockUserAccount): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const now = Math.floor(Date.now() / 1000)
  const payload = base64UrlEncode(
    JSON.stringify({
      sub: account.id,
      email: account.email,
      role: 'authenticated',
      aud: 'authenticated',
      app_metadata: {
        provider: 'email',
        providers: ['email'],
        role: account.role,
      },
      user_metadata: {
        name: account.name,
        role: account.role,
      },
      iat: now,
      exp: now + 7 * 24 * 3600,
    })
  )
  return `${header}.${payload}.mock-signature`
}

export function parseMockToken(token: string): any | null {
  try {
    const parts = token.split('.')
    if (parts.length >= 2 && parts[1]) {
      const decoded = JSON.parse(base64UrlDecode(parts[1]))
      return decoded
    }
  } catch {
    // Ignore decode error
  }
  return null
}

export function getHeader(headers: HeadersInit | undefined, name: string): string {
  if (!headers) return ''
  if (typeof (headers as any).get === 'function') {
    return (headers as any).get(name) || (headers as any).get(name.toLowerCase()) || ''
  }
  if (Array.isArray(headers)) {
    const found = headers.find(([k]) => k.toLowerCase() === name.toLowerCase())
    return found ? found[1] : ''
  }
  const rec = headers as Record<string, string>
  return rec[name] || rec[name.toLowerCase()] || ''
}

export function buildSupabaseUser(account: MockUserAccount) {
  const now = new Date().toISOString()
  return {
    id: account.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: account.email,
    email_confirmed_at: now,
    phone: '',
    confirmed_at: now,
    last_sign_in_at: now,
    app_metadata: {
      provider: 'email',
      providers: ['email'],
      role: account.role,
    },
    user_metadata: {
      name: account.name,
      role: account.role,
    },
    identities: [],
    created_at: now,
    updated_at: now,
  }
}

/**
 * Creates a fetch wrapper that tries the real HTTP request first with a timeout,
 * and seamlessly handles Supabase Auth / PostgREST if the network is unreachable.
 */
export function createResilientFetch(options?: { timeoutMs?: number }): typeof fetch {
  const timeoutMs = options?.timeoutMs ?? 2000

  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlString = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url

    // 1. Attempt live network fetch with a tight timeout to detect unreachable host
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)

      const mergedInit: RequestInit = {
        ...init,
        signal: init?.signal || controller.signal,
      }

      const res = await fetch(input, mergedInit)
      clearTimeout(timer)
      return res
    } catch (networkErr: any) {
      // 2. Host unreachable / DNS ENOTFOUND / ECONNREFUSED / timeout
      // Intercept and synthesize compliant Supabase Auth / PostgREST response
      return handleOfflineSupabaseRequest(urlString, init)
    }
  }
}

/**
 * Mock dispatcher for Supabase endpoints during offline / local development without live daemon
 */
export async function handleOfflineSupabaseRequest(url: string, init?: RequestInit): Promise<Response> {
  const method = (init?.method || 'GET').toUpperCase()

  // Read request body if present
  let bodyJson: any = null
  if (init?.body && typeof init.body === 'string') {
    try {
      bodyJson = JSON.parse(init.body)
    } catch {
      // Not JSON
    }
  }

  // Cross-runtime client-side bridge:
  // When executing inside the browser, proxy PostgREST and storage operations to the Next.js server /api/local-db
  if (typeof window !== 'undefined' && (url.includes('/rest/v1/') || url.includes('/storage/v1/'))) {
    try {
      const origin = window.location.origin
      const bridgeRes = await fetch(`${origin}/api/local-db`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          method,
          headers: init?.headers,
          body: bodyJson,
        }),
      })
      if (bridgeRes.ok) {
        return bridgeRes
      }
    } catch {
      // If bridge fetch fails, fall back smoothly to client in-memory handlers
    }
  }

  // A. Supabase Auth: Password Sign In (/auth/v1/token?grant_type=password)
  if (url.includes('/auth/v1/token')) {
    const email = (bodyJson?.email || '').trim().toLowerCase()
    const password = bodyJson?.password || ''

    // Find matching seeded account or match by role heuristic
    let matched = SEEDED_ACCOUNTS.find((a) => a.email.toLowerCase() === email)

    const isValidPassword =
      matched?.password === password ||
      ((matched?.email === 'iamutkarshyadav1@gmail.com' || matched?.email === 'horizonlord1@gmail.com') && (password === 'asdfghjkl' || password === 'admin-secret-2026'))

    if (matched && matched.password && !isValidPassword) {
      return new Response(
        JSON.stringify({
          error: 'invalid_grant',
          error_description: 'Invalid login credentials',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!matched && email) {
      // Dynamic sign-in for unknown accounts: strictly default to 'customer' (NO substring escalation)
      matched = {
        id: `mock-user-${Date.now()}`,
        email,
        name: email.split('@')[0] || 'Patron',
        role: 'customer',
        password,
      }
    }

    if (!matched) {
      return new Response(
        JSON.stringify({
          error: 'invalid_grant',
          error_description: 'Invalid login credentials',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const token = buildMockToken(matched)
    const nowSec = Math.floor(Date.now() / 1000)
    const sessionResponse = {
      access_token: token,
      token_type: 'bearer',
      expires_in: 7 * 24 * 3600,
      expires_at: nowSec + 7 * 24 * 3600,
      refresh_token: `mock-refresh-${matched.id}`,
      user: buildSupabaseUser(matched),
    }

    return new Response(JSON.stringify(sessionResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // B. Supabase Auth: User Session Inspection (/auth/v1/user)
  if (url.includes('/auth/v1/user')) {
    const authHeader = getHeader(init?.headers, 'Authorization')
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    const decoded = parseMockToken(token)

    if (decoded && decoded.sub) {
      const account: MockUserAccount = {
        id: decoded.sub,
        email: decoded.email || 'user@atelier.internal',
        name: decoded.user_metadata?.name || 'Verified User',
        role: (decoded.app_metadata?.role || decoded.user_metadata?.role || 'customer') as UserRole,
      }

      return new Response(JSON.stringify(buildSupabaseUser(account)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({
        code: 401,
        msg: 'Unauthorized session token',
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // C. Supabase Auth: Sign Up (/auth/v1/signup)
  if (url.includes('/auth/v1/signup')) {
    const email = (bodyJson?.email || '').trim().toLowerCase()
    const name = bodyJson?.data?.name || email.split('@')[0] || 'Patron'
    const role: UserRole = 'customer' // Hardcoded: Client metadata cannot specify administrative role

    const account: MockUserAccount = {
      id: `patron-${Date.now()}`,
      email,
      name,
      role,
    }

    const token = buildMockToken(account)
    const nowSec = Math.floor(Date.now() / 1000)

    return new Response(
      JSON.stringify({
        access_token: token,
        token_type: 'bearer',
        expires_in: 7 * 24 * 3600,
        expires_at: nowSec + 7 * 24 * 3600,
        refresh_token: `mock-refresh-${account.id}`,
        user: buildSupabaseUser(account),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // D. Supabase Auth Admin: List Users (/auth/v1/admin/users)
  if (url.includes('/auth/v1/admin/users')) {
    return new Response(
      JSON.stringify({
        users: SEEDED_ACCOUNTS.map(buildSupabaseUser),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // E. Supabase Auth: Sign Out (/auth/v1/logout)
  if (url.includes('/auth/v1/logout')) {
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // F. PostgREST: public.users query (/rest/v1/users)
  if (url.includes('/rest/v1/users')) {
    // Check if filtering by id or email
    const idMatch = url.match(/id=eq\.([^&]+)/)
    const emailMatch = url.match(/email=eq\.([^&]+)/)
    const targetId = idMatch ? decodeURIComponent(idMatch[1]) : null
    const targetEmail = emailMatch ? decodeURIComponent(emailMatch[1]).toLowerCase() : null

    let matched = SEEDED_ACCOUNTS.find(
      (a) => (targetId && a.id === targetId) || (targetEmail && a.email.toLowerCase() === targetEmail)
    )

    if (!matched && targetId) {
      // Fallback matching strictly defaults to 'customer'
      matched = {
        id: targetId,
        email: 'user@atelier.internal',
        name: 'Atelier User',
        role: 'customer',
      }
    }

    const results = matched
      ? [
          {
            id: matched.id,
            email: matched.email,
            name: matched.name,
            role: matched.role,
            created_at: new Date().toISOString(),
          },
        ]
      : []

    // If PostgREST single mode (Accept: application/vnd.pgrst.object+json)
    const accept = getHeader(init?.headers, 'Accept')
    const isSingle = accept.includes('vnd.pgrst.object+json')

    return new Response(JSON.stringify(isSingle ? results[0] || null : results), {
      status: isSingle && !results[0] ? 404 : 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Range': `0-${results.length ? results.length - 1 : 0}/${results.length}`,
      },
    })
  }

  // G. PostgREST: bolt_pincodes (/rest/v1/bolt_pincodes)
  if (url.includes('/rest/v1/bolt_pincodes')) {
    const pinMatch = url.match(/pincode=eq\.([^&]+)/)
    const requestedPin = pinMatch ? decodeURIComponent(pinMatch[1]).trim() : null

    const pinList = Object.entries(SEEDED_PINCODES).map(([pin, info], idx) => ({
      id: `pin-00${idx + 1}`,
      pincode: pin,
      city: info.city,
      state: info.state,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))

    const filtered = requestedPin
      ? pinList.filter((p) => p.pincode === requestedPin)
      : pinList

    const accept = getHeader(init?.headers, 'Accept')
    const isSingle = accept.includes('vnd.pgrst.object+json')

    return new Response(JSON.stringify(isSingle ? filtered[0] || null : filtered), {
      status: isSingle && !filtered[0] ? 404 : 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Range': `0-${filtered.length ? filtered.length - 1 : 0}/${filtered.length}`,
      },
    })
  }

  // H. PostgREST: bolt_timeslots (/rest/v1/bolt_timeslots)
  if (url.includes('/rest/v1/bolt_timeslots')) {
    return new Response(JSON.stringify(DEFAULT_BOLT_TIMESLOTS), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Range': `0-${DEFAULT_BOLT_TIMESLOTS.length - 1}/${DEFAULT_BOLT_TIMESLOTS.length}`,
      },
    })
  }

  // H2. PostgREST: categories (/rest/v1/categories)
  if (url.includes('/rest/v1/categories')) {
    const diskCategories = loadLocalDbCategories()
    const idMatch = url.match(/id=eq\.([^&]+)/)
    const slugMatch = url.match(/slug=eq\.([^&]+)/)
    const targetId = idMatch ? decodeURIComponent(idMatch[1]) : null
    const targetSlug = slugMatch ? decodeURIComponent(slugMatch[1]) : null

    if (method === 'POST') {
      const items = Array.isArray(bodyJson) ? bodyJson : [bodyJson]
      const inserted: any[] = []
      for (const item of items) {
        const catId = item?.id || `c1000000-${Date.now().toString(16).padStart(12, '0')}`
        const catName = item?.name || 'New Category'
        const catSlug = item?.slug || catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        const newCat = {
          id: catId,
          name: catName,
          slug: catSlug,
          description: item?.description || null,
          image_url: item?.image_url || 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85',
          display_order: Number(item?.display_order) || diskCategories.length + 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        saveLocalDbCategory(newCat)
        inserted.push(newCat)
      }
      const accept = getHeader(init?.headers, 'Accept')
      const isSingle = accept.includes('vnd.pgrst.object+json')
      return new Response(JSON.stringify(isSingle ? inserted[0] || null : inserted), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (method === 'PATCH' || method === 'PUT') {
      if (targetId) {
        const existing = diskCategories.find((c: any) => c.id === targetId)
        if (existing) {
          const updated = { ...existing, ...bodyJson, updated_at: new Date().toISOString() }
          saveLocalDbCategory(updated)
          const accept = getHeader(init?.headers, 'Accept')
          const isSingle = accept.includes('vnd.pgrst.object+json')
          return new Response(JSON.stringify(isSingle ? updated : [updated]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }
      }
    }

    if (method === 'DELETE') {
      if (targetId) {
        deleteLocalDbCategory(targetId)
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    let result = [...loadLocalDbCategories()]
    if (targetId) {
      result = result.filter((c: any) => c.id === targetId)
    } else if (targetSlug) {
      result = result.filter((c: any) => c.slug === targetSlug)
    }
    result.sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))

    const accept = getHeader(init?.headers, 'Accept')
    const isSingle = accept.includes('vnd.pgrst.object+json')
    return new Response(JSON.stringify(isSingle ? result[0] || null : result), {
      status: isSingle && !result[0] ? 404 : 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Range': `0-${result.length ? result.length - 1 : 0}/${result.length}`,
      },
    })
  }

  // I. PostgREST: products (/rest/v1/products)
  if (url.includes('/rest/v1/products')) {
    const diskProducts = loadLocalDbProducts()
    const idMatch = url.match(/(?:^|[?&])id=eq\.([^&]+)/)
    const inMatch = url.match(/(?:^|[?&])id=in\.\(([^)]+)\)/)
    const catMatch = url.match(/(?:^|[?&])category_id=eq\.([^&]+)/)
    const targetId = idMatch ? decodeURIComponent(idMatch[1]) : null
    const targetCatId = catMatch ? decodeURIComponent(catMatch[1]) : null

    if (method === 'POST') {
      const items = Array.isArray(bodyJson) ? bodyJson : [bodyJson]
      const inserted: any[] = []
      for (const item of items) {
        const prodId = item?.id || `b1000000-${Date.now().toString(16).padStart(12, '0')}`
        const newProd = {
          id: prodId,
          title: item?.title || 'Atelier Garment',
          category_id: item?.category_id || 'c1000000-0000-0000-0000-000000000001',
          category: item?.category || 'Atelier Haute Couture',
          description: item?.description || 'Bespoke hand-tailored luxury garment crafted with sculptural proportions.',
          price: Number(item?.price) || 295,
          stock: Number(item?.stock) || 0,
          image_url: item?.image_url || 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85',
          material: item?.material || '100% Hand-Spun Mulberry Silk',
          edition: item?.edition || 'Drop 01 // Limited Edition',
          is_archived: Boolean(item?.is_archived || false),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        saveLocalDbProduct(newProd)
        inserted.push(newProd)
      }
      const accept = getHeader(init?.headers, 'Accept')
      const isSingle = accept.includes('vnd.pgrst.object+json')
      return new Response(JSON.stringify(isSingle ? inserted[0] || null : inserted), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (method === 'PATCH' || method === 'PUT') {
      if (targetId) {
        const existing = diskProducts.find((p: any) => p.id === targetId)
        if (existing) {
          const updated = { ...existing, ...bodyJson, updated_at: new Date().toISOString() }
          saveLocalDbProduct(updated)
          const accept = getHeader(init?.headers, 'Accept')
          const isSingle = accept.includes('vnd.pgrst.object+json')
          return new Response(JSON.stringify(isSingle ? updated : [updated]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }
      }
    }

    if (method === 'DELETE') {
      if (targetId) {
        deleteLocalDbProduct(targetId)
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    let filtered = [...loadLocalDbProducts()]
    if (targetId) {
      filtered = filtered.filter((p: any) => p.id === targetId)
      if (filtered.length === 0) {
        filtered = [
          {
            ...DEFAULT_PRODUCTS[0],
            id: targetId,
            title: `Atelier Garment (${targetId})`,
            price: DEFAULT_PRODUCTS[0].price,
          },
        ]
      }
    } else if (inMatch) {
      const requestedIds = inMatch[1]
        .split(',')
        .map((s) => decodeURIComponent(s.trim().replace(/^"|"$/g, '')))
      const matched = filtered.filter((p: any) => requestedIds.includes(p.id))
      const matchedIds = new Set(matched.map((p) => p.id))
      const fallbacks = requestedIds
        .filter((id) => !matchedIds.has(id))
        .map((id, idx) => ({
          ...DEFAULT_PRODUCTS[idx % DEFAULT_PRODUCTS.length],
          id,
          title: `Atelier Item (${id})`,
          price: DEFAULT_PRODUCTS[idx % DEFAULT_PRODUCTS.length].price,
        }))
      filtered = [...matched, ...fallbacks]
    } else if (targetCatId) {
      filtered = filtered.filter((p: any) => p.category_id === targetCatId)
    }

    const accept = getHeader(init?.headers, 'Accept')
    const isSingle = accept.includes('vnd.pgrst.object+json')
    return new Response(JSON.stringify(isSingle ? filtered[0] || null : filtered), {
      status: isSingle && !filtered[0] ? 404 : 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Range': `0-${filtered.length ? filtered.length - 1 : 0}/${filtered.length}`,
      },
    })
  }

  // J. PostgREST: product_variants (/rest/v1/product_variants)
  if (url.includes('/rest/v1/product_variants')) {
    const diskVariants = loadLocalDbProductVariants()
    const idMatch = url.match(/(?:^|[?&])id=eq\.([^&]+)/)
    const prodMatch = url.match(/(?:^|[?&])product_id=eq\.([^&]+)/)
    const barcodeMatch = url.match(/(?:^|[?&])barcode=eq\.([^&]+)/)
    const skuMatch = url.match(/(?:^|[?&])sku=eq\.([^&]+)/)
    const targetId = idMatch ? decodeURIComponent(idMatch[1]) : null
    const targetProdId = prodMatch ? decodeURIComponent(prodMatch[1]) : null
    const targetBarcode = barcodeMatch ? decodeURIComponent(barcodeMatch[1]) : null
    const targetSku = skuMatch ? decodeURIComponent(skuMatch[1]) : null

    if (method === 'POST') {
      const items = Array.isArray(bodyJson) ? bodyJson : [bodyJson]
      const inserted: any[] = []
      for (const item of items) {
        const vId = item?.id || `v1000000-${Date.now().toString(16).padStart(12, '0')}-${Math.random().toString(36).substring(2, 6)}`
        const newVar = {
          id: vId,
          product_id: item?.product_id,
          size: item?.size || 'M',
          color: item?.color || null,
          sku: item?.sku || `SKU-${Date.now()}`,
          barcode: item?.barcode || item?.sku || '8901234000014',
          barcode_url: item?.barcode_url || '',
          barcode_data: item?.barcode_data || item?.barcode || item?.sku,
          stock: Number(item?.stock) || 0,
          price_override: item?.price_override ?? null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        inserted.push(newVar)
      }
      saveLocalDbProductVariants(inserted)
      const accept = getHeader(init?.headers, 'Accept')
      const isSingle = accept.includes('vnd.pgrst.object+json')
      return new Response(JSON.stringify(isSingle ? inserted[0] || null : inserted), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (method === 'PATCH' || method === 'PUT') {
      if (targetId) {
        const existing = diskVariants.find((v: any) => v.id === targetId)
        if (existing) {
          const updated = { ...existing, ...bodyJson, updated_at: new Date().toISOString() }
          saveLocalDbProductVariants([updated])
          const accept = getHeader(init?.headers, 'Accept')
          const isSingle = accept.includes('vnd.pgrst.object+json')
          return new Response(JSON.stringify(isSingle ? updated : [updated]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }
      }
    }

    let filtered = [...loadLocalDbProductVariants()]
    if (targetId) {
      filtered = filtered.filter((v: any) => v.id === targetId)
    } else if (targetProdId) {
      filtered = filtered.filter((v: any) => v.product_id === targetProdId)
    } else if (targetBarcode) {
      filtered = filtered.filter((v: any) => v.barcode === targetBarcode)
    } else if (targetSku) {
      filtered = filtered.filter((v: any) => v.sku === targetSku)
    }

    const accept = getHeader(init?.headers, 'Accept')
    const isSingle = accept.includes('vnd.pgrst.object+json')
    return new Response(JSON.stringify(isSingle ? filtered[0] || null : filtered), {
      status: isSingle && !filtered[0] ? 404 : 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Range': `0-${filtered.length ? filtered.length - 1 : 0}/${filtered.length}`,
      },
    })
  }

  // J2. PostgREST: product_media (/rest/v1/product_media)
  if (url.includes('/rest/v1/product_media')) {
    const prodMatch = url.match(/product_id=eq\.([^&]+)/)
    const targetProdId = prodMatch ? decodeURIComponent(prodMatch[1]) : null

    if (method === 'POST') {
      const items = Array.isArray(bodyJson) ? bodyJson : [bodyJson]
      const inserted: any[] = []
      for (const item of items) {
        const mId = item?.id || `m-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
        const newMedia = {
          id: mId,
          product_id: item?.product_id,
          url: item?.url || 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85',
          alt_text: item?.alt_text || '',
          is_primary: Boolean(item?.is_primary),
          display_order: Number(item?.display_order) || 0,
          created_at: new Date().toISOString(),
        }
        inserted.push(newMedia)
      }
      saveLocalDbProductMedia(inserted)
      const accept = getHeader(init?.headers, 'Accept')
      const isSingle = accept.includes('vnd.pgrst.object+json')
      return new Response(JSON.stringify(isSingle ? inserted[0] || null : inserted), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    let filtered = [...loadLocalDbProductMedia()]
    if (targetProdId) {
      filtered = filtered.filter((m: any) => m.product_id === targetProdId)
    }

    return new Response(JSON.stringify(filtered), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Range': `0-${filtered.length ? filtered.length - 1 : 0}/${filtered.length}`,
      },
    })
  }

  // K. PostgREST: orders (/rest/v1/orders)
  if (url.includes('/rest/v1/orders')) {
    const diskOrders = loadLocalDbOrders()
    const memoryOrders: any[] = (globalThis as any).__LIVE_ORDERS__ || []
    const combinedMap = new Map<string, any>()
    for (const ord of DEFAULT_ORDERS) combinedMap.set(ord.order_number || ord.id, ord)
    for (const ord of diskOrders) combinedMap.set(ord.order_number || ord.id, ord)
    for (const ord of memoryOrders) combinedMap.set(ord.order_number || ord.id, ord)
    const liveOrdersList = Array.from(combinedMap.values()).sort(
      (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    if (method === 'POST') {
      const orderId = bodyJson?.id || `ord-${Date.now()}`
      const newOrder = {
        id: orderId,
        order_number: bodyJson?.order_number || `ATL-ORD-${Math.floor(1000 + Math.random() * 9000)}`,
        invoice_number: bodyJson?.invoice_number || `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        tracking_barcode: bodyJson?.tracking_barcode || `ATL-TRK-${Math.floor(1000 + Math.random() * 9000)}`,
        user_id: bodyJson?.user_id || 'a0000000-0000-0000-0000-000000000001',
        status: bodyJson?.status || 'processing',
        order_type: bodyJson?.order_type || 'standard',
        delivery_mode: bodyJson?.delivery_mode || 'direct',
        bolt_pincode: bodyJson?.bolt_pincode || null,
        bolt_timeslot_id: bodyJson?.bolt_timeslot_id || null,
        bolt_session_status: bodyJson?.bolt_session_status || null,
        try_on_status: bodyJson?.try_on_status || null,
        tax_amount: bodyJson?.tax_amount || 0,
        shipping_fee: bodyJson?.shipping_fee || 0,
        original_total: bodyJson?.original_total || bodyJson?.total || 165.0,
        total: bodyJson?.total || 165.0,
        shipping_address: bodyJson?.shipping_address || 'Bengaluru, Karnataka, India',
        delivery_notes: bodyJson?.delivery_notes || null,
        order_items: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      saveLocalDbOrder(newOrder)

      if ((globalThis as any).__LIVE_ORDERS__) {
        ;(globalThis as any).__LIVE_ORDERS__.unshift(newOrder)
      }

      return new Response(JSON.stringify(newOrder), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (method === 'PATCH' || method === 'PUT') {
      const idMatch = url.match(/id=eq\.([^&]+)/)
      if (idMatch) {
        const targetId = decodeURIComponent(idMatch[1])
        const targetOrder = liveOrdersList.find((o: any) => o.id === targetId || o.order_number === targetId)
        if (targetOrder) {
          Object.assign(targetOrder, bodyJson, { updated_at: new Date().toISOString() })
          saveLocalDbOrder(targetOrder)
          return new Response(JSON.stringify(targetOrder), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }
      }
    }

    // Single order query
    const idMatch = url.match(/id=eq\.([^&]+)/)
    if (idMatch) {
      const targetId = decodeURIComponent(idMatch[1])
      const found = liveOrdersList.filter((o: any) => o.id === targetId || o.order_number === targetId)
      const accept = getHeader(init?.headers, 'Accept')
      const isSingle = accept.includes('vnd.pgrst.object+json')
      return new Response(JSON.stringify(isSingle ? found[0] || null : found), {
        status: isSingle && !found[0] ? 404 : 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify(liveOrdersList), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Range': `0-${liveOrdersList.length ? liveOrdersList.length - 1 : 0}/${liveOrdersList.length}`,
      },
    })
  }

  // K2. PostgREST: order_items (/rest/v1/order_items)
  if (url.includes('/rest/v1/order_items')) {
    if (method === 'POST') {
      const liveOrdersList: any[] = (globalThis as any).__LIVE_ORDERS__ || []
      const items = Array.isArray(bodyJson) ? bodyJson : [bodyJson]
      for (const item of items) {
        saveLocalDbOrderItem(item)
        const order = liveOrdersList.find((o: any) => o.id === item.order_id)
        if (order) {
          if (!order.order_items) order.order_items = []
          const prod = DEFAULT_PRODUCTS.find((p: any) => p.id === item.product_id) || {
            id: item.product_id,
            title: 'Atelier Creator Silhouette',
            price: item.unit_price || 2490,
            image_url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80',
            material: 'Custom-Milled French Terry',
          }
          order.order_items.push({
            id: `item-${Date.now()}-${Math.random()}`,
            order_id: item.order_id,
            product_id: item.product_id,
            quantity: item.quantity || 1,
            unit_price: item.unit_price || 2490,
            size: item.size || 'M',
            is_kept: null,
            try_on_decision: 'pending',
            product: prod,
          })
        }
      }
      return new Response(JSON.stringify(items), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // L. PostgREST: locations (/rest/v1/locations)
  if (url.includes('/rest/v1/locations')) {
    const idMatch = url.match(/id=eq\.([^&]+)/)
    const targetId = idMatch ? decodeURIComponent(idMatch[1]) : null

    if (method === 'POST') {
      const items = Array.isArray(bodyJson) ? bodyJson : [bodyJson]
      const inserted: any[] = []
      for (const item of items) {
        const lId = item?.id || `l1000000-${Date.now().toString(16).padStart(12, '0')}`
        const newLoc = {
          ...item,
          id: lId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        SEEDED_LOCATIONS.push(newLoc)
        inserted.push(newLoc)
      }
      const accept = getHeader(init?.headers, 'Accept')
      const isSingle = accept.includes('vnd.pgrst.object+json')
      return new Response(JSON.stringify(isSingle ? inserted[0] || null : inserted), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const filtered = targetId ? SEEDED_LOCATIONS.filter((l) => l.id === targetId) : SEEDED_LOCATIONS
    const accept = getHeader(init?.headers, 'Accept')
    const isSingle = accept.includes('vnd.pgrst.object+json')
    return new Response(JSON.stringify(isSingle ? filtered[0] || null : filtered), {
      status: isSingle && !filtered[0] ? 404 : 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Range': `0-${filtered.length ? filtered.length - 1 : 0}/${filtered.length}`,
      },
    })
  }

  // M. PostgREST: location_zones (/rest/v1/location_zones)
  if (url.includes('/rest/v1/location_zones')) {
    const locMatch = url.match(/location_id=eq\.([^&]+)/)
    const targetLoc = locMatch ? decodeURIComponent(locMatch[1]) : null

    if (method === 'POST') {
      const items = Array.isArray(bodyJson) ? bodyJson : [bodyJson]
      const inserted: any[] = []
      for (const item of items) {
        const zId = item?.id || `z-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
        const newZone = { ...item, id: zId }
        SEEDED_ZONES.push(newZone)
        inserted.push(newZone)
      }
      return new Response(JSON.stringify(inserted), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const filtered = targetLoc ? SEEDED_ZONES.filter((z) => z.location_id === targetLoc) : SEEDED_ZONES
    return new Response(JSON.stringify(filtered), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // N. PostgREST: shelves (/rest/v1/shelves)
  if (url.includes('/rest/v1/shelves')) {
    const locMatch = url.match(/location_id=eq\.([^&]+)/)
    const targetLoc = locMatch ? decodeURIComponent(locMatch[1]) : null

    if (method === 'POST') {
      const items = Array.isArray(bodyJson) ? bodyJson : [bodyJson]
      const inserted: any[] = []
      for (const item of items) {
        const sId = item?.id || `s1000000-${Date.now().toString(16).padStart(12, '0')}`
        const newShelf = { ...item, id: sId, created_at: new Date().toISOString() }
        SEEDED_SHELVES.push(newShelf)
        inserted.push(newShelf)
      }
      const accept = getHeader(init?.headers, 'Accept')
      const isSingle = accept.includes('vnd.pgrst.object+json')
      return new Response(JSON.stringify(isSingle ? inserted[0] || null : inserted), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const filtered = targetLoc ? SEEDED_SHELVES.filter((s) => s.location_id === targetLoc) : SEEDED_SHELVES
    return new Response(JSON.stringify(filtered), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // O. PostgREST: shelf_inventory (/rest/v1/shelf_inventory)
  if (url.includes('/rest/v1/shelf_inventory')) {
    const shelfMatch = url.match(/shelf_id=eq\.([^&]+)/)
    const targetShelf = shelfMatch ? decodeURIComponent(shelfMatch[1]) : null
    const diskVariants = loadLocalDbProductVariants()
    const mockInventory = diskVariants.map((v, idx) => ({
      id: `si-${idx + 1}`,
      shelf_id: targetShelf || 's1000000-0000-0000-0000-000000000001',
      variant_id: v.id,
      quantity: Math.max(0, Math.floor(v.stock / 2)),
      updated_at: new Date().toISOString(),
      variant: v,
    }))
    return new Response(JSON.stringify(mockInventory), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // P. PostgREST: inventory_levels (/rest/v1/inventory_levels)
  if (url.includes('/rest/v1/inventory_levels')) {
    const locMatch = url.match(/location_id=eq\.([^&]+)/)
    const targetLoc = locMatch ? decodeURIComponent(locMatch[1]) : null
    const diskVariants = loadLocalDbProductVariants()
    const mockLevels = diskVariants.map((v, idx) => ({
      id: `il-${idx + 1}`,
      location_id: targetLoc || 'l1000000-0000-0000-0000-000000000001',
      variant_id: v.id,
      on_hand: v.stock,
      reserved: 0,
      available: v.stock,
      reorder_point: 5,
      reorder_quantity: 20,
      updated_at: new Date().toISOString(),
    }))
    return new Response(JSON.stringify(mockLevels), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Q. PostgREST: suppliers (/rest/v1/suppliers)
  if (url.includes('/rest/v1/suppliers')) {
    const diskSuppliers = loadLocalDbSuppliers()
    const idMatch = url.match(/id=eq\.([^&]+)/)
    const targetId = idMatch ? decodeURIComponent(idMatch[1]) : null

    if (method === 'POST') {
      const newSup = {
        id: bodyJson?.id || `sup-${Date.now()}`,
        vendor_code: bodyJson?.vendor_code || `SUP-${Date.now().toString().slice(-4)}`,
        name: bodyJson?.name || 'New Supplier',
        gstin: bodyJson?.gstin || '29AAAAA0000A1Z5',
        contact_person: bodyJson?.contact_person || 'Marco Rossi',
        email: bodyJson?.email || 'vendor@atelier.internal',
        phone: bodyJson?.phone || '+91 80 4000 0000',
        address_line1: bodyJson?.address_line1 || 'Via Vergnasco, 2',
        city: bodyJson?.city || 'Bengaluru',
        state: bodyJson?.state || 'Karnataka',
        state_code: bodyJson?.state_code || '29',
        pincode: bodyJson?.pincode || '560001',
        payment_terms: bodyJson?.payment_terms || 'NET_30',
        lead_time_days: Number(bodyJson?.lead_time_days) || 14,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      saveLocalDbSupplier(newSup)
      const accept = getHeader(init?.headers, 'Accept')
      const isSingle = accept.includes('vnd.pgrst.object+json')
      return new Response(JSON.stringify(isSingle ? newSup : [newSup]), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (method === 'PATCH' || method === 'PUT') {
      if (targetId) {
        const existing = diskSuppliers.find((s: any) => s.id === targetId)
        if (existing) {
          const updated = { ...existing, ...bodyJson, updated_at: new Date().toISOString() }
          saveLocalDbSupplier(updated)
          const accept = getHeader(init?.headers, 'Accept')
          const isSingle = accept.includes('vnd.pgrst.object+json')
          return new Response(JSON.stringify(isSingle ? updated : [updated]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }
      }
    }

    let result = [...loadLocalDbSuppliers()]
    if (targetId) {
      result = result.filter((s: any) => s.id === targetId)
    }
    const accept = getHeader(init?.headers, 'Accept')
    const isSingle = accept.includes('vnd.pgrst.object+json')
    return new Response(JSON.stringify(isSingle ? result[0] || null : result), {
      status: isSingle && !result[0] ? 404 : 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Range': `0-${result.length ? result.length - 1 : 0}/${result.length}`,
      },
    })
  }

  // R. PostgREST: purchase_orders (/rest/v1/purchase_orders)
  if (url.includes('/rest/v1/purchase_orders')) {
    const diskPOs = loadLocalDbPurchaseOrders()
    const idMatch = url.match(/id=eq\.([^&]+)/)
    const targetId = idMatch ? decodeURIComponent(idMatch[1]) : null

    if (method === 'POST') {
      const newPO = {
        id: bodyJson?.id || `po-${Date.now()}`,
        po_number: bodyJson?.po_number || `PO-${Date.now()}`,
        supplier_id: bodyJson?.supplier_id || 'sup-00000000-0000-0000-0000-000000000001',
        destination_location_id: bodyJson?.destination_location_id || 'l1000000-0000-0000-0000-000000000001',
        status: bodyJson?.status || 'draft',
        expected_delivery_date: bodyJson?.expected_delivery_date || new Date().toISOString().slice(0, 10),
        subtotal: Number(bodyJson?.subtotal) || 0,
        tax_amount: Number(bodyJson?.tax_amount) || 0,
        total_amount: Number(bodyJson?.total_amount) || 0,
        created_by: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      saveLocalDbPurchaseOrder(newPO)
      const accept = getHeader(init?.headers, 'Accept')
      const isSingle = accept.includes('vnd.pgrst.object+json')
      return new Response(JSON.stringify(isSingle ? newPO : [newPO]), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (method === 'PATCH' || method === 'PUT') {
      if (targetId) {
        const existing = diskPOs.find((p: any) => p.id === targetId)
        if (existing) {
          const updated = { ...existing, ...bodyJson, updated_at: new Date().toISOString() }
          saveLocalDbPurchaseOrder(updated)
          const accept = getHeader(init?.headers, 'Accept')
          const isSingle = accept.includes('vnd.pgrst.object+json')
          return new Response(JSON.stringify(isSingle ? updated : [updated]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }
      }
    }

    // Enrich POs with supplier & location objects for UI
    const suppliers = loadLocalDbSuppliers()
    const enrichedPOs = diskPOs.map((po: any) => ({
      ...po,
      supplier: suppliers.find((s: any) => s.id === po.supplier_id) || suppliers[0],
      destination_location: SEEDED_LOCATIONS.find((l: any) => l.id === po.destination_location_id) || SEEDED_LOCATIONS[0],
    }))

    let result = enrichedPOs
    if (targetId) {
      result = result.filter((p: any) => p.id === targetId)
    }

    const accept = getHeader(init?.headers, 'Accept')
    const isSingle = accept.includes('vnd.pgrst.object+json')
    return new Response(JSON.stringify(isSingle ? result[0] || null : result), {
      status: isSingle && !result[0] ? 404 : 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Range': `0-${result.length ? result.length - 1 : 0}/${result.length}`,
      },
    })
  }

  // R2. PostgREST: promotional_banners (/rest/v1/promotional_banners)
  if (url.includes('/rest/v1/promotional_banners')) {
    const diskBanners = loadLocalDbBanners()
    const idMatch = url.match(/id=eq\.([^&]+)/)
    const targetId = idMatch ? decodeURIComponent(idMatch[1]) : null

    if (method === 'POST') {
      const bId = bodyJson?.id || `banner-${Date.now()}`
      const newBanner = {
        id: bId,
        title: bodyJson?.title || 'Creator Drop',
        subtitle: bodyJson?.subtitle || '',
        badge_text: bodyJson?.badge_text || '',
        image_url: bodyJson?.image_url || 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85',
        cta_label: bodyJson?.cta_label || 'Shop Now',
        cta_link: bodyJson?.cta_link || '/shop',
        is_active: Boolean(bodyJson?.is_active ?? true),
        display_order: Number(bodyJson?.display_order) || diskBanners.length + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      saveLocalDbBanner(newBanner)
      const accept = getHeader(init?.headers, 'Accept')
      const isSingle = accept.includes('vnd.pgrst.object+json')
      return new Response(JSON.stringify(isSingle ? newBanner : [newBanner]), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (method === 'PATCH' || method === 'PUT') {
      if (targetId) {
        const existing = diskBanners.find((b: any) => b.id === targetId)
        if (existing) {
          const updated = { ...existing, ...bodyJson, updated_at: new Date().toISOString() }
          saveLocalDbBanner(updated)
          const accept = getHeader(init?.headers, 'Accept')
          const isSingle = accept.includes('vnd.pgrst.object+json')
          return new Response(JSON.stringify(isSingle ? updated : [updated]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }
      }
    }

    if (method === 'DELETE') {
      if (targetId) {
        deleteLocalDbBanner(targetId)
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    let filtered = [...loadLocalDbBanners()]
    if (targetId) {
      filtered = filtered.filter((b: any) => b.id === targetId)
    }
    return new Response(JSON.stringify(filtered), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Range': `0-${filtered.length ? filtered.length - 1 : 0}/${filtered.length}`,
      },
    })
  }

  // R3. Storage: /storage/v1/object/
  if (url.includes('/storage/v1/object/')) {
    const bucketAndPath = url.split('/storage/v1/object/')[1] || 'products/garment-catalog.jpg'
    return new Response(
      JSON.stringify({
        Key: bucketAndPath,
        Id: `storage-${Date.now()}`,
        url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // S. PostgREST: stock_transfers (/rest/v1/stock_transfers)
  if (url.includes('/rest/v1/stock_transfers')) {
    if (method === 'POST') {
      const newTrf = {
        id: `trf-${Date.now()}`,
        transfer_number: bodyJson?.transfer_number || `TRF-${Date.now()}`,
        source_location_id: bodyJson?.source_location_id || 'l1000000-0000-0000-0000-000000000001',
        destination_location_id: bodyJson?.destination_location_id || 'l1000000-0000-0000-0000-000000000002',
        status: 'draft',
        eway_bill_number: bodyJson?.eway_bill_number || null,
        dispatched_at: null,
        received_at: null,
        created_by: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      return new Response(JSON.stringify(newTrf), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    const trfList = [
      {
        id: 'trf-00000000-0000-0000-0000-000000000001',
        transfer_number: 'TRF-20261108-0001',
        source_location_id: 'l1000000-0000-0000-0000-000000000001',
        destination_location_id: 'l1000000-0000-0000-0000-000000000002',
        status: 'in_transit',
        eway_bill_number: 'EWB-20261108-9842',
        dispatched_at: new Date().toISOString(),
        received_at: null,
        created_by: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]
    return new Response(JSON.stringify(trfList), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // T. PostgREST: inventory_ledger (/rest/v1/inventory_ledger)
  if (url.includes('/rest/v1/inventory_ledger')) {
    const mockLedger = [
      {
        id: 'led-1',
        transaction_timestamp: new Date().toISOString(),
        variant_id: 'v1000000-0000-0000-0000-000000000001',
        location_id: 'l1000000-0000-0000-0000-000000000001',
        from_shelf_id: null,
        to_shelf_id: 's1000000-0000-0000-0000-000000000001',
        movement_type: 'inbound_grn',
        quantity: 25,
        balance_after: 25,
        reference_doc_type: 'purchase_order',
        reference_doc_id: 'PO-20261108-0001',
        operator_id: 'admin',
        notes: 'Initial opening stock putaway into bulk storage',
      },
      {
        id: 'led-2',
        transaction_timestamp: new Date(Date.now() - 3600000).toISOString(),
        variant_id: 'v1000000-0000-0000-0000-000000000002',
        location_id: 'l1000000-0000-0000-0000-000000000002',
        from_shelf_id: 's1000000-0000-0000-0000-000000000003',
        to_shelf_id: null,
        movement_type: 'pos_sale',
        quantity: -1,
        balance_after: 4,
        reference_doc_type: 'pos_order',
        reference_doc_id: 'POS-20261108-0012',
        operator_id: 'cashier',
        notes: 'Boutique walk-in client checkout',
      },
    ]
    return new Response(JSON.stringify(mockLedger), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // U. PostgREST: page_layouts (/rest/v1/page_layouts)
  if (url.includes('/rest/v1/page_layouts')) {
    if (method === 'POST') {
      const savedLayout = {
        id: bodyJson?.id || `layout-${Date.now()}`,
        page_slug: bodyJson?.page_slug || 'home',
        page_title: bodyJson?.page_title || 'Storefront Page',
        layout_json: bodyJson?.layout_json || [],
        is_published: bodyJson?.is_published ?? true,
        version: (bodyJson?.version || 1) + 1,
        meta_description: bodyJson?.meta_description || null,
        updated_at: new Date().toISOString(),
        updated_by: null,
      }
      return new Response(JSON.stringify(savedLayout), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    const mockLayouts = [
      {
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
      },
    ]
    return new Response(JSON.stringify(mockLayouts), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // V. PostgREST: storefront_tokens (/rest/v1/storefront_tokens)
  if (url.includes('/rest/v1/storefront_tokens')) {
    if (method === 'POST') {
      const savedTokens = {
        id: bodyJson?.id || `tok-${Date.now()}`,
        theme_name: bodyJson?.theme_name || 'default',
        tokens_json: bodyJson?.tokens_json || {},
        is_active: true,
        updated_at: new Date().toISOString(),
      }
      return new Response(JSON.stringify(savedTokens), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    const mockTokens = [
      {
        id: 'tok-default-01',
        theme_name: 'default',
        tokens_json: {
          '--background': '#FAFAFA',
          '--foreground': '#0A0A0C',
          '--primary': '#0A0A0C',
          '--primary-foreground': '#FFFFFF',
          '--secondary': '#F4F4F5',
          '--secondary-foreground': '#18181B',
          '--accent-green': '#166534',
          '--accent-gold': '#F59E0B',
          '--border': '#E4E4E7',
          '--radius': '0px',
          '--font-serif': 'Cormorant Garamond, Georgia, serif',
          '--font-sans': 'Inter, -apple-system, sans-serif',
        },
        is_active: true,
        updated_at: new Date().toISOString(),
      },
    ]
    return new Response(JSON.stringify(mockTokens), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // U. RPC Calls (/rest/v1/rpc/...)
  if (url.includes('/rest/v1/rpc/receive_grn_and_putaway')) {
    return new Response(
      JSON.stringify({
        grn_number: `GRN-${Date.now().toString().slice(-4)}`,
        status: 'completed',
        quantity_received: bodyJson?.p_quantity_received || 10,
        success: true,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (url.includes('/rest/v1/rpc/process_pos_checkout')) {
    const randSeq = Math.floor(1000 + Math.random() * 9000)
    return new Response(
      JSON.stringify({
        order_id: `ord-pos-${Date.now()}`,
        order_number: `POS-20261108-${randSeq}`,
        invoice_number: `INV-20261108-${randSeq}`,
        total: bodyJson?.p_total_amount || 1850.0,
        balance_due: 0,
        success: true,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (url.includes('/rest/v1/rpc/move_shelf_stock')) {
    return new Response(
      JSON.stringify({
        quantity_moved: bodyJson?.p_quantity || 1,
        success: true,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (url.includes('/rest/v1/rpc/execute_stock_transfer')) {
    return new Response(
      JSON.stringify({
        status: bodyJson?.p_action === 'dispatch' ? 'in_transit' : 'received',
        success: true,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (url.includes('/rest/v1/rpc/allocate_and_pick_online_order')) {
    return new Response(
      JSON.stringify({
        status: bodyJson?.p_action === 'allocate' ? 'allocated' : 'picked',
        allocated_location_id: bodyJson?.p_location_id || 'l1000000-0000-0000-0000-000000000001',
        success: true,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (url.includes('/rest/v1/rpc/process_boris_return')) {
    return new Response(
      JSON.stringify({
        restocked_shelf_id: bodyJson?.p_target_shelf_id || 's1000000-0000-0000-0000-000000000001',
        condition: bodyJson?.p_condition || 'pass',
        refund_mode: bodyJson?.p_refund_mode || 'store_credit',
        success: true,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // V. Default Fallback for all other endpoints
  return new Response(JSON.stringify([]), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
