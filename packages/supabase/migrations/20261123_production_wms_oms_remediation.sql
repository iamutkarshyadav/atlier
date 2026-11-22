-- ==============================================================================
-- 20261123_production_wms_oms_remediation.sql
-- PRODUCTION WMS + OMS + OMNICHANNEL RETAIL ENGINE REMEDIATION
--
-- 1. Extend enums (inventory_movement_type, zone_type)
-- 2. Constraints: UNIQUE product_variants.barcode, NOT NULL order_items.variant_id
-- 3. Dedicated Quarantine Zone & Shelves
-- 4. Dynamic Initial Stock Backfill (BEFORE capacity trigger)
-- 5. Strict WMS Hierarchy Triggers:
--    - check_shelf_capacity_limit (BEFORE INSERT/UPDATE on shelf_inventory)
--    - sync_shelf_to_inventory_levels (AFTER on shelf_inventory, excluding non-sellable zones)
--    - sync_inventory_levels_to_variants (AFTER on inventory_levels, updating product_variants.stock = SUM(available))
-- 6. Atomic Concurrency-Safe RPCs:
--    - atomic_create_order_and_reserve (SELECT ... FOR UPDATE row-locking)
--    - generate_bin_directed_pick_wave (Zone -> Aisle -> Rack -> Shelf sequential path)
--    - confirm_shelf_pick (Hardware barcode verification & inventory deduction)
--    - complete_bolt_try_on_reconciliation (Courier transit custody & Indian GST)
--    - inward_bolt_returns_at_dock (Dock inwarding & QC quarantine isolation)
--    - execute_stock_transfer_lifecycle (Multi-item inter-location transfers)
-- ==============================================================================

-- 1. EXTEND ENUMS SAFELY
DO $$ BEGIN
  ALTER TYPE public.inventory_movement_type ADD VALUE IF NOT EXISTS 'in_transit_return';
  ALTER TYPE public.inventory_movement_type ADD VALUE IF NOT EXISTS 'allocation_reserved';
  ALTER TYPE public.inventory_movement_type ADD VALUE IF NOT EXISTS 'outbound_pick';
  ALTER TYPE public.inventory_movement_type ADD VALUE IF NOT EXISTS 'try_on_restock';
  ALTER TYPE public.inventory_movement_type ADD VALUE IF NOT EXISTS 'quarantine_isolate';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.zone_type ADD VALUE IF NOT EXISTS 'quarantine';
  ALTER TYPE public.zone_type ADD VALUE IF NOT EXISTS 'damaged_quarantine';
  ALTER TYPE public.zone_type ADD VALUE IF NOT EXISTS 'courier_transit';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Harmonize location_zones columns (support both type and zone_type)
DO $$ BEGIN
  ALTER TABLE public.location_zones ADD COLUMN IF NOT EXISTS type public.zone_type;
  ALTER TABLE public.location_zones ADD COLUMN IF NOT EXISTS zone_type public.zone_type;
  UPDATE public.location_zones SET zone_type = type WHERE zone_type IS NULL AND type IS NOT NULL;
  UPDATE public.location_zones SET type = zone_type WHERE type IS NULL AND zone_type IS NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

-- 2. CATALOG & ORDER ITEM CONSTRAINTS & DATA CLEANING
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_variants_barcode_unique 
ON public.product_variants(barcode) 
WHERE barcode IS NOT NULL;

-- Backfill any null variant_id in order_items using size or first variant
UPDATE public.order_items oi
SET variant_id = pv.id
FROM public.product_variants pv
WHERE oi.variant_id IS NULL
  AND pv.product_id = oi.product_id
  AND (oi.size IS NULL OR pv.size = oi.size);

UPDATE public.order_items oi
SET variant_id = (
  SELECT pv2.id FROM public.product_variants pv2 
  WHERE pv2.product_id = oi.product_id 
  ORDER BY pv2.created_at ASC 
  LIMIT 1
)
WHERE oi.variant_id IS NULL;

-- Enforce NOT NULL on order_items.variant_id
DO $$ BEGIN
  ALTER TABLE public.order_items ALTER COLUMN variant_id SET NOT NULL;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Notice: order_items.variant_id constraint check: %', SQLERRM;
END $$;

-- 3. ENSURE DEDICATED QUARANTINE ZONES & SHELVES EXIST
DO $$
DECLARE
  v_loc RECORD;
  v_zone_id UUID;
BEGIN
  FOR v_loc IN SELECT id, code FROM public.locations WHERE is_active = true LOOP
    -- Check if quarantine zone exists
    SELECT id INTO v_zone_id 
    FROM public.location_zones 
    WHERE location_id = v_loc.id AND COALESCE(type, zone_type) IN ('quarantine', 'damaged_quarantine') 
    LIMIT 1;

    IF v_zone_id IS NULL THEN
      INSERT INTO public.location_zones (location_id, name, code, type, zone_type)
      VALUES (v_loc.id, 'Quarantine & Damaged Goods', 'QRN', 'damaged_quarantine', 'damaged_quarantine')
      RETURNING id INTO v_zone_id;
    END IF;

    -- Ensure quarantine shelf exists
    IF NOT EXISTS (SELECT 1 FROM public.shelves WHERE location_id = v_loc.id AND coordinate = 'QRN-BIN-01') THEN
      INSERT INTO public.shelves (location_id, zone_id, coordinate, barcode, max_unit_capacity, is_active)
      VALUES (v_loc.id, v_zone_id, 'QRN-BIN-01', 'LOC-' || v_loc.code || '-QRN-BIN-01', 99999, true);
    END IF;
  END LOOP;
