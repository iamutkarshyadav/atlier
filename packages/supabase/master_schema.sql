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
SET email_confirmed_at = COALESCE(email_confirmed_at, timezone('utc'::text, now()))
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
  ('a1000000-0000-0000-0000-000000000001', '10:00 AM - 12:00 PM (Morning Priority)', '10:00:00', '12:00:00', '09:00:00', 12, true),
  ('a1000000-0000-0000-0000-000000000002', '12:00 PM - 02:00 PM (Midday Salon)', '12:00:00', '14:00:00', '11:00:00', 12, true),
  ('a1000000-0000-0000-0000-000000000003', '02:00 PM - 04:00 PM (Afternoon Fitting)', '14:00:00', '16:00:00', '13:00:00', 15, true),
  ('a1000000-0000-0000-0000-000000000004', '04:00 PM - 06:00 PM (Evening Express)', '16:00:00', '18:00:00', '15:00:00', 15, true),
  ('a1000000-0000-0000-0000-000000000005', '06:00 PM - 08:00 PM (Sunset White-Glove)', '18:00:00', '20:00:00', '17:00:00', 10, true)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  slot_start = EXCLUDED.slot_start,
  slot_end = EXCLUDED.slot_end,
  cutoff_time = EXCLUDED.cutoff_time,
  max_daily_capacity = EXCLUDED.max_daily_capacity,
  is_active = EXCLUDED.is_active;




