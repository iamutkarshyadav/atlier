/**
 * Strictly sanitizes authentication redirect targets so only internal relative paths
 * beginning with a single '/' are permitted (prevents open-redirect attacks).
 */
export function sanitizeAuthRedirect(raw: string | null | undefined, fallback = '/shop'): string {
  if (!raw) return fallback
  const trimmed = raw.trim()
  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('/\\') ||
    trimmed.includes('://') ||
    trimmed.includes('\\') ||
    trimmed.includes('\u0000')
  ) {
    return fallback
  }
  return trimmed
}

export function mapAuthErrorMessage(rawMessage: string | undefined | null): string {
  if (!rawMessage) return 'Unable to complete authentication. Please try again.'
  const lower = rawMessage.toLowerCase()
  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return 'Incorrect email address or password. Please verify and try again.'
  }
  if (lower.includes('already registered') || lower.includes('user already exists')) {
    return 'An account with this email address already exists. Please sign in instead.'
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Too many attempts. Please wait a moment before trying again.'
  }
  if (lower.includes('password should be at least')) {
    return 'Password must be at least 8 characters long.'
  }
  return rawMessage
}