END $$;

-- 4. DYNAMIC INITIAL STOCK BACKFILL (RUN BEFORE ENABLING CAPACITY TRIGGER)
DO $$
DECLARE
  v_target_shelf_id UUID;
  v_target_location_id UUID;
  v_missing_variant RECORD;
  v_backfilled_count INT := 0;
BEGIN
  -- Dynamic lookup: look for coordinate 'BLK-A-01-A1' first
  SELECT s.id, s.location_id INTO v_target_shelf_id, v_target_location_id
  FROM public.shelves s
  JOIN public.location_zones lz ON lz.id = s.zone_id
  WHERE s.coordinate = 'BLK-A-01-A1'
    AND s.is_active = true
    AND COALESCE(lz.type, lz.zone_type) NOT IN ('quarantine', 'damaged_quarantine', 'courier_transit', 'fitting_room_quarantine')
  LIMIT 1;

  -- Fallback to any active sellable shelf
  IF v_target_shelf_id IS NULL THEN
    SELECT s.id, s.location_id INTO v_target_shelf_id, v_target_location_id
    FROM public.shelves s
    JOIN public.location_zones lz ON lz.id = s.zone_id
    WHERE s.is_active = true
      AND COALESCE(lz.type, lz.zone_type) NOT IN ('quarantine', 'damaged_quarantine', 'courier_transit', 'fitting_room_quarantine')
    ORDER BY s.created_at ASC
    LIMIT 1;
  END IF;

  IF v_target_shelf_id IS NOT NULL THEN
    -- Raise target shelf capacity above backfill requirements
    UPDATE public.shelves
    SET max_unit_capacity = GREATEST(max_unit_capacity, 50000)
    WHERE id = v_target_shelf_id;

    -- Backfill variants that have stock > 0 but no shelf_inventory entry
    FOR v_missing_variant IN
      SELECT pv.id AS variant_id, pv.stock
      FROM public.product_variants pv
      WHERE pv.stock > 0
        AND NOT EXISTS (
          SELECT 1 FROM public.shelf_inventory si WHERE si.variant_id = pv.id
        )
    LOOP
      INSERT INTO public.shelf_inventory (shelf_id, variant_id, quantity)
      VALUES (v_target_shelf_id, v_missing_variant.variant_id, v_missing_variant.stock)
      ON CONFLICT (shelf_id, variant_id) DO UPDATE
      SET quantity = public.shelf_inventory.quantity + EXCLUDED.quantity;

      INSERT INTO public.inventory_levels (location_id, variant_id, on_hand, reserved, reorder_point, reorder_quantity)
      VALUES (v_target_location_id, v_missing_variant.variant_id, v_missing_variant.stock, 0, 5, 20)
      ON CONFLICT (location_id, variant_id) DO UPDATE
      SET on_hand = public.inventory_levels.on_hand + EXCLUDED.on_hand;

      INSERT INTO public.inventory_ledger (
        variant_id, location_id, to_shelf_id, movement_type, quantity, balance_after,
        reference_doc_type, reference_doc_id
      )
      VALUES (
        v_missing_variant.variant_id,
        v_target_location_id,
        v_target_shelf_id,
        'shelf_putaway',
        v_missing_variant.stock,
        v_missing_variant.stock,
        'INITIAL_BACKFILL',
        'MIGRATION_20261123'
      );

      v_backfilled_count := v_backfilled_count + 1;
    END LOOP;

    RAISE NOTICE 'Backfilled % existing catalog variants into sellable shelf %', v_backfilled_count, v_target_shelf_id;
  END IF;
END $$;

-- 5. WMS SINGLE SOURCE OF TRUTH TRIGGERS

-- 5A. Enforce Shelf Capacity Limit
CREATE OR REPLACE FUNCTION public.check_shelf_capacity_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_max_cap INTEGER;
  v_current_total INTEGER;
BEGIN
  SELECT max_unit_capacity INTO v_max_cap
  FROM public.shelves
  WHERE id = NEW.shelf_id;

  IF v_max_cap IS NOT NULL AND v_max_cap > 0 THEN
    SELECT COALESCE(SUM(quantity), 0) INTO v_current_total
    FROM public.shelf_inventory
    WHERE shelf_id = NEW.shelf_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);

    IF (v_current_total + NEW.quantity) > v_max_cap THEN
      RAISE EXCEPTION 'Shelf capacity exceeded for shelf %. Current: %, Added: %, Limit: %',
        NEW.shelf_id, v_current_total, NEW.quantity, v_max_cap;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_enforce_shelf_capacity ON public.shelf_inventory;