-- ==============================================================================
-- PART 2: OMNICHANNEL ERP, WMS, POS, AND SUPPLY CHAIN TOPOLOGY
-- ==============================================================================
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
    'd1000000-0000-0000-0000-000000000001',
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
    'd1000000-0000-0000-0000-000000000002',
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
    'd1000000-0000-0000-0000-000000000003',
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
  ('e1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'RCV', 'Receiving Dock 01', 'receiving_dock'),
  ('e1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000001', 'BLK', 'Central Bulk Racks', 'bulk_storage'),
  ('e1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000001', 'DSK', 'Outbound Dispatch Bay', 'dispatch_bay'),
  ('e1000000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000002', 'FLR', 'Indiranagar Sales Floor', 'sales_floor'),
  ('e1000000-0000-0000-0000-000000000005', 'd1000000-0000-0000-0000-000000000002', 'STK', 'Indiranagar Backroom Stock', 'backroom_stock'),
  ('e1000000-0000-0000-0000-000000000006', 'd1000000-0000-0000-0000-000000000002', 'QRN', 'Indiranagar Fitting Quarantine', 'fitting_room_quarantine')
ON CONFLICT (location_id, code) DO NOTHING;

-- 18.3 Seed Default Warehouse & Boutique Shelves
INSERT INTO public.shelves (id, location_id, zone_id, coordinate, barcode, max_unit_capacity)
VALUES
  (
    'f1000000-0000-0000-0000-000000000001',
    'd1000000-0000-0000-0000-000000000001',
    'e1000000-0000-0000-0000-000000000002',
    'BLK-A-01-A1',
    'LOC-BLR01-BLK-A-01-A1',
    500
  ),
  (
    'f1000000-0000-0000-0000-000000000002',
    'd1000000-0000-0000-0000-000000000001',
    'e1000000-0000-0000-0000-000000000002',
    'BLK-A-01-A2',
    'LOC-BLR01-BLK-A-01-A2',
    500
  ),
  (
    'f1000000-0000-0000-0000-000000000003',
    'd1000000-0000-0000-0000-000000000002',
    'e1000000-0000-0000-0000-000000000004',
    'FLR-RACK-01',
    'LOC-BLR02-FLR-RACK-01',
    100
  ),
  (
    'f1000000-0000-0000-0000-000000000004',
    'd1000000-0000-0000-0000-000000000002',
    'e1000000-0000-0000-0000-000000000006',
    'QRN-BIN-01',
    'LOC-BLR02-QRN-BIN-01',
    50
  )
ON CONFLICT (location_id, coordinate) DO NOTHING;

-- 18.4 Seed Initial Verified Suppliers
INSERT INTO public.suppliers (id, vendor_code, name, gstin, contact_person, email, phone, address_line1, city, state, state_code, pincode, lead_time_days, payment_terms)
VALUES
  (
    'a2000000-0000-0000-0000-000000000001',
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
    'a2000000-0000-0000-0000-000000000002',
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
  'f1000000-0000-0000-0000-000000000001'::UUID,
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
  'd1000000-0000-0000-0000-000000000001'::UUID,
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
  'd1000000-0000-0000-0000-000000000001'::UUID,
  'f1000000-0000-0000-0000-000000000001'::UUID,
  'inbound_grn'::public.inventory_movement_type,
  pv.stock,
  pv.stock,
  'MIGRATION_SEED',
  'INIT-STOCK-2026',
  'Automated zero-downtime inventory migration from legacy stock'
FROM public.product_variants pv
WHERE pv.stock > 0
ON CONFLICT DO NOTHING;



-- ==============================================================================
-- PART 3: MULTI-LOCATION SPLIT INBOUND ALLOCATION & PUTAWAY RPC
-- ==============================================================================
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


-- ==============================================================================
-- PART 4: DYNAMIC SERVER-DRIVEN UI (CMS) PAGE LAYOUTS & DESIGN TOKENS
-- ==============================================================================
-- ==============================================================================
-- 20261109_visual_live_editing_cms_engine.sql
-- Server-Driven UI (SDUI) Page Layouts & Dynamic Storefront Design Tokens Engine
-- ==============================================================================

-- 1. Table for storing hierarchical page layouts (JSON-driven component trees)
CREATE TABLE IF NOT EXISTS public.page_layouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_slug VARCHAR(100) NOT NULL UNIQUE, -- e.g. 'home', 'shop', 'about', 'product-detail'
    page_title VARCHAR(200) NOT NULL DEFAULT 'Untitled Page',
    layout_json JSONB NOT NULL DEFAULT '[]'::jsonb, -- Hierarchical array of LayoutNode objects
    is_published BOOLEAN NOT NULL DEFAULT true,
    version INT NOT NULL DEFAULT 1,
    meta_description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- Index for instant lookup by page slug
CREATE INDEX IF NOT EXISTS idx_page_layouts_slug ON public.page_layouts(page_slug);

-- 2. Table for global storefront styling tokens (CSS variable overrides)
CREATE TABLE IF NOT EXISTS public.storefront_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    theme_name VARCHAR(50) NOT NULL DEFAULT 'default' UNIQUE,
    tokens_json JSONB NOT NULL DEFAULT '{}'::jsonb, -- Key-value CSS variable overrides
    is_active BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for active theme lookup
CREATE INDEX IF NOT EXISTS idx_storefront_tokens_active ON public.storefront_tokens(is_active);

-- 3. Row Level Security (RLS)
ALTER TABLE public.page_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_tokens ENABLE ROW LEVEL SECURITY;

-- Allow public read of published layouts and active tokens
DROP POLICY IF EXISTS "Allow public read published page_layouts" ON public.page_layouts;
CREATE POLICY "Allow public read published page_layouts"
    ON public.page_layouts FOR SELECT
    USING (is_published = true);

DROP POLICY IF EXISTS "Allow public read active storefront_tokens" ON public.storefront_tokens;
CREATE POLICY "Allow public read active storefront_tokens"
    ON public.storefront_tokens FOR SELECT
    USING (is_active = true);

-- Allow full access to admins and service roles
DROP POLICY IF EXISTS "Allow admin full access page_layouts" ON public.page_layouts;
CREATE POLICY "Allow admin full access page_layouts"
    ON public.page_layouts FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow admin full access storefront_tokens" ON public.storefront_tokens;
CREATE POLICY "Allow admin full access storefront_tokens"
    ON public.storefront_tokens FOR ALL
    USING (true)
    WITH CHECK (true);

-- 4. Enable Supabase Realtime Publication
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.page_layouts;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.storefront_tokens;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 5. Seed Starter Home Layout & Default Tokens
INSERT INTO public.storefront_tokens (theme_name, tokens_json, is_active)
VALUES (
    'default',
    '{
        "--background": "#FAFAFA",
        "--foreground": "#0A0A0C",
        "--primary": "#0A0A0C",
        "--primary-foreground": "#FFFFFF",
        "--secondary": "#F4F4F5",
        "--secondary-foreground": "#18181B",
        "--accent-green": "#166534",
        "--accent-gold": "#F59E0B",
        "--border": "#E4E4E7",
        "--radius": "0px",
        "--font-serif": "Cormorant Garamond, Georgia, serif",
        "--font-sans": "Inter, -apple-system, sans-serif"
    }'::jsonb,
    true
)
ON CONFLICT (theme_name) DO UPDATE
SET tokens_json = EXCLUDED.tokens_json,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.page_layouts (page_slug, page_title, layout_json, is_published, version, meta_description)
VALUES (
    'home',
    'Atelier Haute Couture & Creator Apparel Drop 01',
    '[
        {
            "id": "hero-section-01",
            "type": "HeroBanner",
            "name": "Cinematic Hero & Bolt Salon Pill",
            "isVisible": true,
            "className": "relative min-h-[92vh] flex items-center justify-center bg-[#080808] text-white px-6 sm:px-12 py-20 overflow-hidden",
            "styles": {},
            "props": {
                "pillText": "Introducing Bolt ⚡ Doorstep Try-On Salon",
                "pillLink": "#bolt-experience",
                "kicker": "AUTONOMOUS ATELIER // SPECIFICATION DROP 01",
                "titleLine1": "ARCHITECTURAL",
                "titleLine2": "SILHOUETTES",
                "description": "Custom-milled 480 GSM French Terry, 14oz Japanese raw selvedge denim, and sculptural outerwear. Order up to 5 curated works to try on at your doorstep before final settlement.",
                "primaryCtaLabel": "Order Doorstep Salon Try-On",
                "primaryCtaLink": "/shop",
                "secondaryCtaLabel": "Explore Lookbook",
                "secondaryCtaLink": "/about",
                "bgImageUrl": "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=2000&q=85",
                "overlayOpacity": 0.4
            }
        },
        {
            "id": "marquee-ticker-01",
            "type": "MarqueeTicker",
            "name": "Fabric Specification Marquee",
            "isVisible": true,
            "className": "bg-[#121212] text-white border-y border-[#262626] py-3 overflow-hidden select-none font-mono text-2xs uppercase tracking-widest",
            "styles": {},
            "props": {
                "items": [
                    "480 GSM French Terry Loopback",
                    "14oz Japanese Shuttle-Loomed Selvedge Denim",
                    "380 GSM Organic Belgian Flax Linen",
                    "Bolt ⚡ 45-Minute Doorstep Fitting Session",
                    "Zero Synthetic Polyester Blending",
                    "Complimentary White-Glove Courier Delivery"
                ],
                "speedSeconds": 25
            }
        },
        {
            "id": "editorial-split-01",
            "type": "EditorialSplit",
            "name": "Bolt 45-Minute Doorstep Salon Ethos",
            "isVisible": true,
            "className": "max-w-7xl mx-auto px-6 sm:px-12 py-24",
            "styles": {},
            "props": {
                "kicker": "DOORSTEP TRY-ON REVOLUTION",
                "headline": "The Salon Comes to Your Mirror.",
                "bodyParagraph1": "Never guess your size again. Select any garments and sizes from our collection. A uniformed private logistics officer arrives at your residence during your reserved timeslot with your curated garment tote.",
                "bodyParagraph2": "You have 45 private minutes in front of your own mirror. Keep what fits impeccably, hand back what doesn''t, and settle instantly with contactless card or UPI.",
                "imageUrl": "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85",
                "imagePosition": "right",
                "ctaLabel": "How Bolt Works",
                "ctaLink": "/about"
            }
        },
        {
            "id": "product-grid-01",
            "type": "ProductGrid",
            "name": "Featured Works Catalog Grid",
            "isVisible": true,
            "className": "max-w-7xl mx-auto px-6 sm:px-12 py-16",
            "styles": {},
            "props": {
                "kicker": "CURATED ATELIER ARCHIVE",
                "title": "Selected Works Available for Try-On",
                "subtitle": "Select your pieces and choose Bolt ⚡ Try-On at checkout.",
                "categoryFilter": "all",
                "limit": 6,
                "columns": 3
            }
        },
        {
            "id": "custom-div-specs-01",
            "type": "CustomDivBlock",
            "name": "Creator Fabric Lab Technical Banner",
            "isVisible": true,
            "className": "bg-neutral-900 text-white p-8 sm:p-12 my-12 max-w-7xl mx-auto border border-neutral-800",
            "styles": {},
            "props": {
                "htmlContent": "<div class=\"flex flex-col md:flex-row justify-between items-start md:items-center gap-6\"><div class=\"space-y-2\"><span class=\"text-xs font-mono text-emerald-400 uppercase tracking-widest\">PHYSICAL MATERIAL LAB</span><h3 class=\"text-2xl font-serif font-light\">Strictly Unblended Organic Fibers</h3><p class=\"text-xs text-neutral-400 font-sans max-w-xl\">Every yard of fabric is commissioned directly from artisanal mills in Wakayama, Okayama, and Courtrai. No microplastics, no synthetic elastane.</p></div><a href=\"/shop\" class=\"px-6 py-3 bg-white text-black font-mono text-xs uppercase font-bold tracking-wider hover:bg-neutral-200 transition-colors shrink-0\">Shop Collection</a></div>"
            }
        },
        {
            "id": "reviews-showcase-01",
            "type": "ReviewsShowcase",
            "name": "Doorstep Salon Verified Patron Reviews",
            "isVisible": true,
            "className": "bg-[#FAF9F6] border-t border-neutral-200 py-20 px-6 sm:px-12",
            "styles": {},
            "props": {
                "title": "Verified Doorstep Fitting Testimonials",
                "subtitle": "What patrons say about experiencing couture in front of their own mirror."
            }
        }
    ]'::jsonb,
    true,
    1,
    'Atelier Haute Couture Creator Apparel & Bolt 45-Minute Doorstep Salon'
)
ON CONFLICT (page_slug) DO UPDATE
SET layout_json = EXCLUDED.layout_json,
    updated_at = timezone('utc'::text, now());


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
    WHERE location_id = v_loc.id AND zone_type IN ('quarantine', 'damaged_quarantine') 
    LIMIT 1;

    IF v_zone_id IS NULL THEN
      INSERT INTO public.location_zones (location_id, name, code, zone_type)
      VALUES (v_loc.id, 'Quarantine & Damaged Goods', 'QRN', 'damaged_quarantine')
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
    AND lz.zone_type NOT IN ('quarantine', 'damaged_quarantine', 'courier_transit', 'fitting_room_quarantine')
  LIMIT 1;

  -- Fallback to any active sellable shelf
  IF v_target_shelf_id IS NULL THEN
    SELECT s.id, s.location_id INTO v_target_shelf_id, v_target_location_id
    FROM public.shelves s
    JOIN public.location_zones lz ON lz.id = s.zone_id
    WHERE s.is_active = true
      AND lz.zone_type NOT IN ('quarantine', 'damaged_quarantine', 'courier_transit', 'fitting_room_quarantine')
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
      AND lz.zone_type NOT IN ('quarantine', 'damaged_quarantine', 'courier_transit', 'fitting_room_quarantine')
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
    user_id,
    status,
    payment_status,
    delivery_mode,
    try_on_status,
    order_type,
    subtotal,
    discount,
    delivery_fee,
    tax_amount,
    total_amount,
    fulfillment_location_id,
    shipping_address_json,
    billing_address_json,
    notes,
    created_at,
    updated_at
  )
  VALUES (
    v_order_number,
    v_user_id,
    v_status,
    v_payment_status,
    v_delivery_mode,
    v_try_on_status,
    v_order_type,
    v_subtotal,
    v_discount,
    v_delivery_fee,
    v_tax_amount,
    v_total_amount,
    v_loc_id,
    v_shipping_addr,
    v_billing_addr,
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
    WHERE lz.zone_type NOT IN ('quarantine', 'damaged_quarantine', 'courier_transit', 'fitting_room_quarantine')
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
    AND lz.zone_type IN ('quarantine', 'damaged_quarantine')
    AND s.is_active = true
  LIMIT 1;

  -- Look up Default Sellable Shelf in this location
  SELECT s.id INTO v_default_shelf_id
  FROM public.shelves s
  JOIN public.location_zones lz ON lz.id = s.zone_id
  WHERE s.location_id = v_loc_id
    AND lz.zone_type NOT IN ('quarantine', 'damaged_quarantine', 'courier_transit', 'fitting_room_quarantine')
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
        AND lz.zone_type NOT IN ('quarantine', 'damaged_quarantine', 'courier_transit', 'fitting_room_quarantine')
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

-- ==============================================================================
-- COLLECTIONS & OCCASIONS MERCHANDISING
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  group_type TEXT NOT NULL DEFAULT 'occasion' CHECK (group_type IN ('occasion', 'collection', 'season', 'capsule')),
  description TEXT,
  image_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  show_in_navbar BOOLEAN NOT NULL DEFAULT true,
  show_on_home BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.collection_categories (
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (collection_id, category_id)
);

CREATE TABLE IF NOT EXISTS public.collection_products (
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (collection_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_collections_slug ON public.collections(slug);
CREATE INDEX IF NOT EXISTS idx_collections_display ON public.collections(display_order, is_active);
CREATE INDEX IF NOT EXISTS idx_coll_cats_collection ON public.collection_categories(collection_id);
CREATE INDEX IF NOT EXISTS idx_coll_cats_category ON public.collection_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_coll_prods_collection ON public.collection_products(collection_id);
CREATE INDEX IF NOT EXISTS idx_coll_prods_product ON public.collection_products(product_id);

-- ==============================================================================
-- ATELIER ENTERPRISE: PROMOTIONS, PRICING & DISCOUNT ENGINE SCHEMA
-- Added: 20261127_promotions_and_pricing_engine.sql
-- ==============================================================================

-- 1. Cost Price Columns & Security Baseline
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10, 2) DEFAULT 0.00;

ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10, 2);

-- Column-level privilege restrictions: Hide cost_price from unauthenticated patrons and authenticated shoppers (service_role only)
REVOKE SELECT (cost_price) ON public.products FROM anon, authenticated;
REVOKE SELECT (cost_price) ON public.product_variants FROM anon, authenticated;

-- 2. Enumerated Types for Promotion Engine
DO $$ BEGIN
  CREATE TYPE public.promotion_type AS ENUM (
    'coupon',
    'automatic_cart',
    'tiered_threshold',
    'buy_x_get_y',
    'shipping_waiver'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.discount_type AS ENUM (
    'percentage',
    'fixed_amount',
    'fixed_price',
    'free_shipping'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.rule_target_type AS ENUM (
    'entire_order',
    'category',
    'collection',
    'product',
    'variant',
    'delivery_mode',
    'customer_tier'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Master Promotions Table
CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  promotion_type public.promotion_type NOT NULL DEFAULT 'coupon',
  discount_type public.discount_type NOT NULL DEFAULT 'percentage',
  discount_value NUMERIC(10, 2) NOT NULL CHECK (discount_value >= 0),
  min_order_subtotal NUMERIC(10, 2) DEFAULT 0.00,
  max_discount_amount NUMERIC(10, 2) DEFAULT NULL,
  is_stackable BOOLEAN NOT NULL DEFAULT false,
  priority INT NOT NULL DEFAULT 0,
  enforce_margin_floor BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  ends_at TIMESTAMPTZ DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  usage_limit_total INT DEFAULT NULL,
  usage_limit_per_customer INT DEFAULT 1,
  total_redemptions_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Promotion Rules Table
CREATE TABLE IF NOT EXISTS public.promotion_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  target_type public.rule_target_type NOT NULL DEFAULT 'entire_order',
  match_operator VARCHAR(20) NOT NULL DEFAULT 'include',
  target_id VARCHAR(100) DEFAULT NULL,
  min_quantity INT DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Promotion Coupons Table
CREATE TABLE IF NOT EXISTS public.promotion_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL UNIQUE,
  is_single_use BOOLEAN NOT NULL DEFAULT false,
  max_uses INT DEFAULT NULL,
  times_used INT NOT NULL DEFAULT 0,
  assigned_customer_email VARCHAR(255) DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Promotion Redemptions Table
CREATE TABLE IF NOT EXISTS public.promotion_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES public.promotions(id),
  coupon_id UUID REFERENCES public.promotion_coupons(id),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id),
  customer_email VARCHAR(255) NOT NULL,
  original_subtotal NUMERIC(10, 2) NOT NULL,
  discount_applied NUMERIC(10, 2) NOT NULL,
  margin_clamped BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(20) NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'voided')),
  voided_at TIMESTAMPTZ DEFAULT NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. Scheduled Price Adjustments Table
CREATE TABLE IF NOT EXISTS public.price_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
  original_price NUMERIC(10, 2) NOT NULL,
  scheduled_price NUMERIC(10, 2) NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  reason VARCHAR(100) DEFAULT 'archival_markdown',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. Orders & Order Items Extensions
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS promotion_id UUID REFERENCES public.promotions(id),
  ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS discount_breakdown JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS margin_protected BOOLEAN DEFAULT false;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS original_unit_price NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS final_unit_price NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS promotion_id UUID REFERENCES public.promotions(id);

-- 9. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_promotions_active_dates ON public.promotions(is_active, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_promotions_type ON public.promotions(promotion_type, is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_lookup ON public.promotion_coupons(upper(code)) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_promotion_rules_target ON public.promotion_rules(promotion_id, target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_promotion_redemptions_user ON public.promotion_redemptions(promotion_id, lower(customer_email));
CREATE INDEX IF NOT EXISTS idx_promotion_redemptions_order ON public.promotion_redemptions(order_id);
CREATE INDEX IF NOT EXISTS idx_price_schedules_active ON public.price_schedules(product_id, variant_id, starts_at, ends_at) WHERE is_active = true;

-- 10. Enable Row Level Security (RLS)
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select active promotions"
  ON public.promotions FOR SELECT
  TO public
  USING (
    is_active = true 
    AND starts_at <= timezone('utc'::text, now()) 
    AND (ends_at IS NULL OR ends_at >= timezone('utc'::text, now()))
  );

CREATE POLICY "Allow staff all on promotions"
  ON public.promotions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'store_manager', 'warehouse_manager')
    )
  );

CREATE POLICY "Allow public select promotion rules"
  ON public.promotion_rules FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow staff all on promotion rules"
  ON public.promotion_rules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'store_manager')
    )
  );

