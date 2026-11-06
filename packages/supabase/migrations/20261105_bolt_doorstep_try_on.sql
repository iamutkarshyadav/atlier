-- ==============================================================================
-- MIGRATION: BOLT ⚡ WHITE-GLOVE DOORSTEP TRY-ON ENGINE
-- Description: Adds Bolt serviceability (PIN codes), delivery time slots,
--              order classification, item-level try-on decisions, RLS policies,
--              and seed data for Indian metropolitan clusters.
-- ==============================================================================

-- 1. Create Enums
DO $$ BEGIN
  CREATE TYPE public.order_type AS ENUM ('standard', 'bolt_try_on');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.bolt_session_status AS ENUM ('scheduled', 'en_route', 'at_doorstep', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.try_on_decision AS ENUM ('pending', 'kept', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create Bolt PIN Codes Table
CREATE TABLE IF NOT EXISTS public.bolt_pincodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pincode VARCHAR(10) NOT NULL UNIQUE,
  city TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'India',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_bolt_pincodes_pincode ON public.bolt_pincodes(pincode);
CREATE INDEX IF NOT EXISTS idx_bolt_pincodes_is_active ON public.bolt_pincodes(is_active);

-- 3. Create Bolt Delivery Time Slots Table
CREATE TABLE IF NOT EXISTS public.bolt_timeslots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL, -- e.g., "10:00 AM - 12:00 PM (Morning Salon)"
  slot_start TIME,
  slot_end TIME,
  cutoff_time TIME NOT NULL DEFAULT '09:00:00',
  max_daily_capacity INTEGER NOT NULL DEFAULT 15,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_bolt_timeslots_is_active ON public.bolt_timeslots(is_active);

-- 4. Upgrade Orders Table with Bolt Columns
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS order_type public.order_type NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS bolt_pincode VARCHAR(10) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bolt_timeslot_id UUID REFERENCES public.bolt_timeslots(id) ON DELETE SET NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bolt_session_status public.bolt_session_status DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_order_type ON public.orders(order_type);
CREATE INDEX IF NOT EXISTS idx_orders_bolt_pincode ON public.orders(bolt_pincode);
CREATE INDEX IF NOT EXISTS idx_orders_bolt_timeslot_id ON public.orders(bolt_timeslot_id);
CREATE INDEX IF NOT EXISTS idx_orders_bolt_session_status ON public.orders(bolt_session_status);

-- 5. Upgrade Order Items Table with Item-Level Try-On Decision
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS try_on_decision public.try_on_decision NOT NULL DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_order_items_try_on_decision ON public.order_items(try_on_decision);

-- 6. Updated Timestamp Triggers
DROP TRIGGER IF EXISTS set_bolt_pincodes_timestamp ON public.bolt_pincodes;
CREATE TRIGGER set_bolt_pincodes_timestamp
  BEFORE UPDATE ON public.bolt_pincodes
  FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS set_bolt_timeslots_timestamp ON public.bolt_timeslots;
CREATE TRIGGER set_bolt_timeslots_timestamp
  BEFORE UPDATE ON public.bolt_timeslots
  FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

-- 7. Row Level Security (RLS) Policies
ALTER TABLE public.bolt_pincodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bolt_timeslots ENABLE ROW LEVEL SECURITY;

-- Bolt PIN Codes RLS: Public can view active PIN codes to check serviceability; Admins can manage all.
DROP POLICY IF EXISTS "Public read bolt_pincodes" ON public.bolt_pincodes;
CREATE POLICY "Public read bolt_pincodes"
  ON public.bolt_pincodes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins manage bolt_pincodes" ON public.bolt_pincodes;
CREATE POLICY "Admins manage bolt_pincodes"
  ON public.bolt_pincodes FOR ALL
  USING (public.get_user_role(auth.uid()) = 'admin')
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

-- Bolt Time Slots RLS: Public can view active timeslots during checkout; Admins can manage all.
DROP POLICY IF EXISTS "Public read bolt_timeslots" ON public.bolt_timeslots;
CREATE POLICY "Public read bolt_timeslots"
  ON public.bolt_timeslots FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins manage bolt_timeslots" ON public.bolt_timeslots;
CREATE POLICY "Admins manage bolt_timeslots"
  ON public.bolt_timeslots FOR ALL
  USING (public.get_user_role(auth.uid()) = 'admin')
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

-- 8. Seed Indian Metro Serviceability (Bengaluru, Mumbai, Delhi NCR, Hyderabad)
INSERT INTO public.bolt_pincodes (pincode, city, state, is_active)
VALUES
  ('560001', 'Bengaluru', 'Karnataka', true),
  ('560034', 'Bengaluru', 'Karnataka', true),
  ('560038', 'Bengaluru', 'Karnataka', true),
  ('560102', 'Bengaluru', 'Karnataka', true),
  ('560103', 'Bengaluru', 'Karnataka', true),
  ('400001', 'Mumbai', 'Maharashtra', true),
  ('400050', 'Mumbai', 'Maharashtra', true),
  ('400051', 'Mumbai', 'Maharashtra', true),
  ('110001', 'New Delhi', 'Delhi', true),
  ('122002', 'Gurugram', 'Haryana', true),
  ('500081', 'Hyderabad', 'Telangana', true)
ON CONFLICT (pincode) DO UPDATE SET
  city = EXCLUDED.city,
  state = EXCLUDED.state,
  is_active = EXCLUDED.is_active;

-- 9. Seed Indian Time Slots (IST Windows)
INSERT INTO public.bolt_timeslots (id, label, slot_start, slot_end, cutoff_time, max_daily_capacity, is_active)
VALUES
  ('t1000000-0000-0000-0000-000000000001', '10:00 AM - 12:00 PM (Morning Priority)', '10:00:00', '12:00:00', '09:00:00', 12, true),
  ('t1000000-0000-0000-0000-000000000002', '12:00 PM - 02:00 PM (Midday Salon)', '12:00:00', '14:00:00', '11:00:00', 12, true),
  ('t1000000-0000-0000-0000-000000000003', '02:00 PM - 04:00 PM (Afternoon Fitting)', '14:00:00', '16:00:00', '13:00:00', 15, true),
  ('t1000000-0000-0000-0000-000000000004', '04:00 PM - 06:00 PM (Evening Express)', '16:00:00', '18:00:00', '15:00:00', 15, true),
  ('t1000000-0000-0000-0000-000000000005', '06:00 PM - 08:00 PM (Sunset White-Glove)', '18:00:00', '20:00:00', '17:00:00', 10, true)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  slot_start = EXCLUDED.slot_start,
  slot_end = EXCLUDED.slot_end,
  cutoff_time = EXCLUDED.cutoff_time,
  max_daily_capacity = EXCLUDED.max_daily_capacity,
  is_active = EXCLUDED.is_active;

