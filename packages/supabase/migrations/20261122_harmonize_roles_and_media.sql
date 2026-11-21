-- Migration: 20261122_harmonize_roles_and_media.sql
-- Harmonize user_role enum to safely support both 'delivery_partner' and 'delivery'
-- Ensure RLS policies on orders and users accept both aliases.

DO $$ BEGIN
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'delivery_partner';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'delivery';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Update RLS policies to check for both delivery aliases
DROP POLICY IF EXISTS "Allow courier updating orders" ON public.orders;
CREATE POLICY "Allow courier updating orders" ON public.orders 
FOR UPDATE USING (
  auth.uid() = delivery_partner_id 
  OR public.get_user_role(auth.uid()) IN ('admin', 'delivery_partner', 'delivery')
);

DROP POLICY IF EXISTS "Allow patron reading placed orders" ON public.orders;
CREATE POLICY "Allow patron reading placed orders" ON public.orders 
FOR SELECT USING (
  auth.uid() = user_id 
  OR public.get_user_role(auth.uid()) IN ('admin', 'delivery_partner', 'delivery')
);
