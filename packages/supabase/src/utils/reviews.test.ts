import { describe, it, expect, vi } from 'vitest'
import {
  checkUserReviewEligibility,
  createProductReview,
  updateProductReviewModeration,
  updatePatronReview,
  getProductRatingSummary,
} from './index'

describe('Verified Purchase Reviews Engine', () => {
  describe('checkUserReviewEligibility', () => {
    it('rejects review if item already has a submitted review', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'product_reviews') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: 'rev-1', status: 'approved', rating: 5 },
                    error: null,
                  }),
                }),
              }),
            }
          }
          return {}
        }),
      } as any

      const res = await checkUserReviewEligibility(mockSupabase, 'user-1', 'item-1')
      expect(res.eligible).toBe(false)
      expect(res.reason).toContain('already submitted a review')
    })

    it('rejects review if the order is not delivered', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'product_reviews') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }
          }
          if (table === 'order_items') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'item-1',
                      product_id: 'prod-1',
                      order: { id: 'ord-1', user_id: 'user-1', status: 'processing', delivery_mode: 'standard' },
                    },
                    error: null,
                  }),
                }),
              }),
            }
          }
          return {}
        }),
      } as any

      const res = await checkUserReviewEligibility(mockSupabase, 'user-1', 'item-1')
      expect(res.eligible).toBe(false)
      expect(res.reason).toContain('delivered')
    })

    it('rejects review if Bolt Try-On item was rejected at doorstep', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'product_reviews') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }
          }
          if (table === 'order_items') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'item-1',
                      product_id: 'prod-1',
                      is_kept: false,
                      try_on_decision: 'rejected',
                      order: { id: 'ord-1', user_id: 'user-1', status: 'delivered', delivery_mode: 'bolt' },
                    },
                    error: null,
                  }),
                }),
              }),
            }
          }
          return {}
        }),
      } as any

      const res = await checkUserReviewEligibility(mockSupabase, 'user-1', 'item-1')
      expect(res.eligible).toBe(false)
      expect(res.reason).toContain('Bolt Doorstep Try-On')
    })

    it('grants eligibility for kept Bolt Try-On item', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'product_reviews') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }
          }
          if (table === 'order_items') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'item-1',
                      order_id: 'ord-1',
                      product_id: 'prod-1',
                      variant_id: 'var-1',
                      size: 'M',
                      is_kept: true,
                      try_on_decision: 'kept',
                      order: { id: 'ord-1', user_id: 'user-1', status: 'delivered', delivery_mode: 'bolt' },
                    },
                    error: null,
                  }),
                }),
              }),
            }
          }
          return {}
        }),
      } as any

      const res = await checkUserReviewEligibility(mockSupabase, 'user-1', 'item-1')
      expect(res.eligible).toBe(true)
      expect(res.orderItem?.size).toBe('M')
      expect(res.orderItem?.is_bolt).toBe(true)
    })

    it('grants eligibility for delivered Bolt Try-On order when decision was not explicitly rejected', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'product_reviews') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }
          }
          if (table === 'order_items') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'item-2',
                      order_id: 'ord-1',
                      product_id: 'prod-1',
                      variant_id: 'var-1',
                      size: 'L',
                      is_kept: null,
                      try_on_decision: 'pending',
                      order: { id: 'ord-1', user_id: 'user-1', status: 'delivered', delivery_mode: 'try_on' },
                    },
                    error: null,
                  }),
                }),
              }),
            }
          }
          return {}
        }),
      } as any

      const res = await checkUserReviewEligibility(mockSupabase, 'user-1', 'item-2')
      expect(res.eligible).toBe(true)
      expect(res.orderItem?.size).toBe('L')
    })

    it('rejects review if caller is not the purchasing patron', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'product_reviews') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }
          }
          if (table === 'order_items') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'item-1',
                      order: { id: 'ord-1', user_id: 'user-different', status: 'delivered', delivery_mode: 'standard' },
                    },
                    error: null,
                  }),
                }),
              }),
            }
          }
          return {}
        }),
      } as any

      const res = await checkUserReviewEligibility(mockSupabase, 'user-1', 'item-1')
      expect(res.eligible).toBe(false)
      expect(res.reason).toContain('own delivered orders')
    })
  })

  describe('createProductReview', () => {
    it('clamps rating between 1 and 5 and enforces pending status', async () => {
      let insertedPayload: any = null
      let insertedMedia: any = null

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'product_reviews') {
            return {
              insert: vi.fn((payload) => {
                insertedPayload = payload
                return {
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { id: 'rev-new', ...payload },
                      error: null,
                    }),
                  }),
                }
              }),
            }
          }
          if (table === 'review_media') {
            return {
              insert: vi.fn((media) => {
                insertedMedia = media
                return Promise.resolve({ error: null })
              }),
            }
          }
          return {}
        }),
      } as any

      const res = await createProductReview(mockSupabase, {
        productId: 'prod-1',
        orderId: 'ord-1',
        orderItemId: 'item-1',
        userId: 'user-1',
        rating: 10, // out of range
        title: 'A'.repeat(200), // longer than 150 chars
        comment: 'Exquisite silk finish.',
        fitIndicator: 'true_to_size',
        mediaUrls: ['https://cdn.example.com/photo1.jpg', 'https://cdn.example.com/photo2.jpg'],
      })

      expect(res.success).toBe(true)
      expect(insertedPayload.rating).toBe(5) // clamped to 5
      expect(insertedPayload.title.length).toBe(150) // truncated
      expect(insertedPayload.status).toBe('pending') // moderation queue
      expect(insertedPayload.verified_purchase).toBe(true)
      expect(insertedMedia.length).toBe(2)
      expect(insertedMedia[0].image_url).toBe('https://cdn.example.com/photo1.jpg')
    })
  })

  describe('updateProductReviewModeration', () => {
    it('records moderation action and concierge reply timestamp', async () => {
      let updatePayload: any = null

      const mockSupabase = {
        from: vi.fn(() => ({
          update: vi.fn((payload) => {
            updatePayload = payload
            return {
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'rev-1', ...payload },
                    error: null,
                  }),
                }),
              }),
            }
          }),
        })),
      } as any

      const res = await updateProductReviewModeration(mockSupabase, 'rev-1', {
        status: 'approved',
        moderatedBy: 'admin-1',
        adminReply: 'Thank you for your elegant review. We are delighted you enjoy the silhouette.',
        adminRepliedBy: 'admin-1',
      })

      expect(res.success).toBe(true)
      expect(updatePayload.status).toBe('approved')
      expect(updatePayload.moderated_by).toBe('admin-1')
      expect(updatePayload.admin_reply).toContain('Thank you for your elegant review')
      expect(updatePayload.admin_replied_at).toBeDefined()
    })
  })

  describe('updatePatronReview', () => {
    it('resets status to pending when edited within 30 days', async () => {
      let updatePayload: any = null

      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'rev-1',
                  user_id: 'user-1',
                  created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
                  status: 'approved',
                },
                error: null,
              }),
            }),
          }),
          update: vi.fn((payload) => {
            updatePayload = payload
            return {
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'rev-1', ...payload },
                    error: null,
                  }),
                }),
              }),
            }
          }),
        })),
      } as any

      const res = await updatePatronReview(mockSupabase, 'rev-1', 'user-1', {
        rating: 4,
        title: 'Updated title',
        comment: 'Updated feedback',
      })

      expect(res.success).toBe(true)
      expect(updatePayload.status).toBe('pending') // re-moderated!
      expect(updatePayload.rating).toBe(4)
    })

    it('rejects edits older than 30 days', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'rev-1',
                  user_id: 'user-1',
                  created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(), // 40 days ago
                  status: 'approved',
                },
                error: null,
              }),
            }),
          }),
        })),
      } as any

      const res = await updatePatronReview(mockSupabase, 'rev-1', 'user-1', {
        comment: 'Too late edit',
      })

      expect(res.success).toBe(false)
      expect(res.error).toContain('30 days')
    })
  })

  describe('getProductRatingSummary', () => {
    it('aggregates distribution bars and fit counts correctly', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'products') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      average_rating: 4.67,
                      review_count: 3,
                      fit_runs_small_count: 0,
                      fit_true_to_size_count: 3,
                      fit_runs_large_count: 0,
                    },
                    error: null,
                  }),
                }),
              }),
            }
          }
          if (table === 'product_reviews') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({
                    data: [{ rating: 5 }, { rating: 5 }, { rating: 4 }],
                    error: null,
                  }),
                }),
              }),
            }
          }
          return {}
        }),
      } as any

      const summary = await getProductRatingSummary(mockSupabase, 'prod-1')
      expect(summary.average_rating).toBe(4.67)
      expect(summary.review_count).toBe(3)
      expect(summary.fit_true_to_size_count).toBe(3)
      expect(summary.distribution[5]).toBe(2)
      expect(summary.distribution[4]).toBe(1)
      expect(summary.distribution[1]).toBe(0)
    })
  })
})
