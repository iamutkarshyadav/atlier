-- ==============================================================================
-- ATELIER PLATFORM: REALTIME, OCCASIONS & INVENTORY SYNC REMEDIATION
-- Migration: 20261126_realtime_and_inventory_sync.sql
-- ==============================================================================

-- 0. Ensure Categories Hierarchy (parent_id) Exists
ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);

-- 1. Ensure Collections & Occasions Master Tables Exist
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

-- 1b. Ensure Wishlist Items Master Table Exists
CREATE TABLE IF NOT EXISTS public.wishlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, product_id)
);

-- 2. High-Performance Indexes for Occasions, Collections & Wishlists
CREATE INDEX IF NOT EXISTS idx_collections_slug ON public.collections(slug);
CREATE INDEX IF NOT EXISTS idx_collections_display ON public.collections(display_order, is_active);
CREATE INDEX IF NOT EXISTS idx_coll_cats_collection ON public.collection_categories(collection_id);
CREATE INDEX IF NOT EXISTS idx_coll_cats_category ON public.collection_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_coll_prods_collection ON public.collection_products(collection_id);
CREATE INDEX IF NOT EXISTS idx_coll_prods_product ON public.collection_products(product_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_user_id ON public.wishlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_product_id ON public.wishlist_items(product_id);

-- 3. Row-Level Security for Collections & Wishlists
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public select active collections') THEN
    CREATE POLICY "Allow public select active collections" ON public.collections FOR SELECT TO public USING (is_active = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public select collection_categories') THEN
    CREATE POLICY "Allow public select collection_categories" ON public.collection_categories FOR SELECT TO public USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public select collection_products') THEN
    CREATE POLICY "Allow public select collection_products" ON public.collection_products FOR SELECT TO public USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow staff all on collections') THEN
    CREATE POLICY "Allow staff all on collections" ON public.collections FOR ALL TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow staff all on collection_categories') THEN
    CREATE POLICY "Allow staff all on collection_categories" ON public.collection_categories FOR ALL TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow staff all on collection_products') THEN
    CREATE POLICY "Allow staff all on collection_products" ON public.collection_products FOR ALL TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users read own wishlist items') THEN
    CREATE POLICY "Users read own wishlist items" ON public.wishlist_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users insert own wishlist items') THEN
    CREATE POLICY "Users insert own wishlist items" ON public.wishlist_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users delete own wishlist items') THEN
    CREATE POLICY "Users delete own wishlist items" ON public.wishlist_items FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

-- 4. Idempotent Realtime Publication Setup
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.collections;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_levels;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.wishlist_items;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5. Full Replica Identity for Event Broadcasting
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.order_items REPLICA IDENTITY FULL;
ALTER TABLE public.collections REPLICA IDENTITY FULL;
ALTER TABLE public.wishlist_items REPLICA IDENTITY FULL;
ALTER TABLE public.categories REPLICA IDENTITY FULL;

-- 6. Ensure Primary Fulfillment Hub (BLR-WH01) Exists
INSERT INTO public.locations (
  id, name, code, type, is_active, online_fulfillment_priority, city, state, pincode, gstin, state_code, address_line1, phone
) VALUES (
  'd1000000-0000-0000-0000-000000000001',
  'Bengaluru Central Fulfillment Hub',
  'BLR-WH01',
  'warehouse',
  true,
  1,
  'Bengaluru',
  'Karnataka',
  '560038',
  '29AAAAA0000A1Z5',
  '29',
  '12 Victoria Road, Indiranagar',
  '+91 80 4123 4567'
) ON CONFLICT (id) DO UPDATE SET is_active = true, online_fulfillment_priority = 1;

-- 7. Idempotent Backfill of inventory_levels for All Existing Product Variants
INSERT INTO public.inventory_levels (
  location_id,
  variant_id,
  on_hand,
  reserved,
  available,
  created_at,
  updated_at
)
SELECT
  'd1000000-0000-0000-0000-000000000001'::uuid AS location_id,
  pv.id AS variant_id,
  COALESCE(pv.stock, 25) AS on_hand,
  0 AS reserved,
  COALESCE(pv.stock, 25) AS available,
  timezone('utc'::text, now()),
  timezone('utc'::text, now())
FROM public.product_variants pv
ON CONFLICT (location_id, variant_id) DO NOTHING;

-- 8. Seed Initial Occasions Curations (If Not Exists)
INSERT INTO public.collections (name, slug, group_type, description, image_url, display_order, is_active, show_in_navbar, show_on_home)
VALUES
  ('Festivals & Celebrations', 'festivals', 'occasion', 'Artisanal banarasi silks, anarkali sets, and rich festive textures for milestone events.', 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=85', 1, true, true, true),
  ('Royal Weddings', 'weddings', 'occasion', 'Grand ceremonial silhouettes, hand-embroidered kalidars, and heritage weaves.', 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1200&q=85', 2, true, true, true),
  ('Resort & Travel', 'travel', 'occasion', 'Breathable pure linen shirts, relaxed trousers, and easy transit layers.', 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85', 3, true, true, true),
  ('Minimalist Workwear', 'workwear', 'occasion', 'Tailored structured separates, crisp poplin shirts, and muted monochrome layers.', 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1200&q=85', 4, true, true, true)
ON CONFLICT (slug) DO NOTHING;