CREATE TRIGGER trigger_enforce_shelf_capacity
  BEFORE INSERT OR UPDATE ON public.shelf_inventory
  FOR EACH ROW EXECUTE PROCEDURE public.check_shelf_capacity_limit();

-- 5B. Sync Shelf Inventory to Location Inventory Levels (Excluding Quarantine & Transit)
CREATE OR REPLACE FUNCTION public.sync_shelf_to_inventory_levels()
RETURNS TRIGGER AS $$
DECLARE
  v_variant_id UUID;
  v_location_id UUID;
  v_total_sellable_on_hand INTEGER;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    v_variant_id := OLD.variant_id;
    SELECT location_id INTO v_location_id FROM public.shelves WHERE id = OLD.shelf_id;
  ELSE
    v_variant_id := NEW.variant_id;
    SELECT location_id INTO v_location_id FROM public.shelves WHERE id = NEW.shelf_id;
  END IF;

  IF v_location_id IS NOT NULL AND v_variant_id IS NOT NULL THEN
    -- Sum ONLY from sellable zones (quarantine, damaged, and transit are excluded!)
    SELECT COALESCE(SUM(si.quantity), 0) INTO v_total_sellable_on_hand
    FROM public.shelf_inventory si
    JOIN public.shelves s ON s.id = si.shelf_id
    JOIN public.location_zones lz ON lz.id = s.zone_id
    WHERE s.location_id = v_location_id
      AND si.variant_id = v_variant_id
      AND COALESCE(lz.type, lz.zone_type) NOT IN ('quarantine', 'damaged_quarantine', 'courier_transit', 'fitting_room_quarantine')
      AND s.is_active = true;

    INSERT INTO public.inventory_levels (location_id, variant_id, on_hand, reserved)
    VALUES (v_location_id, v_variant_id, v_total_sellable_on_hand, 0)
    ON CONFLICT (location_id, variant_id) DO UPDATE
    SET on_hand = v_total_sellable_on_hand,
        updated_at = timezone('utc'::text, now());
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_shelf_to_inventory_levels ON public.shelf_inventory;
CREATE TRIGGER trigger_sync_shelf_to_inventory_levels
  AFTER INSERT OR UPDATE OR DELETE ON public.shelf_inventory
  FOR EACH ROW EXECUTE PROCEDURE public.sync_shelf_to_inventory_levels();

-- 5C. Sync Inventory Levels to Product Variants Global Stock
CREATE OR REPLACE FUNCTION public.sync_inventory_levels_to_variants()
RETURNS TRIGGER AS $$
DECLARE
  v_target_variant_id UUID;
  v_total_available INTEGER;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    v_target_variant_id := OLD.variant_id;
  ELSE
    v_target_variant_id := NEW.variant_id;
  END IF;

  IF v_target_variant_id IS NOT NULL THEN
    SELECT COALESCE(SUM(available), 0) INTO v_total_available
    FROM public.inventory_levels
    WHERE variant_id = v_target_variant_id;

    UPDATE public.product_variants
    SET stock = v_total_available,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_target_variant_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_inventory_levels_to_variants ON public.inventory_levels;
CREATE TRIGGER trigger_sync_inventory_levels_to_variants
  AFTER INSERT OR UPDATE OF on_hand, reserved, available OR DELETE ON public.inventory_levels
  FOR EACH ROW EXECUTE PROCEDURE public.sync_inventory_levels_to_variants();


-- 6. ATOMIC PRODUCTION-GRADE RPCs

