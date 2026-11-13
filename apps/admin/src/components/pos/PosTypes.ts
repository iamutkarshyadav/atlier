export interface CartItem {
  variantId: string
  productId: string
  title: string
  size: string
  sku: string
  price: number
  quantity: number
  discountPercent: number
  shelfId: string
  shelfCoordinate: string
  imageUrl?: string | null
  category?: string | null
  material?: string | null
  isEndlessAisle?: boolean
  originLocationCode?: string
}

export interface ParkedCart {
  id: string
  name: string
  items: CartItem[]
  customerName: string
  customerPhone: string
  customerEmail?: string
  customerGstin?: string
  customerDiscountPercent: number
  notes?: string
}

export type PaymentMethod = 'upi' | 'card' | 'cash' | 'split'

export interface ShiftState {
  isOpen: boolean
  terminalId: string
  cashierName: string
  openingFloat: number
  openedAt: string
  cashSales: number
  cardSales: number
  upiSales: number
  cashDrop: number
}