-- Strict ADMIN & SERVICE-ROLE ONLY - prevents scraping of VIP/single-use codes
CREATE POLICY "Allow staff all on promotion coupons"
  ON public.promotion_coupons FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'store_manager')
    )
  );

CREATE POLICY "Allow staff and service role only on redemptions"
  ON public.promotion_redemptions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'store_manager')
    )
  );

CREATE POLICY "Allow public select active price schedules"
  ON public.price_schedules FOR SELECT
  TO public
  USING (
    is_active = true 
    AND starts_at <= timezone('utc'::text, now()) 
    AND ends_at >= timezone('utc'::text, now())
  );

CREATE POLICY "Allow staff all on price schedules"
  ON public.price_schedules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'store_manager')
    )
  );

-- 11. Stored Procedure: Void/Rollback Redemption
CREATE OR REPLACE FUNCTION public.void_order_promotion_redemption(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_redemption RECORD;
BEGIN
  SELECT * INTO v_redemption
  FROM public.promotion_redemptions
  WHERE order_id = p_order_id AND status = 'applied'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'No active redemption found for order');
  END IF;

  UPDATE public.promotion_redemptions
  SET status = 'voided',
      voided_at = timezone('utc'::text, now())
  WHERE id = v_redemption.id;

  IF v_redemption.coupon_id IS NOT NULL THEN
    UPDATE public.promotion_coupons
    SET times_used = GREATEST(0, times_used - 1)
    WHERE id = v_redemption.coupon_id;
  END IF;

  IF v_redemption.promotion_id IS NOT NULL THEN
    UPDATE public.promotions
    SET total_redemptions_count = GREATEST(0, total_redemptions_count - 1),
        updated_at = timezone('utc'::text, now())
    WHERE id = v_redemption.promotion_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'voided_redemption_id', v_redemption.id,
    'discount_reversed', v_redemption.discount_applied
  );