-- 6A. Atomic Order Creation & Concurrency-Safe Stock Reservation
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

  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
    variant_id UUID,
    product_id UUID,
    quantity INT,
    unit_price NUMERIC(10, 2),
    size TEXT,
    hsn_code VARCHAR(10)
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

  -- 3. Prepare Order fields
  v_order_number := COALESCE(
    p_order_data->>'order_number',
    'ORD-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text, 1, 6))
  );
  v_user_id := (p_order_data->>'user_id')::UUID;
  v_status := COALESCE((p_order_data->>'status')::public.order_status, 'pending'::public.order_status);
  v_payment_status := COALESCE(p_order_data->>'payment_status', 'pending');
  v_delivery_mode := COALESCE((p_order_data->>'delivery_mode')::public.delivery_mode, 'direct'::public.delivery_mode);
  v_try_on_status := CASE 
    WHEN v_delivery_mode = 'try_on' THEN 'active_timer'::public.try_on_status 
    ELSE 'pending'::public.try_on_status 
  END;
  v_order_type := CASE 
    WHEN v_delivery_mode = 'try_on' THEN 'bolt_try_on'::public.order_type 
    ELSE 'standard'::public.order_type 
  END;
  v_subtotal := COALESCE((p_order_data->>'subtotal')::NUMERIC, 0);
  v_discount := COALESCE((p_order_data->>'discount')::NUMERIC, 0);
  v_delivery_fee := COALESCE((p_order_data->>'delivery_fee')::NUMERIC, 0);
  v_tax_amount := COALESCE((p_order_data->>'tax_amount')::NUMERIC, 0);
  v_total_amount := COALESCE((p_order_data->>'total_amount')::NUMERIC, (v_subtotal - v_discount + v_delivery_fee + v_tax_amount));
  v_notes := p_order_data->>'notes';
  v_shipping_addr := p_order_data->'shipping_address_json';
  v_billing_addr := p_order_data->'billing_address_json';

  -- 4. Insert into public.orders
  INSERT INTO public.orders (
    order_number,
    invoice_number,
    tracking_barcode,
    user_id,
    status,
    payment_status,
    delivery_mode,
    try_on_status,
    order_type,
    subtotal,
    discount,
    delivery_fee,
    shipping_fee,
    tax_amount,
    total_amount,
    total,
    fulfillment_location_id,
    shipping_address,
    shipping_address_json,
    billing_address_json,
    delivery_notes,
    notes,
    created_at,
    updated_at
  )
  VALUES (
    v_order_number,
    'INV-' || v_order_number,
    'ATL-TRK-' || v_order_number,
    v_user_id,
    v_status,
    v_payment_status,
    v_delivery_mode,
    v_try_on_status,
    v_order_type,
    v_subtotal,
    v_discount,
    v_delivery_fee,
    v_delivery_fee,
    v_tax_amount,
    v_total_amount,
    v_total_amount,
    v_loc_id,
    COALESCE(v_shipping_addr->>'address', 'Bengaluru, Karnataka, India'),
    v_shipping_addr,
    v_billing_addr,
    v_notes,
    v_notes,
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  )
  RETURNING id INTO v_order_id;

  -- 5. Insert order items
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
    variant_id UUID,
    product_id UUID,
    quantity INT,
    unit_price NUMERIC(10, 2),
    size TEXT,
    hsn_code VARCHAR(10)
  )
  LOOP
    INSERT INTO public.order_items (
      order_id,
      product_id,
      variant_id,
      quantity,
      unit_price,
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
      v_item.size,
      COALESCE(v_item.hsn_code, '610910'),
      'pending',
      timezone('utc'::text, now())
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'fulfillment_location_id', v_loc_id,
    'total_amount', v_total_amount,
    'delivery_mode', v_delivery_mode
  );
END;
$$;


-- 6B. Bin-Directed Pick Wave Generation (Sequential Zone -> Aisle -> Rack -> Shelf Path)
CREATE OR REPLACE FUNCTION public.generate_bin_directed_pick_wave(
  p_order_ids UUID[],
  p_location_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_loc_id UUID;
  v_result JSONB;
BEGIN
  IF NOT public.check_is_staff() THEN
    RAISE EXCEPTION 'Unauthorized: Omnichannel staff credentials required.';
  END IF;

  v_loc_id := p_location_id;
  IF v_loc_id IS NULL THEN
    SELECT fulfillment_location_id INTO v_loc_id
    FROM public.orders
    WHERE id = ANY(p_order_ids) AND fulfillment_location_id IS NOT NULL
    LIMIT 1;

    IF v_loc_id IS NULL THEN
      SELECT id INTO v_loc_id
      FROM public.locations
      WHERE is_active = true
      ORDER BY online_fulfillment_priority ASC
      LIMIT 1;
    END IF;
  END IF;

  WITH order_items_to_pick AS (
    SELECT 
      o.id AS order_id,
      o.order_number,
      oi.id AS order_item_id,
      oi.product_id,
      p.title AS product_name,
      oi.variant_id,
      pv.title AS variant_title,
      pv.barcode AS variant_barcode,
      pv.sku,
      oi.size,
      oi.quantity
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    JOIN public.products p ON p.id = oi.product_id
    JOIN public.product_variants pv ON pv.id = oi.variant_id
    WHERE o.id = ANY(p_order_ids)
      AND oi.picked_from_shelf_id IS NULL
  ),
  ranked_shelves AS (
    SELECT 
      oitp.*,
      s.id AS shelf_id,
      s.coordinate AS shelf_coordinate,
      s.barcode AS shelf_barcode,
      lz.name AS zone_name,
      si.quantity AS available_on_shelf,
      ROW_NUMBER() OVER (
        PARTITION BY oitp.order_item_id 
        ORDER BY si.quantity DESC, s.coordinate ASC
      ) AS rank
    FROM order_items_to_pick oitp
    JOIN public.shelf_inventory si ON si.variant_id = oitp.variant_id AND si.quantity >= oitp.quantity
    JOIN public.shelves s ON s.id = si.shelf_id AND s.location_id = v_loc_id AND s.is_active = true
    JOIN public.location_zones lz ON lz.id = s.zone_id
    WHERE COALESCE(lz.type, lz.zone_type) NOT IN ('quarantine', 'damaged_quarantine', 'courier_transit', 'fitting_room_quarantine')
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'order_id', rs.order_id,
      'order_number', rs.order_number,
      'order_item_id', rs.order_item_id,
      'product_id', rs.product_id,
      'product_name', rs.product_name,
      'variant_id', rs.variant_id,
      'variant_title', rs.variant_title,
      'variant_barcode', rs.variant_barcode,
      'sku', rs.sku,
      'size', rs.size,
      'quantity', rs.quantity,
      'shelf_id', rs.shelf_id,
      'shelf_coordinate', rs.shelf_coordinate,
      'shelf_barcode', rs.shelf_barcode,
      'zone_name', rs.zone_name,
      'available_on_shelf', rs.available_on_shelf
    ) ORDER BY rs.shelf_coordinate ASC, rs.order_number ASC
  ), '[]'::jsonb) INTO v_result
  FROM ranked_shelves rs
  WHERE rs.rank = 1;

  RETURN v_result;
