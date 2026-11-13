import { PrismaClient, LocationType, TransactionType, UserRole } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting Omnichannel Double-Entry Ledger Seed...')

  // 1. Seed Locations (Virtual Accounting Nodes + Physical Boundaries)
  const supplierLoc = await prisma.location.upsert({
    where: { code: 'SYS-SUPPLIER-INBOUND' },
    update: {},
    create: {
      code: 'SYS-SUPPLIER-INBOUND',
      name: 'Global Supplier Inbound Node',
      type: LocationType.SUPPLIER,
      isActive: true,
    },
  })

  const customerLoc = await prisma.location.upsert({
    where: { code: 'SYS-CUSTOMER-SOLD' },
    update: {},
    create: {
      code: 'SYS-CUSTOMER-SOLD',
      name: 'Global Customer Terminal Sink',
      type: LocationType.CUSTOMER,
      isActive: true,
    },
  })

  const ecomWarehouse = await prisma.location.upsert({
    where: { code: 'ECOM-WH01' },
    update: {},
    create: {
      code: 'ECOM-WH01',
      name: 'Atelier Central E-Commerce Hub (Bengaluru)',
      type: LocationType.ECOM_WAREHOUSE,
      gstin: '29AAAAA0000A1Z5',
      address: 'Phase 1, Electronic City Industrial Area',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560100',
      isActive: true,
    },
  })

  const storeBlr = await prisma.location.upsert({
    where: { code: 'STORE-BLR01' },
    update: {},
    create: {
      code: 'STORE-BLR01',
      name: 'Indiranagar Flagship Boutique (Bengaluru)',
      type: LocationType.RETAIL_STORE,
      gstin: '29AAAAA0000A1Z5',
      address: '100 Feet Road, HAL 2nd Stage, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560038',
      isActive: true,
    },
  })

  const storeMum = await prisma.location.upsert({
    where: { code: 'STORE-MUM01' },
    update: {},
    create: {
      code: 'STORE-MUM01',
      name: 'Kala Ghoda Heritage Boutique (Mumbai)',
      type: LocationType.RETAIL_STORE,
      gstin: '27AAAAA0000A1Z5',
      address: 'VB Gandhi Marg, Kala Ghoda, Fort',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      isActive: true,
    },
  })

  console.log('✅ Core locations established.')

  // 2. Seed Apparel Products & Sized Variants (Zero stock columns!)
  const productsData = [
    {
      title: 'Heavyweight Boxy Hoodie (480 GSM)',
      description: 'Custom unbleached 480 GSM French Terry woven on vintage Japanese loopwheel looms.',
      price: 2200.0,
      material: '100% Organic French Terry Cotton',
      category: 'Hoodies & Fleece',
      edition: 'Drop 01',
      imageUrl: '/images/prod1-primary.jpg',
      variants: [
        { sku: 'HD-480-BLK-S', size: 'S', color: 'Vintage Black' },
        { sku: 'HD-480-BLK-M', size: 'M', color: 'Vintage Black' },
        { sku: 'HD-480-BLK-L', size: 'L', color: 'Vintage Black' },
      ],
    },
    {
      title: '14oz Raw Selvedge Carpenter Pant',
      description: 'Rigid shuttle-loomed Japanese denim with triple-needle felled seams and utility loops.',
      price: 3400.0,
      material: '14oz Kurabo Japanese Selvedge',
      category: 'Denim & Trousers',
      edition: 'Drop 01',
      imageUrl: '/images/prod2-front.jpg',
      variants: [
        { sku: 'DNM-14OZ-30', size: '30', color: 'Indigo Raw' },
        { sku: 'DNM-14OZ-32', size: '32', color: 'Indigo Raw' },
        { sku: 'DNM-14OZ-34', size: '34', color: 'Indigo Raw' },
      ],
    },
    {
      title: 'Double-Breasted Cashmere Overcoat',
      description: 'Structured silhouette tailored from Italian cashmere wool blend with hand-stitched peak lapels.',
      price: 8900.0,
      material: '90% Wool, 10% Cashmere',
      category: 'Tailoring & Outerwear',
      edition: 'Atelier Signature',
      imageUrl: '/images/prod3-front.jpg',
      variants: [
        { sku: 'COAT-CSH-48', size: '48', color: 'Charcoal' },
        { sku: 'COAT-CSH-50', size: '50', color: 'Charcoal' },
        { sku: 'COAT-CSH-52', size: '52', color: 'Charcoal' },
      ],
    },
  ]

  const createdVariants: Array<{ id: string; sku: string }> = []

  for (const prod of productsData) {
    const existing = await prisma.product.findFirst({
      where: { title: prod.title },
    })

    const product = existing || (await prisma.product.create({
      data: {
        title: prod.title,
        description: prod.description,
        price: prod.price,
        material: prod.material,
        category: prod.category,
        edition: prod.edition,
        imageUrl: prod.imageUrl,
      },
    }))

    for (const v of prod.variants) {
      const variant = await prisma.productVariant.upsert({
        where: { sku: v.sku },
        update: {},
        create: {
          productId: product.id,
          sku: v.sku,
          size: v.size,
          color: v.color,
          hsnCode: '610910',
        },
      })
      createdVariants.push({ id: variant.id, sku: variant.sku })
    }
  }

  console.log(`✅ ${createdVariants.length} product variants registered.`)

  // 3. Populate Initial Double-Entry Inbound Ledger Records
  // Move initial stock from SYS-SUPPLIER-INBOUND to ECOM_WAREHOUSE and Retail Boutiques
  const initialGrnRef = 'GRN-SUP-202611-001'

  for (const v of createdVariants) {
    // Check if initial ledger entry already exists
    const existing = await prisma.inventoryLedger.findFirst({
      where: {
        variantId: v.id,
        referenceId: initialGrnRef,
      },
    })

    if (!existing) {
      // 50 units to E-Commerce Warehouse
      await prisma.inventoryLedger.create({
        data: {
          variantId: v.id,
          qty: 50,
          fromLocationId: supplierLoc.id,
          toLocationId: ecomWarehouse.id,
          transactionType: TransactionType.INBOUND,
          referenceId: initialGrnRef,
          notes: 'Initial production allocation for online storefront',
        },
      })

      // 15 units to Indiranagar Boutique
      await prisma.inventoryLedger.create({
        data: {
          variantId: v.id,
          qty: 15,
          fromLocationId: supplierLoc.id,
          toLocationId: storeBlr.id,
          transactionType: TransactionType.INBOUND,
          referenceId: initialGrnRef,
          notes: 'Initial opening stock for Indiranagar flagship retail floor',
        },
      })

      // 10 units to Mumbai Boutique
      await prisma.inventoryLedger.create({
        data: {
          variantId: v.id,
          qty: 10,
          fromLocationId: supplierLoc.id,
          toLocationId: storeMum.id,
          transactionType: TransactionType.INBOUND,
          referenceId: initialGrnRef,
          notes: 'Initial opening stock for Kala Ghoda boutique',
        },
      })
    }
  }

  console.log('✅ Immutable double-entry inventory ledger seeded with initial physical stocks.')

  // 4. Seed Staff Users
  await prisma.user.upsert({
    where: { email: 'horizonlord1@gmail.com' },
    update: {
      role: UserRole.ADMIN,
      name: 'Horizon Lord',
    },
    create: {
      email: 'horizonlord1@gmail.com',
      name: 'Horizon Lord',
      role: UserRole.ADMIN,
    },
  })

  await prisma.user.upsert({
    where: { email: 'admin@atelier.internal' },
    update: {},
    create: {
      email: 'admin@atelier.internal',
      name: 'Sovereign Administrator',
      role: UserRole.ADMIN,
    },
  })

  await prisma.user.upsert({
    where: { email: 'cashier.blr@atelier.internal' },
    update: { assignedLocationId: storeBlr.id },
    create: {
      email: 'cashier.blr@atelier.internal',
      name: 'Indiranagar POS Cashier',
      role: UserRole.POS_CASHIER,
      assignedLocationId: storeBlr.id,
    },
  })

  await prisma.user.upsert({
    where: { email: 'courier@atelier.internal' },
    update: {},
    create: {
      email: 'courier@atelier.internal',
      name: 'Private Logistics Courier',
      role: UserRole.COURIER,
    },
  })

  console.log('🚀 Omnichannel double-entry database initialization complete.')
}

main()
  .catch((e) => {
    console.error('Seed execution error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

