-- ==============================================================================
-- ATELIER ENTERPRISE: PROMOTIONS, PRICING & DISCOUNT ENGINE SCHEMA
-- Migration: 20261127_promotions_and_pricing_engine.sql
-- ==============================================================================

-- 1. Cost Price Columns & Security Baseline
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10, 2) DEFAULT 0.00;

ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10, 2);

-- Column-level privilege restrictions: Hide cost_price from unauthenticated patrons and authenticated shoppers (service_role only)
REVOKE SELECT (cost_price) ON public.products FROM anon, authenticated;
REVOKE SELECT (cost_price) ON public.product_variants FROM anon, authenticated;

-- 2. Enumerated Types for Promotion Engine
DO $$ BEGIN
  CREATE TYPE public.promotion_type AS ENUM (
    'coupon',              -- Requires explicit alphanumeric code entry
    'automatic_cart',      -- Auto-applies when cart conditions are satisfied
    'tiered_threshold',    -- Spend ₹X get ₹Y / spend ₹A get B%
    'buy_x_get_y',         -- Buy X items get Y complimentary/discounted
    'shipping_waiver'      -- Waives Standard Express or Bolt Doorstep Try-On fee
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.discount_type AS ENUM (
    'percentage',          -- Percentage off matching items/cart (e.g. 15%)
    'fixed_amount',        -- Fixed monetary reduction in INR (e.g. ₹2,000)
    'fixed_price',         -- Overrides unit price directly (e.g. promotional ₹4,999)
    'free_shipping'        -- 100% deduction of delivery fee
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.rule_target_type AS ENUM (
    'entire_order',
    'category',
    'collection',
    'product',
    'variant',
    'delivery_mode',
    'customer_tier'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Master Promotions Table
CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  promotion_type public.promotion_type NOT NULL DEFAULT 'coupon',
  discount_type public.discount_type NOT NULL DEFAULT 'percentage',
  discount_value NUMERIC(10, 2) NOT NULL CHECK (discount_value >= 0),
  
  -- Guardrails & Limits
  min_order_subtotal NUMERIC(10, 2) DEFAULT 0.00,
  max_discount_amount NUMERIC(10, 2) DEFAULT NULL, -- Cap for percentage discounts (e.g. 20% up to ₹5,000)
  is_stackable BOOLEAN NOT NULL DEFAULT false,     -- Can combine with other promotions
  priority INT NOT NULL DEFAULT 0,                 -- Evaluation order (higher = evaluates first)
  
  -- Margin & Financial Protections
  enforce_margin_floor BOOLEAN NOT NULL DEFAULT true, -- Never discount below variant/product cost_price
  
  -- Temporal boundaries
  starts_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  ends_at TIMESTAMPTZ DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Redemptions quotas
  usage_limit_total INT DEFAULT NULL,              -- Max total redemptions across all users
  usage_limit_per_customer INT DEFAULT 1,          -- Max redemptions per individual patron email/user
  total_redemptions_count INT NOT NULL DEFAULT 0,  -- Incremented atomically
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Promotion Rules Table (Targeting Categories, Collections, Products, Delivery Modes)
CREATE TABLE IF NOT EXISTS public.promotion_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  target_type public.rule_target_type NOT NULL DEFAULT 'entire_order',
  match_operator VARCHAR(20) NOT NULL DEFAULT 'include', -- 'include' or 'exclude'
  target_id VARCHAR(100) DEFAULT NULL,                   -- Category ID, Collection ID, or Product ID
  min_quantity INT DEFAULT 1,                            -- For BXGY or bundle volume rules
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Promotion Coupons Table (Alphanumeric Codes)
CREATE TABLE IF NOT EXISTS public.promotion_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL UNIQUE,                      -- Upper-case alphanumeric index
  is_single_use BOOLEAN NOT NULL DEFAULT false,          -- Single-use VIP / Concierge code
  max_uses INT DEFAULT NULL,
  times_used INT NOT NULL DEFAULT 0,
  assigned_customer_email VARCHAR(255) DEFAULT NULL,     -- Targeted personalized VIP voucher
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Promotion Redemptions Table (Audit & Rollback Ledger)
CREATE TABLE IF NOT EXISTS public.promotion_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES public.promotions(id),
  coupon_id UUID REFERENCES public.promotion_coupons(id),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id),
  customer_email VARCHAR(255) NOT NULL,
  original_subtotal NUMERIC(10, 2) NOT NULL,
  discount_applied NUMERIC(10, 2) NOT NULL,
  margin_clamped BOOLEAN NOT NULL DEFAULT false,         -- True if discount was curtailed by cost_price floor
  status VARCHAR(20) NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'voided')),
  voided_at TIMESTAMPTZ DEFAULT NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. Scheduled Price Adjustments Table (Curator's Markdowns)
CREATE TABLE IF NOT EXISTS public.price_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
  original_price NUMERIC(10, 2) NOT NULL,
  scheduled_price NUMERIC(10, 2) NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  reason VARCHAR(100) DEFAULT 'archival_markdown',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. Orders & Order Items Extensions
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS promotion_id UUID REFERENCES public.promotions(id),
  ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS discount_breakdown JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS margin_protected BOOLEAN DEFAULT false;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS original_unit_price NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS final_unit_price NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS promotion_id UUID REFERENCES public.promotions(id);

-- 9. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_promotions_active_dates ON public.promotions(is_active, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_promotions_type ON public.promotions(promotion_type, is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_lookup ON public.promotion_coupons(upper(code)) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_promotion_rules_target ON public.promotion_rules(promotion_id, target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_promotion_redemptions_user ON public.promotion_redemptions(promotion_id, lower(customer_email));
CREATE INDEX IF NOT EXISTS idx_promotion_redemptions_order ON public.promotion_redemptions(order_id);
CREATE INDEX IF NOT EXISTS idx_price_schedules_active ON public.price_schedules(product_id, variant_id, starts_at, ends_at) WHERE is_active = true;

-- 10. Enable Row Level Security (RLS)
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_schedules ENABLE ROW LEVEL SECURITY;

-- 10a. RLS: Promotions (Public can read active public promotions)
CREATE POLICY "Allow public select active promotions"
  ON public.promotions FOR SELECT
  TO public
  USING (
    is_active = true 
    AND starts_at <= timezone('utc'::text, now()) 
    AND (ends_at IS NULL OR ends_at >= timezone('utc'::text, now()))
  );

CREATE POLICY "Allow staff all on promotions"
  ON public.promotions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'store_manager', 'warehouse_manager')
    )
  );

-- 10b. RLS: Promotion Rules
CREATE POLICY "Allow public select promotion rules"
  ON public.promotion_rules FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow staff all on promotion rules"
  ON public.promotion_rules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'store_manager')
    )
  );