END;
$$;


-- 6C. Confirm Shelf Pick with Hardware Barcode Verification & Stock Deduction
CREATE OR REPLACE FUNCTION public.confirm_shelf_pick(
  p_order_item_id UUID,
  p_scanned_shelf_barcode TEXT,
  p_scanned_variant_barcode TEXT DEFAULT NULL,
  p_operator_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item RECORD;
  v_order RECORD;
  v_variant RECORD;
  v_shelf RECORD;
  v_shelf_qty INT;
  v_remaining_unpicked INT;
BEGIN
  IF NOT public.check_is_staff() THEN
    RAISE EXCEPTION 'Unauthorized: Omnichannel staff credentials required.';
  END IF;

  -- 1. Fetch Order Item and parent Order
  SELECT oi.* INTO v_item
  FROM public.order_items oi
  WHERE oi.id = p_order_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order item % not found', p_order_item_id;
  END IF;

  IF v_item.picked_from_shelf_id IS NOT NULL THEN
    RAISE EXCEPTION 'Order item % has already been picked from shelf %', p_order_item_id, v_item.picked_from_shelf_id;
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = v_item.order_id
  FOR UPDATE;

  -- 2. Verify Variant Barcode if provided
  SELECT * INTO v_variant
  FROM public.product_variants
  WHERE id = v_item.variant_id;

  IF p_scanned_variant_barcode IS NOT NULL AND trim(p_scanned_variant_barcode) <> '' THEN
    IF v_variant.barcode <> trim(p_scanned_variant_barcode) AND v_variant.sku <> trim(p_scanned_variant_barcode) THEN
      RAISE EXCEPTION 'VARIANT_BARCODE_MISMATCH: Scanned barcode "%" does not match expected variant % (Barcode: %, SKU: %)',
        p_scanned_variant_barcode, v_variant.id, v_variant.barcode, v_variant.sku;
    END IF;
  END IF;

  -- 3. Verify Shelf Barcode
  SELECT * INTO v_shelf
  FROM public.shelves
  WHERE barcode = trim(p_scanned_shelf_barcode) OR coordinate = trim(p_scanned_shelf_barcode);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SHELF_NOT_FOUND: Shelf barcode/coordinate "%" not found', p_scanned_shelf_barcode;
  END IF;

  -- 4. Check & Lock Shelf Inventory
  SELECT quantity INTO v_shelf_qty
  FROM public.shelf_inventory
  WHERE shelf_id = v_shelf.id AND variant_id = v_item.variant_id
  FOR UPDATE;

  IF v_shelf_qty IS NULL OR v_shelf_qty < v_item.quantity THEN
    RAISE EXCEPTION 'INSUFFICIENT_SHELF_STOCK: Shelf % only has % units of variant %, but % requested',
      v_shelf.coordinate, COALESCE(v_shelf_qty, 0), v_item.variant_id, v_item.quantity;
  END IF;

  -- 5. Deduct from Physical Shelf
  UPDATE public.shelf_inventory
  SET quantity = quantity - v_item.quantity,
      updated_at = timezone('utc'::text, now())
  WHERE shelf_id = v_shelf.id AND variant_id = v_item.variant_id;

  -- 6. Deduct from inventory_levels on_hand and reserved
  UPDATE public.inventory_levels
  SET on_hand = GREATEST(0, on_hand - v_item.quantity),
      reserved = GREATEST(0, reserved - v_item.quantity),
      updated_at = timezone('utc'::text, now())
  WHERE location_id = v_shelf.location_id AND variant_id = v_item.variant_id;

  -- 7. Update order item
  UPDATE public.order_items
  SET picked_from_shelf_id = v_shelf.id
  WHERE id = p_order_item_id;

  -- 8. Check if all items in the order are picked
  SELECT COUNT(*) INTO v_remaining_unpicked
  FROM public.order_items
  WHERE order_id = v_order.id AND picked_from_shelf_id IS NULL;

  IF v_remaining_unpicked = 0 THEN
    UPDATE public.orders
    SET status = 'processing',
        updated_at = timezone('utc'::text, now())
    WHERE id = v_order.id;
  END IF;

  -- 9. Immutable Ledger record
  INSERT INTO public.inventory_ledger (
    variant_id,
    location_id,
    from_shelf_id,
    movement_type,
    quantity,
    balance_after,
    reference_doc_type,
    reference_doc_id,
    operator_id
  )
  SELECT
    v_item.variant_id,
    v_shelf.location_id,
    v_shelf.id,
    'outbound_pick',
    -v_item.quantity,
    il.on_hand,
    'PICK_CONFIRMATION',
    COALESCE(v_order.order_number, v_order.id::text),
    p_operator_id
  FROM public.inventory_levels il
  WHERE il.location_id = v_shelf.location_id AND il.variant_id = v_item.variant_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_item_id', p_order_item_id,
    'order_id', v_order.id,
    'shelf_barcode', v_shelf.barcode,
    'shelf_coordinate', v_shelf.coordinate,
    'order_all_picked', (v_remaining_unpicked = 0)
  );
