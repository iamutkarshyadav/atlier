/**
 * Local Supabase & PostgREST-Compatible Database Server for Atelier Monorepo
 * Runs on http://127.0.0.1:54321
 * Backed by persistent disk storage at packages/supabase/.local-db/inventory.json
 * 
 * Synchronizes inventory, garments, size matrices, barcodes, and orders
 * live between Storefront (port 3000) and Admin Portal (port 3001).
 */

const http = require('http')
const url = require('url')
const fs = require('fs')
const path = require('path')

const PORT = 54321
const HOST = '127.0.0.1'
const DB_DIR = path.resolve(__dirname, '../.local-db')
const DB_FILE = path.join(DB_DIR, 'inventory.json')

// Helper for unique ID generation
function generateUuid(prefix = 'b1') {
  return `${prefix}000000-0000-0000-0000-${Date.now().toString(16).padStart(12, '0')}`
}

// Initial seed dataset (matches baseline atelier schema)
function getInitialSeed() {
  const categories = [
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
      name: 'Pants & Raw Denim',
      slug: 'denim',
      description: '14.5oz shuttle-loomed Okayama selvedge denim, double-knee work trousers, and pleated wide-leg pants.',
      image_url: 'https://images.unsplash.com/photo-1542272604-780c96856592?auto=format&fit=crop&w=1200&q=85',
      display_order: 4,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  const products = [
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
      edition: 'Drop 01 // Limited 80 Pieces',
      is_archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'b1000000-0000-0000-0000-000000000004',
      title: '14.5oz Okayama Raw Selvedge Denim',
      description: 'Woven on vintage Toyoda shuttle looms in Kojima, Japan. Stiff raw indigo denim with redline selvedge ID, custom copper hardware, and hidden back pocket rivets. Relaxed straight silhouette.',
      price: 220.0,
      stock: 75,
      image_url: 'https://images.unsplash.com/photo-1542272604-780c96856592?auto=format&fit=crop&w=1200&q=85',
      category_id: 'c1000000-0000-0000-0000-000000000004',
      category: 'Pants & Raw Denim',
      material: '14.5oz 100% Cotton Okayama Selvedge Denim',
      edition: 'Drop 01 // Limited 100 Pieces',
      is_archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  const product_variants = [
    { id: 'v1000000-0000-0000-0000-000000000001', product_id: 'b1000000-0000-0000-0000-000000000001', size: 'S', sku: 'ATL-HD01-BLK-S', barcode: '8901234000014', barcode_url: null, stock: 25, price_override: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'v1000000-0000-0000-0000-000000000002', product_id: 'b1000000-0000-0000-0000-000000000001', size: 'M', sku: 'ATL-HD01-BLK-M', barcode: '8901234000021', barcode_url: null, stock: 45, price_override: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'v1000000-0000-0000-0000-000000000003', product_id: 'b1000000-0000-0000-0000-000000000001', size: 'L', sku: 'ATL-HD01-BLK-L', barcode: '8901234000038', barcode_url: null, stock: 35, price_override: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'v1000000-0000-0000-0000-000000000004', product_id: 'b1000000-0000-0000-0000-000000000001', size: 'XL', sku: 'ATL-HD01-BLK-XL', barcode: '8901234000045', barcode_url: null, stock: 10, price_override: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },

    { id: 'v1000000-0000-0000-0000-000000000005', product_id: 'b1000000-0000-0000-0000-000000000002', size: 'S', sku: 'ATL-TEE01-WSH-S', barcode: '8901234000052', barcode_url: null, stock: 30, price_override: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'v1000000-0000-0000-0000-000000000006', product_id: 'b1000000-0000-0000-0000-000000000002', size: 'M', sku: 'ATL-TEE01-WSH-M', barcode: '8901234000069', barcode_url: null, stock: 50, price_override: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'v1000000-0000-0000-0000-000000000007', product_id: 'b1000000-0000-0000-0000-000000000002', size: 'L', sku: 'ATL-TEE01-WSH-L', barcode: '8901234000076', barcode_url: null, stock: 40, price_override: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'v1000000-0000-0000-0000-000000000008', product_id: 'b1000000-0000-0000-0000-000000000002', size: 'XL', sku: 'ATL-TEE01-WSH-XL', barcode: '8901234000083', barcode_url: null, stock: 20, price_override: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },

    { id: 'v1000000-0000-0000-0000-000000000009', product_id: 'b1000000-0000-0000-0000-000000000003', size: 'S', sku: 'ATL-BMB01-OLV-S', barcode: '8901234000090', barcode_url: null, stock: 10, price_override: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'v1000000-0000-0000-0000-000000000010', product_id: 'b1000000-0000-0000-0000-000000000003', size: 'M', sku: 'ATL-BMB01-OLV-M', barcode: '8901234000106', barcode_url: null, stock: 25, price_override: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'v1000000-0000-0000-0000-000000000011', product_id: 'b1000000-0000-0000-0000-000000000003', size: 'L', sku: 'ATL-BMB01-OLV-L', barcode: '8901234000113', barcode_url: null, stock: 15, price_override: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'v1000000-0000-0000-0000-000000000012', product_id: 'b1000000-0000-0000-0000-000000000003', size: 'XL', sku: 'ATL-BMB01-OLV-XL', barcode: '8901234000120', barcode_url: null, stock: 5, price_override: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },

    { id: 'v1000000-0000-0000-0000-000000000013', product_id: 'b1000000-0000-0000-0000-000000000004', size: '30', sku: 'ATL-DNM01-RAW-30', barcode: '8901234000137', barcode_url: null, stock: 20, price_override: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'v1000000-0000-0000-0000-000000000014', product_id: 'b1000000-0000-0000-0000-000000000004', size: '32', sku: 'ATL-DNM01-RAW-32', barcode: '8901234000144', barcode_url: null, stock: 30, price_override: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'v1000000-0000-0000-0000-000000000015', product_id: 'b1000000-0000-0000-0000-000000000004', size: '34', sku: 'ATL-DNM01-RAW-34', barcode: '8901234000151', barcode_url: null, stock: 25, price_override: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ]

  const product_media = [
    { id: 'm1', product_id: 'b1000000-0000-0000-0000-000000000001', url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85', is_primary: true, display_order: 0 },
    { id: 'm2', product_id: 'b1000000-0000-0000-0000-000000000001', url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1200&q=85', is_primary: false, display_order: 1 },
    { id: 'm3', product_id: 'b1000000-0000-0000-0000-000000000002', url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=85', is_primary: true, display_order: 0 },
    { id: 'm4', product_id: 'b1000000-0000-0000-0000-000000000003', url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1200&q=85', is_primary: true, display_order: 0 },
    { id: 'm5', product_id: 'b1000000-0000-0000-0000-000000000004', url: 'https://images.unsplash.com/photo-1542272604-780c96856592?auto=format&fit=crop&w=1200&q=85', is_primary: true, display_order: 0 },
  ]

  return {
    products,
    product_variants,
    product_media,
    categories,
    orders: [],
    order_items: [],
    page_layouts: [],
    storefront_tokens: [],
    accounts: [
      {
        id: 'b0000000-0000-0000-0000-000000000001',
        email: 'admin@atelier.internal',
        name: 'Sovereign Administrator',
        role: 'admin',
        password: 'admin-secret-2026',
      },
      {
        id: 'b0000000-0000-0000-0000-794156472275',
        email: 'test.admin@atelier.internal',
        name: 'Test Admin',
        role: 'admin',
        password: 'admin-secret-2026',
      },
      {
        id: 'a0000000-0000-0000-0000-000000000001',
        email: 'iamutkarshyadav1@gmail.com',
        name: 'Utkarsh Yadav',
        role: 'admin',
        password: 'asdfghjkl',
      },
    ],
  }
}

// Ensure database file exists
function loadDatabase() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true })
  }
  if (!fs.existsSync(DB_FILE)) {
    const initial = getInitialSeed()
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8')
    return initial
  }
  try {
    const content = fs.readFileSync(DB_FILE, 'utf8')
    return JSON.parse(content)
  } catch (err) {
    console.error('Error reading local db file, re-initializing:', err)
    const initial = getInitialSeed()
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8')
    return initial
  }
}

function saveDatabase(data) {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true })
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8')
  } catch (err) {
    console.error('Error saving local db file:', err)
  }
}