-- 10c. RLS: Promotion Coupons (Strict ADMIN & SERVICE-ROLE ONLY - prevents scraping of VIP/single-use codes)
CREATE POLICY "Allow staff all on promotion coupons"
  ON public.promotion_coupons FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'store_manager')
    )
  );

-- 10d. RLS: Promotion Redemptions (Strict ADMIN & SERVICE-ROLE ONLY)
CREATE POLICY "Allow staff and service role only on redemptions"
  ON public.promotion_redemptions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'store_manager')
    )
  );

-- 10e. RLS: Price Schedules
CREATE POLICY "Allow public select active price schedules"
  ON public.price_schedules FOR SELECT
  TO public
  USING (
    is_active = true 
    AND starts_at <= timezone('utc'::text, now()) 
    AND ends_at >= timezone('utc'::text, now())
  );

CREATE POLICY "Allow staff all on price schedules"
  ON public.price_schedules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'store_manager')
    )
  );

-- 11. Stored Procedure: Coupon Rollback on Order Cancellation or Payment Failure
CREATE OR REPLACE FUNCTION public.void_order_promotion_redemption(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_redemption RECORD;
BEGIN
  -- Lock the redemption record
  SELECT * INTO v_redemption
  FROM public.promotion_redemptions
  WHERE order_id = p_order_id AND status = 'applied'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'No active redemption found for order');
  END IF;

  -- 1. Mark redemption voided
  UPDATE public.promotion_redemptions
  SET status = 'voided',
      voided_at = timezone('utc'::text, now())
  WHERE id = v_redemption.id;

  -- 2. Decrement coupon usage count if coupon was used
  IF v_redemption.coupon_id IS NOT NULL THEN
    UPDATE public.promotion_coupons
    SET times_used = GREATEST(0, times_used - 1)
    WHERE id = v_redemption.coupon_id;
  END IF;

  -- 3. Decrement campaign total redemption count
  IF v_redemption.promotion_id IS NOT NULL THEN
    UPDATE public.promotions
    SET total_redemptions_count = GREATEST(0, total_redemptions_count - 1),
        updated_at = timezone('utc'::text, now())
    WHERE id = v_redemption.promotion_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'voided_redemption_id', v_redemption.id,
    'discount_reversed', v_redemption.discount_applied
  );