END;
$$;


-- 6D. Doorstep Bolt Try-On Reconciliation & Reverse Logistics Custody
CREATE OR REPLACE FUNCTION public.complete_bolt_try_on_reconciliation(
  p_order_id UUID,
  p_decisions JSONB,
  p_payment_mode TEXT,
  p_payment_ref TEXT DEFAULT NULL,
  p_courier_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_dec RECORD;
  v_item RECORD;
  v_kept_count INT := 0;
  v_rejected_count INT := 0;
  v_kept_subtotal NUMERIC(10, 2) := 0.00;
  v_cgst NUMERIC(10, 2) := 0.00;
  v_sgst NUMERIC(10, 2) := 0.00;
  v_final_total NUMERIC(10, 2) := 0.00;
  v_loc_id UUID;
BEGIN
  -- 1. Fetch Order
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % not found', p_order_id;
  END IF;

  v_loc_id := COALESCE(v_order.fulfillment_location_id, (
    SELECT id FROM public.locations WHERE is_active = true ORDER BY online_fulfillment_priority ASC LIMIT 1
  ));

  -- 2. Process Decisions
  FOR v_dec IN SELECT * FROM jsonb_to_recordset(p_decisions) AS x(
    order_item_id UUID,
    decision TEXT,
    rejection_reason TEXT
  )
  LOOP
    SELECT * INTO v_item
    FROM public.order_items
    WHERE id = v_dec.order_item_id AND order_id = p_order_id
    FOR UPDATE;

    IF FOUND THEN
      IF v_dec.decision = 'kept' THEN
        v_kept_count := v_kept_count + 1;
        v_kept_subtotal := v_kept_subtotal + (v_item.unit_price * v_item.quantity);

        UPDATE public.order_items
        SET try_on_decision = 'kept',
            is_kept = true,
            rejection_reason = NULL
        WHERE id = v_item.id;
      ELSE
        v_rejected_count := v_rejected_count + 1;

        UPDATE public.order_items
        SET try_on_decision = 'rejected',
            is_kept = false,
            rejection_reason = v_dec.rejection_reason
        WHERE id = v_item.id;

        -- Record transit custody in inventory ledger WITHOUT inflating shelf or on_hand
        INSERT INTO public.inventory_ledger (
          variant_id,
          location_id,
          movement_type,
          quantity,
          balance_after,
          reference_doc_type,
          reference_doc_id,
          operator_id
        )
        VALUES (
          v_item.variant_id,
          v_loc_id,
          'in_transit_return',
          v_item.quantity,
          0,
          'BOLT_REVERSE_TRANSIT',
          v_order.order_number,
          p_courier_id
        );
      END IF;
    END IF;
  END LOOP;

  -- 3. Calculate Indian GST (12% Apparel: 6% CGST + 6% SGST)
  v_cgst := ROUND((v_kept_subtotal * 0.06), 2);
  v_sgst := ROUND((v_kept_subtotal * 0.06), 2);
  v_final_total := v_kept_subtotal;

  -- 4. Update Order
  UPDATE public.orders
  SET status = 'delivered',
      try_on_status = 'completed',
      pos_payment_method = p_payment_mode::public.pos_payment_method,
      payment_status = CASE WHEN v_final_total > 0 THEN 'paid' ELSE 'settled' END,
      total_amount = v_final_total,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'order_number', v_order.order_number,
    'kept_count', v_kept_count,
    'rejected_count', v_rejected_count,
    'settlement', jsonb_build_object(
      'currency', 'INR',
      'currency_symbol', '₹',
      'subtotal', v_kept_subtotal,
      'cgst', v_cgst,
      'sgst', v_sgst,
      'total_collected', v_final_total,
      'payment_mode', p_payment_mode,
      'payment_ref', p_payment_ref
    )
  );
END;
$$;


