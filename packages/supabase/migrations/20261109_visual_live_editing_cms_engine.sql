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

