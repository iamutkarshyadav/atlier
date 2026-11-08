-- ==============================================================================
-- ATELIER MONOREPO MIGRATION: OMNICHANNEL ERP, WMS (SHELF-LEVEL),
-- MULTI-STORE POS, SUPPLY CHAIN TOPOLOGY & ATOMIC RPCS
-- Migration: 20261108_omnichannel_erp_wms_pos_topology.sql
-- ==============================================================================

-- 1. EXTEND USER ROLES ENUM
DO $$ BEGIN
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'warehouse_manager';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'store_manager';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'pos_cashier';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. CREATE NEW OPERATIONAL ENUMS
DO $$ BEGIN
  CREATE TYPE public.location_type AS ENUM ('warehouse', 'boutique', 'quarantine');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.zone_type AS ENUM (
    'receiving_dock',
    'bulk_storage',
    'sales_floor',
    'backroom_stock',
    'fitting_room_quarantine',
    'packing_bay',
    'dispatch_bay'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.inventory_movement_type AS ENUM (
    'inbound_grn',
    'shelf_putaway',
    'shelf_transfer',
    'pos_sale',
    'pos_return_restock',
    'online_reservation',
    'online_pick',
    'online_dispatch',
    'transfer_out',
    'transfer_in',
    'tryon_return_restock',
    'cycle_count_adjustment',
    'damaged_quarantine'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.po_status AS ENUM ('draft', 'issued', 'partially_received', 'received', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.qc_status AS ENUM ('accepted', 'rejected_damaged', 'pending_qc');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.transfer_status AS ENUM ('draft', 'requested', 'picked', 'in_transit', 'received', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.pos_payment_method AS ENUM ('cash', 'upi', 'card', 'store_credit', 'split');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. DETERMINISTIC SEQUENCES (PREVENTS COLLISION ATTACKS)
CREATE SEQUENCE IF NOT EXISTS public.seq_grn_number START WITH 1001;
CREATE SEQUENCE IF NOT EXISTS public.seq_pos_order_number START WITH 1001;
CREATE SEQUENCE IF NOT EXISTS public.seq_pos_invoice_number START WITH 1001;
CREATE SEQUENCE IF NOT EXISTS public.seq_transfer_number START WITH 1001;
CREATE SEQUENCE IF NOT EXISTS public.seq_po_number START WITH 1001;

-- 4. MULTI-STORE LOCATIONS TABLE
CREATE TABLE IF NOT EXISTS public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) NOT NULL UNIQUE, -- e.g. 'BLR-WH01', 'BLR-ST01', 'BOM-ST01'
  name TEXT NOT NULL,
  type public.location_type NOT NULL DEFAULT 'boutique',
  gstin VARCHAR(15) NOT NULL,
  state_code VARCHAR(5) NOT NULL, -- e.g. '29' (KA), '27' (MH)
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  pincode VARCHAR(10) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  online_fulfillment_priority INTEGER NOT NULL DEFAULT 100, -- lower number = higher routing priority
  online_safety_buffer INTEGER NOT NULL DEFAULT 1, -- units reserved for walk-ins
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_locations_type ON public.locations(type);
CREATE INDEX IF NOT EXISTS idx_locations_code ON public.locations(code);

-- 5. BIND STAFF USERS TO ASSIGNED LOCATION
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS assigned_location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL;

-- 6. LOCATION ZONES TABLE
CREATE TABLE IF NOT EXISTS public.location_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  code VARCHAR(20) NOT NULL, -- e.g. 'RCV', 'BLK', 'FLR', 'STK', 'QRN', 'DSK'
  name TEXT NOT NULL,
  type public.zone_type NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(location_id, code)
);
CREATE INDEX IF NOT EXISTS idx_location_zones_loc ON public.location_zones(location_id);

-- 7. SHELVES / BINS TABLE
CREATE TABLE IF NOT EXISTS public.shelves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES public.location_zones(id) ON DELETE CASCADE,
  coordinate VARCHAR(50) NOT NULL, -- Standard: Zone-Aisle-Rack-Shelf-Bin (e.g. 'BLK-A-01-A1')
  barcode VARCHAR(50) NOT NULL UNIQUE, -- Scannable Code 128: 'LOC-BLR01-BLK-A-01-A1'
  assigned_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  max_unit_capacity INTEGER NOT NULL DEFAULT 50,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_cycle_count_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(location_id, coordinate)
);
CREATE INDEX IF NOT EXISTS idx_shelves_barcode ON public.shelves(barcode);
CREATE INDEX IF NOT EXISTS idx_shelves_location_zone ON public.shelves(location_id, zone_id);

-- 8. SHELF-LEVEL INVENTORY TABLE
CREATE TABLE IF NOT EXISTS public.shelf_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shelf_id UUID NOT NULL REFERENCES public.shelves(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(shelf_id, variant_id)
);
CREATE INDEX IF NOT EXISTS idx_shelf_inventory_lookup ON public.shelf_inventory(variant_id, shelf_id);

-- 9. LOCATION AGGREGATE INVENTORY LEVELS TABLE
CREATE TABLE IF NOT EXISTS public.inventory_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  on_hand INTEGER NOT NULL DEFAULT 0 CHECK (on_hand >= 0),
  reserved INTEGER NOT NULL DEFAULT 0 CHECK (reserved >= 0),
  available INTEGER GENERATED ALWAYS AS (GREATEST(0, on_hand - reserved)) STORED,
  reorder_point INTEGER NOT NULL DEFAULT 5,
  reorder_quantity INTEGER NOT NULL DEFAULT 20,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(location_id, variant_id)
);
CREATE INDEX IF NOT EXISTS idx_inventory_levels_atp ON public.inventory_levels(variant_id, location_id, available);

-- 10. IMMUTABLE DOUBLE-ENTRY INVENTORY LEDGER TABLE
CREATE TABLE IF NOT EXISTS public.inventory_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT,
  from_shelf_id UUID REFERENCES public.shelves(id) ON DELETE RESTRICT,
  to_shelf_id UUID REFERENCES public.shelves(id) ON DELETE RESTRICT,
  movement_type public.inventory_movement_type NOT NULL,
  quantity INTEGER NOT NULL, -- Positive for additions, negative for deductions
  balance_after INTEGER NOT NULL,
  reference_doc_type VARCHAR(50) NOT NULL, -- 'PO', 'GRN', 'POS', 'ORDER', 'TRF', 'CYCLE'
  reference_doc_id TEXT NOT NULL,
  operator_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_inventory_ledger_audit ON public.inventory_ledger(variant_id, location_id, transaction_timestamp DESC);

