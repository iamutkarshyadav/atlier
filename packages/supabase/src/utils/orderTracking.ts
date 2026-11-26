const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Checks whether a reference string is a valid UUID (guards `.or(id.eq....)` against 22P02 errors).
 */
export function isUuidString(value: string | null | undefined): boolean {
  if (!value) return false
  return UUID_REGEX.test(value.trim())
}

/**
 * Builds a Supabase PostgREST `.or(...)` filter matching an order by reference safely.
 */
export function buildOrderReferenceOrFilter(reference: string): string {
  const clean = reference.trim()
  if (isUuidString(clean)) {
    return `id.eq.${clean},order_number.eq.${clean},tracking_barcode.eq.${clean}`
  }
  return `order_number.eq.${clean},tracking_barcode.eq.${clean}`
}

/**
 * Masks street address, phone, and email details for unauthenticated guest order lookups,
 * keeping only non-sensitive regional locality (City/State/PIN).
 */
export function maskShippingAddress(rawAddress: string | null | undefined): string {
  if (!rawAddress) return 'Destination address verified'
  const withoutPatronTag = rawAddress.replace(/\[Patron:[^\]]*\]/gi, '').trim()
  const parts = withoutPatronTag
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)

  if (parts.length <= 2) {
    return 'Verified Delivery Address (Sign in for full street details)'
  }
  return `Verified Address · ${parts.slice(-3).join(', ')}`
}

/**
 * Formats an ISO timestamp in Indian Standard Time (IST).
 */
export function formatIstTimestamp(iso: string | null | undefined): string {
  if (!iso) return 'Pending'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Pending'
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

/**
 * Generates a deterministic 4-digit verification PIN from an order reference for doorstep handover.
 */
export function deriveCourierVerificationPin(orderRef: string): string {
  let hash = 0
  for (let i = 0; i < orderRef.length; i++) {
    hash = (hash * 31 + orderRef.charCodeAt(i)) % 10000
  }
  return String(1000 + (hash % 9000)).slice(-4)
}
