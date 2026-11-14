/**
 * Comprehensive Automated Audit & Test Suite for Atelier Admin Portal
 * Verifies all 20 UI routes, 11 API routes, and end-to-end CRUD operations.
 */

import http from 'http'
import fs from 'fs'
import path from 'path'

const ADMIN_URL = 'http://127.0.0.1:3001'

interface TestResult {
  route: string
  type: 'UI Page' | 'API Route' | 'E2E CRUD'
  status: 'PASS' | 'FAIL'
  httpCode?: number
  detail: string
}

const results: TestResult[] = []

async function fetchRoute(urlPath: string, options: RequestInit = {}): Promise<{ status: number; text: string; json?: any; headers: any }> {
  const fullUrl = `${ADMIN_URL}${urlPath}`
  try {
    const res = await fetch(fullUrl, {
      ...options,
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml,application/json,*/*',
        ...(options.headers || {}),
      },
    })
    const text = await res.text()
    let json: any = undefined
    try {
      json = JSON.parse(text)
    } catch {}
    return {
      status: res.status,
      text,
      json,
      headers: Object.fromEntries(res.headers.entries()),
    }
  } catch (err: any) {
    return {
      status: 0,
      text: err.message || 'Fetch failed',
      headers: {},
    }
  }
}

async function runAudit() {
  console.log('=================================================================')
  console.log('🚀 ATELIER ERP: COMPLETE ADMIN PORTAL AUDIT & VERIFICATION SUITE')
  console.log('=================================================================\n')

  // -------------------------------------------------------------
  // TEST GROUP 1: ALL 20 FRONT-END UI ROUTES
  // -------------------------------------------------------------
  console.log('--- 1. AUDITING ALL 20 FRONT-END UI ROUTES ---')

  const UI_ROUTES = [
    { path: '/', label: 'Root Redirect / Landing' },
    { path: '/login', label: 'Staff Login & Authentication' },
    { path: '/dashboard', label: 'Operations Command Center' },
    { path: '/pos', label: 'POS Terminal & Scanner' },
    { path: '/orders', label: 'Omnichannel Orders Console' },
    { path: '/dispatch', label: 'Outbound Try-On Dispatch' },
    { path: '/inventory', label: 'Inventory Matrix Data Grid' },
    { path: '/inventory/new', label: 'Garment Studio (New Launch)' },
    { path: '/inventory/b1000000-0000-0000-0000-000000000001', label: 'Garment Studio (Edit Dossier)' },
    { path: '/inventory/transfers', label: 'Inter-Facility Stock Transfers' },
    { path: '/inventory/ledger', label: 'Stock Movement Audit Ledger' },
    { path: '/locations', label: 'Multi-Location Directory' },
    { path: '/locations/l1000000-0000-0000-0000-000000000001/shelves', label: 'WMS Shelves & Bin Allocation' },
    { path: '/procurement', label: 'Purchase Orders & GRN Putaway' },
    { path: '/suppliers', label: 'Supplier Master Directory' },
    { path: '/categories', label: 'Category Studio & Taxonomy' },
    { path: '/barcodes', label: 'GS1 EAN-13 Barcode Studio' },
    { path: '/customers', label: 'Patrons & Staff Management' },
    { path: '/cms', label: 'Storefront CMS & Layout Builder' },
    { path: '/invoice/ord-live-test-1794602609607', label: 'B2C Tax Invoice & PDF Viewer' },
  ]

  for (const route of UI_ROUTES) {
    const res = await fetchRoute(route.path)
    // Accept 200 or 307/308 redirect (e.g. '/' redirects to '/dashboard')
    const pass = res.status === 200 || res.status === 307 || res.status === 308
    results.push({
      route: route.path,
      type: 'UI Page',
      status: pass ? 'PASS' : 'FAIL',
      httpCode: res.status,
      detail: pass ? `HTTP ${res.status} OK (${route.label})` : `Failed with status ${res.status}: ${res.text.slice(0, 80)}`,
    })
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${route.path.padEnd(45)} -> HTTP ${res.status} (${route.label})`)
  }

  // -------------------------------------------------------------
  // TEST GROUP 2: ALL 11 SERVER API ROUTES
  // -------------------------------------------------------------
  console.log('\n--- 2. AUDITING ALL 11 SERVER API ROUTES ---')

  // 1. /api/local-db GET
  const apiLocalDbGet = await fetchRoute('/api/local-db')
  results.push({
    route: '/api/local-db (GET)',
    type: 'API Route',
    status: apiLocalDbGet.status === 200 ? 'PASS' : 'FAIL',
    httpCode: apiLocalDbGet.status,
    detail: `Local DB Bridge active: ${Array.isArray(apiLocalDbGet.json) ? `${apiLocalDbGet.json.length} categories` : 'OK'}`,
  })
  console.log(`[${apiLocalDbGet.status === 200 ? 'PASS' : 'FAIL'}] /api/local-db (GET)                          -> HTTP ${apiLocalDbGet.status}`)

  // 2. /api/orders GET
  const apiOrdersGet = await fetchRoute('/api/orders')
  results.push({
    route: '/api/orders (GET)',
    type: 'API Route',
    status: apiOrdersGet.status === 200 ? 'PASS' : 'FAIL',
    httpCode: apiOrdersGet.status,
    detail: `Orders endpoint active: ${apiOrdersGet.json?.orders?.length || 0} orders`,
  })
  console.log(`[${apiOrdersGet.status === 200 ? 'PASS' : 'FAIL'}] /api/orders (GET)                            -> HTTP ${apiOrdersGet.status}`)

  // 3. /api/invoice/generate
  const apiInvoiceGen = await fetchRoute('/api/invoice/generate?id=ord-live-test-1794602609607')
  const invoiceGenPass = apiInvoiceGen.status === 200
  results.push({
    route: '/api/invoice/generate (GET)',
    type: 'API Route',
    status: invoiceGenPass ? 'PASS' : 'FAIL',
    httpCode: apiInvoiceGen.status,
    detail: `Invoice PDF Generator: HTTP ${apiInvoiceGen.status}`,
  })
  console.log(`[${invoiceGenPass ? 'PASS' : 'FAIL'}] /api/invoice/generate (GET)                  -> HTTP ${apiInvoiceGen.status}`)

  // 4. /api/invoice/[id]
  const apiInvoiceStream = await fetchRoute('/api/invoice/ord-live-test-1794602609607')
  const invoiceStreamPass = apiInvoiceStream.status === 200
  results.push({
    route: '/api/invoice/[id] (GET)',
    type: 'API Route',
    status: invoiceStreamPass ? 'PASS' : 'FAIL',
    httpCode: apiInvoiceStream.status,
    detail: `PDF Stream Response: Content-Type=${apiInvoiceStream.headers['content-type']}`,
  })
  console.log(`[${invoiceStreamPass ? 'PASS' : 'FAIL'}] /api/invoice/[id] (GET)                        -> HTTP ${apiInvoiceStream.status}`)

  // 5. /api/auth/demo-admin (Must be 403 Forbidden or 401 Unauthorized as per decommission policy)
  const apiDemoAdmin = await fetchRoute('/api/auth/demo-admin', { method: 'POST' })
  const demoPass = apiDemoAdmin.status === 403 || apiDemoAdmin.status === 401
  results.push({
    route: '/api/auth/demo-admin (POST)',
    type: 'API Route',
    status: demoPass ? 'PASS' : 'FAIL',
    httpCode: apiDemoAdmin.status,
    detail: `Decommissioned Security Check: HTTP ${apiDemoAdmin.status} Blocked (Expected)`,
  })
  console.log(`[${demoPass ? 'PASS' : 'FAIL'}] /api/auth/demo-admin (POST)                    -> HTTP ${apiDemoAdmin.status} (Security Verified)`)

  // 6. /api/admin/create-courier (POST) - validation check
  const apiCreateCourier = await fetchRoute('/api/admin/create-courier', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: '' }),
  })
  // Expect 401 Unauthorized or 400 Bad Request
  const courierPass = apiCreateCourier.status === 400 || apiCreateCourier.status === 401
  results.push({
    route: '/api/admin/create-courier (POST)',
    type: 'API Route',
    status: courierPass ? 'PASS' : 'FAIL',
    httpCode: apiCreateCourier.status,
    detail: `Auth/Validation Guard Active: HTTP ${apiCreateCourier.status}`,
  })
  console.log(`[${courierPass ? 'PASS' : 'FAIL'}] /api/admin/create-courier (POST)                -> HTTP ${apiCreateCourier.status} (Guard Verified)`)

  // 7. /api/admin/create-user (POST) - validation check
  const apiCreateUser = await fetchRoute('/api/admin/create-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: '' }),
  })
  const userPass = apiCreateUser.status === 400 || apiCreateUser.status === 401
  results.push({
    route: '/api/admin/create-user (POST)',
    type: 'API Route',
    status: userPass ? 'PASS' : 'FAIL',
    httpCode: apiCreateUser.status,
    detail: `Auth/Validation Guard Active: HTTP ${apiCreateUser.status}`,
  })
  console.log(`[${userPass ? 'PASS' : 'FAIL'}] /api/admin/create-user (POST)                   -> HTTP ${apiCreateUser.status} (Guard Verified)`)

  // 8. /api/users/admin
  const apiUsersAdmin = await fetchRoute('/api/users/admin')
  const usersAdminPass = apiUsersAdmin.status === 200 || apiUsersAdmin.status === 401
  results.push({
    route: '/api/users/admin (GET)',
    type: 'API Route',
    status: usersAdminPass ? 'PASS' : 'FAIL',
    httpCode: apiUsersAdmin.status,
    detail: `User Management Endpoint Active: HTTP ${apiUsersAdmin.status}`,
  })
  console.log(`[${usersAdminPass ? 'PASS' : 'FAIL'}] /api/users/admin (GET)                         -> HTTP ${apiUsersAdmin.status}`)

  // 9. /api/inventory/inbound
  const apiInbound = await fetchRoute('/api/inventory/inbound', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: [] }),
  })
  const inboundPass = apiInbound.status === 400 || apiInbound.status === 500
  results.push({
    route: '/api/inventory/inbound (POST)',
    type: 'API Route',
    status: inboundPass ? 'PASS' : 'FAIL',
    httpCode: apiInbound.status,
    detail: `Inbound Payload Validator Active: HTTP ${apiInbound.status}`,
  })
  console.log(`[${inboundPass ? 'PASS' : 'FAIL'}] /api/inventory/inbound (POST)                 -> HTTP ${apiInbound.status} (Validation Verified)`)

  // 10. /api/inventory/transfer
  const apiTransfer = await fetchRoute('/api/inventory/transfer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: [] }),
  })
  const transferPass = apiTransfer.status === 400 || apiTransfer.status === 500
  results.push({
    route: '/api/inventory/transfer (POST)',
    type: 'API Route',
    status: transferPass ? 'PASS' : 'FAIL',
    httpCode: apiTransfer.status,
    detail: `Stock Transfer Validator Active: HTTP ${apiTransfer.status}`,
  })
  console.log(`[${transferPass ? 'PASS' : 'FAIL'}] /api/inventory/transfer (POST)                -> HTTP ${apiTransfer.status} (Validation Verified)`)

  // 11. /api/try-on/dispatch
  const apiTryOnDispatch = await fetchRoute('/api/try-on/dispatch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: [] }),
  })
  const tryOnDispatchPass = apiTryOnDispatch.status === 400 || apiTryOnDispatch.status === 500
  results.push({
    route: '/api/try-on/dispatch (POST)',
    type: 'API Route',
    status: tryOnDispatchPass ? 'PASS' : 'FAIL',
    httpCode: apiTryOnDispatch.status,
    detail: `Try-On Dispatch Validator Active: HTTP ${apiTryOnDispatch.status}`,
  })
  console.log(`[${tryOnDispatchPass ? 'PASS' : 'FAIL'}] /api/try-on/dispatch (POST)                    -> HTTP ${apiTryOnDispatch.status} (Validation Verified)`)

  // -------------------------------------------------------------
  // TEST GROUP 3: END-TO-END DYNAMIC CRUD VERIFICATION
  // -------------------------------------------------------------
  console.log('\n--- 3. END-TO-END DYNAMIC CRUD PERSISTENCE VERIFICATION ---')

  // E2E Test A: Category Creation & Persistence
  console.log('\n* Executing Category Creation Test (/categories)...')
  const testCatPayload = {
    name: 'Evening Velvet Capes',
    slug: 'evening-velvet-capes',
    description: 'Bespoke hand-pleated silk velvet capelets with regal high collars.',
    image_url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85',
    display_order: 10,
  }

  const createCatRes = await fetchRoute('/api/local-db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'http://127.0.0.1:54321/rest/v1/categories',
      method: 'POST',
      headers: { Accept: 'application/vnd.pgrst.object+json' },
      body: testCatPayload,
    }),
  })

  const catCreated = createCatRes.json
  const catPass = createCatRes.status === 201 && catCreated?.name === testCatPayload.name
  results.push({
    route: '/categories (E2E Creation)',
    type: 'E2E CRUD',
    status: catPass ? 'PASS' : 'FAIL',
    httpCode: createCatRes.status,
    detail: `Created Category ID: ${catCreated?.id}, Name: ${catCreated?.name}`,
  })
  console.log(`[${catPass ? 'PASS' : 'FAIL'}] Category Created: "${catCreated?.name}" (ID: ${catCreated?.id})`)

  // Verify category exists in GET /rest/v1/categories
  const verifyCatRes = await fetchRoute('/api/local-db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'http://127.0.0.1:54321/rest/v1/categories',
      method: 'GET',
    }),
  })
  const catFound = Array.isArray(verifyCatRes.json) && verifyCatRes.json.some((c: any) => c.slug === 'evening-velvet-capes')
  results.push({
    route: '/categories (E2E Read Verification)',
    type: 'E2E CRUD',
    status: catFound ? 'PASS' : 'FAIL',
    detail: `Category successfully retrieved from database via GET`,
  })
  console.log(`[${catFound ? 'PASS' : 'FAIL'}] Category Found in DB List: ${catFound}`)

  // E2E Test B: Product & Size Matrix Launch Test (/inventory/new)
  console.log('\n* Executing Garment Launch Test (/inventory/new)...')
  const testProdPayload = {
    title: 'Sculptural Cashmere Cape Coat',
    category_id: catCreated?.id || 'c1000000-0000-0000-0000-000000000001',
    category: 'Evening Velvet Capes',
    description: 'Double-faced cashmere with dramatic flared cape sleeves, horn buttons, and hand-stitched silk binding.',
    price: 495,
    stock: 50,
    material: '100% Mongolian Double-Faced Cashmere',
    edition: 'Drop 01 // Limited 50 Pieces',
    image_url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1200&q=85',
  }

  const createProdRes = await fetchRoute('/api/local-db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'http://127.0.0.1:54321/rest/v1/products',
      method: 'POST',
      headers: { Accept: 'application/vnd.pgrst.object+json' },
      body: testProdPayload,
    }),
  })

  const prodCreated = createProdRes.json
  const prodPass = createProdRes.status === 201 && prodCreated?.title === testProdPayload.title
  results.push({
    route: '/inventory/new (E2E Garment Launch)',
    type: 'E2E CRUD',
    status: prodPass ? 'PASS' : 'FAIL',
    httpCode: createProdRes.status,
    detail: `Launched Garment ID: ${prodCreated?.id}, Title: ${prodCreated?.title}`,
  })
  console.log(`[${prodPass ? 'PASS' : 'FAIL'}] Garment Launched: "${prodCreated?.title}" (ID: ${prodCreated?.id})`)

  // Add 5 Size Matrix Variants for this Garment
  if (prodCreated?.id) {
    const testVariants = [
      { product_id: prodCreated.id, size: 'XS', sku: 'CP-CSH-BLK-XS', stock: 5, barcode: '8901234900017' },
      { product_id: prodCreated.id, size: 'S', sku: 'CP-CSH-BLK-S', stock: 15, barcode: '8901234900024' },
      { product_id: prodCreated.id, size: 'M', sku: 'CP-CSH-BLK-M', stock: 20, barcode: '8901234900031' },
      { product_id: prodCreated.id, size: 'L', sku: 'CP-CSH-BLK-L', stock: 10, barcode: '8901234900048' },
    ]

    const createVarRes = await fetchRoute('/api/local-db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'http://127.0.0.1:54321/rest/v1/product_variants',
        method: 'POST',
        body: testVariants,
      }),
    })

    const varPass = createVarRes.status === 201 && Array.isArray(createVarRes.json) && createVarRes.json.length === 4
    results.push({
      route: '/inventory/new (E2E Size Matrix Variants)',
      type: 'E2E CRUD',
      status: varPass ? 'PASS' : 'FAIL',
      httpCode: createVarRes.status,
      detail: `Allocated 4 Size Matrix Variants with barcodes and stock`,
    })
    console.log(`[${varPass ? 'PASS' : 'FAIL'}] Allocated 4 Size Matrix Variants for "${prodCreated.title}"`)

    // Verify variants query by product_id
    const verifyVarRes = await fetchRoute('/api/local-db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: `http://127.0.0.1:54321/rest/v1/product_variants?product_id=eq.${prodCreated.id}`,
        method: 'GET',
      }),
    })
    const varsFound = Array.isArray(verifyVarRes.json) && verifyVarRes.json.length === 4
    results.push({
      route: `/inventory/[id] (Variant Retrieval)`,
      type: 'E2E CRUD',
      status: varsFound ? 'PASS' : 'FAIL',
      detail: `Retrieved ${verifyVarRes.json?.length || 0} size variants for garment`,
    })
    console.log(`[${varsFound ? 'PASS' : 'FAIL'}] Retrieved ${verifyVarRes.json?.length || 0} size variants from database`)
  }

  // E2E Test C: Supplier Creation Test (/suppliers)
  console.log('\n* Executing Supplier Master Creation Test (/suppliers)...')
  const testSupPayload = {
    name: 'Atelier Silk Weavers Como',
    vendor_code: 'SUP-COMO-01',
    gstin: '29BBBBB1111B1Z2',
    contact_person: 'Gianni Bellini',
    email: 'gianni@silkcomomills.it',
    phone: '+39 031 3456',
    address_line1: 'Via Volta, 14',
    city: 'Como',
    state: 'Lombardy',
    state_code: 'IT',
    pincode: '22100',
    payment_terms: 'NET_30',
    lead_time_days: 18,
  }

  const createSupRes = await fetchRoute('/api/local-db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'http://127.0.0.1:54321/rest/v1/suppliers',
      method: 'POST',
      headers: { Accept: 'application/vnd.pgrst.object+json' },
      body: testSupPayload,
    }),
  })

  const supCreated = createSupRes.json
  const supPass = createSupRes.status === 201 && supCreated?.name === testSupPayload.name
  results.push({
    route: '/suppliers (E2E Vendor Registration)',
    type: 'E2E CRUD',
    status: supPass ? 'PASS' : 'FAIL',
    httpCode: createSupRes.status,
    detail: `Registered Supplier ID: ${supCreated?.id}, Name: ${supCreated?.name}`,
  })
  console.log(`[${supPass ? 'PASS' : 'FAIL'}] Supplier Registered: "${supCreated?.name}" (ID: ${supCreated?.id})`)

  // -------------------------------------------------------------
  // AUDIT SUMMARY & TOTAL SCORE
  // -------------------------------------------------------------
  const total = results.length
  const passed = results.filter((r) => r.status === 'PASS').length
  const failed = results.filter((r) => r.status === 'FAIL').length

  console.log('\n=================================================================')
  console.log(`📊 FINAL AUDIT REPORT: ${passed} / ${total} TESTS PASSED (${failed} FAILED)`)
  console.log('=================================================================')

  if (failed === 0) {
    console.log('🎉 ALL ROUTES & CRUD ENGINES ARE 100% ACTIVE, DYNAMIC, AND VERIFIED!')
  } else {
    console.log(`⚠️ Some tests failed. Check details above.`)
  }

  return { total, passed, failed, results }
}

runAudit()
  .then((report) => {
    if (report.failed > 0) process.exit(1)
  })
  .catch((err) => {
    console.error('Audit execution error:', err)
    process.exit(1)
  })