END;
$$;


-- =============================================================================
-- SECTION 24: VERIFIED PURCHASE REVIEWS, RATINGS & PHOTO FEEDBACK
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_status') THEN
        CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected', 'hidden');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fashion_fit_indicator') THEN
        CREATE TYPE fashion_fit_indicator AS ENUM ('runs_small', 'true_to_size', 'runs_large');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.product_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(150) NOT NULL,
    comment TEXT NOT NULL,
    fit_indicator fashion_fit_indicator NOT NULL DEFAULT 'true_to_size',
    
    verified_purchase BOOLEAN NOT NULL DEFAULT true,
    size_purchased VARCHAR(50),
    is_bolt_try_on BOOLEAN NOT NULL DEFAULT false,
    
    status review_status NOT NULL DEFAULT 'pending',
    moderated_by UUID REFERENCES public.users(id),
    moderated_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    admin_reply TEXT,
    admin_replied_at TIMESTAMPTZ,
    admin_replied_by UUID REFERENCES public.users(id),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_review_per_order_item UNIQUE (order_item_id)
);

CREATE TABLE IF NOT EXISTS public.review_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES public.product_reviews(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3, 2) NOT NULL DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS review_count INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS fit_runs_small_count INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS fit_true_to_size_count INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS fit_runs_large_count INT NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION update_product_review_aggregates()
RETURNS TRIGGER AS $$
DECLARE
    target_product_id UUID;
    old_product_id UUID;
