/**
 * On-Demand Cache Revalidation Dispatcher for Storefront ISR
 * Secures requests with REVALIDATION_SECRET and targets the configured Storefront URL.
 */
export async function triggerStorefrontRevalidation(params: {
  path?: string
  tag?: string
}): Promise<{ success: boolean; message?: string }> {
  try {
    const storefrontUrl = process.env.NEXT_PUBLIC_STOREFRONT_URL || 'http://localhost:3000'
    const secret = process.env.REVALIDATION_SECRET || 'atelier-isr-secret-2026'

    const res = await fetch(`${storefrontUrl}/api/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidation-secret': secret,
      },
      body: JSON.stringify({
        path: params.path || '/',
        tag: params.tag,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { success: false, message: err.error || `HTTP ${res.status}` }
    }

    return { success: true, message: 'Storefront ISR cache purged successfully' }
  } catch (err: any) {
    return { success: false, message: err?.message || 'Network error triggering revalidation' }
  }
}
