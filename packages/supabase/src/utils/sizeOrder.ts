const ALPHA_SIZE_RANKS: Record<string, number> = {
  XXS: 10,
  '2XS': 10,
  XS: 20,
  S: 30,
  SMALL: 30,
  M: 40,
  MEDIUM: 40,
  L: 50,
  LARGE: 50,
  XL: 60,
  XXL: 70,
  '2XL': 70,
  XXXL: 80,
  '3XL': 80,
  '4XL': 90,
  XXXXL: 90,
}

const TAILLE_REGEX = /^TAILLE\s*0*(\d+)/i

/**
 * Extracts a normalized primary size token from strings like "M (Black)" or "32 / Slim".
 */
function extractPrimarySizeToken(rawSize: string): string {
  const cleaned = rawSize
    .replace(/\s*\([^)]*\)/g, '')
    .split(/[\/|]/)[0]
    ?.trim() ?? ''
  return cleaned.toUpperCase()
}

/**
 * Computes a deterministic sort tuple [bucket, rank, rawNormalized] for any apparel size.
 * - Bucket 0: Standard alpha apparel sizes (XXS .. 4XL)
 * - Bucket 1: Numeric waist / chest sizes (26, 28, 30, 32 ...)
 * - Bucket 2: Taille / numbered editorial editions (Taille 01, Taille 02 ...)
 * - Bucket 3: One-size / standard fallback
 * - Bucket 4: Unknown labels sorted lexicographically
 */
function getSizeSortKey(sizeLabel: string | null | undefined): [number, number, string] {
  const raw = (sizeLabel ?? '').trim()
  if (!raw) return [4, Number.MAX_SAFE_INTEGER, '']

  const upper = raw.toUpperCase()
  const token = extractPrimarySizeToken(raw)

  if (token in ALPHA_SIZE_RANKS) {
    return [0, ALPHA_SIZE_RANKS[token]!, upper]
  }

  const numericMatch = token.match(/^(\d+(?:\.\d+)?)(?:\s*(?:IN|CM|UK|EU|US))?$/)
  if (numericMatch) {
    return [1, parseFloat(numericMatch[1]!), upper]
  }

  const tailleMatch = upper.match(TAILLE_REGEX)
  if (tailleMatch) {
    return [2, parseInt(tailleMatch[1]!, 10), upper]
  }

  if (
    token === 'OS' ||
    token === 'ONE SIZE' ||
    token === 'FREE SIZE' ||
    token === 'STANDARD'
  ) {
    return [3, 0, upper]
  }

  return [4, Number.MAX_SAFE_INTEGER, upper]
}

/**
 * Comparator for apparel size strings (XXS -> 4XL, then numeric waist/chest sizes).
 */
export function compareSizeLabels(a: string | null | undefined, b: string | null | undefined): number {
  const [bucketA, rankA, rawA] = getSizeSortKey(a)
  const [bucketB, rankB, rawB] = getSizeSortKey(b)

  if (bucketA !== bucketB) return bucketA - bucketB
  if (rankA !== rankB) return rankA - rankB
  return rawA.localeCompare(rawB, undefined, { numeric: true, sensitivity: 'base' })
}

/**
 * Returns a new sorted array of size strings using deterministic apparel size ranking.
 */
export function sortSizes(sizes: readonly string[]): string[] {
  return [...sizes].sort((a, b) => compareSizeLabels(a, b))
}

/**
 * Returns a new sorted array of variant objects ordered deterministically by their `size` property.
 */
export function sortVariantsBySize<T extends { size?: string | null }>(variants: readonly T[]): T[] {
  return [...variants].sort((a, b) => compareSizeLabels(a.size, b.size))
}
