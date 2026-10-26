-- ==============================================================================
-- ATELIER MONOREPO MASTER CONSOLIDATED DATABASE SCHEMA
-- Migration: 20261025_complete_storefront_admin_unified_schema.sql
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/bmjbzupilwbzdimowgnd/sql/new
-- ==============================================================================

-- 1. EXTENSIONS & ENUMS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('admin', 'delivery_partner', 'customer');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM ('pending', 'processing', 'out_for_delivery', 'delivered', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.delivery_mode AS ENUM ('direct', 'try_on');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.try_on_status AS ENUM ('pending', 'active_timer', 'reconciling', 'completed', 'fitting_in_progress', 'reconciled', 'failed_absent');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,
  role public.user_role NOT NULL DEFAULT 'customer',
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  street_address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'US',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. PRODUCTS TABLE
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

-- 5. PRODUCT VARIANTS TABLE
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
CREATE INDEX IF NOT EXISTS idx_product_variants_barcode_data ON public.product_variants(barcode_data);

-- 6. PRODUCT MEDIA TABLE
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

-- 7. ADDRESSES TABLE
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

CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON public.addresses(user_id);

-- 8. ORDERS TABLE (Supports both registered patrons and guest checkouts)
CREATE SEQUENCE IF NOT EXISTS public.order_invoice_seq START WITH 1001;

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
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

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_partner_id ON public.orders(delivery_partner_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_mode ON public.orders(delivery_mode);
CREATE INDEX IF NOT EXISTS idx_orders_try_on_status ON public.orders(try_on_status);
CREATE INDEX IF NOT EXISTS idx_orders_invoice_number ON public.orders(invoice_number);
CREATE INDEX IF NOT EXISTS idx_orders_tracking_barcode ON public.orders(tracking_barcode);

-- 9. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
  size TEXT DEFAULT NULL,
  is_kept BOOLEAN DEFAULT NULL,
  rejection_reason TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_is_kept ON public.order_items(is_kept);

-- 10. STOREFRONT CONFIG & BANNERS
CREATE TABLE IF NOT EXISTS public.storefront_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

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

-- ==============================================================================
-- 11. FUNCTIONS & TRIGGERS
-- ==============================================================================

-- Helper: get_user_role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE((SELECT role FROM public.users WHERE id = user_id), 'customer'::public.user_role);
$$;

-- Trigger: Synchronize variant stock with parent product stock
CREATE OR REPLACE FUNCTION public.sync_product_variant_stock()
RETURNS TRIGGER AS $$
DECLARE
  target_product_id UUID;
  total_units INTEGER;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    target_product_id := OLD.product_id;
  ELSE
    target_product_id := NEW.product_id;
  END IF;

  SELECT COALESCE(SUM(stock), 0) INTO total_units
  FROM public.product_variants
  WHERE product_id = target_product_id;

  UPDATE public.products
  SET stock = total_units, updated_at = timezone('utc'::text, now())
  WHERE id = target_product_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_product_variant_stock ON public.product_variants;
CREATE TRIGGER trigger_sync_product_variant_stock
  AFTER INSERT OR UPDATE OR DELETE ON public.product_variants
  FOR EACH ROW EXECUTE PROCEDURE public.sync_product_variant_stock();

-- Trigger: Automatic Invoice Number, Tracking Barcode, and Tax Calculation on Insert
CREATE OR REPLACE FUNCTION public.generate_order_logistics_meta()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := 'ATL-' || UPPER(SUBSTRING(NEW.id::TEXT FROM 1 FOR 6));
  END IF;
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := 'INV-2026-' || LPAD(nextval('public.order_invoice_seq')::TEXT, 4, '0');
  END IF;
  IF NEW.tracking_barcode IS NULL THEN
    NEW.tracking_barcode := 'ATL-TRK-' || UPPER(SUBSTRING(NEW.id::TEXT FROM 1 FOR 8));
  END IF;
  IF NEW.tax_amount IS NULL OR NEW.tax_amount = 0 THEN
    NEW.tax_amount := ROUND((NEW.total * 0.0825)::NUMERIC, 2);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_order_logistics_meta ON public.orders;
CREATE TRIGGER trigger_order_logistics_meta
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE PROCEDURE public.generate_order_logistics_meta();

-- Trigger: Restock inventory if order is cancelled
CREATE OR REPLACE FUNCTION public.handle_order_cancellation_inventory()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item_rec RECORD;
BEGIN
  IF NEW.status = 'cancelled' AND (OLD.status IS DISTINCT FROM 'cancelled') THEN
    FOR item_rec IN
      SELECT product_id, size, quantity, is_kept
      FROM public.order_items
      WHERE order_id = NEW.id
    LOOP
      IF item_rec.is_kept IS DISTINCT FROM false THEN
        IF item_rec.size IS NOT NULL THEN
          UPDATE public.product_variants
          SET stock = stock + COALESCE(item_rec.quantity, 1), updated_at = now()
          WHERE product_id = item_rec.product_id AND size = item_rec.size;
        ELSE
          UPDATE public.products
          SET stock = stock + COALESCE(item_rec.quantity, 1), updated_at = now()
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
  FOR EACH ROW EXECUTE PROCEDURE public.handle_order_cancellation_inventory();

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

-- ==============================================================================
-- 12. ROW LEVEL SECURITY (RLS) POLICIES
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

-- Catalog Policies (Public read, admin write)
CREATE POLICY "Public read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admin write categories" ON public.categories FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Public read products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Admin write products" ON public.products FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Public read product_variants" ON public.product_variants FOR SELECT USING (true);
CREATE POLICY "Admin write product_variants" ON public.product_variants FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Public read product_media" ON public.product_media FOR SELECT USING (true);
CREATE POLICY "Admin write product_media" ON public.product_media FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Public read storefront_config" ON public.storefront_config FOR SELECT USING (true);
CREATE POLICY "Admin write storefront_config" ON public.storefront_config FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Public read promotional_banners" ON public.promotional_banners FOR SELECT USING (true);
CREATE POLICY "Admin write promotional_banners" ON public.promotional_banners FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

-- Users Policies
CREATE POLICY "Users read own profile" ON public.users FOR SELECT USING (auth.uid() = id OR public.get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Users update own profile" ON public.users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.users WHERE id = auth.uid()));
CREATE POLICY "Admin manage users" ON public.users FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

-- Orders Policies (CRITICAL: Allow Storefront patron order placement regardless of auth state!)
CREATE POLICY "Allow patron placing orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow patron reading placed orders" ON public.orders FOR SELECT USING (auth.uid() = user_id OR public.get_user_role(auth.uid()) IN ('admin', 'delivery_partner'));
CREATE POLICY "Allow courier updating orders" ON public.orders FOR UPDATE USING (auth.uid() = delivery_partner_id OR public.get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admin full access to orders" ON public.orders FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

-- Order Items Policies
CREATE POLICY "Allow patron inserting order items" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow reading order items" ON public.order_items FOR SELECT USING (true);
CREATE POLICY "Allow courier updating order items in try on" ON public.order_items FOR UPDATE USING (true);
CREATE POLICY "Admin full access to order items" ON public.order_items FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

-- Addresses Policies
CREATE POLICY "Patrons manage addresses" ON public.addresses FOR ALL USING (auth.uid() = user_id OR public.get_user_role(auth.uid()) = 'admin');

-- Storage Buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('products', 'products', true) ON CONFLICT (id) DO UPDATE SET public = true;
INSERT INTO storage.buckets (id, name, public) VALUES ('invoices', 'invoices', true) ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public can view products images" ON storage.objects;
CREATE POLICY "Public can view products images" ON storage.objects FOR SELECT USING (bucket_id = 'products');

DROP POLICY IF EXISTS "Public can view invoices" ON storage.objects;
CREATE POLICY "Public can view invoices" ON storage.objects FOR SELECT USING (bucket_id = 'invoices');

DROP POLICY IF EXISTS "Admins can upload files" ON storage.objects;
CREATE POLICY "Admins can upload files" ON storage.objects FOR INSERT WITH CHECK (bucket_id IN ('products', 'invoices'));

-- ==============================================================================
-- 13. SEED ESSENTIAL CREATOR APPAREL CATALOG & USERS
-- ==============================================================================

-- Admin User in auth.users (Credentials: iamutkarshyadav1@gmail.com / asdfghjkl)
DO $$
DECLARE
  admin_user_id UUID := '8f62dbc0-1b70-4380-8edf-26988612a5c3';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'iamutkarshyadav1@gmail.com') THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud
    ) VALUES (
      admin_user_id,
      '00000000-0000-0000-0000-000000000000',
      'iamutkarshyadav1@gmail.com',
      crypt('asdfghjkl', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Utkarsh Yadav","role":"admin"}',
      NOW(),
      NOW(),
      'authenticated',
      'authenticated'
    );
  ELSE
    UPDATE auth.users
    SET encrypted_password = crypt('asdfghjkl', gen_salt('bf')),
        raw_user_meta_data = '{"name":"Utkarsh Yadav","role":"admin"}',
        updated_at = NOW()
    WHERE email = 'iamutkarshyadav1@gmail.com';
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Ignore if auth.users schema is restricted
  NULL;
END $$;

-- Admin User Profile in public.users
INSERT INTO public.users (id, role, name, email, phone)
VALUES ('8f62dbc0-1b70-4380-8edf-26988612a5c3', 'admin', 'Utkarsh Yadav', 'iamutkarshyadav1@gmail.com', '+1 (415) 555-0199')
ON CONFLICT (id) DO UPDATE SET role = 'admin', email = EXCLUDED.email;

-- Couriers
INSERT INTO public.users (id, role, name, email, phone)
VALUES 
  ('d1000000-0000-0000-0000-000000000001', 'delivery_partner', 'Eleanor Vance', 'courier.vance@atelier.com', '+1 (415) 555-0192'),
  ('d1000000-0000-0000-0000-000000000002', 'delivery_partner', 'Jean-Luc Moreau', 'courier.moreau@atelier.com', '+1 (415) 555-0188')
ON CONFLICT (id) DO NOTHING;

-- Guest Patron
INSERT INTO public.users (id, role, name, email, phone)
VALUES ('a0000000-0000-0000-0000-000000000001', 'customer', 'Alex Rivera', 'alex.rivera@atelier.com', '+1 (415) 555-0192')
ON CONFLICT (id) DO NOTHING;

-- Categories
INSERT INTO public.categories (id, name, slug, description, image_url, display_order)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Hoodies & Fleece', 'hoodies', 'Heavyweight 480 GSM French Terry.', 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85', 1),
  ('c1000000-0000-0000-0000-000000000002', 'Tees & Tops', 'tees', 'Overdyed 280 GSM vintage combed cotton tees.', 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=85', 2),
  ('c1000000-0000-0000-0000-000000000003', 'Outerwear & Jackets', 'outerwear', 'Technical flight bombers and chore coats.', 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1200&q=85', 3),
  ('c1000000-0000-0000-0000-000000000004', 'Pants & Denim', 'pants', '14oz Japanese raw selvedge denim.', 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1200&q=85', 4)
ON CONFLICT (id) DO NOTHING;

-- Core Products
INSERT INTO public.products (id, title, description, price, stock, image_url, category_id, category, material, edition)
VALUES
  ('b1000000-0000-0000-0000-000000000001', 'Heavyweight Boxy Hoodie', 'Custom-milled 480 GSM loopback organic French Terry.', 165.00, 115, 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85', 'c1000000-0000-0000-0000-000000000001', 'Hoodies & Fleece', '480 GSM 100% Organic Cotton French Terry', 'Drop 01 // Limited 150 Pieces'),
  ('b1000000-0000-0000-0000-000000000002', 'Vintage Washed Boxy Tee', '280 GSM heavyweight combed cotton jersey with distressed neck ribbing.', 75.00, 140, 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=85', 'c1000000-0000-0000-0000-000000000002', 'Tees & Tops', '280 GSM Combed Cotton with Vintage Enzymatic Wash', 'Drop 01 // Core Essential'),
  ('b1000000-0000-0000-0000-000000000003', 'Cropped Weatherproof Flight Bomber', 'High-density technical nylon shell with quilted synthetic insulation.', 285.00, 55, 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1200&q=85', 'c1000000-0000-0000-0000-000000000003', 'Outerwear & Jackets', 'Matte Technical Nylon Shell & Primaloft Insulation', 'Drop 01 // Archive Edition of 60'),
  ('b1000000-0000-0000-0000-000000000004', 'Pleated Selvedge Carpenter Pant', 'Cut from 14oz shuttle-loomed Japanese raw black selvedge denim.', 210.00, 75, 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1200&q=85', 'c1000000-0000-0000-0000-000000000004', 'Pants & Denim', '14oz Japanese Selvedge Cotton Denim', 'Drop 01 // Strict Edition of 80')
ON CONFLICT (id) DO NOTHING;

-- Variants for Heavyweight Boxy Hoodie
INSERT INTO public.product_variants (id, product_id, sku, size, stock, barcode, barcode_data)
VALUES
  ('e1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'HD-BOX-BLK-XS', 'XS', 10, 'BAR-HDBOXBLKXS', 'BAR-HDBOXBLKXS'),
  ('e1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'HD-BOX-BLK-S', 'S', 25, 'BAR-HDBOXBLKS', 'BAR-HDBOXBLKS'),
  ('e1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000001', 'HD-BOX-BLK-M', 'M', 45, 'BAR-HDBOXBLKM', 'BAR-HDBOXBLKM'),
  ('e1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000001', 'HD-BOX-BLK-L', 'L', 25, 'BAR-HDBOXBLKL', 'BAR-HDBOXBLKL'),
  ('e1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000001', 'HD-BOX-BLK-XL', 'XL', 10, 'BAR-HDBOXBLKXL', 'BAR-HDBOXBLKXL')
ON CONFLICT (sku) DO NOTHING;

-- Variants for Vintage Washed Boxy Tee
INSERT INTO public.product_variants (id, product_id, sku, size, stock, barcode, barcode_data)
VALUES
  ('e1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000002', 'TEE-VN-GRY-XS', 'XS', 15, 'BAR-TEEVNGRYXS', 'BAR-TEEVNGRYXS'),
  ('e1000000-0000-0000-0000-000000000007', 'b1000000-0000-0000-0000-000000000002', 'TEE-VN-GRY-S', 'S', 30, 'BAR-TEEVNGRYS', 'BAR-TEEVNGRYS'),
  ('e1000000-0000-0000-0000-000000000008', 'b1000000-0000-0000-0000-000000000002', 'TEE-VN-GRY-M', 'M', 50, 'BAR-TEEVNGRYM', 'BAR-TEEVNGRYM'),
  ('e1000000-0000-0000-0000-000000000009', 'b1000000-0000-0000-0000-000000000002', 'TEE-VN-GRY-L', 'L', 30, 'BAR-TEEVNGRYL', 'BAR-TEEVNGRYL'),
  ('e1000000-0000-0000-0000-000000000010', 'b1000000-0000-0000-0000-000000000002', 'TEE-VN-GRY-XL', 'XL', 15, 'BAR-TEEVNGRYXL', 'BAR-TEEVNGRYXL')
ON CONFLICT (sku) DO NOTHING;
