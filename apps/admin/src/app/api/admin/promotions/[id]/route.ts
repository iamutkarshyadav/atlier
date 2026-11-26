import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@repo/supabase/server'
import { updatePromotion, extractBannerImageUrl, cleanPromotionDescription } from '@repo/supabase/utils'
import { saveStorefrontPopup } from '@repo/supabase'
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
    const { couponCode, isPublicCoupon, rules, nudgeCampaign, ...promoUpdates } = body
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

        const couponPayload: any = {
          code: cleanCode,
          is_public: isPublicCoupon !== undefined ? Boolean(isPublicCoupon) : false,
        }

        if (existingCoupons && existingCoupons.length > 0) {
          await supabase
            .from('promotion_coupons')
            .update(couponPayload)
            .eq('id', existingCoupons[0].id)
        } else {
          await supabase
            .from('promotion_coupons')
            .insert({
              promotion_id: id,
              code: cleanCode,
              is_public: isPublicCoupon !== undefined ? Boolean(isPublicCoupon) : false,
              is_single_use: false,
              is_active: true,
            })
        }
      }
    }

    // If rules are provided, replace promotion_rules
    if (Array.isArray(rules)) {
      await supabase.from('promotion_rules').delete().eq('promotion_id', id)
      if (rules.length > 0) {
        const rulesPayload = rules.map((r: any) => ({
          ...r,
          promotion_id: id,
          target_type: r.target_type || r.rule_target_type || 'entire_order',
          rule_target_type: r.rule_target_type || r.target_type || 'entire_order',
          match_operator: r.match_operator || 'include',
          target_values: r.target_values || (r.target_id ? [r.target_id] : []),
        }))
        await supabase.from('promotion_rules').insert(rulesPayload as any)
      }
    }

    // If nudgeCampaign is provided, save or update linked popup
    if (nudgeCampaign) {
      try {
        await saveStorefrontPopup(supabase, {
          ...nudgeCampaign,
          promotion_id: id,
          type: 'sale',
          is_active: promoUpdates.is_active !== undefined ? promoUpdates.is_active : true,
          start_at: promoUpdates.starts_at,
          end_at: promoUpdates.ends_at,
        })
      } catch (nudgeErr) {
        console.warn('Failed to save linked popup nudge:', nudgeErr)
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
