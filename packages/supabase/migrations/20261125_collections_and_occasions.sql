-- ==============================================================================
-- ATELIER ERP: COLLECTIONS & OCCASIONS MERCHANDISING SCHEMA
-- ==============================================================================

-- 1. Collections & Occasions Master Table
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

-- 2. Junction Table: Many-to-Many Collection <-> Categories
CREATE TABLE IF NOT EXISTS public.collection_categories (
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (collection_id, category_id)
);

-- 3. Junction Table: Optional Pinned Products per Collection
CREATE TABLE IF NOT EXISTS public.collection_products (
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (collection_id, product_id)
);

-- 4. High-Performance Indexes
CREATE INDEX IF NOT EXISTS idx_collections_slug ON public.collections(slug);
CREATE INDEX IF NOT EXISTS idx_collections_display ON public.collections(display_order, is_active);
CREATE INDEX IF NOT EXISTS idx_coll_cats_collection ON public.collection_categories(collection_id);
CREATE INDEX IF NOT EXISTS idx_coll_cats_category ON public.collection_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_coll_prods_collection ON public.collection_products(collection_id);
CREATE INDEX IF NOT EXISTS idx_coll_prods_product ON public.collection_products(product_id);

-- 5. Row-Level Security (RLS)
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_products ENABLE ROW LEVEL SECURITY;

-- Public can read active collections and associations
CREATE POLICY "Allow public select active collections"
  ON public.collections FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Allow public select collection_categories"
  ON public.collection_categories FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public select collection_products"
  ON public.collection_products FOR SELECT
  TO public
  USING (true);

-- Authenticated Admin can perform all operations
CREATE POLICY "Allow admin all on collections"
  ON public.collections FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'service_role' OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Allow admin all on collection_categories"
  ON public.collection_categories FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'service_role' OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Allow admin all on collection_products"
  ON public.collection_products FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'service_role' OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- 6. Initial Seed Curations
INSERT INTO public.collections (name, slug, group_type, description, image_url, display_order, is_active, show_in_navbar, show_on_home)
VALUES
  ('Festivals & Celebrations', 'festivals', 'occasion', 'Artisanal banarasi silks, anarkali sets, and rich festive textures for milestone events.', 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=85', 1, true, true, true),
  ('Royal Weddings', 'weddings', 'occasion', 'Grand ceremonial silhouettes, hand-embroidered kalidars, and heritage weaves.', 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1200&q=85', 2, true, true, true),
  ('Resort & Travel', 'travel', 'occasion', 'Breathable pure linen shirts, relaxed trousers, and easy transit layers.', 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85', 3, true, true, true),
  ('Minimalist Workwear', 'workwear', 'occasion', 'Tailored structured separates, crisp poplin shirts, and muted monochrome layers.', 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1200&q=85', 4, true, true, true)
ON CONFLICT (slug) DO NOTHING;
