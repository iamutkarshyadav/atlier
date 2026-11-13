import { Worker, Job } from 'bullmq'
import {
  prisma,
  calculateAvailableStock,
  executeLedgerTransaction,
  TransactionType,
  OrderStatus,
} from '@repo/db'
import {
  CHECKOUT_QUEUE_NAME,
  type CheckoutJobData,
} from '../queues'
import {
  createDedicatedRedisConnection,
  acquireMultiLock,
  releaseMultiLock,
} from '../redis'

export function createCheckoutWorker(): Worker<CheckoutJobData> {
  const connection = createDedicatedRedisConnection()

  const worker = new Worker<CheckoutJobData>(
    CHECKOUT_QUEUE_NAME,
    async (job: Job<CheckoutJobData>) => {
      const {
        orderNumber,
        idempotencyKey,
        channel,
        sourceLocationId,
        destinationLocationId,
        userId,
        items,
        paymentMethod,
        paymentDetails,
        deliveryAddress,
        deliveryNotes,
      } = job.data

      // 1. Idempotency Check (Fast In-Memory / Database Pre-Check)
      const existingKey = await prisma.idempotencyKey.findUnique({
        where: { key: idempotencyKey },
      })

      if (existingKey?.completedAt) {
        return {
          success: true,
          idempotent: true,
          response: existingKey.responseBody,
        }
      }

      // 2. Acquire Redis Distributed Multi-Key Locks on all Variants at Source Location
      const lockKeys = items.map(
        (it) => `lock:stock:${sourceLocationId}:${it.variantId}`
      )
      const lockAcquired = await acquireMultiLock(connection, lockKeys, 15000)

      if (!lockAcquired) {
        throw new Error(
          `Concurrency lock acquisition failed for one or more variants at location ${sourceLocationId}. Re-queueing.`
        )
      }

      try {
        // 3. Execute Atomic Database Transaction with Strict Verification
        const result = await prisma.$transaction(async (tx) => {
          // Re-verify idempotency inside serializable transaction block
          const lockedIdempotency = await tx.idempotencyKey.upsert({
            where: { key: idempotencyKey },
            update: { lockedAt: new Date() },
            create: { key: idempotencyKey, lockedAt: new Date() },
          })

          if (lockedIdempotency.completedAt) {
            return {
              success: true,
              idempotent: true,
              orderId: (lockedIdempotency.responseBody as any)?.orderId,
            }
          }

          // A. Strict Inventory Availability Verification
          for (const it of items) {
            const currentStock = await calculateAvailableStock(
              it.variantId,
              sourceLocationId,
              tx
            )

            if (currentStock < it.quantity) {
              throw new Error(
                `INSUFFICIENT_STOCK: Variant ${it.variantId} at location ${sourceLocationId} has only ${currentStock} units available. Requested: ${it.quantity}.`
              )
            }
          }

          // B. Compute Order Financials
          const totalAmount = items.reduce(
            (sum, it) => sum + it.quantity * it.unitPrice,
            0
          )

          // C. Create Order Record
          const order = await tx.order.create({
            data: {
              orderNumber,
              userId: userId || null,
              fulfillmentLocationId: sourceLocationId,
              status: OrderStatus.PROCESSING,
              totalAmount,
              isPosOrder: channel === 'POS',
              paymentMethod: paymentMethod || (channel === 'POS' ? 'POS_CASH' : 'CARD'),
              paymentDetails: paymentDetails || {},
              deliveryAddress: deliveryAddress || null,
              deliveryNotes: deliveryNotes || null,
              items: {
                create: items.map((it) => ({
                  variantId: it.variantId,
                  quantity: it.quantity,
                  unitPrice: it.unitPrice,
                })),
              },
            },
          })

          // D. Determine Ledger Movement Type
          const ledgerType =
            channel === 'POS'
              ? TransactionType.POS_SALE
              : channel === 'TRY_AT_HOME'
                ? TransactionType.TRY_AT_HOME_DISPATCH
                : TransactionType.ECOM_SALE

          // E. Append Immutable Double-Entry Ledger Records
          for (const it of items) {
            await executeLedgerTransaction(
              {
                variantId: it.variantId,
                qty: it.quantity,
                fromLocationId: sourceLocationId,
                toLocationId: destinationLocationId,
                transactionType: ledgerType,
                referenceId: order.orderNumber,
                notes: `Checkout order ${order.orderNumber} via ${channel}`,
              },
              tx
            )
          }

          // F. Finalize Idempotency Key
          const responsePayload = {
            orderId: order.id,
            orderNumber: order.orderNumber,
            totalAmount: Number(order.totalAmount),
            status: order.status,
            channel,
            createdAt: order.createdAt.toISOString(),
          }

          await tx.idempotencyKey.update({
            where: { key: idempotencyKey },
            data: {
              completedAt: new Date(),
              responseBody: responsePayload,
            },
          })

          return { success: true, ...responsePayload }
        })

        return result
      } finally {
        // 4. Always Release Redis Distributed Locks
        await releaseMultiLock(connection, lockKeys)
      }
    },
    {
      connection,
      concurrency: 8, // Process up to 8 concurrent order streams safely
    }
  )

  worker.on('failed', (job, err) => {
    console.error(`Checkout job ${job?.id} failed:`, err.message)
  })

  return worker
}