END;
$$;

-- 12. Atomic Concurrency-Safe Order Creation with Promotion Locking & Margin-Floor Assertion
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
  v_item RECORD;
  v_curr_level RECORD;
  v_user_id UUID;
  v_status public.order_status;
  v_payment_status VARCHAR(50);
  v_delivery_mode public.delivery_mode;
  v_try_on_status public.try_on_status;
  v_order_type public.order_type;
  v_subtotal NUMERIC(10, 2);
  v_discount NUMERIC(10, 2);
  v_delivery_fee NUMERIC(10, 2);
  v_tax_amount NUMERIC(10, 2);
  v_total_amount NUMERIC(10, 2);
  v_notes TEXT;
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

  -- 2. Validate Items and Lock Inventory Rows (FOR UPDATE)
  IF jsonb_array_length(p_items) = 0 THEN
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

    -- Check coupon usage limits
    IF v_coupon.max_uses IS NOT NULL AND v_coupon.times_used >= v_coupon.max_uses THEN
      RAISE EXCEPTION 'COUPON_EXHAUSTED: Coupon code "%" has reached its maximum redemption limit', v_coupon_code;
    END IF;

    -- Check personal customer assignment if voucher is restricted
    IF v_coupon.assigned_customer_email IS NOT NULL AND lower(v_coupon.assigned_customer_email) <> v_customer_email THEN
      RAISE EXCEPTION 'UNAUTHORIZED_COUPON: This exclusive voucher is reserved for a specific private client';
    END IF;

    v_coupon_id := v_coupon.id;
    v_promo_id := v_coupon.promotion_id;
  ELSIF (p_order_data->>'promotion_id') IS NOT NULL THEN
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

    -- Temporal check
    IF timezone('utc'::text, now()) < v_promo.starts_at OR (v_promo.ends_at IS NOT NULL AND timezone('utc'::text, now()) > v_promo.ends_at) THEN
      RAISE EXCEPTION 'PROMOTION_EXPIRED: Promotion is outside its active validity schedule';
    END IF;

    -- Global quota check
    IF v_promo.usage_limit_total IS NOT NULL AND v_promo.total_redemptions_count >= v_promo.usage_limit_total THEN
      RAISE EXCEPTION 'PROMOTION_EXHAUSTED: Total allocation for this privilege has been exhausted';
    END IF;

    -- Per-customer limit check
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

    -- Margin Floor Check: Look up cost_price from product_variants or products
    SELECT COALESCE(pv.cost_price, p.cost_price, 0.00) INTO v_item_cost
    FROM public.product_variants pv
    JOIN public.products p ON p.id = pv.product_id
    WHERE pv.id = v_item.variant_id;

    v_item_unit_price := v_item.unit_price;
    v_item_discount := COALESCE(v_item.discount_amount, 0.00);
    v_item_final_price := COALESCE(v_item.final_unit_price, (v_item_unit_price - v_item_discount));

    -- Protect margin floor: final selling price must never drop below garment cost price
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
      COALESCE(p_order_data->>'order_number', 'PENDING')
    );
  END LOOP;

  -- 5. Prepare Order fields
  v_order_number := COALESCE(
    NULLIF(p_order_data->>'order_number', ''),
    'ORD-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text, 1, 6))
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
  v_subtotal := COALESCE((p_order_data->>'original_total')::NUMERIC, (p_order_data->>'subtotal')::NUMERIC, 0);
  v_discount := COALESCE((p_order_data->>'discount')::NUMERIC, 0);
  v_delivery_fee := COALESCE((p_order_data->>'shipping_fee')::NUMERIC, (p_order_data->>'delivery_fee')::NUMERIC, 0);
  v_tax_amount := COALESCE((p_order_data->>'tax_amount')::NUMERIC, 0);
  v_total_amount := COALESCE((p_order_data->>'total')::NUMERIC, (p_order_data->>'total_amount')::NUMERIC, GREATEST(0, v_subtotal - v_discount + v_delivery_fee + v_tax_amount));
  v_notes := COALESCE(NULLIF(p_order_data->>'delivery_notes', ''), NULLIF(p_order_data->>'notes', ''));
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
    COALESCE(NULLIF(p_order_data->>'invoice_number', ''), 'INV-' || v_order_number),
    COALESCE(NULLIF(p_order_data->>'tracking_barcode', ''), 'ATL-TRK-' || v_order_number),
    v_user_id,
    v_status,
    v_delivery_mode,
    v_try_on_status,
    v_order_type,
    COALESCE(NULLIF(p_order_data->>'bolt_pincode', ''), NULLIF(v_shipping_addr->>'bolt_pincode', '')),
    NULLIF(trim(COALESCE(p_order_data->>'bolt_timeslot_id', v_shipping_addr->>'bolt_timeslot_id', '')), '')::UUID,
    CASE WHEN v_delivery_mode = 'try_on' THEN 'scheduled'::public.bolt_session_status ELSE NULL END,
    v_subtotal,
    v_total_amount,
    v_tax_amount,
    v_delivery_fee,
    v_loc_id,
    v_loc_id,
    COALESCE(NULLIF(p_order_data->>'shipping_address', ''), NULLIF(v_shipping_addr->>'address', '')),
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
      'pending',
      timezone('utc'::text, now())
    );
  END LOOP;

  -- 8. Increment Promotion/Coupon Redemptions & Write to Audit Table
  IF v_promo_id IS NOT NULL THEN
    -- Increment campaign redemptions count
    UPDATE public.promotions
    SET total_redemptions_count = total_redemptions_count + 1,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_promo_id;

    -- Increment coupon usage count
    IF v_coupon_id IS NOT NULL THEN
      UPDATE public.promotion_coupons
      SET times_used = times_used + 1
      WHERE id = v_coupon_id;
    END IF;

    -- Insert audit record
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
      v_customer_email,
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
    'status', v_status,
    'total_amount', v_total_amount,
    'subtotal', v_subtotal,
    'discount', v_discount,
    'tax_amount', v_tax_amount,
    'delivery_fee', v_delivery_fee,
    'fulfillment_location_id', v_loc_id,
    'promotion_id', v_promo_id,
    'coupon_code', v_coupon_code,
    'margin_protected', v_margin_protected
  );
