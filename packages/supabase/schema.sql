-- ==============================================================================
-- ATELIER MONOREPO: SUPABASE DATABASE INITIALIZATION SCHEMA
-- Covers: Roles, Products, Orders, Order Items, RLS Policies, and Auth Triggers
-- ==============================================================================

-- 1. Create Custom Enum Types
CREATE TYPE public.user_role AS ENUM ('admin', 'customer', 'delivery');
CREATE TYPE public.order_status AS ENUM ('pending', 'processing', 'out_for_delivery', 'delivered', 'cancelled');
CREATE TYPE public.delivery_mode AS ENUM ('direct', 'try_on');
CREATE TYPE public.try_on_status AS ENUM ('pending', 'active_timer', 'reconciling', 'completed');

-- 2. Create Users Table (Synced with Supabase auth.users)
CREATE TABLE public.users (
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

-- 2b. Create Addresses Table for Patron Saved Addresses
CREATE TABLE public.addresses (
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

-- 3. Create Products Table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url TEXT,
  category TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Create Orders Table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
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
  delivery_partner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  shipping_address TEXT,
  delivery_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Create Order Items Junction Table
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
  is_kept BOOLEAN DEFAULT NULL,
  rejection_reason TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Helper Function to Check Current User Role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.users WHERE id = user_id;
$$;

-- 7. Trigger to Sync Auth Users into public.users
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
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, 'Anonymous'),
    NEW.email,
    NEW.phone
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 8. Updated At Timestamp Automation Trigger
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_products_timestamp
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

CREATE TRIGGER set_orders_timestamp
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

CREATE TRIGGER set_users_timestamp
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

CREATE TRIGGER set_addresses_timestamp
  BEFORE UPDATE ON public.addresses
  FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

-- ==============================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Addresses Policies:
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

-- Products Policies:
-- Anyone can view active products (storefront visitor)
CREATE POLICY "Allow public read access to products"
  ON public.products FOR SELECT
  USING (true);

-- Admins can create, update, delete products
CREATE POLICY "Allow admins full access to products"
  ON public.products FOR ALL
  USING (public.get_user_role(auth.uid()) = 'admin')
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

-- Orders Policies:
-- Customers can view their own orders
CREATE POLICY "Customers can view their own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

-- Customers can insert orders
CREATE POLICY "Customers can place orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Delivery partners can view orders assigned to them
CREATE POLICY "Delivery partners can view assigned orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = delivery_partner_id);

-- Delivery partners can update the status/notes of assigned orders
CREATE POLICY "Delivery partners can update status of assigned orders"
  ON public.orders FOR UPDATE
  USING (auth.uid() = delivery_partner_id)
  WITH CHECK (auth.uid() = delivery_partner_id);

-- Admins have full access to all orders
CREATE POLICY "Admins have full access to orders"
  ON public.orders FOR ALL
  USING (public.get_user_role(auth.uid()) = 'admin')
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

-- Users Policies:
-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Admins can view and update all profiles
CREATE POLICY "Admins can view all user profiles"
  ON public.users FOR ALL
  USING (public.get_user_role(auth.uid()) = 'admin');

-- Order Items Policies:
CREATE POLICY "Users can read their own order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND (orders.user_id = auth.uid() OR orders.delivery_partner_id = auth.uid())
    )
    OR public.get_user_role(auth.uid()) = 'admin'
  );

CREATE POLICY "Customers can create order items"
  ON public.order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND orders.user_id = auth.uid()
    )
  );

-- ==============================================================================
-- 10. STARTER SEED DATA (For local development or initial staging setup)
-- ==============================================================================

INSERT INTO public.products (title, description, price, stock, image_url, category) VALUES
  ('Sculptural Ceramic Vase', 'Hand-thrown stoneware with a matte raw clay finish. Limited edition solo designer piece.', 185.00, 12, 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80', 'Ceramics'),
  ('Minimalist Alabaster Pendant Lamp', 'Carved Spanish alabaster with brushed brass fittings. Warm diffused architectural lighting.', 420.00, 6, 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80', 'Lighting'),
  ('Tailored Linen Studio Smock', 'Heavyweight organic European flax linen. Engineered with deep utility pockets and Japanese horn buttons.', 240.00, 15, 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80', 'Apparel'),
  ('Smoked Walnut Catchall Tray', 'Solid black American walnut hand-carved with continuous fluid grain and natural oil finish.', 95.00, 24, 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80', 'Objects'),
  ('Architectural Leather Tote', 'Vegetable-tanned saddle leather crafted with hand-stitched seams and raw edges.', 360.00, 8, 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80', 'Accessories');
