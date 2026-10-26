-- ==============================================================================
-- ATELIER MONOREPO MIGRATION: DUAL DELIVERY MODES & TRY-ON RECONCILIATION ENGINE
-- Migration: 20261024_dual_delivery_try_on.sql
-- ==============================================================================

-- 1. Create Enums for Delivery Mode & Try-On Lifecycle State Machine
DO $$ BEGIN
  CREATE TYPE public.delivery_mode AS ENUM ('direct', 'try_on');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.try_on_status AS ENUM ('pending', 'active_timer', 'reconciling', 'completed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Update public.orders Table
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_mode public.delivery_mode NOT NULL DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS try_on_status public.try_on_status DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS try_on_window_start TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS try_on_window_end TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fitting_started_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fitting_duration_minutes INTEGER DEFAULT 45,
  ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS original_total NUMERIC(10, 2) DEFAULT NULL;

-- 3. Update public.order_items Table
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS is_kept BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT NULL;

-- 4. Add Address Fields to public.users (Convenience & Fast Profile Lookup)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS street_address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'US';

-- 5. Create Dedicated Addresses Schema for Patron Multi-Address Management
CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_name TEXT NOT NULL,
  street_address TEXT NOT NULL,
  unit_or_suite TEXT,
  city TEXT NOT NULL,
  state_or_province TEXT,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'US',
  phone TEXT,
  instructions TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Trigger for addresses updated_at
CREATE OR REPLACE TRIGGER set_addresses_timestamp
  BEFORE UPDATE ON public.addresses
  FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

-- 6. Enable RLS and Configure Policies for Addresses
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own addresses"
  ON public.addresses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own addresses"
  ON public.addresses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own addresses"
  ON public.addresses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own addresses"
  ON public.addresses FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins have full access to addresses"
  ON public.addresses FOR ALL
  USING (public.get_user_role(auth.uid()) = 'admin')
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

-- 7. Add Indexing for Performance
CREATE INDEX IF NOT EXISTS idx_orders_delivery_mode ON public.orders(delivery_mode);
CREATE INDEX IF NOT EXISTS idx_orders_try_on_status ON public.orders(try_on_status);
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON public.addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_is_kept ON public.order_items(is_kept);
