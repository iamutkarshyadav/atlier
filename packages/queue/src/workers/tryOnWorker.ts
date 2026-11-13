import { Worker, Job } from 'bullmq'
import {
  dispatchTryOnToVehicle,
  reconcileTryOnDoorstep,
} from '@repo/db'
import {
  TRYON_QUEUE_NAME,
  type TryOnJobData,
} from '../queues'
import { createDedicatedRedisConnection } from '../redis'

export function createTryOnWorker(): Worker<TryOnJobData> {
  const connection = createDedicatedRedisConnection()

  const worker = new Worker<TryOnJobData>(
    TRYON_QUEUE_NAME,
    async (job: Job<TryOnJobData>) => {
      const data = job.data

      if (data.action === 'DISPATCH_TO_VEHICLE') {
        if (!data.transitVehicleId || !data.items || data.items.length === 0) {
          throw new Error('Invalid dispatch payload: transitVehicleId and items required')
        }

        return dispatchTryOnToVehicle({
          tryOnSessionId: data.tryOnSessionId,
          ecomLocationId: data.ecomLocationId,
          transitVehicleId: data.transitVehicleId,
          items: data.items,
        })
      }

      if (data.action === 'DOORSTEP_RECONCILE') {
        if (!data.customerLocationId) {
          throw new Error('Invalid reconcile payload: customerLocationId required')
        }

        return reconcileTryOnDoorstep({
          tryOnSessionId: data.tryOnSessionId,
          ecomLocationId: data.ecomLocationId,
          customerLocationId: data.customerLocationId,
          keptItems: data.keptItems || [],
          rejectedItems: data.rejectedItems || [],
          collectedPaymentMode: data.collectedPaymentMode,
        })
      }

      throw new Error(`Unknown Try-On queue action: ${(data as any).action}`)
    },
    {
      connection,
      concurrency: 4,
    }
  )

  worker.on('failed', (job, err) => {
    console.error(`Try-On worker job ${job?.id} failed:`, err.message)
  })

  return worker
}

