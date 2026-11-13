import { prisma } from './index'
import {
  LocationType,
  TransactionType,
  OrderStatus,
  TryOnStatus,
  type Prisma,
  type InventoryLedger,
} from '@prisma/client'

export interface LedgerTransactionPayload {
  variantId: string
  qty: number
  fromLocationId: string
  toLocationId: string
  transactionType: TransactionType
  referenceId: string
  notes?: string
}

export interface LedgerBatchItem {
  variantId: string
  quantity: number
}

/**
 * Dynamically computes available physical stock for a variant at a specific location
 * via strict Double-Entry Ledger aggregation: SUM(INBOUND) - SUM(OUTBOUND)
 */
export async function calculateAvailableStock(
  variantId: string,
  locationId: string,
  txClient?: Prisma.TransactionClient
): Promise<number> {
  const db = txClient || prisma

  const [inbound, outbound] = await Promise.all([
    db.inventoryLedger.aggregate({
      _sum: { qty: true },
      where: {
        variantId,
        toLocationId: locationId,
      },
    }),
    db.inventoryLedger.aggregate({
      _sum: { qty: true },
      where: {
        variantId,
        fromLocationId: locationId,
      },
    }),
  ])

  const totalIn = inbound._sum.qty || 0
  const totalOut = outbound._sum.qty || 0

  return Math.max(0, totalIn - totalOut)
}

/**
 * Ringfenced Query: Calculates stock strictly within the primary E-Commerce Warehouse.
 * Physical store inventory is completely invisible and inaccessible to this query.
 */
export async function getEcomAvailableStock(
  variantId: string,
  ecomLocationId?: string,
  txClient?: Prisma.TransactionClient
): Promise<number> {
  const db = txClient || prisma
  let targetLocationId = ecomLocationId

  if (!targetLocationId) {
    const ecomWarehouse = await db.location.findFirst({
      where: { type: LocationType.ECOM_WAREHOUSE, isActive: true },
      select: { id: true },
    })

    if (!ecomWarehouse) {
      throw new Error('ECOM_WAREHOUSE location not configured in system topology.')
    }
    targetLocationId = ecomWarehouse.id
  }

  return calculateAvailableStock(variantId, targetLocationId, db)
}

/**
 * Ringfenced Query: Calculates stock strictly within a specific physical Retail Store.
 * E-commerce warehouse and other stores' stock are completely isolated and inaccessible.
 */
export async function getStoreAvailableStock(
  variantId: string,
  retailStoreId: string,
  txClient?: Prisma.TransactionClient
): Promise<number> {
  const db = txClient || prisma

  const store = await db.location.findUnique({
    where: { id: retailStoreId },
    select: { id: true, type: true, isActive: true },
  })

  if (!store || store.type !== LocationType.RETAIL_STORE || !store.isActive) {
    throw new Error(`Invalid or inactive retail store location: ${retailStoreId}`)
  }

  return calculateAvailableStock(variantId, store.id, db)
}

/**
 * Appends an immutable movement record into the Double-Entry Inventory Ledger.
 * Enforces non-negative quantities and distinct location boundaries.
 */
export async function executeLedgerTransaction(
  payload: LedgerTransactionPayload,
  txClient?: Prisma.TransactionClient
): Promise<InventoryLedger> {
  const db = txClient || prisma

  if (payload.qty <= 0) {
    throw new Error(`Ledger transaction quantity must be greater than zero. Received: ${payload.qty}`)
  }

  if (payload.fromLocationId === payload.toLocationId) {
    throw new Error('Double-entry ledger requires distinct source and destination locations.')
  }

  return db.inventoryLedger.create({
    data: {
      variantId: payload.variantId,
      qty: payload.qty,
      fromLocationId: payload.fromLocationId,
      toLocationId: payload.toLocationId,
      transactionType: payload.transactionType,
      referenceId: payload.referenceId,
      notes: payload.notes,
    },
  })
}

