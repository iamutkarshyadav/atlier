-- ==============================================================================
-- ATELIER MONOREPO MIGRATION: INVENTORY STOCK LEDGER & CANCELLATION TRIGGERS
-- Migration: 20261025_inventory_reconciliation_triggers.sql
-- ==============================================================================

-- 1. Trigger Function to replenish inventory when an order is cancelled
CREATE OR REPLACE FUNCTION public.handle_order_cancellation_inventory()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item_rec RECORD;
BEGIN
  -- Only execute if transitioning from a non-cancelled status to 'cancelled'
  IF NEW.status = 'cancelled' AND (OLD.status IS DISTINCT FROM 'cancelled') THEN
    FOR item_rec IN
      SELECT product_id, size, quantity, is_kept
      FROM public.order_items
      WHERE order_id = NEW.id
    LOOP
      -- Only restore stock for items that were not already marked as rejected (is_kept = false)
      IF item_rec.is_kept IS DISTINCT FROM false THEN
        IF item_rec.size IS NOT NULL THEN
          UPDATE public.product_variants
          SET 
            stock = stock + COALESCE(item_rec.quantity, 1),
            updated_at = timezone('utc'::text, now())
          WHERE product_id = item_rec.product_id AND size = item_rec.size;
        ELSE
          UPDATE public.products
          SET 
            stock = stock + COALESCE(item_rec.quantity, 1),
            updated_at = timezone('utc'::text, now())
          WHERE id = item_rec.product_id;
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_order_cancellation_inventory ON public.orders;
CREATE TRIGGER trigger_order_cancellation_inventory
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_order_cancellation_inventory();

-- 2. Dedicated indices for real-time Try-On line-item resolution
CREATE INDEX IF NOT EXISTS idx_order_items_order_id_is_kept ON public.order_items(order_id, is_kept);
CREATE INDEX IF NOT EXISTS idx_orders_reconciled_at ON public.orders(reconciled_at);
