import { createCheckoutWorker, createTryOnWorker } from '@repo/queue'

console.log('⚡ Starting BullMQ Omnichannel Background Workers...')

const checkoutWorker = createCheckoutWorker()
const tryOnWorker = createTryOnWorker()

console.log('✅ Checkout Worker active on stream: checkout-processing-queue')
console.log('✅ Try-On Worker active on stream: tryon-lifecycle-queue')

process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down workers gracefully...')
  await Promise.all([checkoutWorker.close(), tryOnWorker.close()])
  process.exit(0)
})

