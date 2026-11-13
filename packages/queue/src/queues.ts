import { Queue } from 'bullmq'
import { getRedisClient } from './redis'

export const CHECKOUT_QUEUE_NAME = 'checkout-processing-queue'
export const TRYON_QUEUE_NAME = 'tryon-lifecycle-queue'
export const POS_SYNC_QUEUE_NAME = 'pos-offline-sync-queue'

export interface CheckoutJobData {
  orderId?: string
  orderNumber: string
  idempotencyKey: string
  channel: 'STOREFRONT' | 'POS' | 'TRY_AT_HOME'
  sourceLocationId: string
  destinationLocationId: string
  userId?: string
  items: Array<{
    variantId: string
    quantity: number
    unitPrice: number
  }>
  paymentMethod?: string
  paymentDetails?: Record<string, any>
  deliveryAddress?: string
  deliveryNotes?: string
}

export interface TryOnJobData {
  action: 'DISPATCH_TO_VEHICLE' | 'DOORSTEP_RECONCILE'
  tryOnSessionId: string
  ecomLocationId: string
  transitVehicleId?: string
  customerLocationId?: string
  items?: Array<{ variantId: string; quantity: number }>
  keptItems?: Array<{ variantId: string; quantity: number }>
  rejectedItems?: Array<{ variantId: string; quantity: number }>
  collectedPaymentMode?: string
}

export interface PosSyncJobData {
  batchId: string
  retailStoreId: string
  cashierId: string
  transactions: Array<{
    clientTransactionId: string
    sessionId: string
    totalAmount: number
    paymentMethod: string
    items: Array<{ variantId: string; quantity: number; unitPrice: number }>
    offlineTimestamp: string
  }>
}

export function getCheckoutQueue(): Queue<CheckoutJobData> {
  const connection = getRedisClient()
  return new Queue<CheckoutJobData>(CHECKOUT_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    },
  })
}

export function getTryOnQueue(): Queue<TryOnJobData> {
  const connection = getRedisClient()
  return new Queue<TryOnJobData>(TRYON_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1500,
      },
      removeOnComplete: 1000,
    },
  })
}

export function getPosSyncQueue(): Queue<PosSyncJobData> {
  const connection = getRedisClient()
  return new Queue<PosSyncJobData>(POS_SYNC_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
  })
}

