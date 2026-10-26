import type { OrderWithItems } from '../types/database.types'

// In-memory fallback ledger so browser runtime always has access without 'fs'
let memoryLedger: OrderWithItems[] = []

// Dynamic Node runtime loader that will not fail webpack in client builds
function getNodeFsAndPath(): { fs: any; path: any } | null {
  if (typeof window !== 'undefined') return null
  try {
    // Avoid bundler static analysis using eval('require')
    const req = eval('require')
    return {
      fs: req('fs'),
      path: req('path'),
    }
  } catch {
    return null
  }
}

// Fallback search paths in monorepo if process.cwd() is apps/admin or apps/storefront
function getResolvedLedgerPath(): string | null {
  const node = getNodeFsAndPath()
  if (!node) return null

  const { fs, path } = node
  const LEDGER_FILE_PATH = path.join(
    process.cwd(),
    'packages',
    'supabase',
    'src',
    'data',
    'live_orders.json'
  )

  if (fs.existsSync(LEDGER_FILE_PATH)) return LEDGER_FILE_PATH

  const candidates = [
    LEDGER_FILE_PATH,
    path.resolve(process.cwd(), '..', '..', 'packages', 'supabase', 'src', 'data', 'live_orders.json'),
    path.resolve(process.cwd(), 'packages', 'supabase', 'src', 'data', 'live_orders.json'),
  ]

  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }

  // Ensure directory exists for primary candidate
  const target = candidates[1] || LEDGER_FILE_PATH
  try {
    const dir = path.dirname(target)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  } catch {}
  return target
}

export function readLiveOrdersLedger(): OrderWithItems[] {
  const node = getNodeFsAndPath()
  if (!node) return memoryLedger

  try {
    const filePath = getResolvedLedgerPath()
    if (filePath && node.fs.existsSync(filePath)) {
      const content = node.fs.readFileSync(filePath, 'utf-8')
      const parsed = JSON.parse(content)
      if (Array.isArray(parsed)) {
        memoryLedger = parsed
        return parsed
      }
    }
  } catch (err) {
    console.warn('Could not read orders ledger file:', err)
  }
  return memoryLedger
}

export function writeLiveOrderLedger(order: OrderWithItems): void {
  // Update memory ledger first
  const current = readLiveOrdersLedger()
  const filtered = current.filter(
    (o) => o.id !== order.id && o.order_number !== order.order_number
  )
  memoryLedger = [order, ...filtered]

  const node = getNodeFsAndPath()
  if (!node) return

  try {
    const filePath = getResolvedLedgerPath()
    if (filePath) {
      node.fs.writeFileSync(filePath, JSON.stringify(memoryLedger, null, 2), 'utf-8')
    }
  } catch (err) {
    console.warn('Could not persist order to ledger:', err)
  }
}

export function updateLiveOrderInLedger(
  orderId: string,
  updates: Partial<OrderWithItems>
): void {
  const current = readLiveOrdersLedger()
  memoryLedger = current.map((ord) => {
    if (ord.id === orderId || ord.order_number === orderId) {
      return {
        ...ord,
        ...updates,
        updated_at: new Date().toISOString(),
      }
    }
    return ord
  })

  const node = getNodeFsAndPath()
  if (!node) return

  try {
    const filePath = getResolvedLedgerPath()
    if (filePath) {
      node.fs.writeFileSync(filePath, JSON.stringify(memoryLedger, null, 2), 'utf-8')
    }
  } catch (err) {
    console.warn('Could not update live order in ledger:', err)
  }
}