-- 11. SUPPLIERS & PROCUREMENT
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_code VARCHAR(20) NOT NULL UNIQUE,
  name TEXT NOT NULL,
  gstin VARCHAR(15) NOT NULL,
  contact_person VARCHAR(100),
  email VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  address_line1 TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  state_code VARCHAR(5) NOT NULL,
  pincode VARCHAR(10) NOT NULL,
  lead_time_days INTEGER NOT NULL DEFAULT 14,
  payment_terms VARCHAR(50) NOT NULL DEFAULT 'Net 30',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number VARCHAR(50) NOT NULL UNIQUE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  destination_location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT,
  status public.po_status NOT NULL DEFAULT 'draft',
  expected_delivery_date DATE NOT NULL,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  hsn_code VARCHAR(10) NOT NULL DEFAULT '610910',
  quantity_ordered INTEGER NOT NULL CHECK (quantity_ordered > 0),
  quantity_received INTEGER NOT NULL DEFAULT 0 CHECK (quantity_received >= 0),
  unit_cost NUMERIC(10, 2) NOT NULL CHECK (unit_cost >= 0),
  tax_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 12.00,
  tax_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  line_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.goods_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_number VARCHAR(50) NOT NULL UNIQUE,
  po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE RESTRICT,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT,
  received_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  invoice_reference VARCHAR(50),
  received_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.goods_receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_id UUID NOT NULL REFERENCES public.goods_receipts(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  quantity_accepted INTEGER NOT NULL DEFAULT 0 CHECK (quantity_accepted >= 0),
  quantity_rejected INTEGER NOT NULL DEFAULT 0 CHECK (quantity_rejected >= 0),
  qc_status public.qc_status NOT NULL DEFAULT 'accepted',
  rejection_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 12. INTER-STORE TRANSFERS
CREATE TABLE IF NOT EXISTS public.stock_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_number VARCHAR(50) NOT NULL UNIQUE,
  source_location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT,
  destination_location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT,
  status public.transfer_status NOT NULL DEFAULT 'draft',
  eway_bill_number VARCHAR(50),
  dispatched_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.stock_transfer_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES public.stock_transfers(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  source_shelf_id UUID REFERENCES public.shelves(id) ON DELETE RESTRICT,
  quantity_requested INTEGER NOT NULL CHECK (quantity_requested > 0),
  quantity_shipped INTEGER NOT NULL DEFAULT 0 CHECK (quantity_shipped >= 0),
  quantity_received INTEGER NOT NULL DEFAULT 0 CHECK (quantity_received >= 0)
);

-- 13. POS SESSIONS
CREATE TABLE IF NOT EXISTS public.pos_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT,
  terminal_id VARCHAR(50) NOT NULL,
  cashier_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  opening_cash_float NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  closing_cash_actual NUMERIC(10, 2),
  cash_discrepancy NUMERIC(10, 2),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  closed_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- 14. STRUCTURED MULTI-ENTITY ADDRESSES
CREATE TABLE IF NOT EXISTS public.user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_name TEXT NOT NULL,
  phone VARCHAR(20) NOT NULL,
  alternate_phone VARCHAR(20),
  flat_building TEXT NOT NULL,
  street_area TEXT NOT NULL,
  landmark TEXT,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  state_code VARCHAR(5) NOT NULL,
  pincode VARCHAR(10) NOT NULL,
  country VARCHAR(5) NOT NULL DEFAULT 'IN',
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  address_type VARCHAR(20) NOT NULL DEFAULT 'home',
  is_default_shipping BOOLEAN NOT NULL DEFAULT false,
  is_default_billing BOOLEAN NOT NULL DEFAULT false,
  gstin VARCHAR(15),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_user_addresses_user ON public.user_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_addresses_pin ON public.user_addresses(pincode);

-- 15. EXPAND ORDERS & ORDER ITEMS FOR OMNICHANNEL & POS
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS source_location_id UUID REFERENCES public.locations(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS fulfillment_location_id UUID REFERENCES public.locations(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS pos_session_id UUID REFERENCES public.pos_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_pos_order BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_endless_aisle BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS billing_address_json JSONB,
  ADD COLUMN IF NOT EXISTS shipping_address_json JSONB,
  ADD COLUMN IF NOT EXISTS pos_payment_method public.pos_payment_method,
  ADD COLUMN IF NOT EXISTS pos_payment_details JSONB;

-- MANDATORY PRODUCTION FIX 2: variant_id on order_items
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS picked_from_shelf_id UUID REFERENCES public.shelves(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(10) DEFAULT '610910',
  ADD COLUMN IF NOT EXISTS cgst_rate NUMERIC(5, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS sgst_rate NUMERIC(5, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS igst_rate NUMERIC(5, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS igst_amount NUMERIC(10, 2) DEFAULT 0.00;

ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(10) NOT NULL DEFAULT '610910',
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS mrp NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS tax_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 12.00;

-- 16. CALLER AUTHORIZATION HELPER FUNCTION
CREATE OR REPLACE FUNCTION public.check_is_staff()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_role public.user_role;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;
  SELECT role INTO v_role FROM public.users WHERE id = auth.uid();
  RETURN v_role IN ('admin', 'warehouse_manager', 'store_manager', 'pos_cashier');
END;
$$;

-- ==============================================================================
-- 17. THE 6 ATOMIC RPC FUNCTIONS (STRICT CONCURRENCY WITH FOR UPDATE LOCKS)
-- ==============================================================================

-- 17.1 RPC: receive_grn_and_putaway
CREATE OR REPLACE FUNCTION public.receive_grn_and_putaway(
  p_po_id UUID,
  p_location_id UUID,
  p_target_shelf_id UUID,
  p_operator_id UUID,
  p_received_items JSONB -- Array of { variant_id: UUID, qty_accepted: INT, qty_rejected: INT, unit_cost: NUMERIC }
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_grn_id UUID;
  v_grn_number VARCHAR(50);
  v_seq INT;
  v_item RECORD;
  v_po_status public.po_status;
  v_current_shelf_qty INT;
  v_current_loc_on_hand INT;
  v_shelf_barcode VARCHAR(50);
BEGIN
  -- Strict Staff Role Check
  IF NOT public.check_is_staff() THEN
    RAISE EXCEPTION 'Unauthorized: Omnichannel staff credentials required.';
  END IF;

  -- 1. Lock Purchase Order row
  SELECT status INTO v_po_status
  FROM public.purchase_orders
  WHERE id = p_po_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase Order % does not exist.', p_po_id;
  END IF;

  IF v_po_status NOT IN ('issued', 'partially_received') THEN
    RAISE EXCEPTION 'PO % is not open for receipt (Status: %)', p_po_id, v_po_status;
  END IF;

  -- 2. Verify and Lock Target Shelf
  SELECT barcode INTO v_shelf_barcode
  FROM public.shelves
  WHERE id = p_target_shelf_id AND location_id = p_location_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target shelf % does not exist at location %', p_target_shelf_id, p_location_id;
  END IF;

  -- 3. Deterministic Sequential GRN Generation
  v_seq := nextval('public.seq_grn_number');
  v_grn_number := 'GRN-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(v_seq::TEXT, 5, '0');

  INSERT INTO public.goods_receipts (grn_number, po_id, location_id, received_by)
  VALUES (v_grn_number, p_po_id, p_location_id, p_operator_id)
  RETURNING id INTO v_grn_id;

  -- 4. Process Each Received Item
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_received_items) AS x(
    variant_id UUID,
    qty_accepted INT,
    qty_rejected INT,
    unit_cost NUMERIC
  )
  LOOP
    -- Lock PO item line
    UPDATE public.purchase_order_items
    SET quantity_received = quantity_received + v_item.qty_accepted
    WHERE po_id = p_po_id AND variant_id = v_item.variant_id;

    -- Record GRN Item
    INSERT INTO public.goods_receipt_items (grn_id, variant_id, quantity_accepted, quantity_rejected, qc_status)
    VALUES (
      v_grn_id,
      v_item.variant_id,
      v_item.qty_accepted,
      v_item.qty_rejected,
      CASE WHEN v_item.qty_rejected > 0 THEN 'rejected_damaged'::public.qc_status ELSE 'accepted'::public.qc_status END
    );

    IF v_item.qty_accepted > 0 THEN
      -- A. Upsert Shelf-Level Inventory
      INSERT INTO public.shelf_inventory (shelf_id, variant_id, quantity, updated_at)
      VALUES (p_target_shelf_id, v_item.variant_id, v_item.qty_accepted, now())
      ON CONFLICT (shelf_id, variant_id) DO UPDATE
      SET quantity = public.shelf_inventory.quantity + v_item.qty_accepted,
          updated_at = now()
      RETURNING quantity INTO v_current_shelf_qty;

      -- B. Upsert Location Aggregate Inventory
      INSERT INTO public.inventory_levels (location_id, variant_id, on_hand, reserved, updated_at)
      VALUES (p_location_id, v_item.variant_id, v_item.qty_accepted, 0, now())
      ON CONFLICT (location_id, variant_id) DO UPDATE
      SET on_hand = public.inventory_levels.on_hand + v_item.qty_accepted,
          updated_at = now()
      RETURNING on_hand INTO v_current_loc_on_hand;

      -- C. Update Master Product Variant Stock & Cost
      UPDATE public.product_variants
      SET stock = stock + v_item.qty_accepted,
          cost_price = COALESCE(v_item.unit_cost, cost_price),
          updated_at = now()
      WHERE id = v_item.variant_id;

      -- D. Insert Immutable Double-Entry Ledger Record
      INSERT INTO public.inventory_ledger (
        variant_id, location_id, to_shelf_id, movement_type,
        quantity, balance_after, reference_doc_type, reference_doc_id, operator_id
      ) VALUES (
        v_item.variant_id, p_location_id, p_target_shelf_id, 'inbound_grn',
        v_item.qty_accepted, v_current_loc_on_hand, 'GRN', v_grn_number, p_operator_id
      );
    END IF;
  END LOOP;

  -- 5. Update PO Status
  IF EXISTS (
    SELECT 1 FROM public.purchase_order_items
    WHERE po_id = p_po_id AND quantity_received < quantity_ordered
  ) THEN
    UPDATE public.purchase_orders SET status = 'partially_received', updated_at = now() WHERE id = p_po_id;
  ELSE
    UPDATE public.purchase_orders SET status = 'received', updated_at = now() WHERE id = p_po_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'grn_id', v_grn_id,
    'grn_number', v_grn_number,
    'shelf_barcode', v_shelf_barcode
  );
END;
$$;

-- 17.2 RPC: process_pos_checkout (with Endless Aisle Support)
CREATE OR REPLACE FUNCTION public.process_pos_checkout(
  p_location_id UUID,
  p_pos_session_id UUID,
  p_cashier_id UUID,
  p_customer_id UUID,
  p_customer_info JSONB,
  p_cart_items JSONB, -- Array of { variant_id, shelf_id, quantity, unit_price, discount, hsn_code }
  p_payment_method public.pos_payment_method,
  p_payment_details JSONB,
  p_subtotal NUMERIC,
  p_tax_amount NUMERIC,
  p_discount_amount NUMERIC,
  p_total NUMERIC,
  p_is_endless_aisle BOOLEAN DEFAULT false,
  p_shipping_address JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_order_number VARCHAR(50);
  v_invoice_number VARCHAR(50);
  v_order_seq INT;
  v_invoice_seq INT;
  v_item RECORD;
  v_available_qty INT;
  v_loc_state VARCHAR(5);
  v_is_intra_state BOOLEAN := true;
  v_line_tax_rate NUMERIC;
  v_cgst NUMERIC;
  v_sgst NUMERIC;
  v_igst NUMERIC;
  v_loc_on_hand INT;
  v_order_status public.order_status;
BEGIN
  -- Strict Staff Role Check
  IF NOT public.check_is_staff() THEN
    RAISE EXCEPTION 'Unauthorized: Omnichannel staff credentials required.';
  END IF;

  -- 1. Validate Active POS Session
  IF NOT EXISTS (
    SELECT 1 FROM public.pos_sessions
    WHERE id = p_pos_session_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'POS session % is closed or invalid.', p_pos_session_id;
  END IF;

  -- 2. Determine State Code for GST Logic
  SELECT state_code INTO v_loc_state FROM public.locations WHERE id = p_location_id;
  IF p_customer_info->>'gstin' IS NOT NULL AND LENGTH(p_customer_info->>'gstin') >= 2 THEN
    v_is_intra_state := (SUBSTRING(p_customer_info->>'gstin' FROM 1 FOR 2) = v_loc_state);
  END IF;

  -- 3. Deterministic Sequential Numbers
  v_order_seq := nextval('public.seq_pos_order_number');
  v_invoice_seq := nextval('public.seq_pos_invoice_number');
  v_order_number := 'POS-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(v_order_seq::TEXT, 5, '0');
  v_invoice_number := 'INV-POS-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(v_invoice_seq::TEXT, 5, '0');

  v_order_status := CASE WHEN p_is_endless_aisle THEN 'processing'::public.order_status ELSE 'delivered'::public.order_status END;

  -- 4. Create Order Record
  INSERT INTO public.orders (
    order_number, user_id, status, delivery_mode,
    source_location_id, fulfillment_location_id, pos_session_id,
    is_pos_order, is_endless_aisle, total, tax_amount,
    invoice_number, tracking_barcode, pos_payment_method, pos_payment_details,
    billing_address_json, shipping_address_json
  ) VALUES (
    v_order_number, COALESCE(p_customer_id, p_cashier_id), v_order_status, 'direct',
    p_location_id, p_location_id, p_pos_session_id,
    true, p_is_endless_aisle, p_total, p_tax_amount,
    v_invoice_number, 'POS-BAR-' || SUBSTRING(v_order_number FROM 5), p_payment_method, p_payment_details,
    p_customer_info, COALESCE(p_shipping_address, p_customer_info)
  )
  RETURNING id INTO v_order_id;

  -- 5. Process Items with Row-Level Locks
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_cart_items) AS x(
    variant_id UUID,
    shelf_id UUID,
    quantity INT,
    unit_price NUMERIC,
    discount NUMERIC,
    hsn_code VARCHAR(10)
  )
  LOOP
    -- Lock and verify shelf stock
    SELECT quantity INTO v_available_qty
    FROM public.shelf_inventory
    WHERE shelf_id = v_item.shelf_id AND variant_id = v_item.variant_id
    FOR UPDATE;

    IF v_available_qty IS NULL OR v_available_qty < v_item.quantity THEN
      RAISE EXCEPTION 'Insufficient stock on shelf % for variant %. Requested: %, Available: %',
        v_item.shelf_id, v_item.variant_id, v_item.quantity, COALESCE(v_available_qty, 0);
    END IF;

    -- Compute GST slabs
    SELECT tax_rate_percent INTO v_line_tax_rate
    FROM public.product_variants
    WHERE id = v_item.variant_id;
    v_line_tax_rate := COALESCE(v_line_tax_rate, 12.00);

    IF v_is_intra_state THEN
      v_cgst := ROUND(((v_item.unit_price * v_item.quantity - COALESCE(v_item.discount, 0)) * (v_line_tax_rate / 200)), 2);
      v_sgst := v_cgst;
      v_igst := 0.00;
    ELSE
      v_cgst := 0.00;
      v_sgst := 0.00;
      v_igst := ROUND(((v_item.unit_price * v_item.quantity - COALESCE(v_item.discount, 0)) * (v_line_tax_rate / 100)), 2);
    END IF;

    -- A. Insert Order Item (Includes explicit variant_id)
    INSERT INTO public.order_items (
      order_id, product_id, variant_id, quantity, unit_price, size, is_kept,
      try_on_decision, picked_from_shelf_id, hsn_code,
      cgst_rate, cgst_amount, sgst_rate, sgst_amount, igst_rate, igst_amount
    )
    SELECT
      v_order_id, pv.product_id, v_item.variant_id, v_item.quantity, v_item.unit_price, pv.size, true,
      'kept', v_item.shelf_id, COALESCE(v_item.hsn_code, pv.hsn_code),
      CASE WHEN v_is_intra_state THEN v_line_tax_rate / 2 ELSE 0 END, v_cgst,
      CASE WHEN v_is_intra_state THEN v_line_tax_rate / 2 ELSE 0 END, v_sgst,
      CASE WHEN NOT v_is_intra_state THEN v_line_tax_rate ELSE 0 END, v_igst
    FROM public.product_variants pv
    WHERE pv.id = v_item.variant_id;

    -- B. Deduct Shelf Stock
    UPDATE public.shelf_inventory
    SET quantity = quantity - v_item.quantity, updated_at = now()
    WHERE shelf_id = v_item.shelf_id AND variant_id = v_item.variant_id;

    -- C. Deduct Location Inventory
    UPDATE public.inventory_levels
    SET on_hand = on_hand - v_item.quantity, updated_at = now()
    WHERE location_id = p_location_id AND variant_id = v_item.variant_id
    RETURNING on_hand INTO v_loc_on_hand;

    -- D. Deduct Global Product Variant Stock
    UPDATE public.product_variants
    SET stock = GREATEST(0, stock - v_item.quantity), updated_at = now()
    WHERE id = v_item.variant_id;

    -- E. Append to Audit Ledger
    INSERT INTO public.inventory_ledger (
      variant_id, location_id, from_shelf_id, movement_type,
      quantity, balance_after, reference_doc_type, reference_doc_id, operator_id
    ) VALUES (
      v_item.variant_id, p_location_id, v_item.shelf_id, 'pos_sale',
      -v_item.quantity, v_loc_on_hand, 'POS', v_order_number, p_cashier_id
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'invoice_number', v_invoice_number,
    'is_endless_aisle', p_is_endless_aisle,
    'total', p_total
  );
END;
$$;

-- 17.3 RPC: move_shelf_stock
CREATE OR REPLACE FUNCTION public.move_shelf_stock(
  p_location_id UUID,
  p_from_shelf_id UUID,
  p_to_shelf_id UUID,
  p_variant_id UUID,
  p_quantity INT,
  p_operator_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_source_qty INT;
  v_loc_on_hand INT;
BEGIN
  -- Strict Staff Role Check
  IF NOT public.check_is_staff() THEN
    RAISE EXCEPTION 'Unauthorized: Omnichannel staff credentials required.';
  END IF;

  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Transfer quantity must be greater than zero.';
  END IF;

  -- 1. Lock and Verify Source Shelf
  SELECT quantity INTO v_source_qty
  FROM public.shelf_inventory
  WHERE shelf_id = p_from_shelf_id AND variant_id = p_variant_id
  FOR UPDATE;

  IF v_source_qty IS NULL OR v_source_qty < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock on source shelf. Available: %, Requested: %', COALESCE(v_source_qty, 0), p_quantity;
  END IF;

  -- 2. Deduct and Increment
  UPDATE public.shelf_inventory
  SET quantity = quantity - p_quantity, updated_at = now()
  WHERE shelf_id = p_from_shelf_id AND variant_id = p_variant_id;

  INSERT INTO public.shelf_inventory (shelf_id, variant_id, quantity, updated_at)
  VALUES (p_to_shelf_id, p_variant_id, p_quantity, now())
  ON CONFLICT (shelf_id, variant_id) DO UPDATE
  SET quantity = public.shelf_inventory.quantity + p_quantity, updated_at = now();

  SELECT on_hand INTO v_loc_on_hand FROM public.inventory_levels
  WHERE location_id = p_location_id AND variant_id = p_variant_id;

  -- 3. Record Audit Movement
  INSERT INTO public.inventory_ledger (
    variant_id, location_id, from_shelf_id, to_shelf_id,
    movement_type, quantity, balance_after, reference_doc_type,
    reference_doc_id, operator_id, notes
  ) VALUES (
    p_variant_id, p_location_id, p_from_shelf_id, p_to_shelf_id,
    'shelf_transfer', p_quantity, v_loc_on_hand, 'SHELF_RELOCATION',
    p_from_shelf_id::TEXT || '->' || p_to_shelf_id::TEXT, p_operator_id, p_notes
  );

  RETURN jsonb_build_object('success', true, 'quantity_moved', p_quantity);
END;
$$;

-- 17.4 RPC: execute_stock_transfer
CREATE OR REPLACE FUNCTION public.execute_stock_transfer(
  p_transfer_id UUID,
  p_action VARCHAR(20), -- 'dispatch' or 'receive'
  p_target_shelf_id UUID DEFAULT NULL, -- required for 'receive'
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
  v_source_shelf_qty INT;
  v_source_loc_on_hand INT;
  v_dest_loc_on_hand INT;
BEGIN
  -- Strict Staff Role Check
  IF NOT public.check_is_staff() THEN
    RAISE EXCEPTION 'Unauthorized: Omnichannel staff credentials required.';
  END IF;

  -- 1. Lock Transfer Record
  SELECT * INTO v_transfer
  FROM public.stock_transfers
  WHERE id = p_transfer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer % not found', p_transfer_id;
  END IF;

  -- 2. DISPATCH ACTION (Source Location -> In-Transit)
  IF p_action = 'dispatch' THEN
    IF v_transfer.status NOT IN ('draft', 'requested') THEN
      RAISE EXCEPTION 'Transfer % cannot be dispatched (Status: %)', p_transfer_id, v_transfer.status;
    END IF;

    FOR v_item IN
      SELECT * FROM public.stock_transfer_items
      WHERE transfer_id = p_transfer_id
    LOOP
      -- Lock source shelf
      SELECT quantity INTO v_source_shelf_qty
      FROM public.shelf_inventory
      WHERE shelf_id = v_item.source_shelf_id AND variant_id = v_item.variant_id
      FOR UPDATE;

      IF v_source_shelf_qty IS NULL OR v_source_shelf_qty < v_item.quantity_requested THEN
        RAISE EXCEPTION 'Insufficient stock on source shelf % for transfer. Available: %, Requested: %',
          v_item.source_shelf_id, COALESCE(v_source_shelf_qty, 0), v_item.quantity_requested;
      END IF;

      -- Deduct from shelf
      UPDATE public.shelf_inventory
      SET quantity = quantity - v_item.quantity_requested, updated_at = now()
      WHERE shelf_id = v_item.source_shelf_id AND variant_id = v_item.variant_id;

      -- Deduct from source location aggregate
      UPDATE public.inventory_levels
      SET on_hand = on_hand - v_item.quantity_requested, updated_at = now()
      WHERE location_id = v_transfer.source_location_id AND variant_id = v_item.variant_id
      RETURNING on_hand INTO v_source_loc_on_hand;

      -- Mark shipped quantity
      UPDATE public.stock_transfer_items
      SET quantity_shipped = v_item.quantity_requested
      WHERE id = v_item.id;

      -- Ledger Audit
      INSERT INTO public.inventory_ledger (
        variant_id, location_id, from_shelf_id, movement_type,
        quantity, balance_after, reference_doc_type, reference_doc_id, operator_id, notes
      ) VALUES (
        v_item.variant_id, v_transfer.source_location_id, v_item.source_shelf_id,
        'transfer_out', -v_item.quantity_requested, v_source_loc_on_hand,
        'TRANSFER', v_transfer.transfer_number, p_operator_id, p_notes
      );
    END LOOP;

    UPDATE public.stock_transfers
    SET status = 'in_transit', dispatched_at = now(), updated_at = now()
    WHERE id = p_transfer_id;

    RETURN jsonb_build_object('success', true, 'status', 'in_transit');

  -- 3. RECEIVE ACTION (In-Transit -> Destination Location Shelf)
  ELSIF p_action = 'receive' THEN
    IF v_transfer.status <> 'in_transit' THEN
      RAISE EXCEPTION 'Transfer % is not in transit (Status: %)', p_transfer_id, v_transfer.status;
    END IF;

    IF p_target_shelf_id IS NULL THEN
      RAISE EXCEPTION 'Target destination shelf is required for receiving transfer.';
    END IF;

    FOR v_item IN
      SELECT * FROM public.stock_transfer_items
      WHERE transfer_id = p_transfer_id
    LOOP
      -- Upsert into destination shelf
      INSERT INTO public.shelf_inventory (shelf_id, variant_id, quantity, updated_at)
      VALUES (p_target_shelf_id, v_item.variant_id, v_item.quantity_shipped, now())
      ON CONFLICT (shelf_id, variant_id) DO UPDATE
      SET quantity = public.shelf_inventory.quantity + v_item.quantity_shipped, updated_at = now();

      -- Upsert into destination location aggregate
      INSERT INTO public.inventory_levels (location_id, variant_id, on_hand, reserved, updated_at)
      VALUES (v_transfer.destination_location_id, v_item.variant_id, v_item.quantity_shipped, 0, now())
      ON CONFLICT (location_id, variant_id) DO UPDATE
      SET on_hand = public.inventory_levels.on_hand + v_item.quantity_shipped, updated_at = now()
      RETURNING on_hand INTO v_dest_loc_on_hand;

      -- Mark received quantity
      UPDATE public.stock_transfer_items
      SET quantity_received = v_item.quantity_shipped
      WHERE id = v_item.id;

      -- Ledger Audit
      INSERT INTO public.inventory_ledger (
        variant_id, location_id, to_shelf_id, movement_type,
        quantity, balance_after, reference_doc_type, reference_doc_id, operator_id, notes
      ) VALUES (
        v_item.variant_id, v_transfer.destination_location_id, p_target_shelf_id,
        'transfer_in', v_item.quantity_shipped, v_dest_loc_on_hand,
        'TRANSFER', v_transfer.transfer_number, p_operator_id, p_notes
      );
    END LOOP;

    UPDATE public.stock_transfers
    SET status = 'received', received_at = now(), updated_at = now()
    WHERE id = p_transfer_id;

    RETURN jsonb_build_object('success', true, 'status', 'received');
  ELSE
    RAISE EXCEPTION 'Invalid transfer action: %', p_action;
  END IF;
END;
$$;

-- 17.5 RPC: allocate_and_pick_online_order
CREATE OR REPLACE FUNCTION public.allocate_and_pick_online_order(
  p_order_id UUID,
  p_action VARCHAR(20), -- 'allocate' or 'confirm_pick'
  p_location_id UUID DEFAULT NULL,
  p_picks JSONB DEFAULT NULL, -- Array of { order_item_id: UUID, shelf_id: UUID }
  p_operator_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
  v_pick RECORD;
  v_loc_id UUID;
  v_shelf_qty INT;
  v_loc_on_hand INT;
BEGIN
  -- Strict Staff Role Check
  IF NOT public.check_is_staff() THEN
    RAISE EXCEPTION 'Unauthorized: Omnichannel staff credentials required.';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % not found', p_order_id;
  END IF;

  -- A. ALLOCATE INVENTORY FOR ORDER
  IF p_action = 'allocate' THEN
    -- Pick specified location or priority location with stock
    v_loc_id := p_location_id;
    IF v_loc_id IS NULL THEN
      SELECT l.id INTO v_loc_id
      FROM public.locations l
      WHERE l.is_active = true
      ORDER BY l.online_fulfillment_priority ASC
      LIMIT 1;
    END IF;

    FOR v_item IN
      SELECT * FROM public.order_items
      WHERE order_id = p_order_id
    LOOP
      IF v_item.variant_id IS NOT NULL THEN
        -- Increment reserved count
        UPDATE public.inventory_levels
        SET reserved = reserved + v_item.quantity, updated_at = now()
        WHERE location_id = v_loc_id AND variant_id = v_item.variant_id;

        -- Record ledger reservation
        INSERT INTO public.inventory_ledger (
          variant_id, location_id, movement_type, quantity, balance_after,
          reference_doc_type, reference_doc_id, operator_id
        )
        SELECT v_item.variant_id, v_loc_id, 'online_reservation', v_item.quantity, il.on_hand,
               'ONLINE_ORDER', COALESCE(v_order.order_number, p_order_id::TEXT), p_operator_id
        FROM public.inventory_levels il
        WHERE il.location_id = v_loc_id AND il.variant_id = v_item.variant_id;
      END IF;
    END LOOP;

    UPDATE public.orders
    SET fulfillment_location_id = v_loc_id, updated_at = now()
    WHERE id = p_order_id;

    RETURN jsonb_build_object('success', true, 'allocated_location_id', v_loc_id);

  -- B. CONFIRM PICK FROM PHYSICAL SHELF
  ELSIF p_action = 'confirm_pick' THEN
    IF p_picks IS NULL THEN
      RAISE EXCEPTION 'Picks array is required for confirm_pick.';
    END IF;

    v_loc_id := COALESCE(v_order.fulfillment_location_id, p_location_id);

    FOR v_pick IN SELECT * FROM jsonb_to_recordset(p_picks) AS x(
      order_item_id UUID,
      shelf_id UUID
    )
    LOOP
      SELECT * INTO v_item
      FROM public.order_items
      WHERE id = v_pick.order_item_id AND order_id = p_order_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Order item % not found in order %', v_pick.order_item_id, p_order_id;
      END IF;

      -- Lock and verify shelf stock
      SELECT quantity INTO v_shelf_qty
      FROM public.shelf_inventory
      WHERE shelf_id = v_pick.shelf_id AND variant_id = v_item.variant_id
      FOR UPDATE;

      IF v_shelf_qty IS NULL OR v_shelf_qty < v_item.quantity THEN
        RAISE EXCEPTION 'Insufficient stock on shelf % for item %. Available: %, Required: %',
          v_pick.shelf_id, v_item.variant_id, COALESCE(v_shelf_qty, 0), v_item.quantity;
      END IF;

      -- Deduct from physical shelf
      UPDATE public.shelf_inventory
      SET quantity = quantity - v_item.quantity, updated_at = now()
      WHERE shelf_id = v_pick.shelf_id AND variant_id = v_item.variant_id;

      -- Deduct from location on_hand & reserved
      UPDATE public.inventory_levels
      SET on_hand = on_hand - v_item.quantity,
          reserved = GREATEST(0, reserved - v_item.quantity),
          updated_at = now()
      WHERE location_id = v_loc_id AND variant_id = v_item.variant_id
      RETURNING on_hand INTO v_loc_on_hand;

      -- Deduct global variant stock
      UPDATE public.product_variants
      SET stock = GREATEST(0, stock - v_item.quantity), updated_at = now()
      WHERE id = v_item.variant_id;

      -- Update item record
      UPDATE public.order_items
      SET picked_from_shelf_id = v_pick.shelf_id
      WHERE id = v_item.id;

      -- Ledger Audit
      INSERT INTO public.inventory_ledger (
        variant_id, location_id, from_shelf_id, movement_type,
        quantity, balance_after, reference_doc_type, reference_doc_id, operator_id
      ) VALUES (
        v_item.variant_id, v_loc_id, v_pick.shelf_id, 'online_pick',
        -v_item.quantity, v_loc_on_hand, 'PICK_WAVE', COALESCE(v_order.order_number, p_order_id::TEXT), p_operator_id
      );
    END LOOP;

    UPDATE public.orders
    SET status = 'processing', updated_at = now()
    WHERE id = p_order_id;

    RETURN jsonb_build_object('success', true, 'status', 'processing');
  ELSE
    RAISE EXCEPTION 'Invalid allocation action: %', p_action;
  END IF;
END;
$$;

-- 17.6 RPC: process_boris_return (In-Store Return / Restock)
CREATE OR REPLACE FUNCTION public.process_boris_return(
  p_order_id UUID,
  p_order_item_id UUID,
  p_location_id UUID,
  p_target_shelf_id UUID,
  p_condition public.qc_status,
  p_refund_mode VARCHAR(20),
  p_operator_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item RECORD;
  v_loc_on_hand INT;
  v_movement public.inventory_movement_type;
BEGIN
  -- Strict Staff Role Check
  IF NOT public.check_is_staff() THEN
    RAISE EXCEPTION 'Unauthorized: Omnichannel staff credentials required.';
  END IF;

  -- 1. Lock Order Item
  SELECT * INTO v_item
  FROM public.order_items
  WHERE id = p_order_item_id AND order_id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order item % not found in order %', p_order_item_id, p_order_id;
  END IF;

  -- 2. Mark item as returned in order_items
  UPDATE public.order_items
  SET is_kept = false,
      try_on_decision = 'rejected',
      rejection_reason = COALESCE(p_notes, 'BORIS in-store return')
  WHERE id = p_order_item_id;

  v_movement := CASE WHEN p_condition = 'accepted' THEN 'pos_return_restock'::public.inventory_movement_type ELSE 'damaged_quarantine'::public.inventory_movement_type END;

  -- 3. Upsert into Target Shelf
  INSERT INTO public.shelf_inventory (shelf_id, variant_id, quantity, updated_at)
  VALUES (p_target_shelf_id, v_item.variant_id, v_item.quantity, now())
  ON CONFLICT (shelf_id, variant_id) DO UPDATE
  SET quantity = public.shelf_inventory.quantity + v_item.quantity, updated_at = now();

  -- 4. Upsert into Location Aggregate
  INSERT INTO public.inventory_levels (location_id, variant_id, on_hand, reserved, updated_at)
  VALUES (p_location_id, v_item.variant_id, v_item.quantity, 0, now())
  ON CONFLICT (location_id, variant_id) DO UPDATE
  SET on_hand = public.inventory_levels.on_hand + v_item.quantity, updated_at = now()
  RETURNING on_hand INTO v_loc_on_hand;

  -- 5. Restore Global Product Variant Stock (if accepted for resale)
  IF p_condition = 'accepted' THEN
    UPDATE public.product_variants
    SET stock = stock + v_item.quantity, updated_at = now()
    WHERE id = v_item.variant_id;
  END IF;

  -- 6. Record in Ledger
  INSERT INTO public.inventory_ledger (
    variant_id, location_id, to_shelf_id, movement_type,
    quantity, balance_after, reference_doc_type, reference_doc_id, operator_id, notes
  ) VALUES (
    v_item.variant_id, p_location_id, p_target_shelf_id, v_movement,
    v_item.quantity, v_loc_on_hand, 'BORIS_RETURN', p_order_id::TEXT, p_operator_id, p_notes
  );

  RETURN jsonb_build_object(
    'success', true,
    'refund_mode', p_refund_mode,
    'restocked_shelf_id', p_target_shelf_id,
    'condition', p_condition
  );
END;
$$;

-- ==============================================================================
-- 18. ZERO-DOWNTIME DATA SEEDING & AUTOMATIC INVENTORY BACKFILL
-- ==============================================================================

-- 18.1 Seed Physical Store & Mother Hub Locations
INSERT INTO public.locations (id, code, name, type, gstin, state_code, address_line1, city, state, pincode, phone, email, online_fulfillment_priority, online_safety_buffer)
VALUES
  (
    'l1000000-0000-0000-0000-000000000001',
    'BLR-WH01',
    'Atelier Central Mother Hub (Bengaluru)',
    'warehouse',
    '29AAAAA0000A1Z5',
    '29',
    'Phase 1, Electronic City Industrial Area',
    'Bengaluru',
    'Karnataka',
    '560100',
    '+91 80 4000 1100',
    'hub.blr@atelier.com',
    10,
    0
  ),
  (
    'l1000000-0000-0000-0000-000000000002',
    'BLR-ST01',
    'Indiranagar Flagship Boutique (Bengaluru)',
    'boutique',
    '29AAAAA0000A1Z5',
    '29',
    '100 Feet Road, HAL 2nd Stage, Indiranagar',
    'Bengaluru',
    'Karnataka',
    '560038',
    '+91 80 4000 2200',
    'indiranagar@atelier.com',
    20,
    1
  ),
  (
    'l1000000-0000-0000-0000-000000000003',
    'BOM-ST01',
    'Kala Ghoda Heritage Boutique (Mumbai)',
    'boutique',
    '27AAAAA0000A1Z5',
    '27',
    'VB Gandhi Marg, Kala Ghoda, Fort',
    'Mumbai',
    'Maharashtra',
    '400001',
    '+91 22 4000 3300',
    'mumbai@atelier.com',
    30,
    1
  )
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  gstin = EXCLUDED.gstin,
  phone = EXCLUDED.phone;

-- 18.2 Seed Location Operational Zones
INSERT INTO public.location_zones (id, location_id, code, name, type)
VALUES
  ('z1000000-0000-0000-0000-000000000001', 'l1000000-0000-0000-0000-000000000001', 'RCV', 'Receiving Dock 01', 'receiving_dock'),
  ('z1000000-0000-0000-0000-000000000002', 'l1000000-0000-0000-0000-000000000001', 'BLK', 'Central Bulk Racks', 'bulk_storage'),
  ('z1000000-0000-0000-0000-000000000003', 'l1000000-0000-0000-0000-000000000001', 'DSK', 'Outbound Dispatch Bay', 'dispatch_bay'),
  ('z1000000-0000-0000-0000-000000000004', 'l1000000-0000-0000-0000-000000000002', 'FLR', 'Indiranagar Sales Floor', 'sales_floor'),
  ('z1000000-0000-0000-0000-000000000005', 'l1000000-0000-0000-0000-000000000002', 'STK', 'Indiranagar Backroom Stock', 'backroom_stock'),
  ('z1000000-0000-0000-0000-000000000006', 'l1000000-0000-0000-0000-000000000002', 'QRN', 'Indiranagar Fitting Quarantine', 'fitting_room_quarantine')
ON CONFLICT (location_id, code) DO NOTHING;

-- 18.3 Seed Default Warehouse & Boutique Shelves
INSERT INTO public.shelves (id, location_id, zone_id, coordinate, barcode, max_unit_capacity)
VALUES
  (
    's1000000-0000-0000-0000-000000000001',
    'l1000000-0000-0000-0000-000000000001',
    'z1000000-0000-0000-0000-000000000002',
    'BLK-A-01-A1',
    'LOC-BLR01-BLK-A-01-A1',
    500
  ),
  (
    's1000000-0000-0000-0000-000000000002',
    'l1000000-0000-0000-0000-000000000001',
    'z1000000-0000-0000-0000-000000000002',
    'BLK-A-01-A2',
    'LOC-BLR01-BLK-A-01-A2',
    500
  ),
  (
    's1000000-0000-0000-0000-000000000003',
    'l1000000-0000-0000-0000-000000000002',
    'z1000000-0000-0000-0000-000000000004',
    'FLR-RACK-01',
    'LOC-BLR02-FLR-RACK-01',
    100
  ),
  (
    's1000000-0000-0000-0000-000000000004',
    'l1000000-0000-0000-0000-000000000002',
    'z1000000-0000-0000-0000-000000000006',
    'QRN-BIN-01',
    'LOC-BLR02-QRN-BIN-01',
    50
  )
ON CONFLICT (location_id, coordinate) DO NOTHING;

-- 18.4 Seed Initial Verified Suppliers
INSERT INTO public.suppliers (id, vendor_code, name, gstin, contact_person, email, phone, address_line1, city, state, state_code, pincode, lead_time_days, payment_terms)
VALUES
  (
    'v1000000-0000-0000-0000-000000000001',
    'SUP-SHIN-01',
    'Shingora Textiles & Knitting Mills',
    '03AAAAA1234A1Z1',
    'Harpreet Singh',
    'harpreet@shingora.internal',
    '+91 161 500 2200',
    'Focal Point Phase V',
    'Ludhiana',
    'Punjab',
    '03',
    '141010',
    14,
    'Net 30'
  ),
  (
    'v1000000-0000-0000-0000-000000000002',
    'SUP-KURO-02',
    'Kuroki Denim Mills Co.',
    '27AAAAA5678A1Z9',
    'Kenji Kuroki',
    'kenji@kurokidenim.jp',
    '+81 866 62 0111',
    'Ibara City Selvedge Mill',
    'Okayama',
    'Japan',
    '99',
    '7150014',
    28,
    'LC at Sight'
  )
ON CONFLICT (vendor_code) DO NOTHING;

-- 18.5 BACKFILL: Backfill order_items.variant_id by matching product_id and size
UPDATE public.order_items oi
SET variant_id = pv.id
FROM public.product_variants pv
WHERE oi.variant_id IS NULL
  AND oi.product_id = pv.product_id
  AND oi.size = pv.size;

-- Fallback for items without size: match first variant of product
UPDATE public.order_items oi
SET variant_id = pv.id
FROM (
  SELECT DISTINCT ON (product_id) id, product_id
  FROM public.product_variants
  ORDER BY product_id, created_at ASC
) pv
WHERE oi.variant_id IS NULL
  AND oi.product_id = pv.product_id;

-- 18.6 ZERO-DOWNTIME DATA MIGRATION:
-- Copy all existing product_variants with stock > 0 into Central Warehouse BLR-WH01
INSERT INTO public.shelf_inventory (shelf_id, variant_id, quantity, updated_at)
SELECT
  's1000000-0000-0000-0000-000000000001'::UUID,
  pv.id,
  pv.stock,
  now()
FROM public.product_variants pv
WHERE pv.stock > 0
ON CONFLICT (shelf_id, variant_id) DO UPDATE
SET quantity = EXCLUDED.quantity;

-- Populate Location Inventory Levels for BLR-WH01
INSERT INTO public.inventory_levels (location_id, variant_id, on_hand, reserved, reorder_point, reorder_quantity, updated_at)
SELECT
  'l1000000-0000-0000-0000-000000000001'::UUID,
  pv.id,
  pv.stock,
  0,
  5,
  20,
  now()
FROM public.product_variants pv
WHERE pv.stock > 0
ON CONFLICT (location_id, variant_id) DO UPDATE
SET on_hand = EXCLUDED.on_hand;

-- Write Initial Opening Balance Entries into the Double-Entry Ledger
INSERT INTO public.inventory_ledger (
  variant_id, location_id, to_shelf_id, movement_type,
  quantity, balance_after, reference_doc_type, reference_doc_id, notes
)
SELECT
  pv.id,
  'l1000000-0000-0000-0000-000000000001'::UUID,
  's1000000-0000-0000-0000-000000000001'::UUID,
  'inbound_grn'::public.inventory_movement_type,
  pv.stock,
  pv.stock,
  'MIGRATION_SEED',
  'INIT-STOCK-2026',
  'Automated zero-downtime inventory migration from legacy stock'
FROM public.product_variants pv
WHERE pv.stock > 0
ON CONFLICT DO NOTHING;

