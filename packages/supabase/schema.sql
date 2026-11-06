-- ==============================================================================
-- ATELIER MONOREPO: MASTER DATABASE PROVISIONING SCHEMA
-- Covers: Enums, Users, Categories, Products, Addresses, Orders, Order Items,
-- RLS Security Policies, Admin Role Assignment, Triggers, and Seed Data.
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Custom Enums
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('admin', 'customer', 'delivery');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM ('pending', 'processing', 'out_for_delivery', 'delivered', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.delivery_mode AS ENUM ('direct', 'try_on');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.try_on_status AS ENUM ('pending', 'active_timer', 'reconciling', 'completed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

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

-- 3. Users Table (Synced with auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'customer',
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  street_address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'US',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Categories Table (Dynamic Parent Categories for Storefront)
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Products Table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  category TEXT,
  material TEXT,
  edition TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5b. Product Variants Table
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku TEXT UNIQUE NOT NULL,
  size TEXT NOT NULL,
  color TEXT,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  price_override NUMERIC(10, 2) CHECK (price_override IS NULL OR price_override >= 0),
  barcode TEXT,
  barcode_data TEXT,
  barcode_url TEXT,
  weight_grams INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON public.product_variants(sku);

-- 5c. Product Media Table
CREATE TABLE IF NOT EXISTS public.product_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt_text TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_product_media_product_id ON public.product_media(product_id);

-- 6. Patron Addresses Table
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

-- 6b. Bolt PIN Codes Table (Serviceability Engine)
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

-- 6c. Bolt Delivery Time Slots Table
CREATE TABLE IF NOT EXISTS public.bolt_timeslots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  slot_start TIME,
  slot_end TIME,
  cutoff_time TIME NOT NULL DEFAULT '09:00:00',
  max_daily_capacity INTEGER NOT NULL DEFAULT 15,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_bolt_timeslots_is_active ON public.bolt_timeslots(is_active);

-- 7. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  order_type public.order_type NOT NULL DEFAULT 'standard',
  bolt_pincode VARCHAR(10) DEFAULT NULL,
  bolt_timeslot_id UUID REFERENCES public.bolt_timeslots(id) ON DELETE SET NULL DEFAULT NULL,
  bolt_session_status public.bolt_session_status DEFAULT NULL,
  status public.order_status NOT NULL DEFAULT 'pending',
  delivery_mode public.delivery_mode NOT NULL DEFAULT 'direct',
  try_on_status public.try_on_status DEFAULT NULL,
  try_on_window_start TIMESTAMPTZ DEFAULT NULL,
  try_on_window_end TIMESTAMPTZ DEFAULT NULL,
  fitting_started_at TIMESTAMPTZ DEFAULT NULL,
  fitting_duration_minutes INTEGER DEFAULT 45,
  reconciled_at TIMESTAMPTZ DEFAULT NULL,
  original_total NUMERIC(10, 2) DEFAULT NULL,
  total NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (total >= 0),
  invoice_number TEXT UNIQUE,
  tracking_barcode TEXT UNIQUE,
  tax_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  shipping_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  invoice_url TEXT,
  delivery_partner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  shipping_address TEXT,
  delivery_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
  size TEXT DEFAULT NULL,
  is_kept BOOLEAN DEFAULT NULL,
  try_on_decision public.try_on_decision NOT NULL DEFAULT 'pending',
  rejection_reason TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8b. Storefront Configuration Table (CMS)
CREATE TABLE IF NOT EXISTS public.storefront_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8c. Promotional Banners Table (CMS)
CREATE TABLE IF NOT EXISTS public.promotional_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  badge_text TEXT,
  image_url TEXT,
  cta_label TEXT NOT NULL DEFAULT 'Shop Now',
  cta_link TEXT NOT NULL DEFAULT '/shop',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. Helper Security Definer Functions
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.users WHERE id = user_id;
$$;

-- Security Definer to allow Studio Admins to assign roles (couriers, admins, customers)
CREATE OR REPLACE FUNCTION public.set_user_role(target_user_id UUID, new_role public.user_role)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF public.get_user_role(auth.uid()) <> 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only Studio Admins can reassign user roles.';
  END IF;

  UPDATE public.users 
  SET role = new_role, updated_at = timezone('utc'::text, now()) 
  WHERE id = target_user_id;

  UPDATE auth.users 
  SET raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', new_role)
  WHERE id = target_user_id;
END;
$$;

-- 10. Triggers for Automatic Profile Creation & Timestamps
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.users (id, role, name, email, phone)
  VALUES (
    NEW.id,
    'customer'::public.user_role,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, 'Patron'),
    NEW.email,
    NEW.phone
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.users.name),
    updated_at = timezone('utc'::text, now());

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Auto-confirm trigger to prevent "Email not confirmed" in development / prototyping
CREATE OR REPLACE FUNCTION public.auto_confirm_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at := timezone('utc'::text, now());
    NEW.confirmed_at := timezone('utc'::text, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_auto_confirm ON auth.users;
CREATE TRIGGER on_auth_user_auto_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.auto_confirm_auth_user();

-- Ensure all existing users are confirmed
UPDATE auth.users 
SET email_confirmed_at = COALESCE(email_confirmed_at, timezone('utc'::text, now())),
    confirmed_at = COALESCE(confirmed_at, timezone('utc'::text, now()))
WHERE email_confirmed_at IS NULL;

-- RPC: Atomic Variant Stock Adjustment
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
  UPDATE public.product_variants
  SET stock = GREATEST(0, stock + p_delta), updated_at = now()
  WHERE id = p_variant_id
  RETURNING product_variants.stock, product_variants.product_id
  INTO v_new_stock, v_prod_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Variant with id % not found', p_variant_id;
  END IF;

  SELECT stock INTO v_prod_stock FROM public.products WHERE id = v_prod_id;
  RETURN QUERY SELECT p_variant_id, v_new_stock, v_prod_id, v_prod_stock;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_categories_timestamp ON public.categories;
CREATE TRIGGER set_categories_timestamp
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS set_products_timestamp ON public.products;
CREATE TRIGGER set_products_timestamp
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS set_orders_timestamp ON public.orders;
CREATE TRIGGER set_orders_timestamp
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS set_users_timestamp ON public.users;
CREATE TRIGGER set_users_timestamp
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS set_addresses_timestamp ON public.addresses;
CREATE TRIGGER set_addresses_timestamp
  BEFORE UPDATE ON public.addresses
  FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS set_bolt_pincodes_timestamp ON public.bolt_pincodes;
CREATE TRIGGER set_bolt_pincodes_timestamp
  BEFORE UPDATE ON public.bolt_pincodes
  FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS set_bolt_timeslots_timestamp ON public.bolt_timeslots;
CREATE TRIGGER set_bolt_timeslots_timestamp
  BEFORE UPDATE ON public.bolt_timeslots
  FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

-- ==============================================================================
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotional_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bolt_pincodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bolt_timeslots ENABLE ROW LEVEL SECURITY;

-- Bolt PIN Codes RLS:
DROP POLICY IF EXISTS "Public read bolt_pincodes" ON public.bolt_pincodes;
CREATE POLICY "Public read bolt_pincodes" ON public.bolt_pincodes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin write bolt_pincodes" ON public.bolt_pincodes;
CREATE POLICY "Admin write bolt_pincodes" ON public.bolt_pincodes FOR ALL USING (public.get_user_role(auth.uid()) = 'admin') WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

-- Bolt Time Slots RLS:
DROP POLICY IF EXISTS "Public read bolt_timeslots" ON public.bolt_timeslots;
CREATE POLICY "Public read bolt_timeslots" ON public.bolt_timeslots FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin write bolt_timeslots" ON public.bolt_timeslots;
CREATE POLICY "Admin write bolt_timeslots" ON public.bolt_timeslots FOR ALL USING (public.get_user_role(auth.uid()) = 'admin') WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

-- Product Variants RLS:
DROP POLICY IF EXISTS "Public read product_variants" ON public.product_variants;
CREATE POLICY "Public read product_variants" ON public.product_variants FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin write product_variants" ON public.product_variants;
CREATE POLICY "Admin write product_variants" ON public.product_variants FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

-- Product Media RLS:
DROP POLICY IF EXISTS "Public read product_media" ON public.product_media;
CREATE POLICY "Public read product_media" ON public.product_media FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin write product_media" ON public.product_media;
CREATE POLICY "Admin write product_media" ON public.product_media FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

-- Storefront Config RLS:
DROP POLICY IF EXISTS "Public read storefront_config" ON public.storefront_config;
CREATE POLICY "Public read storefront_config" ON public.storefront_config FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin write storefront_config" ON public.storefront_config;
CREATE POLICY "Admin write storefront_config" ON public.storefront_config FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

-- Promotional Banners RLS:
DROP POLICY IF EXISTS "Public read promotional_banners" ON public.promotional_banners;
CREATE POLICY "Public read promotional_banners" ON public.promotional_banners FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin write promotional_banners" ON public.promotional_banners;
CREATE POLICY "Admin write promotional_banners" ON public.promotional_banners FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

-- Categories RLS:
-- Everyone (visitors & patrons) can view categories
DROP POLICY IF EXISTS "Allow public read access to categories" ON public.categories;
CREATE POLICY "Allow public read access to categories"
  ON public.categories FOR SELECT
  USING (true);

-- Admins can create, update, delete categories
DROP POLICY IF EXISTS "Allow admins full access to categories" ON public.categories;
CREATE POLICY "Allow admins full access to categories"
  ON public.categories FOR ALL
  USING (public.get_user_role(auth.uid()) = 'admin')
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

-- Products RLS:
DROP POLICY IF EXISTS "Allow public read access to products" ON public.products;
CREATE POLICY "Allow public read access to products"
  ON public.products FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow admins full access to products" ON public.products;
CREATE POLICY "Allow admins full access to products"
  ON public.products FOR ALL
  USING (public.get_user_role(auth.uid()) = 'admin')
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

-- Users RLS:
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND 
    role = (SELECT role FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can view and update all profiles" ON public.users;
CREATE POLICY "Admins can view and update all profiles"
  ON public.users FOR ALL
  USING (public.get_user_role(auth.uid()) = 'admin')
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

-- Addresses RLS:
DROP POLICY IF EXISTS "Users can view their own addresses" ON public.addresses;
CREATE POLICY "Users can view their own addresses"
  ON public.addresses FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own addresses" ON public.addresses;
CREATE POLICY "Users can create their own addresses"
  ON public.addresses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own addresses" ON public.addresses;
CREATE POLICY "Users can update their own addresses"
  ON public.addresses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own addresses" ON public.addresses;
CREATE POLICY "Users can delete their own addresses"
  ON public.addresses FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins have full access to addresses" ON public.addresses;
CREATE POLICY "Admins have full access to addresses"
  ON public.addresses FOR ALL
  USING (public.get_user_role(auth.uid()) = 'admin')
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

-- Orders RLS:
DROP POLICY IF EXISTS "Customers can view their own orders" ON public.orders;
CREATE POLICY "Customers can view their own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Customers can place orders" ON public.orders;
CREATE POLICY "Customers can place orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Delivery partners can view assigned orders" ON public.orders;
CREATE POLICY "Delivery partners can view assigned orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = delivery_partner_id);

DROP POLICY IF EXISTS "Delivery partners can update assigned orders" ON public.orders;
CREATE POLICY "Delivery partners can update assigned orders"
  ON public.orders FOR UPDATE
  USING (auth.uid() = delivery_partner_id)
  WITH CHECK (auth.uid() = delivery_partner_id);

DROP POLICY IF EXISTS "Admins have full access to orders" ON public.orders;
CREATE POLICY "Admins have full access to orders"
  ON public.orders FOR ALL
  USING (public.get_user_role(auth.uid()) = 'admin')
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

-- Order Items RLS:
DROP POLICY IF EXISTS "Users can read order items" ON public.order_items;
CREATE POLICY "Users can read order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND (orders.user_id = auth.uid() OR orders.delivery_partner_id = auth.uid())
    )
    OR public.get_user_role(auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Customers can insert order items" ON public.order_items;
CREATE POLICY "Customers can insert order items"
  ON public.order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND orders.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Delivery partners can update order items in try on" ON public.order_items;
CREATE POLICY "Delivery partners can update order items in try on"
  ON public.order_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND orders.delivery_partner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND orders.delivery_partner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins have full access to order items" ON public.order_items;
CREATE POLICY "Admins have full access to order items"
  ON public.order_items FOR ALL
  USING (public.get_user_role(auth.uid()) = 'admin')
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

-- Indexes for maximum query performance:
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_partner_id ON public.orders(delivery_partner_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_type ON public.orders(order_type);
CREATE INDEX IF NOT EXISTS idx_orders_bolt_pincode ON public.orders(bolt_pincode);
CREATE INDEX IF NOT EXISTS idx_orders_bolt_timeslot_id ON public.orders(bolt_timeslot_id);
CREATE INDEX IF NOT EXISTS idx_orders_bolt_session_status ON public.orders(bolt_session_status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_try_on_decision ON public.order_items(try_on_decision);
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON public.addresses(user_id);

-- ==============================================================================
-- 12. INITIAL SEED DATA (Starter Categories & Products)
-- ==============================================================================

-- Insert Starter Creator Clothing Categories
INSERT INTO public.categories (id, name, slug, description, image_url, display_order)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Hoodies & Fleece', 'hoodies', 'Heavyweight 480 GSM French Terry and loopback brushed cotton fleece hoodies.', 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85', 1),
  ('c1000000-0000-0000-0000-000000000002', 'Tees & Tops', 'tees', 'Overdyed 280 GSM combed cotton vintage drop-shoulder tees and thermal waffle tops.', 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=85', 2),
  ('c1000000-0000-0000-0000-000000000003', 'Outerwear & Jackets', 'outerwear', 'Weatherproof cropped flight bombers, heavy canvas chore coats, and sculptural overcoats.', 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1200&q=85', 3),
  ('c1000000-0000-0000-0000-000000000004', 'Pants & Denim', 'pants', '14oz Japanese raw selvedge denim, pleated wide-leg trousers, and heavyweight sweatpants.', 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1200&q=85', 4)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  display_order = EXCLUDED.display_order;

-- Insert Premier Creator Apparel Catalog
INSERT INTO public.products (id, title, description, price, stock, image_url, category_id, category, material, edition)
VALUES
  (
    'b1000000-0000-0000-0000-000000000001',
    'Heavyweight Boxy Hoodie',
    'Custom-milled 480 GSM loopback organic French Terry. Engineered with an exaggerated dropped shoulder, double-layered architectural hood, and concealed side-seam pockets. Mineral washed for a vintage drape.',
    165.00,
    115,
    'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85',
    'c1000000-0000-0000-0000-000000000001',
    'Hoodies & Fleece',
    '480 GSM 100% Organic Cotton French Terry',
    'Drop 01 // Limited 150 Pieces'
  ),
  (
    'b1000000-0000-0000-0000-000000000002',
    'Vintage Washed Boxy Tee',
    '280 GSM heavyweight combed cotton jersey with distressed neck ribbing and raw edge blind hem. Sun-faded wash treatment creates individual character on every piece.',
    75.00,
    140,
    'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=85',
    'c1000000-0000-0000-0000-000000000002',
    'Tees & Tops',
    '280 GSM Combed Cotton with Vintage Enzymatic Wash',
    'Drop 01 // Core Essential'
  ),
  (
    'b1000000-0000-0000-0000-000000000003',
    'Cropped Weatherproof Flight Bomber',
    'High-density technical nylon shell with quilted synthetic insulation. Cropped torso silhouette with elongated sleeves and custom matte nickel two-way zipper hardware.',
    285.00,
    55,
    'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1200&q=85',
    'c1000000-0000-0000-0000-000000000003',
    'Outerwear & Jackets',
    'Matte Technical Nylon Shell & Primaloft Insulation',
    'Drop 01 // Archive Edition of 60'
  ),
  (
    'b1000000-0000-0000-0000-000000000004',
    'Pleated Selvedge Carpenter Pant',
    'Cut from 14oz shuttle-loomed Japanese raw black selvedge denim. Double front pleats create an elegant wide drape falling straight over chunky footwear.',
    210.00,
    75,
    'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1200&q=85',
    'c1000000-0000-0000-0000-000000000004',
    'Pants & Denim',
    '14oz Japanese Selvedge Cotton Denim',
    'Drop 01 // Strict Edition of 80'
  ),
  (
    'b1000000-0000-0000-0000-000000000005',
    'Architectural Raw Linen Smock',
    'Hand-loomed 380 GSM Belgian flax linen with flat-felled French seams, wide kimono-cut sleeves, and natural horn button closures.',
    240.00,
    45,
    '/images/prod3-front.jpg',
    'c1000000-0000-0000-0000-000000000002',
    'Tees & Tops',
    '380 GSM Organic Belgian Flax Linen',
    'Creator Atelier Spec 05'
  ),
  (
    'b1000000-0000-0000-0000-000000000006',
    'Relaxed Flared Minimalist Track Pant',
    'Custom 400 GSM double-knit jersey with center front pinch pleat and hidden zip ankle vents. Elasticized drawcord waist with custom metal aglets.',
    145.00,
    80,
    'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=1200&q=85',
    'c1000000-0000-0000-0000-000000000004',
    'Pants & Denim',
    '400 GSM Heavyweight Double-Knit Cotton',
    'Drop 01 // Daily Uniform'
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  image_url = EXCLUDED.image_url,
  category_id = EXCLUDED.category_id,
  category = EXCLUDED.category,
  material = EXCLUDED.material,
  edition = EXCLUDED.edition;

-- ==============================================================================
-- 13. BOLT ⚡ SEED DATA (Indian Metro PIN Codes & IST Timeslots)
-- ==============================================================================

-- Seed Indian Metro Serviceability
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

-- Seed Indian Time Slots (IST Windows)
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