/**
 * Supplier Inbound Intake: Allocates incoming manufacturer stock to a physical location
 * (either ECOM_WAREHOUSE or a specific RETAIL_STORE).
 */
export async function executeInboundSupply(params: {
  supplierLocationId: string
  destinationLocationId: string
  items: LedgerBatchItem[]
  referenceId: string
  notes?: string
}) {
  return prisma.$transaction(async (tx) => {
    const records = []
    for (const item of params.items) {
      const entry = await executeLedgerTransaction(
        {
          variantId: item.variantId,
          qty: item.quantity,
          fromLocationId: params.supplierLocationId,
          toLocationId: params.destinationLocationId,
          transactionType: TransactionType.INBOUND,
          referenceId: params.referenceId,
          notes: params.notes || 'Inbound supplier stock receipt',
        },
        tx
      )
      records.push(entry)
    }
    return records
  })
}

/**
 * Inter-Location Transfer: Moves stock from ECOM to a physical store, or between physical stores.
 * Strictly verifies source available stock before writing transfer records.
 */
export async function executeStoreTransfer(params: {
  fromLocationId: string
  toLocationId: string
  items: LedgerBatchItem[]
  referenceId: string
  notes?: string
}) {
  return prisma.$transaction(async (tx) => {
    // 1. Strict Stock Availability Check at Source Location
    for (const item of params.items) {
      const currentAvailable = await calculateAvailableStock(item.variantId, params.fromLocationId, tx)
      if (currentAvailable < item.quantity) {
        throw new Error(
          `Transfer rejected: Insufficient stock for variant ${item.variantId} at source location. Available: ${currentAvailable}, Requested: ${item.quantity}`
        )
      }
    }

    // 2. Append Double-Entry Ledger Transfers
    const records = []
    for (const item of params.items) {
      const entry = await executeLedgerTransaction(
        {
          variantId: item.variantId,
          qty: item.quantity,
          fromLocationId: params.fromLocationId,
          toLocationId: params.toLocationId,
          transactionType: TransactionType.STORE_TRANSFER,
          referenceId: params.referenceId,
          notes: params.notes || 'Inter-store inventory transfer',
        },
        tx
      )
      records.push(entry)
    }
    return records
  })
}

/**
 * "Try-at-Home" State Machine — DISPATCH Phase:
 * Transfers garments from ECOM_WAREHOUSE to a mobile TRANSIT_VEHICLE location.
 * Items become immediately locked and unavailable to online shoppers.
 */
export async function dispatchTryOnToVehicle(params: {
  tryOnSessionId: string
  ecomLocationId: string
  transitVehicleId: string
  items: LedgerBatchItem[]
  operatorId?: string
}) {
  return prisma.$transaction(async (tx) => {
    // 1. Verify Try-On Session status
    const session = await tx.tryOnSession.findUnique({
      where: { id: params.tryOnSessionId },
      include: { order: true },
    })

    if (!session) {
      throw new Error(`Try-on session not found: ${params.tryOnSessionId}`)
    }

    if (session.status !== TryOnStatus.PENDING) {
      throw new Error(`Try-on session is not pending dispatch. Current status: ${session.status}`)
    }

    // 2. Verify stock at ECOM Warehouse
    for (const item of params.items) {
      const available = await calculateAvailableStock(item.variantId, params.ecomLocationId, tx)
      if (available < item.quantity) {
        throw new Error(
          `Cannot dispatch try-on: Insufficient E-Commerce stock for variant ${item.variantId}. Available: ${available}, Required: ${item.quantity}`
        )
      }
    }

    // 3. Move items from ECOM_WAREHOUSE -> TRANSIT_VEHICLE
    for (const item of params.items) {
      await executeLedgerTransaction(
        {
          variantId: item.variantId,
          qty: item.quantity,
          fromLocationId: params.ecomLocationId,
          toLocationId: params.transitVehicleId,
          transactionType: TransactionType.TRY_AT_HOME_DISPATCH,
          referenceId: session.order.orderNumber,
          notes: `Try-at-Home dispatch to transit vehicle ${params.transitVehicleId}`,
        },
        tx
      )
    }

    // 4. Transition State Machine
    await tx.tryOnSession.update({
      where: { id: session.id },
      data: {
        status: TryOnStatus.DISPATCHED,
        transitVehicleId: params.transitVehicleId,
      },
    })

    await tx.order.update({
      where: { id: session.orderId },
      data: { status: OrderStatus.DISPATCHED },
    })

    return { success: true, sessionId: session.id, status: TryOnStatus.DISPATCHED }
  })
}

