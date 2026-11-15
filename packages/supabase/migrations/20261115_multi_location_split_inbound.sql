-- ==============================================================================
-- 20261115_multi_location_split_inbound.sql
-- ENTERPRISE OMNICHANNEL INBOUND SPLIT ALLOCATION & SHELF PUTAWAY ENGINE
--
-- Enables Admin to split incoming supplier batches arbitrarily between:
-- 1. Storefront E-Commerce Central Hub (BLR-WH01)
-- 2. Offline Flagship Boutiques (BLR-ST01, BOM-ST01, etc.)
--
-- Single Source of Truth in Supabase with Double-Entry Ledger Tracking
-- ==============================================================================

-- 1. Extend purchase_order_items to optionally allow line-level destination overrides
ALTER TABLE public.purchase_order_items 
ADD COLUMN IF NOT EXISTS destination_location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL;

-- Index for query optimization
CREATE INDEX IF NOT EXISTS idx_po_items_dest_loc ON public.purchase_order_items(destination_location_id);

-- 2. Create the Atomic Multi-Location Split GRN Putaway RPC
CREATE OR REPLACE FUNCTION public.receive_split_grn_and_putaway(
  p_po_id UUID,
  p_challan_number VARCHAR(50),
  p_operator_id UUID DEFAULT NULL,
  p_splits JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_po RECORD;
  v_po_status public.po_status;
  v_grn_number VARCHAR(50);
  v_seq INT;
  v_item RECORD;
  v_split RECORD;
  v_shelf_barcode VARCHAR(50);
  v_current_shelf_qty INT;
  v_current_loc_on_hand INT;
  v_total_accepted INT := 0;
  v_total_rejected INT := 0;
  v_grn_id UUID;
  v_all_received BOOLEAN := TRUE;
  v_item_ordered INT;
  v_item_received INT;
BEGIN
  -- 1. Lock and Verify Purchase Order
  SELECT * INTO v_po
  FROM public.purchase_orders
  WHERE id = p_po_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase Order % does not exist.', p_po_id;
  END IF;

  IF v_po.status NOT IN ('issued', 'partially_received') THEN
    RAISE EXCEPTION 'PO % is not open for receipt (Current Status: %)', p_po_id, v_po.status;
  END IF;

  -- 2. Generate Master GRN Sequence & Code
  v_seq := nextval('public.seq_grn_number');
  v_grn_number := 'GRN-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(v_seq::TEXT, 5, '0');

  -- 3. Create Master Goods Receipt Record (defaults to PO default destination)
  INSERT INTO public.goods_receipts (
    grn_number,
    po_id,
    location_id,
    received_by,
    invoice_reference,
    received_at
  ) VALUES (
    v_grn_number,
    p_po_id,
    v_po.destination_location_id,
    p_operator_id,
    COALESCE(p_challan_number, 'DC-SUPPLIER'),
    timezone('utc'::text, now())
  )
  RETURNING id INTO v_grn_id;

  -- 4. Process Each Garment Item and Its Multi-Location Allocations
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_splits) AS x(
    order_item_id UUID,
    variant_id UUID,
    unit_cost NUMERIC,
    destinations JSONB
  )
  LOOP
    FOR v_split IN SELECT * FROM jsonb_to_recordset(v_item.destinations) AS s(
      location_id UUID,
      shelf_id UUID,
      qty_accepted INT,
      qty_rejected INT,
      rejection_notes TEXT
    )
    LOOP
      -- Verify target shelf exists at destination location
      SELECT barcode INTO v_shelf_barcode
      FROM public.shelves
      WHERE id = v_split.shelf_id AND location_id = v_split.location_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Target shelf % does not exist at location %', v_split.shelf_id, v_split.location_id;
      END IF;

      -- A. Record GRN Line Item
      INSERT INTO public.goods_receipt_items (
        grn_id,
        variant_id,
        quantity_accepted,
        quantity_rejected,
        qc_status,
        rejection_notes
      ) VALUES (
        v_grn_id,
        v_item.variant_id,
        COALESCE(v_split.qty_accepted, 0),
        COALESCE(v_split.qty_rejected, 0),
        CASE 
          WHEN COALESCE(v_split.qty_rejected, 0) > 0 AND COALESCE(v_split.qty_accepted, 0) = 0 THEN 'rejected_damaged'::public.qc_status
          ELSE 'accepted'::public.qc_status
        END,
        v_split.rejection_notes
      );

      -- B. Putaway Accepted Stock into Shelf & Location
      IF COALESCE(v_split.qty_accepted, 0) > 0 THEN
        v_total_accepted := v_total_accepted + v_split.qty_accepted;

        -- 1. Upsert Shelf-Level Stock
        INSERT INTO public.shelf_inventory (shelf_id, variant_id, quantity, updated_at)
        VALUES (v_split.shelf_id, v_item.variant_id, v_split.qty_accepted, timezone('utc'::text, now()))
        ON CONFLICT (shelf_id, variant_id) DO UPDATE
        SET quantity = public.shelf_inventory.quantity + v_split.qty_accepted,
            updated_at = timezone('utc'::text, now())
        RETURNING quantity INTO v_current_shelf_qty;

        -- 2. Upsert Location-Level Aggregate Stock
        INSERT INTO public.inventory_levels (location_id, variant_id, on_hand, reserved, updated_at)
        VALUES (v_split.location_id, v_item.variant_id, v_split.qty_accepted, 0, timezone('utc'::text, now()))
        ON CONFLICT (location_id, variant_id) DO UPDATE
        SET on_hand = public.inventory_levels.on_hand + v_split.qty_accepted,
            updated_at = timezone('utc'::text, now())
        RETURNING on_hand INTO v_current_loc_on_hand;

        -- 3. Update Master Product Variant Stock and Cost Price
        UPDATE public.product_variants
        SET stock = stock + v_split.qty_accepted,
            cost_price = COALESCE(v_item.unit_cost, cost_price),
            updated_at = timezone('utc'::text, now())
        WHERE id = v_item.variant_id;

        -- 4. Record Double-Entry Immutable Ledger Audit
        INSERT INTO public.inventory_ledger (
          variant_id,
          location_id,
          to_shelf_id,
          movement_type,
          quantity,
          balance_after,
          reference_doc_type,
          reference_doc_id,
          operator_id
        ) VALUES (
          v_item.variant_id,
          v_split.location_id,
          v_split.shelf_id,
          'inbound_grn'::public.inventory_movement_type,
          v_split.qty_accepted,
          v_current_loc_on_hand,
          'INBOUND_SPLIT_GRN',
          v_grn_number,
          p_operator_id
        );
      END IF;

      IF COALESCE(v_split.qty_rejected, 0) > 0 THEN
        v_total_rejected := v_total_rejected + v_split.qty_rejected;
      END IF;
    END LOOP;

    -- Update PO Item Received Qty
    IF v_item.order_item_id IS NOT NULL THEN
      UPDATE public.purchase_order_items
      SET quantity_received = quantity_received + (
        SELECT COALESCE(SUM((d->>'qty_accepted')::INT), 0)
        FROM jsonb_array_elements(v_item.destinations) AS d
      )
      WHERE id = v_item.order_item_id;
    ELSIF v_item.variant_id IS NOT NULL THEN
      UPDATE public.purchase_order_items
      SET quantity_received = quantity_received + (
        SELECT COALESCE(SUM((d->>'qty_accepted')::INT), 0)
        FROM jsonb_array_elements(v_item.destinations) AS d
      )
      WHERE po_id = p_po_id AND variant_id = v_item.variant_id;
    END IF;
  END LOOP;

  -- 5. Check if PO is Fully Received
  FOR v_item IN
    SELECT quantity_ordered, quantity_received
    FROM public.purchase_order_items
    WHERE po_id = p_po_id
  LOOP
    IF v_item.quantity_received < v_item.quantity_ordered THEN
      v_all_received := FALSE;
    END IF;
  END LOOP;

  UPDATE public.purchase_orders
  SET status = CASE WHEN v_all_received THEN 'received'::public.po_status ELSE 'partially_received'::public.po_status END,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_po_id;

  RETURN jsonb_build_object(
    'success', true,
    'grn_id', v_grn_id,
    'grn_number', v_grn_number,
    'total_accepted', v_total_accepted,
    'total_rejected', v_total_rejected,
    'po_status', CASE WHEN v_all_received THEN 'received' ELSE 'partially_received' END
  );
END;
$$;