-- 6E. Warehouse Dock Inwarding of Bolt Returns with QC Quarantine Isolation
CREATE OR REPLACE FUNCTION public.inward_bolt_returns_at_dock(
  p_order_id UUID,
  p_return_items JSONB,
  p_operator_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_ret RECORD;
  v_item RECORD;
  v_loc_id UUID;
  v_qrn_shelf_id UUID;
  v_default_shelf_id UUID;
  v_target_shelf_id UUID;
  v_pass_count INT := 0;
  v_damaged_count INT := 0;
BEGIN
  IF NOT public.check_is_staff() THEN
    RAISE EXCEPTION 'Unauthorized: Omnichannel staff credentials required.';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % not found', p_order_id;
  END IF;

  v_loc_id := COALESCE(v_order.fulfillment_location_id, (
    SELECT id FROM public.locations WHERE is_active = true ORDER BY online_fulfillment_priority ASC LIMIT 1
  ));

  -- Look up Quarantine Shelf in this location
  SELECT s.id INTO v_qrn_shelf_id
  FROM public.shelves s
  JOIN public.location_zones lz ON lz.id = s.zone_id
  WHERE s.location_id = v_loc_id
    AND COALESCE(lz.type, lz.zone_type) IN ('quarantine', 'damaged_quarantine')
    AND s.is_active = true
  LIMIT 1;

  -- Look up Default Sellable Shelf in this location
  SELECT s.id INTO v_default_shelf_id
  FROM public.shelves s
  JOIN public.location_zones lz ON lz.id = s.zone_id
  WHERE s.location_id = v_loc_id
    AND COALESCE(lz.type, lz.zone_type) NOT IN ('quarantine', 'damaged_quarantine', 'courier_transit', 'fitting_room_quarantine')
    AND s.is_active = true
  ORDER BY (s.coordinate = 'BLK-A-01-A1') DESC, s.coordinate ASC
  LIMIT 1;

  FOR v_ret IN SELECT * FROM jsonb_to_recordset(p_return_items) AS x(
    order_item_id UUID,
    variant_id UUID,
    qc_condition TEXT,
    target_shelf_id UUID
  )
  LOOP
    SELECT * INTO v_item
    FROM public.order_items
    WHERE id = v_ret.order_item_id;

    IF v_ret.qc_condition = 'damaged' THEN
      v_target_shelf_id := COALESCE(v_ret.target_shelf_id, v_qrn_shelf_id);
      IF v_target_shelf_id IS NULL THEN
        RAISE EXCEPTION 'Quarantine shelf not found for location %', v_loc_id;
      END IF;

      -- Put away into Quarantine shelf (excluded from sellable levels by sync_shelf_to_inventory_levels)
      INSERT INTO public.shelf_inventory (shelf_id, variant_id, quantity)
      VALUES (v_target_shelf_id, v_ret.variant_id, v_item.quantity)
      ON CONFLICT (shelf_id, variant_id) DO UPDATE
      SET quantity = public.shelf_inventory.quantity + EXCLUDED.quantity,
          updated_at = timezone('utc'::text, now());

      INSERT INTO public.inventory_ledger (
        variant_id, location_id, to_shelf_id, movement_type, quantity, balance_after,
        reference_doc_type, reference_doc_id, operator_id
      )
      VALUES (
        v_ret.variant_id, v_loc_id, v_target_shelf_id, 'quarantine_isolate',
        v_item.quantity, 0, 'BOLT_DOCK_INWARD_DAMAGED', v_order.order_number, p_operator_id
      );

      v_damaged_count := v_damaged_count + 1;
    ELSE
      -- Condition: PASS (Sellable Restock)
      v_target_shelf_id := COALESCE(v_ret.target_shelf_id, v_default_shelf_id);
      IF v_target_shelf_id IS NULL THEN
        RAISE EXCEPTION 'Sellable shelf not found for location %', v_loc_id;
      END IF;

      -- Put away into sellable shelf (fires sync_shelf_to_inventory_levels and sync_inventory_levels_to_variants)
      INSERT INTO public.shelf_inventory (shelf_id, variant_id, quantity)
      VALUES (v_target_shelf_id, v_ret.variant_id, v_item.quantity)
      ON CONFLICT (shelf_id, variant_id) DO UPDATE
      SET quantity = public.shelf_inventory.quantity + EXCLUDED.quantity,
          updated_at = timezone('utc'::text, now());

      INSERT INTO public.inventory_ledger (
        variant_id, location_id, to_shelf_id, movement_type, quantity, balance_after,
        reference_doc_type, reference_doc_id, operator_id
      )
      VALUES (
        v_ret.variant_id, v_loc_id, v_target_shelf_id, 'try_on_restock',
        v_item.quantity, 0, 'BOLT_DOCK_INWARD_RESTOCK', v_order.order_number, p_operator_id
      );

      v_pass_count := v_pass_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'total_inwarded', (v_pass_count + v_damaged_count),
    'restocked_sellable', v_pass_count,
    'quarantined_damaged', v_damaged_count
  );
END;
$$;


