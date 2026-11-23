import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createResilientFetch } from './resilientFetch'

describe('createResilientFetch Adapter', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('passes through successful HTTP requests directly without mock interception', async () => {
    const mockResponse = new Response(JSON.stringify({ success: true, count: 42 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })

    const originalFetch = vi.fn().mockResolvedValue(mockResponse)
    vi.stubGlobal('fetch', originalFetch)

    const resilientFetch = createResilientFetch({ timeoutMs: 5000 })
    const res = await resilientFetch('https://aavyohkylcguhrmblrcx.supabase.co/rest/v1/products?select=*')

    expect(originalFetch).toHaveBeenCalledTimes(1)
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data).toEqual({ success: true, count: 42 })
  })

  it('propagates HTTP error status codes transparently without falling back to mock data', async () => {
    const errorBody = JSON.stringify({ message: 'relation does not exist', code: '42P01' })
    const mockErrorResponse = new Response(errorBody, {
      status: 404,
      statusText: 'Not Found',
      headers: { 'Content-Type': 'application/json' },
    })

    const originalFetch = vi.fn().mockResolvedValue(mockErrorResponse)
    vi.stubGlobal('fetch', originalFetch)

    const resilientFetch = createResilientFetch({ timeoutMs: 5000 })
    const res = await resilientFetch('https://aavyohkylcguhrmblrcx.supabase.co/rest/v1/missing_table')

    expect(originalFetch).toHaveBeenCalledTimes(1)
    expect(res.status).toBe(404)

    const body = await res.json()
    expect(body.code).toBe('42P01')
  })

  it('aborts when the request exceeds the specified timeoutMs', async () => {
    const originalFetch = vi.fn().mockImplementation((_url: any, init?: RequestInit) => {
      return new Promise((resolve, reject) => {
        if (init?.signal) {
          init.signal.addEventListener('abort', () => {
            const err = new Error('The operation was aborted.')
            err.name = 'AbortError'
            reject(err)
          })
        }
      })
    })
    vi.stubGlobal('fetch', originalFetch)

    const resilientFetch = createResilientFetch({ timeoutMs: 50 })

    await expect(
      resilientFetch('https://aavyohkylcguhrmblrcx.supabase.co/rest/v1/slow_endpoint')
    ).rejects.toThrow(/aborted/i)
  })

  it('re-throws network failures directly without synthesizing fallback responses', async () => {
    const networkError = new Error('fetch failed: ECONNREFUSED')
    const originalFetch = vi.fn().mockRejectedValue(networkError)
    vi.stubGlobal('fetch', originalFetch)

    const resilientFetch = createResilientFetch({ timeoutMs: 5000 })

    await expect(
      resilientFetch('https://aavyohkylcguhrmblrcx.supabase.co/rest/v1/products')
    ).rejects.toThrow('fetch failed: ECONNREFUSED')
  })
})
