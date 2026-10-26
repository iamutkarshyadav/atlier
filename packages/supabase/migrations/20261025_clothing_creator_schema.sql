-- ==============================================================================
-- ATELIER MONOREPO MIGRATION: CLOTHING CREATOR REDESIGN & SIZE-MATRIX INVENTORY
-- Migration: 20261025_clothing_creator_schema.sql
-- Exclusively Apparel: Hoodies, Tees, Outerwear, Pants with multi-size variants
-- ==============================================================================

-- 1. Ensure product_variants table exists
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

-- 2. Trigger Function to Keep products.stock in sync with sum(product_variants.stock)
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

-- 3. Clear non-clothing categories & products
DELETE FROM public.product_variants WHERE true;
DELETE FROM public.products WHERE category IN ('Ceramics', 'Lighting', 'Sculptural Objects');
DELETE FROM public.categories WHERE slug IN ('ceramics', 'lighting', 'sculptural-objects', 'wearable-art');

-- 4. Provision Creator Clothing Categories
INSERT INTO public.categories (id, name, slug, description, image_url, display_order)
VALUES
  (
    'c1000000-0000-0000-0000-000000000001',
    'Hoodies & Fleece',
    'hoodies',
    'Heavyweight 480 GSM French Terry and loopback brushed cotton fleece hoodies.',
    'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85',
    1
  ),
  (
    'c1000000-0000-0000-0000-000000000002',
    'Tees & Tops',
    'tees',
    'Overdyed 280 GSM combed cotton vintage drop-shoulder tees and thermal waffle tops.',
    'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=85',
    2
  ),
  (
    'c1000000-0000-0000-0000-000000000003',
    'Outerwear & Jackets',
    'outerwear',
    'Weatherproof cropped flight bombers, heavy canvas chore coats, and sculptural overcoats.',
    'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1200&q=85',
    3
  ),
  (
    'c1000000-0000-0000-0000-000000000004',
    'Pants & Denim',
    'pants',
    '14oz Japanese raw selvedge denim, pleated wide-leg trousers, and heavyweight sweatpants.',
    'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1200&q=85',
    4
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  display_order = EXCLUDED.display_order;

-- 5. Seed Premier Creator Apparel Catalog
INSERT INTO public.products (id, title, description, price, stock, image_url, category_id, category, material, edition)
VALUES
  (
    'p1000000-0000-0000-0000-000000000001',
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
    'p1000000-0000-0000-0000-000000000002',
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
    'p1000000-0000-0000-0000-000000000003',
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
    'p1000000-0000-0000-0000-000000000004',
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
    'p1000000-0000-0000-0000-000000000005',
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
    'p1000000-0000-0000-0000-000000000006',
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

-- 6. Insert Multi-Size Variants with Exact Unit Allocation
-- Product 1: Heavyweight Boxy Hoodie
INSERT INTO public.product_variants (product_id, sku, size, color, stock, price_override)
VALUES
  ('p1000000-0000-0000-0000-000000000001', 'HD-BOX-BLK-XS', 'XS', 'Faded Onyx', 10, NULL),
  ('p1000000-0000-0000-0000-000000000001', 'HD-BOX-BLK-S',  'S',  'Faded Onyx', 25, NULL),
  ('p1000000-0000-0000-0000-000000000001', 'HD-BOX-BLK-M',  'M',  'Faded Onyx', 45, NULL),
  ('p1000000-0000-0000-0000-000000000001', 'HD-BOX-BLK-L',  'L',  'Faded Onyx', 25, NULL),
  ('p1000000-0000-0000-0000-000000000001', 'HD-BOX-BLK-XL', 'XL', 'Faded Onyx', 10, NULL)
ON CONFLICT (sku) DO UPDATE SET stock = EXCLUDED.stock;

-- Product 2: Vintage Washed Boxy Tee
INSERT INTO public.product_variants (product_id, sku, size, color, stock, price_override)
VALUES
  ('p1000000-0000-0000-0000-000000000002', 'TEE-VNTG-WHT-XS', 'XS', 'Chalk White', 15, NULL),
  ('p1000000-0000-0000-0000-000000000002', 'TEE-VNTG-WHT-S',  'S',  'Chalk White', 30, NULL),
  ('p1000000-0000-0000-0000-000000000002', 'TEE-VNTG-WHT-M',  'M',  'Chalk White', 50, NULL),
  ('p1000000-0000-0000-0000-000000000002', 'TEE-VNTG-WHT-L',  'L',  'Chalk White', 35, NULL),
  ('p1000000-0000-0000-0000-000000000002', 'TEE-VNTG-WHT-XL', 'XL', 'Chalk White', 10, NULL)
ON CONFLICT (sku) DO UPDATE SET stock = EXCLUDED.stock;

-- Product 3: Cropped Weatherproof Flight Bomber
INSERT INTO public.product_variants (product_id, sku, size, color, stock, price_override)
VALUES
  ('p1000000-0000-0000-0000-000000000003', 'BMB-CR-BLK-S',  'S',  'Pitch Black', 10, NULL),
  ('p1000000-0000-0000-0000-000000000003', 'BMB-CR-BLK-M',  'M',  'Pitch Black', 25, NULL),
  ('p1000000-0000-0000-0000-000000000003', 'BMB-CR-BLK-L',  'L',  'Pitch Black', 15, NULL),
  ('p1000000-0000-0000-0000-000000000003', 'BMB-CR-BLK-XL', 'XL', 'Pitch Black', 5, NULL)
ON CONFLICT (sku) DO UPDATE SET stock = EXCLUDED.stock;

-- Product 4: Pleated Selvedge Carpenter Pant
INSERT INTO public.product_variants (product_id, sku, size, color, stock, price_override)
VALUES
  ('p1000000-0000-0000-0000-000000000004', 'PNT-SLV-30', '30', 'Raw Black', 15, NULL),
  ('p1000000-0000-0000-0000-000000000004', 'PNT-SLV-32', '32', 'Raw Black', 30, NULL),
  ('p1000000-0000-0000-0000-000000000004', 'PNT-SLV-34', '34', 'Raw Black', 20, NULL),
  ('p1000000-0000-0000-0000-000000000004', 'PNT-SLV-36', '36', 'Raw Black', 10, NULL)
ON CONFLICT (sku) DO UPDATE SET stock = EXCLUDED.stock;

-- Product 5: Architectural Raw Linen Smock
INSERT INTO public.product_variants (product_id, sku, size, color, stock, price_override)
VALUES
  ('p1000000-0000-0000-0000-000000000005', 'SMK-LNN-T1', 'Taille 01 (S/M)', 'Natural Ecru', 20, NULL),
  ('p1000000-0000-0000-0000-000000000005', 'SMK-LNN-T2', 'Taille 02 (L/XL)', 'Natural Ecru', 25, NULL)
ON CONFLICT (sku) DO UPDATE SET stock = EXCLUDED.stock;

-- Product 6: Relaxed Flared Minimalist Track Pant
INSERT INTO public.product_variants (product_id, sku, size, color, stock, price_override)
VALUES
  ('p1000000-0000-0000-0000-000000000006', 'TRK-FLR-BLK-S',  'S',  'Washed Ink', 15, NULL),
  ('p1000000-0000-0000-0000-000000000006', 'TRK-FLR-BLK-M',  'M',  'Washed Ink', 35, NULL),
  ('p1000000-0000-0000-0000-000000000006', 'TRK-FLR-BLK-L',  'L',  'Washed Ink', 20, NULL),
  ('p1000000-0000-0000-0000-000000000006', 'TRK-FLR-BLK-XL', 'XL', 'Washed Ink', 10, NULL)
ON CONFLICT (sku) DO UPDATE SET stock = EXCLUDED.stock;

-- 7. Update Storefront CMS Defaults to Clothing Drop 01
INSERT INTO public.storefront_config (key, value, description)
VALUES
  (
    'hero',
    '{
      "kicker": "CREATOR CAPSULE // DROP 001",
      "headline": "AUTONOMOUS",
      "headlineItalic": "GARMENTS",
      "description": "Engineered heavyweight silhouettes cut from custom 480 GSM French Terry, 14oz Japanese selvedge denim, and technical outerwear. Made for the creator.",
      "ctaLabel": "SHOP DROP 01",
      "ctaLink": "/shop",
      "secondaryCategory": "Hoodies & Fleece",
      "featuredProductId": "p1000000-0000-0000-0000-000000000001"
    }'::jsonb,
    'Storefront Creator Apparel Hero Section'
  ),
  (
    'ethos',
    '{
      "title": "FABRIC LAB & SILHOUETTE SPECIFICATION",
      "subtitle": "480 GSM FRENCH TERRY • 14OZ RAW SELVEDGE • 280 GSM COMBED JERSEY",
      "body": "Every piece is designed from the yarn up. We mill custom heavyweight knits with zero synthetic polyester blending, resulting in substantial drape, enduring structure, and tactile luxury."
    }'::jsonb,
    'Storefront Creator Fabric Philosophy'
  )
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = timezone('utc'::text, now());