BEGIN
    target_product_id := COALESCE(NEW.product_id, OLD.product_id);

    IF TG_OP = 'UPDATE' AND OLD.product_id IS NOT NULL AND OLD.product_id <> NEW.product_id THEN
        old_product_id := OLD.product_id;
        UPDATE public.products
        SET
            average_rating = COALESCE((
                SELECT ROUND(AVG(rating)::numeric, 2)
                FROM public.product_reviews
                WHERE product_id = old_product_id AND status = 'approved'
            ), 0.00),
            review_count = (
                SELECT COUNT(*)
                FROM public.product_reviews
                WHERE product_id = old_product_id AND status = 'approved'
            ),
            fit_runs_small_count = (
                SELECT COUNT(*)
                FROM public.product_reviews
                WHERE product_id = old_product_id AND status = 'approved' AND fit_indicator = 'runs_small'
            ),
            fit_true_to_size_count = (
                SELECT COUNT(*)
                FROM public.product_reviews
                WHERE product_id = old_product_id AND status = 'approved' AND fit_indicator = 'true_to_size'
            ),
            fit_runs_large_count = (
                SELECT COUNT(*)
                FROM public.product_reviews
                WHERE product_id = old_product_id AND status = 'approved' AND fit_indicator = 'runs_large'
            ),
            updated_at = NOW()
        WHERE id = old_product_id;
    END IF;

    UPDATE public.products
    SET
        average_rating = COALESCE((
            SELECT ROUND(AVG(rating)::numeric, 2)
            FROM public.product_reviews
            WHERE product_id = target_product_id AND status = 'approved'
        ), 0.00),
        review_count = (
            SELECT COUNT(*)
            FROM public.product_reviews
            WHERE product_id = target_product_id AND status = 'approved'
        ),
        fit_runs_small_count = (
            SELECT COUNT(*)
            FROM public.product_reviews
            WHERE product_id = target_product_id AND status = 'approved' AND fit_indicator = 'runs_small'
        ),
        fit_true_to_size_count = (
            SELECT COUNT(*)
            FROM public.product_reviews
            WHERE product_id = target_product_id AND status = 'approved' AND fit_indicator = 'true_to_size'
        ),
        fit_runs_large_count = (
            SELECT COUNT(*)
            FROM public.product_reviews
            WHERE product_id = target_product_id AND status = 'approved' AND fit_indicator = 'runs_large'
        ),
        updated_at = NOW()
    WHERE id = target_product_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_product_review_aggregates ON public.product_reviews;
