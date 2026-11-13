import { describe, it, expect, vi, beforeEach } from 'vitest'
import { acquireMultiLock, releaseMultiLock } from '../redis'

describe('Redis Multi-Key Distributed Locking (Redlock pattern)', () => {
  let mockPipeline: any
  let mockRedis: any

  beforeEach(() => {
    mockPipeline = {
      set: vi.fn().mockReturnThis(),
      exec: vi.fn(),
    }
    mockRedis = {
      pipeline: vi.fn(() => mockPipeline),
      del: vi.fn().mockResolvedValue(1),
    }
  })

  it('returns true when all keys are successfully locked via SET NX PX', async () => {
    mockPipeline.exec.mockResolvedValueOnce([
      [null, 'OK'],
      [null, 'OK'],
    ])

    const acquired = await acquireMultiLock(mockRedis, ['lock:1', 'lock:2'], 15000)

    expect(acquired).toBe(true)
    expect(mockPipeline.set).toHaveBeenCalledTimes(2)
    expect(mockPipeline.set).toHaveBeenNthCalledWith(1, 'lock:1', 'LOCKED', 'PX', 15000, 'NX')
    expect(mockPipeline.set).toHaveBeenNthCalledWith(2, 'lock:2', 'LOCKED', 'PX', 15000, 'NX')
  })

  it('fails and cleans up all acquired keys if any key fails to lock', async () => {
    // Key 1 locked, but Key 2 already locked by another process (null result)
    mockPipeline.exec.mockResolvedValueOnce([
      [null, 'OK'],
      [null, null],
    ])

    const acquired = await acquireMultiLock(mockRedis, ['lock:1', 'lock:2'], 15000)

    expect(acquired).toBe(false)
    expect(mockRedis.del).toHaveBeenCalledWith('lock:1', 'lock:2')
  })

  it('handles empty key array gracefully', async () => {
    const acquired = await acquireMultiLock(mockRedis, [])
    expect(acquired).toBe(true)
  })

  it('releaseMultiLock deletes all provided keys', async () => {
    await releaseMultiLock(mockRedis, ['lock:1', 'lock:2'])
    expect(mockRedis.del).toHaveBeenCalledWith('lock:1', 'lock:2')
  })
})

