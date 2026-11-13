import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  calculateAvailableStock,
  getEcomAvailableStock,
  getStoreAvailableStock,
  executeLedgerTransaction,
} from './ledger'
import { LocationType, TransactionType } from '@prisma/client'

describe('Double-Entry Inventory Ledger Engine', () => {
  const mockPrisma: any = {
    inventoryLedger: {
      aggregate: vi.fn(),
      create: vi.fn(),
    },
    location: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('calculateAvailableStock()', () => {
    it('accurately computes stock as SUM(INBOUND) - SUM(OUTBOUND)', async () => {
      // Inbound = 50, Outbound = 18 => Available = 32
      mockPrisma.inventoryLedger.aggregate
        .mockResolvedValueOnce({ _sum: { qty: 50 } })
        .mockResolvedValueOnce({ _sum: { qty: 18 } })

      const available = await calculateAvailableStock('variant-1', 'loc-warehouse', mockPrisma)

      expect(available).toBe(32)
      expect(mockPrisma.inventoryLedger.aggregate).toHaveBeenCalledTimes(2)
      expect(mockPrisma.inventoryLedger.aggregate).toHaveBeenNthCalledWith(1, {
        _sum: { qty: true },
        where: { variantId: 'variant-1', toLocationId: 'loc-warehouse' },
      })
      expect(mockPrisma.inventoryLedger.aggregate).toHaveBeenNthCalledWith(2, {
        _sum: { qty: true },
        where: { variantId: 'variant-1', fromLocationId: 'loc-warehouse' },
      })
    })

    it('returns zero and prevents negative numbers if outbound exceeds inbound', async () => {
      mockPrisma.inventoryLedger.aggregate
        .mockResolvedValueOnce({ _sum: { qty: 5 } })
        .mockResolvedValueOnce({ _sum: { qty: 10 } })

      const available = await calculateAvailableStock('variant-1', 'loc-warehouse', mockPrisma)
      expect(available).toBe(0)
    })

    it('handles null aggregate sums gracefully (no entries recorded)', async () => {
      mockPrisma.inventoryLedger.aggregate
        .mockResolvedValueOnce({ _sum: { qty: null } })
        .mockResolvedValueOnce({ _sum: { qty: null } })

      const available = await calculateAvailableStock('variant-1', 'loc-warehouse', mockPrisma)
      expect(available).toBe(0)
    })
  })

  describe('Ringfenced Fulfillment Query Isolation', () => {
    it('getEcomAvailableStock queries strictly against ECOM_WAREHOUSE location', async () => {
      mockPrisma.location.findFirst.mockResolvedValueOnce({ id: 'loc-ecom-wh01' })
      mockPrisma.inventoryLedger.aggregate
        .mockResolvedValueOnce({ _sum: { qty: 100 } })
        .mockResolvedValueOnce({ _sum: { qty: 25 } })

      const stock = await getEcomAvailableStock('variant-1', undefined, mockPrisma)

      expect(stock).toBe(75)
      expect(mockPrisma.location.findFirst).toHaveBeenCalledWith({
        where: { type: LocationType.ECOM_WAREHOUSE, isActive: true },
        select: { id: true },
      })
      expect(mockPrisma.inventoryLedger.aggregate).toHaveBeenNthCalledWith(1, {
        _sum: { qty: true },
        where: { variantId: 'variant-1', toLocationId: 'loc-ecom-wh01' },
      })
    })

    it('getStoreAvailableStock rejects non-retail locations and isolates store stock', async () => {
      mockPrisma.location.findUnique.mockResolvedValueOnce({
        id: 'loc-store-blr',
        type: LocationType.RETAIL_STORE,
        isActive: true,
      })
      mockPrisma.inventoryLedger.aggregate
        .mockResolvedValueOnce({ _sum: { qty: 15 } })
        .mockResolvedValueOnce({ _sum: { qty: 3 } })

      const stock = await getStoreAvailableStock('variant-1', 'loc-store-blr', mockPrisma)
      expect(stock).toBe(12)
    })

    it('throws error when getStoreAvailableStock is called with an ECOM or invalid location', async () => {
      mockPrisma.location.findUnique.mockResolvedValueOnce({
        id: 'loc-ecom',
        type: LocationType.ECOM_WAREHOUSE,
        isActive: true,
      })

      await expect(
        getStoreAvailableStock('variant-1', 'loc-ecom', mockPrisma)
      ).rejects.toThrow('Invalid or inactive retail store location')
    })
  })

  describe('executeLedgerTransaction()', () => {
    it('enforces non-zero positive quantity', async () => {
      await expect(
        executeLedgerTransaction(
          {
            variantId: 'v-1',
            qty: 0,
            fromLocationId: 'loc-a',
            toLocationId: 'loc-b',
            transactionType: TransactionType.INBOUND,
            referenceId: 'REF-001',
          },
          mockPrisma
        )
      ).rejects.toThrow('quantity must be greater than zero')
    })

    it('enforces distinct source and destination locations', async () => {
      await expect(
        executeLedgerTransaction(
          {
            variantId: 'v-1',
            qty: 10,
            fromLocationId: 'loc-same',
            toLocationId: 'loc-same',
            transactionType: TransactionType.STORE_TRANSFER,
            referenceId: 'REF-002',
          },
          mockPrisma
        )
      ).rejects.toThrow('Double-entry ledger requires distinct source and destination locations')
    })

    it('appends an immutable record when payload is valid', async () => {
      mockPrisma.inventoryLedger.create.mockResolvedValueOnce({
        id: 'ledger-uuid',
        variantId: 'v-1',
        qty: 5,
        fromLocationId: 'loc-a',
        toLocationId: 'loc-b',
        transactionType: TransactionType.POS_SALE,
        referenceId: 'POS-REC-101',
      })

      const entry = await executeLedgerTransaction(
        {
          variantId: 'v-1',
          qty: 5,
          fromLocationId: 'loc-a',
          toLocationId: 'loc-b',
          transactionType: TransactionType.POS_SALE,
          referenceId: 'POS-REC-101',
        },
        mockPrisma
      )

      expect(entry.id).toBe('ledger-uuid')
      expect(mockPrisma.inventoryLedger.create).toHaveBeenCalledWith({
        data: {
          variantId: 'v-1',
          qty: 5,
          fromLocationId: 'loc-a',
          toLocationId: 'loc-b',
          transactionType: TransactionType.POS_SALE,
          referenceId: 'POS-REC-101',
          notes: undefined,
        },
      })
    })
  })
})