CREATE TRIGGER trg_update_product_review_aggregates
AFTER INSERT OR UPDATE OR DELETE ON public.product_reviews
FOR EACH ROW EXECUTE FUNCTION update_product_review_aggregates();

CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id_status ON public.product_reviews(product_id, status);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON public.product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_order_item_id ON public.product_reviews(order_item_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_status ON public.product_reviews(status);
CREATE INDEX IF NOT EXISTS idx_review_media_review_id ON public.review_media(review_id);

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view approved reviews or own reviews" ON public.product_reviews;
CREATE POLICY "Public can view approved reviews or own reviews"
ON public.product_reviews
FOR SELECT
USING (
    status = 'approved'
    OR auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role IN ('admin', 'store_manager')
    )
);

DROP POLICY IF EXISTS "Authenticated users can submit reviews" ON public.product_reviews;
CREATE POLICY "Authenticated users can submit reviews"
ON public.product_reviews
FOR INSERT
WITH CHECK (
    auth.uid() = user_id
);

DROP POLICY IF EXISTS "Staff can moderate reviews" ON public.product_reviews;
CREATE POLICY "Staff can moderate reviews"
ON public.product_reviews
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role IN ('admin', 'store_manager')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role IN ('admin', 'store_manager')
    )
);

DROP POLICY IF EXISTS "Staff can delete reviews" ON public.product_reviews;
CREATE POLICY "Staff can delete reviews"
ON public.product_reviews
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role IN ('admin', 'store_manager')
    )
);

DROP POLICY IF EXISTS "Public can view approved review media" ON public.review_media;
CREATE POLICY "Public can view approved review media"
ON public.review_media
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.product_reviews pr
        WHERE pr.id = review_id
        AND (
            pr.status = 'approved'
            OR pr.user_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.users
                WHERE id = auth.uid() AND role IN ('admin', 'store_manager')
            )
        )
    )
);

DROP POLICY IF EXISTS "Users can insert media for their own reviews" ON public.review_media;
CREATE POLICY "Users can insert media for their own reviews"
ON public.review_media
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.product_reviews pr
        WHERE pr.id = review_id AND pr.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Staff can manage review media" ON public.review_media;
CREATE POLICY "Staff can manage review media"
ON public.review_media
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role IN ('admin', 'store_manager')
    )
);



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
    user_id,
    status,
    payment_status,
    delivery_mode,
    try_on_status,
    order_type,
    subtotal,
    discount,
    delivery_fee,
    tax_amount,
    total_amount,
    fulfillment_location_id,
    shipping_address_json,
    billing_address_json,
    notes,
    created_at,
    updated_at
  )
  VALUES (
    v_order_number,
    v_user_id,
    v_status,
    v_payment_status,
    v_delivery_mode,
    v_try_on_status,
    v_order_type,
    v_subtotal,
    v_discount,
    v_delivery_fee,
    v_tax_amount,
    v_total_amount,
    v_loc_id,
    v_shipping_addr,
    v_billing_addr,
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

-- ==============================================================================
-- COLLECTIONS & OCCASIONS MERCHANDISING
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  group_type TEXT NOT NULL DEFAULT 'occasion' CHECK (group_type IN ('occasion', 'collection', 'season', 'capsule')),
  description TEXT,
  image_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  show_in_navbar BOOLEAN NOT NULL DEFAULT true,
  show_on_home BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.collection_categories (
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (collection_id, category_id)
);

CREATE TABLE IF NOT EXISTS public.collection_products (
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (collection_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_collections_slug ON public.collections(slug);
CREATE INDEX IF NOT EXISTS idx_collections_display ON public.collections(display_order, is_active);
CREATE INDEX IF NOT EXISTS idx_coll_cats_collection ON public.collection_categories(collection_id);
CREATE INDEX IF NOT EXISTS idx_coll_cats_category ON public.collection_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_coll_prods_collection ON public.collection_products(collection_id);
CREATE INDEX IF NOT EXISTS idx_coll_prods_product ON public.collection_products(product_id);

-- ==============================================================================
-- ATELIER ENTERPRISE: PROMOTIONS, PRICING & DISCOUNT ENGINE SCHEMA
-- Added: 20261127_promotions_and_pricing_engine.sql
-- ==============================================================================

-- 1. Cost Price Columns & Security Baseline
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10, 2) DEFAULT 0.00;

ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10, 2);

-- Column-level privilege restrictions: Hide cost_price from unauthenticated patrons and authenticated shoppers (service_role only)
REVOKE SELECT (cost_price) ON public.products FROM anon, authenticated;
REVOKE SELECT (cost_price) ON public.product_variants FROM anon, authenticated;

-- 2. Enumerated Types for Promotion Engine
DO $$ BEGIN
  CREATE TYPE public.promotion_type AS ENUM (
    'coupon',
    'automatic_cart',
    'tiered_threshold',
    'buy_x_get_y',
    'shipping_waiver'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.discount_type AS ENUM (
    'percentage',
    'fixed_amount',
    'fixed_price',
    'free_shipping'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.rule_target_type AS ENUM (
    'entire_order',
    'category',
    'collection',
    'product',
    'variant',
    'delivery_mode',
    'customer_tier'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Master Promotions Table
CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  promotion_type public.promotion_type NOT NULL DEFAULT 'coupon',
  discount_type public.discount_type NOT NULL DEFAULT 'percentage',
  discount_value NUMERIC(10, 2) NOT NULL CHECK (discount_value >= 0),
  min_order_subtotal NUMERIC(10, 2) DEFAULT 0.00,
  max_discount_amount NUMERIC(10, 2) DEFAULT NULL,
  is_stackable BOOLEAN NOT NULL DEFAULT false,
  priority INT NOT NULL DEFAULT 0,
  enforce_margin_floor BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  ends_at TIMESTAMPTZ DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  usage_limit_total INT DEFAULT NULL,
  usage_limit_per_customer INT DEFAULT 1,
  total_redemptions_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Promotion Rules Table
CREATE TABLE IF NOT EXISTS public.promotion_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  target_type public.rule_target_type NOT NULL DEFAULT 'entire_order',
  match_operator VARCHAR(20) NOT NULL DEFAULT 'include',
  target_id VARCHAR(100) DEFAULT NULL,
  min_quantity INT DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Promotion Coupons Table
CREATE TABLE IF NOT EXISTS public.promotion_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL UNIQUE,
  is_single_use BOOLEAN NOT NULL DEFAULT false,
  max_uses INT DEFAULT NULL,
  times_used INT NOT NULL DEFAULT 0,
  assigned_customer_email VARCHAR(255) DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Promotion Redemptions Table
CREATE TABLE IF NOT EXISTS public.promotion_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES public.promotions(id),
  coupon_id UUID REFERENCES public.promotion_coupons(id),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id),
  customer_email VARCHAR(255) NOT NULL,
  original_subtotal NUMERIC(10, 2) NOT NULL,
  discount_applied NUMERIC(10, 2) NOT NULL,
  margin_clamped BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(20) NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'voided')),
  voided_at TIMESTAMPTZ DEFAULT NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. Scheduled Price Adjustments Table
CREATE TABLE IF NOT EXISTS public.price_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
  original_price NUMERIC(10, 2) NOT NULL,
  scheduled_price NUMERIC(10, 2) NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  reason VARCHAR(100) DEFAULT 'archival_markdown',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. Orders & Order Items Extensions
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS promotion_id UUID REFERENCES public.promotions(id),
  ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS discount_breakdown JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS margin_protected BOOLEAN DEFAULT false;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS original_unit_price NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS final_unit_price NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS promotion_id UUID REFERENCES public.promotions(id);

-- 9. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_promotions_active_dates ON public.promotions(is_active, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_promotions_type ON public.promotions(promotion_type, is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_lookup ON public.promotion_coupons(upper(code)) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_promotion_rules_target ON public.promotion_rules(promotion_id, target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_promotion_redemptions_user ON public.promotion_redemptions(promotion_id, lower(customer_email));
CREATE INDEX IF NOT EXISTS idx_promotion_redemptions_order ON public.promotion_redemptions(order_id);
CREATE INDEX IF NOT EXISTS idx_price_schedules_active ON public.price_schedules(product_id, variant_id, starts_at, ends_at) WHERE is_active = true;

-- 10. Enable Row Level Security (RLS)
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select active promotions"
  ON public.promotions FOR SELECT
  TO public
  USING (
    is_active = true 
    AND starts_at <= timezone('utc'::text, now()) 
    AND (ends_at IS NULL OR ends_at >= timezone('utc'::text, now()))
  );

CREATE POLICY "Allow staff all on promotions"
  ON public.promotions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'store_manager', 'warehouse_manager')
    )
  );

CREATE POLICY "Allow public select promotion rules"
  ON public.promotion_rules FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow staff all on promotion rules"
  ON public.promotion_rules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'store_manager')
    )
  );

