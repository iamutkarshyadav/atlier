-- ==============================================================================
-- FIX: atomic_create_order_and_reserve PL/pgSQL unassigned RECORD & schema alignment
-- Migration: 20261202_fix_atomic_order_v_promo_bug.sql
--
-- Fixes:
-- 1. Eliminates SQLSTATE 55000 (`record "v_promo" is not assigned yet`) caused by
--    evaluating `IF v_promo_id IS NOT NULL AND v_promo.enforce_margin_floor = true`
--    inside the item loop when no promotion/coupon is applied.
-- 2. Guards every RECORD variable (`v_promo`, `v_coupon`, `v_curr_level`, `v_item`)
--    so no field on an unassigned record is ever bound in a boolean predicate.
-- 3. Aligns INSERT INTO public.orders strictly with the live orders schema
--    (`original_total`, `total`, `shipping_fee`, `delivery_notes`, `invoice_number`,
--    `tracking_barcode`, `bolt_pincode`, `bolt_timeslot_id`, `bolt_session_status`).
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.atomic_create_order_and_reserve(
  p_order_data JSONB,
  p_items JSONB,
  p_source_location_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_loc_id UUID;
  v_order_id UUID;
  v_order_number VARCHAR(50);
  v_invoice_number TEXT;
  v_tracking_barcode TEXT;
  v_item RECORD;
  v_curr_level RECORD;
  v_user_id UUID;
  v_status public.order_status;
  v_delivery_mode public.delivery_mode;
  v_try_on_status public.try_on_status;
  v_order_type public.order_type;
  v_bolt_pincode VARCHAR(10);
  v_bolt_timeslot_id UUID;
  v_bolt_session_status public.bolt_session_status;
  v_subtotal NUMERIC(10, 2);
  v_discount NUMERIC(10, 2);
  v_delivery_fee NUMERIC(10, 2);
  v_tax_amount NUMERIC(10, 2);
  v_total_amount NUMERIC(10, 2);
  v_notes TEXT;
  v_shipping_address_text TEXT;
  v_shipping_addr JSONB;
  v_billing_addr JSONB;

  -- Promotion & Guardrails Variables
  v_promo_id UUID := NULL;
  v_coupon_id UUID := NULL;
  v_coupon_code VARCHAR(50) := NULL;
  v_customer_email VARCHAR(255) := NULL;
  v_promo RECORD;
  v_coupon RECORD;
  v_enforce_margin_floor BOOLEAN := false;
  v_customer_redemptions_count INT := 0;
  v_item_cost NUMERIC(10, 2);
  v_item_unit_price NUMERIC(10, 2);
  v_item_discount NUMERIC(10, 2);
  v_item_final_price NUMERIC(10, 2);
  v_margin_protected BOOLEAN := false;
  v_discount_breakdown JSONB;
BEGIN
  -- 1. Determine fulfillment location
  v_loc_id := p_source_location_id;
  IF v_loc_id IS NULL THEN
    SELECT id INTO v_loc_id
    FROM public.locations
    WHERE is_active = true
    ORDER BY online_fulfillment_priority ASC
    LIMIT 1;
  END IF;

  IF v_loc_id IS NULL THEN
    RAISE EXCEPTION 'No active fulfillment location available';
  END IF;

  -- 2. Validate Items
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;

  -- Extract Customer Email for Coupon & Promotion Quotas
  v_customer_email := lower(trim(COALESCE(
    p_order_data->>'customer_email',
    p_order_data->'shipping_address_json'->>'email',
    ''
  )));

  -- 3. Promotion & Coupon Locking & Concurrency Quota Check
  v_coupon_code := upper(trim(COALESCE(p_order_data->>'coupon_code', '')));
  IF v_coupon_code <> '' THEN
    -- Lock coupon row FOR UPDATE to prevent concurrency race conditions
    SELECT * INTO v_coupon
    FROM public.promotion_coupons
    WHERE upper(code) = v_coupon_code AND is_active = true
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'INVALID_COUPON: Coupon code "%" is invalid or inactive', v_coupon_code;
    END IF;

    IF v_coupon.max_uses IS NOT NULL AND v_coupon.times_used >= v_coupon.max_uses THEN
      RAISE EXCEPTION 'COUPON_EXHAUSTED: Coupon code "%" has reached its maximum redemption limit', v_coupon_code;
    END IF;

    IF v_coupon.assigned_customer_email IS NOT NULL AND lower(v_coupon.assigned_customer_email) <> v_customer_email THEN
      RAISE EXCEPTION 'UNAUTHORIZED_COUPON: This exclusive voucher is reserved for a specific private client';
    END IF;

    v_coupon_id := v_coupon.id;
    v_promo_id := v_coupon.promotion_id;
  ELSE
    v_promo_id := NULLIF(trim(COALESCE(p_order_data->>'promotion_id', '')), '')::UUID;
  END IF;

  -- Lock and validate master promotion if present
  IF v_promo_id IS NOT NULL THEN
    SELECT * INTO v_promo
    FROM public.promotions
    WHERE id = v_promo_id AND is_active = true
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'INVALID_PROMOTION: Promotion is inactive or does not exist';
    END IF;

    IF timezone('utc'::text, now()) < v_promo.starts_at
       OR (v_promo.ends_at IS NOT NULL AND timezone('utc'::text, now()) > v_promo.ends_at) THEN
      RAISE EXCEPTION 'PROMOTION_EXPIRED: Promotion is outside its active validity schedule';
    END IF;

    IF v_promo.usage_limit_total IS NOT NULL AND v_promo.total_redemptions_count >= v_promo.usage_limit_total THEN
      RAISE EXCEPTION 'PROMOTION_EXHAUSTED: Total allocation for this privilege has been exhausted';
    END IF;

    IF v_customer_email <> '' AND v_promo.usage_limit_per_customer IS NOT NULL THEN
      SELECT count(*) INTO v_customer_redemptions_count
      FROM public.promotion_redemptions
      WHERE promotion_id = v_promo_id
        AND lower(customer_email) = v_customer_email
        AND status = 'applied';

      IF v_customer_redemptions_count >= v_promo.usage_limit_per_customer THEN
        RAISE EXCEPTION 'USAGE_LIMIT_EXCEEDED: You have already redeemed this privilege the maximum allowable times';
      END IF;
    END IF;

    v_enforce_margin_floor := COALESCE(v_promo.enforce_margin_floor, false);
  END IF;

  -- 4. Inventory Row Locking and Margin-Floor Validation per Item
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
    variant_id UUID,
    product_id UUID,
    quantity INT,
    unit_price NUMERIC(10, 2),
    discount_amount NUMERIC(10, 2),
    final_unit_price NUMERIC(10, 2),
    original_unit_price NUMERIC(10, 2),
    size TEXT,
    hsn_code VARCHAR(10),
    promotion_id UUID
  )
  LOOP
    IF v_item.variant_id IS NULL THEN
      RAISE EXCEPTION 'variant_id is required for all order items';
    END IF;

    IF v_item.quantity <= 0 THEN
      RAISE EXCEPTION 'Item quantity must be greater than 0';
    END IF;

    -- Row-level lock on inventory_levels to prevent overselling race conditions
    SELECT on_hand, reserved, available INTO v_curr_level
    FROM public.inventory_levels
    WHERE location_id = v_loc_id AND variant_id = v_item.variant_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK: No inventory record found for variant % at location %', v_item.variant_id, v_loc_id;
    END IF;

    IF v_curr_level.available < v_item.quantity THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK: Insufficient available stock for variant %. Available: %, Requested: %',
        v_item.variant_id, v_curr_level.available, v_item.quantity;
    END IF;

    -- Margin Floor Check (scalar boolean only; never dereference unassigned v_promo RECORD)
    SELECT COALESCE(pv.cost_price, p.cost_price, 0.00) INTO v_item_cost
    FROM public.product_variants pv
    JOIN public.products p ON p.id = pv.product_id
    WHERE pv.id = v_item.variant_id;

    v_item_unit_price := v_item.unit_price;
    v_item_discount := COALESCE(v_item.discount_amount, 0.00);
    v_item_final_price := COALESCE(v_item.final_unit_price, (v_item_unit_price - v_item_discount));

    IF v_enforce_margin_floor THEN
      IF (v_item_unit_price - v_item_discount) < COALESCE(v_item_cost, 0.00) THEN
        v_margin_protected := true;
      END IF;
    END IF;

    -- Atomically increment reserved stock
    UPDATE public.inventory_levels
    SET reserved = reserved + v_item.quantity,
        updated_at = timezone('utc'::text, now())
    WHERE location_id = v_loc_id AND variant_id = v_item.variant_id;

    -- Record reservation in double-entry ledger
    INSERT INTO public.inventory_ledger (
      variant_id,
      location_id,
      movement_type,
      quantity,
      balance_after,
      reference_doc_type,
      reference_doc_id
    )
    VALUES (
      v_item.variant_id,
      v_loc_id,
      'online_reservation',
      v_item.quantity,
      v_curr_level.on_hand - (v_curr_level.reserved + v_item.quantity),
      'CHECKOUT_RESERVATION',
      COALESCE(NULLIF(p_order_data->>'order_number', ''), 'PENDING')
    );
  END LOOP;

  -- 5. Prepare Order fields
  v_order_number := COALESCE(
    NULLIF(p_order_data->>'order_number', ''),
    'ORD-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text, 1, 6))
  );
  v_invoice_number := COALESCE(
    NULLIF(p_order_data->>'invoice_number', ''),
    'INV-' || v_order_number
  );
  v_tracking_barcode := COALESCE(
    NULLIF(p_order_data->>'tracking_barcode', ''),
    'ATL-TRK-' || v_order_number
  );
  v_user_id := NULLIF(trim(COALESCE(p_order_data->>'user_id', '')), '')::UUID;
  v_status := COALESCE((NULLIF(p_order_data->>'status', ''))::public.order_status, 'pending'::public.order_status);
  v_delivery_mode := COALESCE((NULLIF(p_order_data->>'delivery_mode', ''))::public.delivery_mode, 'direct'::public.delivery_mode);
  v_try_on_status := CASE
    WHEN v_delivery_mode = 'try_on' THEN COALESCE((NULLIF(p_order_data->>'try_on_status', ''))::public.try_on_status, 'pending'::public.try_on_status)
    ELSE NULL
  END;
  v_order_type := CASE
    WHEN v_delivery_mode = 'try_on' THEN 'bolt_try_on'::public.order_type
    ELSE 'standard'::public.order_type
  END;
  v_bolt_pincode := COALESCE(
    NULLIF(p_order_data->>'bolt_pincode', ''),
    NULLIF(p_order_data->'shipping_address_json'->>'bolt_pincode', '')
  );
  v_bolt_timeslot_id := NULLIF(trim(COALESCE(
    p_order_data->>'bolt_timeslot_id',
    p_order_data->'shipping_address_json'->>'bolt_timeslot_id',
    ''
  )), '')::UUID;
  v_bolt_session_status := CASE
    WHEN v_delivery_mode = 'try_on' THEN 'scheduled'::public.bolt_session_status
    ELSE NULL
  END;

  v_subtotal := COALESCE((p_order_data->>'original_total')::NUMERIC, (p_order_data->>'subtotal')::NUMERIC, 0);
  v_discount := COALESCE((p_order_data->>'discount')::NUMERIC, 0);
  v_delivery_fee := COALESCE((p_order_data->>'shipping_fee')::NUMERIC, (p_order_data->>'delivery_fee')::NUMERIC, 0);
  v_tax_amount := COALESCE((p_order_data->>'tax_amount')::NUMERIC, 0);
  v_total_amount := COALESCE(
    (p_order_data->>'total')::NUMERIC,
    (p_order_data->>'total_amount')::NUMERIC,
    GREATEST(0, v_subtotal - v_discount + v_delivery_fee + v_tax_amount)
  );
  v_notes := COALESCE(NULLIF(p_order_data->>'delivery_notes', ''), NULLIF(p_order_data->>'notes', ''));
  v_shipping_address_text := COALESCE(
    NULLIF(p_order_data->>'shipping_address', ''),
    NULLIF(p_order_data->'shipping_address_json'->>'address', '')
  );
  v_shipping_addr := p_order_data->'shipping_address_json';
  v_billing_addr := p_order_data->'billing_address_json';
  v_discount_breakdown := COALESCE(p_order_data->'discount_breakdown', '[]'::jsonb);

  -- 6. Insert into public.orders (only verified schema columns)
  INSERT INTO public.orders (
    order_number,
    invoice_number,
    tracking_barcode,
    user_id,
    status,
    delivery_mode,
    try_on_status,
    order_type,
    bolt_pincode,
    bolt_timeslot_id,
    bolt_session_status,
    original_total,
    total,
    tax_amount,
    shipping_fee,
    source_location_id,
    fulfillment_location_id,
    shipping_address,
    shipping_address_json,
    billing_address_json,
    delivery_notes,
    promotion_id,
    coupon_code,
    discount_breakdown,
    margin_protected,
    created_at,
    updated_at
  )
  VALUES (
    v_order_number,
    v_invoice_number,
    v_tracking_barcode,
    v_user_id,
    v_status,
    v_delivery_mode,
    v_try_on_status,
    v_order_type,
    v_bolt_pincode,
    v_bolt_timeslot_id,
    v_bolt_session_status,
    v_subtotal,
    v_total_amount,
    v_tax_amount,
    v_delivery_fee,
    v_loc_id,
    v_loc_id,
    v_shipping_address_text,
    v_shipping_addr,
    v_billing_addr,
    v_notes,
    v_promo_id,
    NULLIF(v_coupon_code, ''),
    v_discount_breakdown,
    v_margin_protected,
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  )
  RETURNING id INTO v_order_id;

  -- 7. Insert Order Items with Line-Level Discounts
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
    variant_id UUID,
    product_id UUID,
    quantity INT,
    unit_price NUMERIC(10, 2),
    discount_amount NUMERIC(10, 2),
    final_unit_price NUMERIC(10, 2),
    original_unit_price NUMERIC(10, 2),
    size TEXT,
    hsn_code VARCHAR(10),
    promotion_id UUID
  )
  LOOP
    INSERT INTO public.order_items (
      order_id,
      product_id,
      variant_id,
      quantity,
      unit_price,
      original_unit_price,
      discount_amount,
      final_unit_price,
      promotion_id,
      size,
      hsn_code,
      try_on_decision,
      created_at
    )
    VALUES (
      v_order_id,
      v_item.product_id,
      v_item.variant_id,
      v_item.quantity,
      v_item.unit_price,
      COALESCE(v_item.original_unit_price, v_item.unit_price),
      COALESCE(v_item.discount_amount, 0.00),
      COALESCE(v_item.final_unit_price, v_item.unit_price - COALESCE(v_item.discount_amount, 0.00)),
      COALESCE(v_item.promotion_id, v_promo_id),
      v_item.size,
      v_item.hsn_code,
      'pending'::public.try_on_decision,
      timezone('utc'::text, now())
    );
  END LOOP;

  -- 8. Increment Promotion/Coupon Redemptions & Write to Audit Table
  IF v_promo_id IS NOT NULL THEN
    UPDATE public.promotions
    SET total_redemptions_count = total_redemptions_count + 1,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_promo_id;

    IF v_coupon_id IS NOT NULL THEN
      UPDATE public.promotion_coupons
      SET times_used = times_used + 1
      WHERE id = v_coupon_id;
    END IF;

    INSERT INTO public.promotion_redemptions (
      promotion_id,
      coupon_id,
      order_id,
      user_id,
      customer_email,
      original_subtotal,
      discount_applied,
      margin_clamped,
      status,
      redeemed_at
    )
    VALUES (
      v_promo_id,
      v_coupon_id,
      v_order_id,
      v_user_id,
      COALESCE(NULLIF(v_customer_email, ''), 'guest@atelier.local'),
      v_subtotal,
      v_discount,
      v_margin_protected,
      'applied',
      timezone('utc'::text, now())
    );
  END IF;

  -- 9. Return Created Order Details
  RETURN jsonb_build_object(
    'id', v_order_id,
    'order_number', v_order_number,
    'invoice_number', v_invoice_number,
    'tracking_barcode', v_tracking_barcode,
    'status', v_status,
    'total', v_total_amount,
    'total_amount', v_total_amount,
    'original_total', v_subtotal,
    'subtotal', v_subtotal,
    'discount', v_discount,
    'tax_amount', v_tax_amount,
    'shipping_fee', v_delivery_fee,
    'delivery_fee', v_delivery_fee,
    'fulfillment_location_id', v_loc_id,
    'promotion_id', v_promo_id,
    'coupon_code', NULLIF(v_coupon_code, ''),
    'margin_protected', v_margin_protected
  );
END;
$$;
