/**
 * Code 128 (Subset B) Pure Vector Symbology Generator for @repo/ui
 * Zero-dependency, isomorphic, cross-runtime SVG barcode generator.
 */

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
      charCodes.push(0)
    }
  }

  let checksumTotal = START_CODE_B
  for (let i = 0; i < charCodes.length; i++) {
    checksumTotal += (i + 1) * charCodes[i]!
  }
  const checkDigit = checksumTotal % 103

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
  let isBar = true

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