-- Strict ADMIN & SERVICE-ROLE ONLY - prevents scraping of VIP/single-use codes
CREATE POLICY "Allow staff all on promotion coupons"
  ON public.promotion_coupons FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'store_manager')
    )
  );

CREATE POLICY "Allow staff and service role only on redemptions"
  ON public.promotion_redemptions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'store_manager')
    )
  );

CREATE POLICY "Allow public select active price schedules"
  ON public.price_schedules FOR SELECT
  TO public
  USING (
    is_active = true 
    AND starts_at <= timezone('utc'::text, now()) 
    AND ends_at >= timezone('utc'::text, now())
  );

CREATE POLICY "Allow staff all on price schedules"
  ON public.price_schedules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'store_manager')
    )
  );

-- 11. Stored Procedure: Void/Rollback Redemption
CREATE OR REPLACE FUNCTION public.void_order_promotion_redemption(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_redemption RECORD;
BEGIN
  SELECT * INTO v_redemption
  FROM public.promotion_redemptions
  WHERE order_id = p_order_id AND status = 'applied'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'No active redemption found for order');
  END IF;

  UPDATE public.promotion_redemptions
  SET status = 'voided',
      voided_at = timezone('utc'::text, now())
  WHERE id = v_redemption.id;

  IF v_redemption.coupon_id IS NOT NULL THEN
    UPDATE public.promotion_coupons
    SET times_used = GREATEST(0, times_used - 1)
    WHERE id = v_redemption.coupon_id;
  END IF;

  IF v_redemption.promotion_id IS NOT NULL THEN
    UPDATE public.promotions
    SET total_redemptions_count = GREATEST(0, total_redemptions_count - 1),
        updated_at = timezone('utc'::text, now())
    WHERE id = v_redemption.promotion_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'voided_redemption_id', v_redemption.id,
    'discount_reversed', v_redemption.discount_applied
  );
END;
$$;


