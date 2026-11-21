-- Migration: 20261122_cms_and_banners.sql
-- Merchandising CMS Extensions: Storage bucket policies, hero banner columns, and initial config

-- 1. Extend promotional_banners with responsive mobile image and secondary CTA fields
ALTER TABLE public.promotional_banners
ADD COLUMN IF NOT EXISTS mobile_image_url TEXT,
ADD COLUMN IF NOT EXISTS secondary_cta_label TEXT DEFAULT 'Explore Lookbook',
ADD COLUMN IF NOT EXISTS secondary_cta_link TEXT DEFAULT '/about';

-- 2. Ensure initial storefront_config rows exist
INSERT INTO public.storefront_config (key, value, description)
VALUES 
  ('announcement_bar', '{
    "is_active": true,
    "badge": "BOLT 45-MIN DOORSTEP TRY-ON",
    "message": "Try up to 5 pieces at home before buying • Free express delivery on orders over ₹1,999",
    "link_text": "Select Delivery PIN"
  }'::jsonb, 'Global top announcement strip config'),
  ('homepage_sections', '[
    { "id": "hero_carousel", "name": "Hero Carousel", "is_active": true, "order": 1 },
    { "id": "trust_strip", "name": "Value & Trust Badges", "is_active": true, "order": 2 },
    { "id": "marquee", "name": "Fabric & Craft Marquee", "is_active": true, "order": 3 },
    { "id": "product_showcase", "name": "Category Strip & New Arrivals", "is_active": true, "order": 4 },
    { "id": "spotlight_grid", "name": "Featured Collections", "is_active": true, "order": 5 },
    { "id": "newsletter", "name": "Newsletter", "is_active": true, "order": 6 }
  ]'::jsonb, 'Homepage section ordering and visibility')
ON CONFLICT (key) DO NOTHING;

-- 3. Storage bucket setup for promotional banners (also supported under product-media/banners/)
INSERT INTO storage.buckets (id, name, public)
VALUES ('promotional-banners', 'promotional-banners', true)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "Public read promotional-banners" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'promotional-banners');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated upload promotional-banners" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'promotional-banners');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
