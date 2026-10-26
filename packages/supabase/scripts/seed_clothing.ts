import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bmjbzupilwbzdimowgnd.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (typeof globalThis.WebSocket === 'undefined') {
  // @ts-ignore
  globalThis.WebSocket = class DummyWebSocket {}
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: {
    // @ts-ignore
    transport: class {}
  }
})

async function runClothingSeed() {
  console.log('--- 1. Clearing legacy non-apparel categories and products ---')
  
  // Clean up legacy products
  await supabase.from('product_variants').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('products').delete().in('category', ['Ceramics', 'Lighting', 'Sculptural Objects'])
  await supabase.from('categories').delete().in('slug', ['ceramics', 'lighting', 'sculptural-objects', 'wearable-art'])

  console.log('--- 2. Upserting Creator Clothing Categories ---')
  const categories = [
    {
      id: 'c1000000-0000-0000-0000-000000000001',
      name: 'Hoodies & Fleece',
      slug: 'hoodies',
      description: 'Heavyweight 480 GSM French Terry and loopback brushed cotton fleece hoodies.',
      image_url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85',
      display_order: 1
    },
    {
      id: 'c1000000-0000-0000-0000-000000000002',
      name: 'Tees & Tops',
      slug: 'tees',
      description: 'Overdyed 280 GSM combed cotton vintage drop-shoulder tees and thermal waffle tops.',
      image_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=85',
      display_order: 2
    },
    {
      id: 'c1000000-0000-0000-0000-000000000003',
      name: 'Outerwear & Jackets',
      slug: 'outerwear',
      description: 'Weatherproof cropped flight bombers, heavy canvas chore coats, and sculptural overcoats.',
      image_url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1200&q=85',
      display_order: 3
    },
    {
      id: 'c1000000-0000-0000-0000-000000000004',
      name: 'Pants & Denim',
      slug: 'pants',
      description: '14oz Japanese raw selvedge denim, pleated wide-leg trousers, and heavyweight sweatpants.',
      image_url: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1200&q=85',
      display_order: 4
    }
  ]

  for (const cat of categories) {
    const { error } = await supabase.from('categories').upsert(cat)
    if (error) console.error('Error upserting category:', cat.name, error.message)
    else console.log('✓ Category:', cat.name)
  }

  console.log('--- 3. Upserting Premier Creator Apparel Catalog ---')
  const products = [
    {
      id: 'b1000000-0000-0000-0000-000000000001',
      title: 'Heavyweight Boxy Hoodie',
      description: 'Custom-milled 480 GSM loopback organic French Terry. Engineered with an exaggerated dropped shoulder, double-layered architectural hood, and concealed side-seam pockets. Mineral washed for a vintage drape.',
      price: 165.00,
      stock: 115,
      image_url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85',
      category_id: 'c1000000-0000-0000-0000-000000000001',
      category: 'Hoodies & Fleece',
      material: '480 GSM 100% Organic Cotton French Terry',
      edition: 'Drop 01 // Limited 150 Pieces'
    },
    {
      id: 'b1000000-0000-0000-0000-000000000002',
      title: 'Vintage Washed Boxy Tee',
      description: '280 GSM heavyweight combed cotton jersey with distressed neck ribbing and raw edge blind hem. Sun-faded wash treatment creates individual character on every piece.',
      price: 75.00,
      stock: 140,
      image_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=85',
      category_id: 'c1000000-0000-0000-0000-000000000002',
      category: 'Tees & Tops',
      material: '280 GSM Combed Cotton with Vintage Enzymatic Wash',
      edition: 'Drop 01 // Core Essential'
    },
    {
      id: 'b1000000-0000-0000-0000-000000000003',
      title: 'Cropped Weatherproof Flight Bomber',
      description: 'High-density technical nylon shell with quilted synthetic insulation. Cropped torso silhouette with elongated sleeves and custom matte nickel two-way zipper hardware.',
      price: 285.00,
      stock: 55,
      image_url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1200&q=85',
      category_id: 'c1000000-0000-0000-0000-000000000003',
      category: 'Outerwear & Jackets',
      material: 'Matte Technical Nylon Shell & Primaloft Insulation',
      edition: 'Drop 01 // Archive Edition of 60'
    },
    {
      id: 'b1000000-0000-0000-0000-000000000004',
      title: 'Pleated Selvedge Carpenter Pant',
      description: 'Cut from 14oz shuttle-loomed Japanese raw black selvedge denim. Double front pleats create an elegant wide drape falling straight over chunky footwear.',
      price: 210.00,
      stock: 75,
      image_url: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1200&q=85',
      category_id: 'c1000000-0000-0000-0000-000000000004',
      category: 'Pants & Denim',
      material: '14oz Japanese Selvedge Cotton Denim',
      edition: 'Drop 01 // Strict Edition of 80'
    },
    {
      id: 'b1000000-0000-0000-0000-000000000005',
      title: 'Architectural Raw Linen Smock',
      description: 'Hand-loomed 380 GSM Belgian flax linen with flat-felled French seams, wide kimono-cut sleeves, and natural horn button closures.',
      price: 240.00,
      stock: 45,
      image_url: '/images/prod3-front.jpg',
      category_id: 'c1000000-0000-0000-0000-000000000002',
      category: 'Tees & Tops',
      material: '380 GSM Organic Belgian Flax Linen',
      edition: 'Creator Atelier Spec 05'
    },
    {
      id: 'b1000000-0000-0000-0000-000000000006',
      title: 'Relaxed Flared Minimalist Track Pant',
      description: 'Custom 400 GSM double-knit jersey with center front pinch pleat and hidden zip ankle vents. Elasticized drawcord waist with custom metal aglets.',
      price: 145.00,
      stock: 80,
      image_url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=1200&q=85',
      category_id: 'c1000000-0000-0000-0000-000000000004',
      category: 'Pants & Denim',
      material: '400 GSM Heavyweight Double-Knit Cotton',
      edition: 'Drop 01 // Daily Uniform'
    }
  ]

  for (const prod of products) {
    const { error } = await supabase.from('products').upsert(prod)
    if (error) console.error('Error upserting product:', prod.title, error.message)
    else console.log('✓ Product:', prod.title)
  }

  console.log('--- 4. Inserting Clothing Size Variants ---')
  const variants = [
    // Heavyweight Boxy Hoodie (XS, S, M, L, XL)
    { product_id: 'b1000000-0000-0000-0000-000000000001', sku: 'HD-BOX-BLK-XS', size: 'XS', color: 'Faded Onyx', stock: 10 },
    { product_id: 'b1000000-0000-0000-0000-000000000001', sku: 'HD-BOX-BLK-S',  size: 'S',  color: 'Faded Onyx', stock: 25 },
    { product_id: 'b1000000-0000-0000-0000-000000000001', sku: 'HD-BOX-BLK-M',  size: 'M',  color: 'Faded Onyx', stock: 45 },
    { product_id: 'b1000000-0000-0000-0000-000000000001', sku: 'HD-BOX-BLK-L',  size: 'L',  color: 'Faded Onyx', stock: 25 },
    { product_id: 'b1000000-0000-0000-0000-000000000001', sku: 'HD-BOX-BLK-XL', size: 'XL', color: 'Faded Onyx', stock: 10 },

    // Vintage Washed Boxy Tee (XS, S, M, L, XL)
    { product_id: 'b1000000-0000-0000-0000-000000000002', sku: 'TEE-VNTG-WHT-XS', size: 'XS', color: 'Chalk White', stock: 15 },
    { product_id: 'b1000000-0000-0000-0000-000000000002', sku: 'TEE-VNTG-WHT-S',  size: 'S',  color: 'Chalk White', stock: 30 },
    { product_id: 'b1000000-0000-0000-0000-000000000002', sku: 'TEE-VNTG-WHT-M',  size: 'M',  color: 'Chalk White', stock: 50 },
    { product_id: 'b1000000-0000-0000-0000-000000000002', sku: 'TEE-VNTG-WHT-L',  size: 'L',  color: 'Chalk White', stock: 35 },
    { product_id: 'b1000000-0000-0000-0000-000000000002', sku: 'TEE-VNTG-WHT-XL', size: 'XL', color: 'Chalk White', stock: 10 },

    // Cropped Flight Bomber (S, M, L, XL)
    { product_id: 'b1000000-0000-0000-0000-000000000003', sku: 'BMB-CR-BLK-S',  size: 'S',  color: 'Pitch Black', stock: 10 },
    { product_id: 'b1000000-0000-0000-0000-000000000003', sku: 'BMB-CR-BLK-M',  size: 'M',  color: 'Pitch Black', stock: 25 },
    { product_id: 'b1000000-0000-0000-0000-000000000003', sku: 'BMB-CR-BLK-L',  size: 'L',  color: 'Pitch Black', stock: 15 },
    { product_id: 'b1000000-0000-0000-0000-000000000003', sku: 'BMB-CR-BLK-XL', size: 'XL', color: 'Pitch Black', stock: 5 },

    // Pleated Carpenter Pant (30, 32, 34, 36)
    { product_id: 'b1000000-0000-0000-0000-000000000004', sku: 'PNT-SLV-30', size: '30', color: 'Raw Black', stock: 15 },
    { product_id: 'b1000000-0000-0000-0000-000000000004', sku: 'PNT-SLV-32', size: '32', color: 'Raw Black', stock: 30 },
    { product_id: 'b1000000-0000-0000-0000-000000000004', sku: 'PNT-SLV-34', size: '34', color: 'Raw Black', stock: 20 },
    { product_id: 'b1000000-0000-0000-0000-000000000004', sku: 'PNT-SLV-36', size: '36', color: 'Raw Black', stock: 10 },

    // Architectural Raw Linen Smock (Taille 01, Taille 02)
    { product_id: 'b1000000-0000-0000-0000-000000000005', sku: 'SMK-LNN-T1', size: 'Taille 01 (S/M)', color: 'Natural Ecru', stock: 20 },
    { product_id: 'b1000000-0000-0000-0000-000000000005', sku: 'SMK-LNN-T2', size: 'Taille 02 (L/XL)', color: 'Natural Ecru', stock: 25 },

    // Relaxed Flared Minimalist Track Pant (S, M, L, XL)
    { product_id: 'b1000000-0000-0000-0000-000000000006', sku: 'TRK-FLR-BLK-S',  size: 'S',  color: 'Washed Ink', stock: 15 },
    { product_id: 'b1000000-0000-0000-0000-000000000006', sku: 'TRK-FLR-BLK-M',  size: 'M',  color: 'Washed Ink', stock: 35 },
    { product_id: 'b1000000-0000-0000-0000-000000000006', sku: 'TRK-FLR-BLK-L',  size: 'L',  color: 'Washed Ink', stock: 20 },
    { product_id: 'b1000000-0000-0000-0000-000000000006', sku: 'TRK-FLR-BLK-XL', size: 'XL', color: 'Washed Ink', stock: 10 }
  ]

  for (const v of variants) {
    const { error } = await supabase.from('product_variants').upsert(v)
    if (error) console.error('Error upserting variant:', v.sku, error.message)
  }
  console.log(`✓ Inserted ${variants.length} size variants across all apparel pieces`)

  console.log('--- 5. Upserting Storefront CMS Hero & Ethos ---')
  await supabase.from('storefront_config').upsert([
    {
      key: 'hero',
      value: {
        kicker: 'CREATOR CAPSULE // DROP 001',
        headline: 'AUTONOMOUS',
        headlineItalic: 'GARMENTS',
        description: 'Engineered heavyweight silhouettes cut from custom 480 GSM French Terry, 14oz Japanese selvedge denim, and technical outerwear. Made for the creator.',
        ctaLabel: 'SHOP DROP 01',
        ctaLink: '/shop',
        secondaryCategory: 'Hoodies & Fleece',
        featuredProductId: 'b1000000-0000-0000-0000-000000000001'
      },
      description: 'Storefront Creator Apparel Hero Section'
    },
    {
      key: 'ethos',
      value: {
        title: 'FABRIC LAB & SILHOUETTE SPECIFICATION',
        subtitle: '480 GSM FRENCH TERRY • 14OZ RAW SELVEDGE • 280 GSM COMBED JERSEY',
        body: 'Every piece is designed from the yarn up. We mill custom heavyweight knits with zero synthetic polyester blending, resulting in substantial drape, enduring structure, and tactile luxury.'
      },
      description: 'Storefront Creator Fabric Philosophy'
    }
  ])
  console.log('✓ Storefront CMS configuration updated to Clothing Drop 01')
  console.log('--- Seeding Completed Successfully! ---')
}

runClothingSeed().catch(err => {
  console.error('Fatal seed error:', err)
  process.exit(1)
})