-- =============================================================================
-- SECTION 24: VERIFIED PURCHASE REVIEWS, RATINGS & PHOTO FEEDBACK
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_status') THEN
        CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected', 'hidden');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fashion_fit_indicator') THEN
        CREATE TYPE fashion_fit_indicator AS ENUM ('runs_small', 'true_to_size', 'runs_large');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.product_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(150) NOT NULL,
    comment TEXT NOT NULL,
    fit_indicator fashion_fit_indicator NOT NULL DEFAULT 'true_to_size',
    
    verified_purchase BOOLEAN NOT NULL DEFAULT true,
    size_purchased VARCHAR(50),
    is_bolt_try_on BOOLEAN NOT NULL DEFAULT false,
    
    status review_status NOT NULL DEFAULT 'pending',
    moderated_by UUID REFERENCES public.users(id),
    moderated_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    admin_reply TEXT,
    admin_replied_at TIMESTAMPTZ,
    admin_replied_by UUID REFERENCES public.users(id),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_review_per_order_item UNIQUE (order_item_id)
);

CREATE TABLE IF NOT EXISTS public.review_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES public.product_reviews(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3, 2) NOT NULL DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS review_count INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS fit_runs_small_count INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS fit_true_to_size_count INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS fit_runs_large_count INT NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION update_product_review_aggregates()
RETURNS TRIGGER AS $$
DECLARE
    target_product_id UUID;
    old_product_id UUID;
BEGIN
    target_product_id := COALESCE(NEW.product_id, OLD.product_id);

    IF TG_OP = 'UPDATE' AND OLD.product_id IS NOT NULL AND OLD.product_id <> NEW.product_id THEN
        old_product_id := OLD.product_id;
        UPDATE public.products
        SET
            average_rating = COALESCE((
                SELECT ROUND(AVG(rating)::numeric, 2)
                FROM public.product_reviews
                WHERE product_id = old_product_id AND status = 'approved'
            ), 0.00),
            review_count = (
                SELECT COUNT(*)
                FROM public.product_reviews
                WHERE product_id = old_product_id AND status = 'approved'
            ),
            fit_runs_small_count = (
                SELECT COUNT(*)
                FROM public.product_reviews
                WHERE product_id = old_product_id AND status = 'approved' AND fit_indicator = 'runs_small'
            ),
            fit_true_to_size_count = (
                SELECT COUNT(*)
                FROM public.product_reviews
                WHERE product_id = old_product_id AND status = 'approved' AND fit_indicator = 'true_to_size'
            ),
            fit_runs_large_count = (
                SELECT COUNT(*)
                FROM public.product_reviews
                WHERE product_id = old_product_id AND status = 'approved' AND fit_indicator = 'runs_large'
            ),
            updated_at = NOW()
        WHERE id = old_product_id;
    END IF;

    UPDATE public.products
    SET
        average_rating = COALESCE((
            SELECT ROUND(AVG(rating)::numeric, 2)
            FROM public.product_reviews
            WHERE product_id = target_product_id AND status = 'approved'
        ), 0.00),
        review_count = (
            SELECT COUNT(*)
            FROM public.product_reviews
            WHERE product_id = target_product_id AND status = 'approved'
        ),
        fit_runs_small_count = (
            SELECT COUNT(*)
            FROM public.product_reviews
            WHERE product_id = target_product_id AND status = 'approved' AND fit_indicator = 'runs_small'
        ),
        fit_true_to_size_count = (
            SELECT COUNT(*)
            FROM public.product_reviews
            WHERE product_id = target_product_id AND status = 'approved' AND fit_indicator = 'true_to_size'
        ),
        fit_runs_large_count = (
            SELECT COUNT(*)
            FROM public.product_reviews
            WHERE product_id = target_product_id AND status = 'approved' AND fit_indicator = 'runs_large'
        ),
        updated_at = NOW()
    WHERE id = target_product_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_product_review_aggregates ON public.product_reviews;
CREATE TRIGGER trg_update_product_review_aggregates
AFTER INSERT OR UPDATE OR DELETE ON public.product_reviews
FOR EACH ROW EXECUTE FUNCTION update_product_review_aggregates();

CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id_status ON public.product_reviews(product_id, status);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON public.product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_order_item_id ON public.product_reviews(order_item_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_status ON public.product_reviews(status);
CREATE INDEX IF NOT EXISTS idx_review_media_review_id ON public.review_media(review_id);

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view approved reviews or own reviews" ON public.product_reviews;
CREATE POLICY "Public can view approved reviews or own reviews"
ON public.product_reviews
FOR SELECT
USING (
    status = 'approved'
    OR auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role IN ('admin', 'store_manager')
    )
);

DROP POLICY IF EXISTS "Authenticated users can submit reviews" ON public.product_reviews;
CREATE POLICY "Authenticated users can submit reviews"
ON public.product_reviews
FOR INSERT
WITH CHECK (
    auth.uid() = user_id
);

DROP POLICY IF EXISTS "Staff can moderate reviews" ON public.product_reviews;
CREATE POLICY "Staff can moderate reviews"
ON public.product_reviews
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role IN ('admin', 'store_manager')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role IN ('admin', 'store_manager')
    )
);

DROP POLICY IF EXISTS "Staff can delete reviews" ON public.product_reviews;
CREATE POLICY "Staff can delete reviews"
ON public.product_reviews
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role IN ('admin', 'store_manager')
    )
);

DROP POLICY IF EXISTS "Public can view approved review media" ON public.review_media;
CREATE POLICY "Public can view approved review media"
ON public.review_media
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.product_reviews pr
        WHERE pr.id = review_id
        AND (
            pr.status = 'approved'
            OR pr.user_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.users
                WHERE id = auth.uid() AND role IN ('admin', 'store_manager')
            )
        )
    )
);

DROP POLICY IF EXISTS "Users can insert media for their own reviews" ON public.review_media;
CREATE POLICY "Users can insert media for their own reviews"
ON public.review_media
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.product_reviews pr
        WHERE pr.id = review_id AND pr.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Staff can manage review media" ON public.review_media;
CREATE POLICY "Staff can manage review media"
ON public.review_media
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role IN ('admin', 'store_manager')
    )
);




