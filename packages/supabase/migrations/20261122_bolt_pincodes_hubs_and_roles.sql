-- Migration: 20261122_bolt_pincodes_hubs_and_roles.sql
-- Extend bolt_pincodes with hub assignment and daily order limits
-- Extend bolt_timeslots with optional pincode association

-- 1. Extend bolt_pincodes
ALTER TABLE public.bolt_pincodes
ADD COLUMN IF NOT EXISTS hub_location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS max_daily_orders INTEGER NOT NULL DEFAULT 50;

CREATE INDEX IF NOT EXISTS idx_bolt_pincodes_hub ON public.bolt_pincodes(hub_location_id);

-- 2. Extend bolt_timeslots
ALTER TABLE public.bolt_timeslots
ADD COLUMN IF NOT EXISTS pincode VARCHAR(10) REFERENCES public.bolt_pincodes(pincode) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_bolt_timeslots_pincode ON public.bolt_timeslots(pincode);

-- 3. Ensure RLS policies are up-to-date
DROP POLICY IF EXISTS "Public read bolt_pincodes" ON public.bolt_pincodes;
CREATE POLICY "Public read bolt_pincodes" ON public.bolt_pincodes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin write bolt_pincodes" ON public.bolt_pincodes;
CREATE POLICY "Admin write bolt_pincodes" ON public.bolt_pincodes FOR ALL 
USING (public.get_user_role(auth.uid()) = 'admin') 
WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Public read bolt_timeslots" ON public.bolt_timeslots;
CREATE POLICY "Public read bolt_timeslots" ON public.bolt_timeslots FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin write bolt_timeslots" ON public.bolt_timeslots;
CREATE POLICY "Admin write bolt_timeslots" ON public.bolt_timeslots FOR ALL 
USING (public.get_user_role(auth.uid()) = 'admin') 
WITH CHECK (public.get_user_role(auth.uid()) = 'admin');