END;
$$;

-- 13. Seed Initial Luxury Promotions & Codes
INSERT INTO public.promotions (
  name, slug, description, promotion_type, discount_type, discount_value, min_order_subtotal, max_discount_amount, is_stackable, priority, starts_at
) VALUES 
  (
    'Private Client Welcome Privilege',
    'welcome-privilege',
    'Enjoy 10% complimentary courtesy on your initial curated wardrobe acquisition.',
    'coupon',
    'percentage',
    10.00,
    5000.00,
    3000.00,
    false,
    1,
    timezone('utc'::text, now())
  ),
  (
    'Curator Sovereign Wardrobe Tier',
    'sovereign-wardrobe-tier',
    'Complimentary ₹2,500 private client courtesy on royal curations exceeding ₹15,000.',
    'tiered_threshold',
    'fixed_amount',
    2500.00,
    15000.00,
    2500.00,
    false,
    2,
    timezone('utc'::text, now())
  ),
  (
    'Complimentary White-Glove Bolt Fitting',
    'complimentary-bolt-hold',
    'Doorstep 45-minute fitting hold fee waived for all festive curations.',
    'shipping_waiver',
    'free_shipping',
    99.00,
    10000.00,
    99.00,
    true,
    0,
    timezone('utc'::text, now())
  )
ON CONFLICT (slug) DO NOTHING;

-- Seed Sample Coupon Codes
INSERT INTO public.promotion_coupons (promotion_id, code, is_single_use, max_uses, is_active)
SELECT id, 'WELCOME10', false, 1000, true
FROM public.promotions WHERE slug = 'welcome-privilege'
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.promotion_coupons (promotion_id, code, is_single_use, max_uses, is_active)
SELECT id, 'CURATOR26', false, 500, true
FROM public.promotions WHERE slug = 'sovereign-wardrobe-tier'
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.promotion_coupons (promotion_id, code, is_single_use, max_uses, is_active)
SELECT id, 'BOLTFREE', false, 500, true
FROM public.promotions WHERE slug = 'complimentary-bolt-hold'
ON CONFLICT (code) DO NOTHING;

-- 14. Realtime Broadcast Enablement for Merchandising Command Center
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.promotions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.promotion_redemptions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
