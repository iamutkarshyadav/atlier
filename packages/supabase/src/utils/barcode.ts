/**
 * ATELIER SOVEREIGN BARCODE ENGINE (Code 128 Standard)
 * Zero-dependency, isomorphic, high-precision vector barcode generator.
 * Works seamlessly across Edge runtime, SSR, React Client, and Canvas/PDF generators.
 */

// Code 128 Pattern Table (Patterns of bars and spaces: 6 elements per symbol, sum of modules = 11)
const CODE128_PATTERNS: number[][] = [
  [2, 1, 2, 2, 2, 2], [2, 2, 2, 1, 2, 2], [2, 2, 2, 2, 2, 1], [1, 2, 1, 2, 2, 3],
  [1, 2, 1, 3, 2, 2], [1, 3, 1, 2, 2, 2], [1, 2, 2, 2, 1, 3], [1, 2, 2, 3, 1, 2],
  [1, 3, 2, 2, 1, 2], [2, 2, 1, 2, 1, 3], [2, 2, 1, 3, 1, 2], [2, 3, 1, 2, 1, 2],
  [1, 1, 2, 2, 3, 2], [1, 2, 2, 1, 3, 2], [1, 2, 2, 2, 3, 1], [1, 1, 3, 2, 2, 2],
  [1, 2, 3, 1, 2, 2], [1, 2, 3, 2, 2, 1], [2, 2, 3, 2, 1, 1], [2, 2, 1, 1, 3, 2],
  [2, 2, 1, 2, 3, 1], [2, 1, 3, 2, 1, 2], [2, 2, 3, 1, 1, 2], [3, 1, 2, 1, 3, 1],
  [3, 1, 1, 2, 2, 2], [3, 2, 1, 1, 2, 2], [3, 2, 1, 2, 2, 1], [3, 1, 2, 2, 1, 2],
  [3, 2, 2, 1, 1, 2], [3, 2, 2, 2, 1, 1], [2, 1, 2, 1, 2, 3], [2, 1, 2, 3, 2, 1],
  [2, 3, 2, 1, 2, 1], [1, 1, 1, 3, 2, 3], [1, 3, 1, 1, 2, 3], [1, 3, 1, 3, 2, 1],
  [1, 1, 2, 3, 1, 3], [1, 3, 2, 1, 1, 3], [1, 3, 2, 3, 1, 1], [2, 1, 1, 3, 1, 3],
  [2, 3, 1, 1, 1, 3], [2, 3, 1, 3, 1, 1], [1, 1, 2, 1, 3, 3], [1, 1, 2, 3, 3, 1],
  [1, 3, 2, 1, 3, 1], [1, 1, 3, 1, 2, 3], [1, 1, 3, 3, 2, 1], [1, 3, 3, 1, 2, 1],
  [3, 1, 3, 1, 2, 1], [2, 1, 1, 3, 3, 1], [2, 3, 1, 1, 3, 1], [2, 1, 3, 1, 1, 3],
  [2, 1, 3, 3, 1, 1], [2, 1, 3, 1, 3, 1], [3, 1, 1, 1, 2, 3], [3, 1, 1, 3, 2, 1],
  [3, 3, 1, 1, 2, 1], [3, 1, 2, 1, 1, 3], [3, 1, 2, 3, 1, 1], [3, 3, 2, 1, 1, 1],
  [3, 1, 4, 1, 1, 1], [2, 2, 1, 4, 1, 1], [4, 3, 1, 1, 1, 1], [1, 1, 1, 2, 2, 4],
  [1, 1, 1, 4, 2, 2], [1, 2, 1, 1, 2, 4], [1, 2, 1, 4, 2, 1], [1, 4, 1, 1, 2, 2],
  [1, 4, 1, 2, 2, 1], [1, 1, 2, 2, 1, 4], [1, 1, 2, 4, 1, 2], [1, 2, 2, 1, 1, 4],
  [1, 2, 2, 4, 1, 1], [1, 4, 2, 1, 1, 2], [1, 4, 2, 2, 1, 1], [2, 4, 1, 2, 1, 1],
  [2, 2, 1, 1, 1, 4], [4, 1, 3, 1, 1, 1], [2, 4, 1, 1, 1, 2], [1, 3, 4, 1, 1, 1],
  [1, 1, 1, 2, 4, 2], [1, 2, 1, 1, 4, 2], [1, 2, 1, 2, 4, 1], [1, 1, 4, 2, 1, 2],
  [1, 2, 4, 1, 1, 2], [1, 2, 4, 2, 1, 1], [4, 1, 1, 2, 1, 2], [4, 2, 1, 1, 1, 2],
  [4, 2, 1, 2, 1, 1], [2, 1, 2, 1, 4, 1], [2, 1, 4, 1, 2, 1], [4, 1, 2, 1, 2, 1],
  [1, 1, 1, 1, 4, 3], [1, 1, 1, 3, 4, 1], [1, 3, 1, 1, 4, 1], [1, 1, 4, 1, 1, 3],
  [1, 1, 4, 3, 1, 1], [4, 1, 1, 1, 1, 3], [4, 1, 1, 3, 1, 1], [1, 1, 3, 1, 4, 1],
  [1, 1, 4, 1, 3, 1], [3, 1, 1, 1, 4, 1], [4, 1, 1, 1, 3, 1], [2, 1, 1, 4, 1, 2],
  [2, 1, 1, 2, 1, 4], [2, 1, 1, 2, 3, 2], [2, 3, 3, 1, 1, 1, 2] // 106 = STOP
]

