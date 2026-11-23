/**
 * Resilient Network Fetch Adapter for Supabase Clients.
 *
 * Ensures all Supabase Auth, Storage, and PostgREST operations communicate directly
 * with the live Supabase instance with timeout protection and network error propagation.
 * Strictly no offline mock fallbacks or local mock DB interceptions.
 */

// Polyfill WebSocket for Node.js <= 20 environments (SSR, Vitest, Playwright, Server Components)
if (typeof globalThis.WebSocket === 'undefined') {
  class DummyWebSocket {
    static readonly CONNECTING = 0
    static readonly OPEN = 1
    static readonly CLOSING = 2
    static readonly CLOSED = 3
    readonly CONNECTING = 0
    readonly OPEN = 1
    readonly CLOSING = 2
    readonly CLOSED = 3
    readyState = 3
    onclose: any = null
    onerror: any = null
    onmessage: any = null
    onopen: any = null
    send() {}
    close() {}
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() {
      return false
    }
  }
  ;(globalThis as any).WebSocket = DummyWebSocket
}

export interface ResilientFetchOptions {
  timeoutMs?: number
}

/**
 * Creates a fetch wrapper with timeout protection that communicates directly
 * with the live Supabase instance without any mock interceptions.
 */
export function createResilientFetch(options?: ResilientFetchOptions): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const timeoutMs = options?.timeoutMs ?? 15000

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    let signal = controller.signal
    if (init?.signal) {
      if (typeof AbortSignal.any === 'function') {
        signal = AbortSignal.any([init.signal, controller.signal])
      } else {
        init.signal.addEventListener('abort', () => controller.abort())
      }
    }

    try {
      const res = await fetch(input, {
        ...init,
        signal,
      })
      clearTimeout(timer)
      return res
    } catch (err: any) {
      clearTimeout(timer)
      throw err
    }
  }
}