/**
 * "Try-at-Home" State Machine — RECONCILIATION Phase:
 * Split resolution at doorstep:
 * - Kept items: Transferred from TRANSIT_VEHICLE to CUSTOMER (ECOM_SALE).
 * - Rejected items: Transferred from TRANSIT_VEHICLE back to ECOM_WAREHOUSE (RETURN).
 */
export async function reconcileTryOnDoorstep(params: {
  tryOnSessionId: string
  ecomLocationId: string
  customerLocationId: string
  keptItems: LedgerBatchItem[]
  rejectedItems: LedgerBatchItem[]
  collectedPaymentMode?: string
}) {
  return prisma.$transaction(async (tx) => {
    const session = await tx.tryOnSession.findUnique({
      where: { id: params.tryOnSessionId },
      include: { order: { include: { items: true } } },
    })

    if (!session) {
      throw new Error(`Try-on session not found: ${params.tryOnSessionId}`)
    }

    const vehicleId = session.transitVehicleId

    // 1. Process Kept Items: TRANSIT_VEHICLE -> CUSTOMER
    for (const item of params.keptItems) {
      await executeLedgerTransaction(
        {
          variantId: item.variantId,
          qty: item.quantity,
          fromLocationId: vehicleId,
          toLocationId: params.customerLocationId,
          transactionType: TransactionType.ECOM_SALE,
          referenceId: session.order.orderNumber,
          notes: 'Try-at-Home retained item: Doorstep client purchase finalized',
        },
        tx
      )

      // Mark order item as kept
      const matched = session.order.items.find((i) => i.variantId === item.variantId)
      if (matched) {
        await tx.orderItem.update({
          where: { id: matched.id },
          data: { isKept: true },
        })
      }
    }

    // 2. Process Rejected Items: TRANSIT_VEHICLE -> ECOM_WAREHOUSE
    for (const item of params.rejectedItems) {
      await executeLedgerTransaction(
        {
          variantId: item.variantId,
          qty: item.quantity,
          fromLocationId: vehicleId,
          toLocationId: params.ecomLocationId,
          transactionType: TransactionType.RETURN,
          referenceId: session.order.orderNumber,
          notes: 'Try-at-Home rejected item: Restocked back to ECOM Warehouse',
        },
        tx
      )

      // Mark order item as rejected
      const matched = session.order.items.find((i) => i.variantId === item.variantId)
      if (matched) {
        await tx.orderItem.update({
          where: { id: matched.id },
          data: { isKept: false, rejectionReason: 'Doorstep fitting preference' },
        })
      }
    }

    // 3. Finalize Order & Session Status
    await tx.tryOnSession.update({
      where: { id: session.id },
      data: { status: TryOnStatus.RECONCILED },
    })

    await tx.order.update({
      where: { id: session.orderId },
      data: {
        status: OrderStatus.RECONCILED,
        paymentMethod: params.collectedPaymentMode || 'DOORSTEP_UPI',
      },
    })

    return {
      success: true,
      orderNumber: session.order.orderNumber,
      keptCount: params.keptItems.reduce((acc, i) => acc + i.quantity, 0),
      rejectedCount: params.rejectedItems.reduce((acc, i) => acc + i.quantity, 0),
    }
  })
}