const START_CODE_B = 104
const STOP_CODE = 106

export interface BarcodeRenderOptions {
  height?: number
  barWidth?: number
  includeText?: boolean
  textColor?: string
  barColor?: string
  backgroundColor?: string
  fontSize?: number
  quietZone?: number
}

/**
 * Encodes string to Code 128 (Subset B) binary sequences.
 * Output: array of widths (bars, spaces alternating).
 */
export function encodeCode128B(rawText: string): {
  widths: number[]
  checksum: number
  totalModules: number
} {
  const clean = rawText.trim()
  const charCodes: number[] = []

  for (let i = 0; i < clean.length; i++) {
    const ascii = clean.charCodeAt(i)
    if (ascii >= 32 && ascii <= 126) {
      charCodes.push(ascii - 32)
    } else {
      // Fallback to space for unsupported chars
      charCodes.push(0)
    }
  }

  // Calculate Checksum: (START + SUM(pos * code)) % 103
  let checksumTotal = START_CODE_B
  for (let i = 0; i < charCodes.length; i++) {
    checksumTotal += (i + 1) * charCodes[i]!
  }
  const checkDigit = checksumTotal % 103

  // Assemble full sequence: Start B + chars + checkDigit + Stop
  const allSymbols = [START_CODE_B, ...charCodes, checkDigit, STOP_CODE]
  const widths: number[] = []
  let totalModules = 0

  for (const sym of allSymbols) {
    const pattern = CODE128_PATTERNS[sym]
    if (pattern) {
      for (const w of pattern) {
        widths.push(w)
        totalModules += w
      }
    }
  }

  return { widths, checksum: checkDigit, totalModules }
}

/**
 * Generates an SVG string representation of a Code 128 barcode.
 */
export function generateCode128Svg(
  text: string,
  options: BarcodeRenderOptions = {}
): string {
  const {
    height = 50,
    barWidth = 2,
    includeText = true,
    barColor = '#000000',
    backgroundColor = 'transparent',
    textColor = '#000000',
    fontSize = 11,
    quietZone = 12,
  } = options

  const { widths, totalModules } = encodeCode128B(text)
  const contentWidth = totalModules * barWidth
  const totalWidth = contentWidth + quietZone * 2
  const textHeight = includeText ? fontSize + 6 : 0
  const totalHeight = height + textHeight

  let svgRects = ''
  let currentX = quietZone
  let isBar = true // Code 128 always starts with a bar

  for (const w of widths) {
    const rectWidth = w * barWidth
    if (isBar) {
      svgRects += `<rect x="${currentX}" y="0" width="${rectWidth}" height="${height}" fill="${barColor}" />`
    }
    currentX += rectWidth
    isBar = !isBar
  }

  const textElement = includeText
    ? `<text x="${totalWidth / 2}" y="${height + fontSize + 2}" font-family="monospace" font-size="${fontSize}" fill="${textColor}" text-anchor="middle" font-weight="600" letter-spacing="1.5">${text}</text>`
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="${totalWidth}" height="${totalHeight}" shape-rendering="crispEdges" style="background-color: ${backgroundColor};">
    ${svgRects}
    ${textElement}
  </svg>`
}

/**
 * Generates an encoded Data URI (image/svg+xml) for embedding in PDF invoices or HTML packing slips.
 */
export function generateBarcodeDataUrl(
  text: string,
  options: BarcodeRenderOptions = {}
): string {
  const svg = generateCode128Svg(text, options)
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

/**
 * Generates standard SKU string: [BRAND]-[CATEGORY_SLUG]-[COLOR_SLUG]-[SIZE]
 */
export function generateStandardSku(
  brandPrefix: string,
  categorySlug: string,
  size: string
): string {
  const brand = (brandPrefix || 'ATL').toUpperCase().replace(/[^A-Z0-9]/g, '')
  const cat = (categorySlug || 'GAR').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3)
  const cleanSize = size.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${brand}-${cat}-${cleanSize}-${randomSuffix}`
}

/**
 * Generates standard barcode data string: BAR-[SKU_OR_RANDOM]
 */
export function generateStandardBarcode(skuOrId: string): string {
  const sanitized = skuOrId.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return `BAR-${sanitized}`
}

/**
 * Generates tracking barcode for order fulfillment: ATL-TRK-[HEX8]
 */
export function generateOrderTrackingBarcode(orderId: string): string {
  const hex = orderId.replace(/-/g, '').slice(0, 8).toUpperCase()
  return `ATL-TRK-${hex}`
}