// Request parser
function parseRequestBody(req) {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch {
        resolve({})
      }
    })
  })
}

// Send standard JSON response with PostgREST / Supabase headers
function sendJson(res, statusCode, data, headers = {}) {
  const payload = JSON.stringify(data)
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'apikey, Authorization, Content-Type, Accept, Range, x-client-info, Prefer',
    'Access-Control-Expose-Headers': 'Content-Range, Range',
    ...headers,
  })
  res.end(payload)
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'apikey, Authorization, Content-Type, Accept, Range, x-client-info, Prefer',
    })
    return res.end()
  }

  const parsedUrl = url.parse(req.url, true)
  const pathname = parsedUrl.pathname || '/'
  const query = parsedUrl.query || {}
  const method = req.method
  const db = loadDatabase()
  const accept = req.headers['accept'] || ''
  const isSingle = accept.includes('vnd.pgrst.object+json')

  const bodyJson = ['POST', 'PUT', 'PATCH'].includes(method) ? await parseRequestBody(req) : null

  // 1. PRODUCTS (/rest/v1/products)
  if (pathname === '/rest/v1/products') {
    if (method === 'GET') {
      let result = [...db.products]

      // Filter by id
      if (query['id']) {
        const idMatch = query['id'].replace(/^eq\./, '')
        result = result.filter((p) => p.id === idMatch)
      }

      // Filter by is_archived
      if (query['is_archived']) {
        const archivedMatch = query['is_archived'].replace(/^eq\./, '') === 'true'
        result = result.filter((p) => Boolean(p.is_archived) === archivedMatch)
      }

      // Filter by category
      if (query['category']) {
        const catMatch = query['category'].replace(/^ilike\./, '').replace(/%/g, '').toLowerCase()
        result = result.filter((p) => (p.category || '').toLowerCase().includes(catMatch))
      }

      // Embed product_variants and categories if requested in select
      const selectStr = query['select'] || ''
      if (selectStr.includes('product_variants') || selectStr.includes('categories') || selectStr.includes('media')) {
        result = result.map((p) => {
          const variants = db.product_variants.filter((v) => v.product_id === p.id)
          const categoryObj = db.categories.find((c) => c.id === p.category_id) || null
          const media = db.product_media.filter((m) => m.product_id === p.id)
          return {
            ...p,
            product_variants: variants,
            variants: variants,
            categories: categoryObj,
            media: media,
          }
        })
      }

      // Ordering
      if (query['order'] && query['order'].includes('desc')) {
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      }

      const total = result.length
      const rangeHeader = total > 0 ? `0-${total - 1}/${total}` : '0-0/0'

      if (isSingle) {
        if (!result[0]) {
          return sendJson(res, 404, { code: 'PGRST116', message: 'Row not found' })
        }
        return sendJson(res, 200, result[0], { 'Content-Range': '0-0/1' })
      }

      return sendJson(res, 200, result, { 'Content-Range': rangeHeader })
    }

    if (method === 'POST') {
      const itemsToInsert = Array.isArray(bodyJson) ? bodyJson : [bodyJson]
      const createdItems = []

      for (const item of itemsToInsert) {
        const newProduct = {
          id: item.id || generateUuid('b1'),
          title: item.title || 'Untitled Garment',
          description: item.description || '',
          price: Number(item.price) || 0,
          stock: Number(item.stock) || 0,
          image_url: item.image_url || null,
          category_id: item.category_id || null,
          category: item.category || 'Apparel',
          material: item.material || '',
          edition: item.edition || null,
          is_archived: Boolean(item.is_archived),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        db.products.unshift(newProduct)
        createdItems.push(newProduct)
      }

      saveDatabase(db)
      return sendJson(res, 201, isSingle || !Array.isArray(bodyJson) ? createdItems[0] : createdItems)
    }

    if (method === 'PATCH') {
      const idMatch = query['id'] ? query['id'].replace(/^eq\./, '') : bodyJson?.id
      let updatedProduct = null

      db.products = db.products.map((p) => {
        if (p.id === idMatch) {
          updatedProduct = {
            ...p,
            ...bodyJson,
            updated_at: new Date().toISOString(),
          }
          return updatedProduct
        }
        return p
      })

      saveDatabase(db)
      return sendJson(res, 200, isSingle ? updatedProduct : updatedProduct ? [updatedProduct] : [])
    }

    if (method === 'DELETE') {
      const idMatch = query['id'] ? query['id'].replace(/^eq\./, '') : null
      db.products = db.products.filter((p) => p.id !== idMatch)
      db.product_variants = db.product_variants.filter((v) => v.product_id !== idMatch)
      db.product_media = db.product_media.filter((m) => m.product_id !== idMatch)
      saveDatabase(db)
      return sendJson(res, 204, null)
    }
  }

  // 2. PRODUCT VARIANTS (/rest/v1/product_variants)
  if (pathname === '/rest/v1/product_variants') {
    if (method === 'GET') {
      let result = [...db.product_variants]
      if (query['id']) {
        const idMatch = query['id'].replace(/^eq\./, '')
        result = result.filter((v) => v.id === idMatch)
      }
      if (query['product_id']) {
        const pIdMatch = query['product_id'].replace(/^eq\./, '')
        result = result.filter((v) => v.product_id === pIdMatch)
      }

      const total = result.length
      const rangeHeader = total > 0 ? `0-${total - 1}/${total}` : '0-0/0'

      if (isSingle) {
        if (!result[0]) return sendJson(res, 404, { code: 'PGRST116', message: 'Variant not found' })
        return sendJson(res, 200, result[0], { 'Content-Range': '0-0/1' })
      }
      return sendJson(res, 200, result, { 'Content-Range': rangeHeader })
    }

    if (method === 'POST') {
      const itemsToInsert = Array.isArray(bodyJson) ? bodyJson : [bodyJson]
      const created = []

      for (const item of itemsToInsert) {
        const newVariant = {
          id: item.id || generateUuid('v1'),
          product_id: item.product_id,
          size: item.size || 'M',
          sku: item.sku || `ATL-${Date.now().toString().slice(-6)}`,
          barcode: item.barcode || `890${Date.now().toString().slice(-10)}`,
          barcode_url: item.barcode_url || null,
          stock: Number(item.stock) || 0,
          price_override: item.price_override ? Number(item.price_override) : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        db.product_variants.push(newVariant)
        created.push(newVariant)
      }

      // Recalculate parent product total stock
      const affectedProductIds = [...new Set(created.map((v) => v.product_id))]
      for (const pId of affectedProductIds) {
        const totalStock = db.product_variants
          .filter((v) => v.product_id === pId)
          .reduce((sum, v) => sum + (v.stock || 0), 0)
        const p = db.products.find((prod) => prod.id === pId)
        if (p) p.stock = totalStock
      }

      saveDatabase(db)
      return sendJson(res, 201, isSingle || !Array.isArray(bodyJson) ? created[0] : created)
    }

    if (method === 'PATCH') {
      const idMatch = query['id'] ? query['id'].replace(/^eq\./, '') : bodyJson?.id
      let updatedVariant = null

      db.product_variants = db.product_variants.map((v) => {
        if (v.id === idMatch) {
          updatedVariant = {
            ...v,
            ...bodyJson,
            updated_at: new Date().toISOString(),
          }
          return updatedVariant
        }
        return v
      })

      if (updatedVariant) {
        // Recalculate parent product stock
        const totalStock = db.product_variants
          .filter((v) => v.product_id === updatedVariant.product_id)
          .reduce((sum, v) => sum + (v.stock || 0), 0)
        const p = db.products.find((prod) => prod.id === updatedVariant.product_id)
        if (p) p.stock = totalStock
      }

      saveDatabase(db)
      return sendJson(res, 200, isSingle ? updatedVariant : updatedVariant ? [updatedVariant] : [])
    }

    if (method === 'DELETE') {
      const idMatch = query['id'] ? query['id'].replace(/^eq\./, '') : null
      const target = db.product_variants.find((v) => v.id === idMatch)
      db.product_variants = db.product_variants.filter((v) => v.id !== idMatch)
      if (target) {
        const totalStock = db.product_variants
          .filter((v) => v.product_id === target.product_id)
          .reduce((sum, v) => sum + (v.stock || 0), 0)
        const p = db.products.find((prod) => prod.id === target.product_id)
        if (p) p.stock = totalStock
      }
      saveDatabase(db)
      return sendJson(res, 204, null)
    }
  }

  // 3. PRODUCT MEDIA (/rest/v1/product_media)
  if (pathname === '/rest/v1/product_media') {
    if (method === 'GET') {
      let result = [...db.product_media]
      if (query['product_id']) {
        const pIdMatch = query['product_id'].replace(/^eq\./, '')
        result = result.filter((m) => m.product_id === pIdMatch)
      }
      return sendJson(res, 200, result)
    }
    if (method === 'POST') {
      const items = Array.isArray(bodyJson) ? bodyJson : [bodyJson]
      for (const m of items) {
        db.product_media.push({
          id: m.id || generateUuid('m1'),
          product_id: m.product_id,
          url: m.url,
          is_primary: Boolean(m.is_primary),
          display_order: Number(m.display_order) || 0,
        })
      }
      saveDatabase(db)
      return sendJson(res, 201, items)
    }
    if (method === 'DELETE') {
      if (query['product_id']) {
        const pIdMatch = query['product_id'].replace(/^eq\./, '')
        db.product_media = db.product_media.filter((m) => m.product_id !== pIdMatch)
      }
      saveDatabase(db)
      return sendJson(res, 204, null)
    }
  }

  // 4. CATEGORIES (/rest/v1/categories)
  if (pathname === '/rest/v1/categories') {
    if (method === 'GET') {
      return sendJson(res, 200, db.categories)
    }
    if (method === 'POST') {
      const newCat = {
        id: bodyJson?.id || generateUuid('c1'),
        name: bodyJson?.name || 'New Category',
        slug: bodyJson?.slug || 'new-category',
        description: bodyJson?.description || '',
        image_url: bodyJson?.image_url || null,
        display_order: Number(bodyJson?.display_order) || db.categories.length + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      db.categories.push(newCat)
      saveDatabase(db)
      return sendJson(res, 201, isSingle ? newCat : [newCat])
    }
  }

  // 5. ORDERS (/rest/v1/orders)
  if (pathname === '/rest/v1/orders') {
    if (method === 'GET') {
      return sendJson(res, 200, db.orders)
    }
    if (method === 'POST') {
      const randNum = Math.floor(1000 + Math.random() * 9000)
      const newOrder = {
        id: bodyJson?.id || `ord-${Date.now()}`,
        order_number: bodyJson?.order_number || `ATL-ORD-${randNum}`,
        customer_id: bodyJson?.customer_id || 'a0000000-0000-0000-0000-000000000001',
        status: bodyJson?.status || 'processing',
        total_amount: Number(bodyJson?.total_amount) || 0,
        subtotal: Number(bodyJson?.subtotal) || Number(bodyJson?.total_amount) || 0,
        tax_amount: Number(bodyJson?.tax_amount) || 0,
        shipping_amount: Number(bodyJson?.shipping_amount) || 0,
        order_type: bodyJson?.order_type || 'standard',
        bolt_pincode: bodyJson?.bolt_pincode || null,
        bolt_timeslot_id: bodyJson?.bolt_timeslot_id || null,
        bolt_session_status: bodyJson?.bolt_session_status || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      // If items are attached, atomically decrement inventory
      if (Array.isArray(bodyJson?.items)) {
        for (const item of bodyJson.items) {
          const v = db.product_variants.find((variant) => variant.id === item.variant_id)
          if (v) {
            const qty = Number(item.quantity) || 1
            v.stock = Math.max(0, v.stock - qty)
            const p = db.products.find((prod) => prod.id === v.product_id)
            if (p) {
              p.stock = Math.max(0, p.stock - qty)
            }
          }
        }
      }

      db.orders.unshift(newOrder)
      saveDatabase(db)
      return sendJson(res, 201, isSingle ? newOrder : [newOrder])
    }
  }

  // 6. RPC: adjust_variant_stock (/rest/v1/rpc/adjust_variant_stock)
  if (pathname === '/rest/v1/rpc/adjust_variant_stock') {
    const variantId = bodyJson?.p_variant_id
    const delta = Number(bodyJson?.p_delta) || 0

    const v = db.product_variants.find((variant) => variant.id === variantId)
    if (!v) {
      return sendJson(res, 404, { code: '404', message: 'Variant not found' })
    }

    v.stock = Math.max(0, v.stock + delta)
    v.updated_at = new Date().toISOString()

    const p = db.products.find((prod) => prod.id === v.product_id)
    if (p) {
      const totalStock = db.product_variants
        .filter((item) => item.product_id === v.product_id)
        .reduce((sum, item) => sum + (item.stock || 0), 0)
      p.stock = totalStock
      p.updated_at = new Date().toISOString()
    }

    saveDatabase(db)

    return sendJson(res, 200, {
      new_stock: v.stock,
      product_id: v.product_id,
      new_product_stock: p?.stock ?? v.stock,
    })
  }

  // 7. RPC: update_variant_stock (/rest/v1/rpc/update_variant_stock)
  if (pathname === '/rest/v1/rpc/update_variant_stock') {
    const variantId = bodyJson?.p_variant_id
    const newStock = Math.max(0, Number(bodyJson?.p_stock) || 0)

    const v = db.product_variants.find((variant) => variant.id === variantId)
    if (v) {
      v.stock = newStock
      v.updated_at = new Date().toISOString()
      const p = db.products.find((prod) => prod.id === v.product_id)
      if (p) {
        p.stock = db.product_variants
          .filter((item) => item.product_id === v.product_id)
          .reduce((sum, item) => sum + (item.stock || 0), 0)
      }
      saveDatabase(db)
    }
    return sendJson(res, 200, { success: true })
  }

  // 8. PAGE LAYOUTS (/rest/v1/page_layouts)
  if (pathname === '/rest/v1/page_layouts') {
    if (method === 'GET') {
      return sendJson(res, 200, db.page_layouts || [])
    }
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
      }
      db.page_layouts = (db.page_layouts || []).filter((l) => l.page_slug !== savedLayout.page_slug)
      db.page_layouts.push(savedLayout)
      saveDatabase(db)
      return sendJson(res, 201, savedLayout)
    }
  }

  // 9. STOREFRONT TOKENS (/rest/v1/storefront_tokens)
  if (pathname === '/rest/v1/storefront_tokens') {
    if (method === 'GET') {
      return sendJson(res, 200, db.storefront_tokens || [])
    }
    if (method === 'POST') {
      const savedTokens = {
        id: bodyJson?.id || `tok-${Date.now()}`,
        theme_name: bodyJson?.theme_name || 'default',
        tokens_json: bodyJson?.tokens_json || {},
        is_active: true,
        updated_at: new Date().toISOString(),
      }
      db.storefront_tokens = (db.storefront_tokens || []).filter((t) => t.theme_name !== savedTokens.theme_name)
      db.storefront_tokens.push(savedTokens)
      saveDatabase(db)
      return sendJson(res, 201, savedTokens)
    }
  }

  // 10. AUTH: Sign In & Token Grant (/auth/v1/token)
  if (pathname === '/auth/v1/token') {
    const email = (bodyJson?.email || '').trim().toLowerCase()
    const password = bodyJson?.password || ''

    const account = db.accounts.find((a) => a.email.toLowerCase() === email)
    if (!account || (account.password && account.password !== password)) {
      return sendJson(res, 400, { error: 'invalid_grant', error_description: 'Invalid login credentials' })
    }

    const token = `mock-token-${account.id}-${Date.now()}`
    return sendJson(res, 200, {
      access_token: token,
      token_type: 'bearer',
      expires_in: 604800,
      refresh_token: `mock-refresh-${account.id}`,
      user: {
        id: account.id,
        email: account.email,
        role: 'authenticated',
        app_metadata: { provider: 'email', role: account.role },
        user_metadata: { name: account.name },
      },
    })
  }

  // 11. AUTH: Current User (/auth/v1/user)
  if (pathname === '/auth/v1/user') {
    const authHeader = req.headers['authorization'] || ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const account = db.accounts[0] // Default to admin for authorized calls
    return sendJson(res, 200, {
      id: account.id,
      email: account.email,
      role: 'authenticated',
      app_metadata: { provider: 'email', role: account.role },
      user_metadata: { name: account.name },
    })
  }

  // 12. Catch-all: Compliant 200 OK for other endpoints
  return sendJson(res, 200, [])
})

// Export database functions for in-process usage by resilientFetch
module.exports = {
  loadDatabase,
  saveDatabase,
  getInitialSeed,
  DB_FILE,
}

// Start server if executed directly
if (require.main === module) {
  loadDatabase()
  server.listen(PORT, HOST, () => {
    console.log(`[Atelier DB Server] Live PostgREST & Inventory daemon listening on http://${HOST}:${PORT}`)
    console.log(`[Atelier DB Server] Backed by persistent disk storage at: ${DB_FILE}`)
  })
}
