import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@repo/supabase/server'
import { updatePromotion, extractBannerImageUrl, cleanPromotionDescription } from '@repo/supabase/utils'
import { triggerStorefrontRevalidation } from '@/lib/revalidate'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const supabase = createServiceRoleClient()

    const { data: promotion, error } = await supabase
      .from('promotions')
      .select(`
        *,
        rules:promotion_rules(*),
        coupons:promotion_coupons(*),
        redemptions:promotion_redemptions(
          id,
          order_id,
          customer_email,
          discount_applied,
          status,
          created_at
        )
      `)
      .eq('id', id)
      .single()

    if (error || !promotion) {
      return NextResponse.json(
        { error: error?.message || 'Promotion not found' },
        { status: 404 }
      )
    }

    const normalizedPromotion = {
      ...promotion,
      banner_image_url: extractBannerImageUrl(promotion),
      description: cleanPromotionDescription(promotion.description),
    }

    return NextResponse.json({ promotion: normalizedPromotion }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch promotion' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await req.json()
    const { couponCode, ...promoUpdates } = body
    const supabase = createServiceRoleClient()

    const result = await updatePromotion(supabase, id, promoUpdates)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    // If couponCode is provided, update or create the associated code
    if (couponCode !== undefined && typeof couponCode === 'string') {
      const cleanCode = couponCode.trim().toUpperCase()
      if (cleanCode) {
        // Check if a coupon already exists for this promo
        const { data: existingCoupons } = await supabase
          .from('promotion_coupons')
          .select('id')
          .eq('promotion_id', id)
          .limit(1)

        if (existingCoupons && existingCoupons.length > 0) {
          await supabase
            .from('promotion_coupons')
            .update({ code: cleanCode })
            .eq('id', existingCoupons[0].id)
        } else {
          await supabase
            .from('promotion_coupons')
            .insert({
              promotion_id: id,
              code: cleanCode,
              is_single_use: false,
              is_active: true,
            })
        }
      }
    }

    await triggerStorefrontRevalidation({ path: '/' }).catch(() => {})
    await triggerStorefrontRevalidation({ path: '/shop' }).catch(() => {})
    await triggerStorefrontRevalidation({ path: '/offers' }).catch(() => {})

    return NextResponse.json({ success: true, promotion: result.promotion }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to update promotion' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const supabase = createServiceRoleClient()

    const { error } = await supabase.from('promotions').delete().eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    await triggerStorefrontRevalidation({ path: '/' }).catch(() => {})

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to delete promotion' },
      { status: 500 }
    )
  }
}
