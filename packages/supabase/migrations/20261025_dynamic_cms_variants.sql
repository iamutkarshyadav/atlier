-- ==============================================================================
-- ATELIER MONOREPO MIGRATION: DYNAMIC CMS & ADVANCED PRODUCT VARIANTS (PIM)
-- Migration: 20261025_dynamic_cms_variants.sql
-- ==============================================================================

-- 1. Product Media Asset Management Table
CREATE TABLE IF NOT EXISTS public.product_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt_text TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  media_type TEXT NOT NULL DEFAULT 'image', -- 'image' | 'video'
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_product_media_product_id ON public.product_media(product_id);
CREATE INDEX IF NOT EXISTS idx_product_media_display_order ON public.product_media(display_order);

-- 2. Product Variants Engine Table (Size, Color, SKU, Stock & Price Overrides)
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku TEXT UNIQUE NOT NULL,
  size TEXT NOT NULL,
  color TEXT DEFAULT NULL,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  price_override NUMERIC(10, 2) DEFAULT NULL CHECK (price_override IS NULL OR price_override >= 0),
  barcode TEXT DEFAULT NULL,
  weight_grams INTEGER DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON public.product_variants(sku);

-- Trigger for product_variants updated_at
CREATE OR REPLACE TRIGGER set_product_variants_timestamp
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

-- 3. Dynamic Storefront CMS Configuration Table (Key-Value / JSONB Layout Engine)
CREATE TABLE IF NOT EXISTS public.storefront_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_storefront_config_key ON public.storefront_config(key);

-- 4. Promotional Banners Table (Hero Announcements, Active Dates, CTA Links)
CREATE TABLE IF NOT EXISTS public.promotional_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  badge_text TEXT,
  image_url TEXT,
  cta_label TEXT NOT NULL DEFAULT 'Explore Catalogue',
  cta_link TEXT NOT NULL DEFAULT '/shop',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  start_date TIMESTAMPTZ DEFAULT NULL,
  end_date TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_promotional_banners_active ON public.promotional_banners(is_active);
CREATE INDEX IF NOT EXISTS idx_promotional_banners_display_order ON public.promotional_banners(display_order);

-- Trigger for promotional_banners updated_at
CREATE OR REPLACE TRIGGER set_promotional_banners_timestamp
  BEFORE UPDATE ON public.promotional_banners
  FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

-- 5. Row-Level Security (RLS) Configuration
ALTER TABLE public.product_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotional_banners ENABLE ROW LEVEL SECURITY;

-- Product Media Policies: Public read, Admin write
DROP POLICY IF EXISTS "Public can view product media" ON public.product_media;
CREATE POLICY "Public can view product media"
  ON public.product_media FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage product media" ON public.product_media;
CREATE POLICY "Admins can manage product media"
  ON public.product_media FOR ALL
  USING (public.get_user_role(auth.uid()) = 'admin')
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

-- Product Variants Policies: Public read, Admin write
DROP POLICY IF EXISTS "Public can view product variants" ON public.product_variants;
CREATE POLICY "Public can view product variants"
  ON public.product_variants FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage product variants" ON public.product_variants;
CREATE POLICY "Admins can manage product variants"
  ON public.product_variants FOR ALL
  USING (public.get_user_role(auth.uid()) = 'admin')
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

-- Storefront Config Policies: Public read, Admin write
DROP POLICY IF EXISTS "Public can view storefront config" ON public.storefront_config;
CREATE POLICY "Public can view storefront config"
  ON public.storefront_config FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage storefront config" ON public.storefront_config;
CREATE POLICY "Admins can manage storefront config"
  ON public.storefront_config FOR ALL
  USING (public.get_user_role(auth.uid()) = 'admin')
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

-- Promotional Banners Policies: Public read, Admin write
DROP POLICY IF EXISTS "Public can view promotional banners" ON public.promotional_banners;
CREATE POLICY "Public can view promotional banners"
  ON public.promotional_banners FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage promotional banners" ON public.promotional_banners;
CREATE POLICY "Admins can manage promotional banners"
  ON public.promotional_banners FOR ALL
  USING (public.get_user_role(auth.uid()) = 'admin')
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

-- 6. Initial Seed Data for Storefront CMS Config
INSERT INTO public.storefront_config (key, value, description)
VALUES 
  ('hero', '{
    "kicker": "Collection N° 04 • Autumn Archive",
    "headline": "Tactile forms.",
    "headlineItalic": "Mindful permanence.",
    "description": "Every creation is conceptualized, prototyped, and finished by hand in our private atelier. Strict single-run numbered production guarantees unrepeatable rarity.",
    "ctaLabel": "Explore Catalogue",
    "ctaLink": "/shop",
    "secondaryCategory": "Ceramics",
    "featuredProductId": "a1111111-1111-1111-1111-111111111111"
  }'::jsonb, 'Storefront hero section dynamic configuration'),
  ('ethos', '{
    "pretitle": "The Atelier Ethos",
    "statement": "We reject rapid seasons. We honor natural irregularities, dense raw fibers, and the indelible patina of age.",
    "subtext": "Solo Practice • Paris • Tokyo • New York"
  }'::jsonb, 'Brand statement editorial banner'),
  ('featured_collection', '{
    "title": "Active Editions",
    "kicker": "Curated Selections",
    "limit": 6,
    "viewAllLink": "/shop"
  }'::jsonb, 'Storefront homepage featured product grid configuration')
ON CONFLICT (key) DO NOTHING;

-- Initial Seed Data for Promotional Banners
INSERT INTO public.promotional_banners (title, subtitle, badge_text, image_url, cta_label, cta_link, display_order, is_active)
VALUES
  (
    'Private Autumn Fitting Salon',
    'Experience our complete Belgian linen and selvedge smock collection in the sanctuary of your residence with an atelier courier.',
    'Haute Couture Privilege',
    '/images/auth-editorial.jpg',
    'Reserve 45m Doorstep Fitting',
    '/shop',
    1,
    TRUE
  )
ON CONFLICT DO NOTHING;