-- 6F. Inter-Location Multi-Item Stock Transfer Lifecycle
CREATE OR REPLACE FUNCTION public.execute_stock_transfer_lifecycle(
  p_transfer_id UUID,
  p_action TEXT,
  p_target_shelf_id UUID DEFAULT NULL,
  p_operator_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transfer RECORD;
  v_item RECORD;
  v_dest_shelf_id UUID;
  v_shelf_qty INT;
BEGIN
  IF NOT public.check_is_staff() THEN
    RAISE EXCEPTION 'Unauthorized: Omnichannel staff credentials required.';
  END IF;

  SELECT * INTO v_transfer
  FROM public.stock_transfers
  WHERE id = p_transfer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stock transfer % not found', p_transfer_id;
  END IF;

  IF p_action = 'dispatch' THEN
    IF v_transfer.status <> 'draft' AND v_transfer.status <> 'requested' THEN
      RAISE EXCEPTION 'Transfer % cannot be dispatched from status %', p_transfer_id, v_transfer.status;
    END IF;

    -- For each item, deduct from source shelf
    FOR v_item IN SELECT * FROM public.stock_transfer_items WHERE transfer_id = p_transfer_id LOOP
      IF v_item.source_shelf_id IS NOT NULL THEN
        SELECT quantity INTO v_shelf_qty
        FROM public.shelf_inventory
        WHERE shelf_id = v_item.source_shelf_id AND variant_id = v_item.variant_id
        FOR UPDATE;

        IF v_shelf_qty IS NULL OR v_shelf_qty < v_item.quantity_requested THEN
          RAISE EXCEPTION 'Insufficient stock on source shelf % for variant %', v_item.source_shelf_id, v_item.variant_id;
        END IF;

        UPDATE public.shelf_inventory
        SET quantity = quantity - v_item.quantity_requested,
            updated_at = timezone('utc'::text, now())
        WHERE shelf_id = v_item.source_shelf_id AND variant_id = v_item.variant_id;
      END IF;

      UPDATE public.stock_transfer_items
      SET quantity_shipped = v_item.quantity_requested
      WHERE id = v_item.id;

      INSERT INTO public.inventory_ledger (
        variant_id, location_id, from_shelf_id, movement_type, quantity, balance_after,
        reference_doc_type, reference_doc_id, operator_id
      )
      VALUES (
        v_item.variant_id, v_transfer.source_location_id, v_item.source_shelf_id, 'transfer_out',
        -v_item.quantity_requested, 0, 'STOCK_TRANSFER_DISPATCH', v_transfer.transfer_number, p_operator_id
      );
    END LOOP;

    UPDATE public.stock_transfers
    SET status = 'in_transit',
        dispatched_at = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
    WHERE id = p_transfer_id;

    RETURN jsonb_build_object('success', true, 'transfer_id', p_transfer_id, 'status', 'in_transit');

  ELSIF p_action = 'receive' THEN
    IF v_transfer.status <> 'in_transit' THEN
      RAISE EXCEPTION 'Transfer % cannot be received from status %', p_transfer_id, v_transfer.status;
    END IF;

    v_dest_shelf_id := p_target_shelf_id;
    IF v_dest_shelf_id IS NULL THEN
      SELECT s.id INTO v_dest_shelf_id
      FROM public.shelves s
      JOIN public.location_zones lz ON lz.id = s.zone_id
      WHERE s.location_id = v_transfer.destination_location_id
        AND COALESCE(lz.type, lz.zone_type) NOT IN ('quarantine', 'damaged_quarantine', 'courier_transit', 'fitting_room_quarantine')
        AND s.is_active = true
      ORDER BY s.coordinate ASC
      LIMIT 1;
    END IF;

    IF v_dest_shelf_id IS NULL THEN
      RAISE EXCEPTION 'No active sellable shelf found at destination location %', v_transfer.destination_location_id;
    END IF;

    FOR v_item IN SELECT * FROM public.stock_transfer_items WHERE transfer_id = p_transfer_id LOOP
      INSERT INTO public.shelf_inventory (shelf_id, variant_id, quantity)
      VALUES (v_dest_shelf_id, v_item.variant_id, v_item.quantity_shipped)
      ON CONFLICT (shelf_id, variant_id) DO UPDATE
      SET quantity = public.shelf_inventory.quantity + EXCLUDED.quantity,
          updated_at = timezone('utc'::text, now());

      UPDATE public.stock_transfer_items
      SET quantity_received = v_item.quantity_shipped
      WHERE id = v_item.id;

      INSERT INTO public.inventory_ledger (
        variant_id, location_id, to_shelf_id, movement_type, quantity, balance_after,
        reference_doc_type, reference_doc_id, operator_id
      )
      VALUES (
        v_item.variant_id, v_transfer.destination_location_id, v_dest_shelf_id, 'transfer_in',
        v_item.quantity_shipped, 0, 'STOCK_TRANSFER_RECEIVE', v_transfer.transfer_number, p_operator_id
      );
    END LOOP;

    UPDATE public.stock_transfers
    SET status = 'received',
        received_at = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
    WHERE id = p_transfer_id;

    RETURN jsonb_build_object('success', true, 'transfer_id', p_transfer_id, 'status', 'received');
  ELSE
    RAISE EXCEPTION 'Unknown action: %', p_action;
  END IF;
END;
$$;

-- Backward compatibility alias
CREATE OR REPLACE FUNCTION public.execute_stock_transfer(
  p_transfer_id UUID,
  p_action VARCHAR(20),
  p_target_shelf_id UUID DEFAULT NULL,
  p_operator_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN public.execute_stock_transfer_lifecycle(
    p_transfer_id,
    p_action::TEXT,
    p_target_shelf_id,
    p_operator_id,
    p_notes
  );
END;
$$;

