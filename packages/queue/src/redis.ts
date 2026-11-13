import Redis from 'ioredis'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

let sharedRedis: Redis | null = null

export function getRedisClient(): Redis {
  if (!sharedRedis) {
    sharedRedis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: null, // Mandatory for BullMQ workers and queues
      enableReadyCheck: false,
      lazyConnect: true,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000)
        return delay
      },
    })

    sharedRedis.on('error', (err) => {
      console.warn('Redis connection note:', err?.message || err)
    })
  }

  return sharedRedis
}

/**
 * Creates an isolated Redis instance for workers or subscriptions
 */
export function createDedicatedRedisConnection(): Redis {
  return new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times) => Math.min(times * 50, 2000),
  })
}

/**
 * Redlock Multi-Key Distributed Lock:
 * Atomically acquires distributed locks on an array of keys using Redis SET NX PX.
 * If ANY key cannot be acquired, releases all previously acquired keys and returns false.
 */
export async function acquireMultiLock(
  redis: Redis,
  keys: string[],
  ttlMs: number = 15000
): Promise<boolean> {
  if (keys.length === 0) return true

  const pipeline = redis.pipeline()
  for (const key of keys) {
    pipeline.set(key, 'LOCKED', 'PX', ttlMs, 'NX')
  }

  const results = await pipeline.exec()
  const allAcquired = results?.every(([, res]) => res === 'OK')

  if (!allAcquired) {
    // Release any successfully acquired keys to prevent partial deadlocks
    await releaseMultiLock(redis, keys)
    return false
  }

  return true
}

/**
 * Releases multi-key distributed locks
 */
export async function releaseMultiLock(redis: Redis, keys: string[]): Promise<void> {
  if (keys.length === 0) return
  await redis.del(...keys)
}

