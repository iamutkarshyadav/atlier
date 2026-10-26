-- ==============================================================================
-- ATELIER MONOREPO MIGRATION: ATOMIC VARIANT STOCK ADJUSTMENT RPC
-- Migration: 20261025_inventory_rpc_adjust_variant_stock.sql
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.adjust_variant_stock(
  p_variant_id UUID,
  p_delta INTEGER
)
RETURNS TABLE (
  variant_id UUID,
  new_stock INTEGER,
  product_id UUID,
  new_product_stock INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prod_id UUID;
  v_new_stock INTEGER;
  v_prod_stock INTEGER;
BEGIN
  -- Atomically adjust variant stock and floor at 0
  UPDATE public.product_variants
  SET 
    stock = GREATEST(0, stock + p_delta),
    updated_at = timezone('utc'::text, now())
  WHERE id = p_variant_id
  RETURNING product_variants.stock, product_variants.product_id
  INTO v_new_stock, v_prod_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Variant with id % not found', p_variant_id;
  END IF;

  -- Retrieve updated aggregate product stock from products table
  SELECT stock INTO v_prod_stock FROM public.products WHERE id = v_prod_id;

  RETURN QUERY SELECT p_variant_id, v_new_stock, v_prod_id, v_prod_stock;
END;
$$;
