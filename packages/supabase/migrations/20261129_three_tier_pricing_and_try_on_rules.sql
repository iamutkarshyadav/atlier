-- ==============================================================================
-- ATELIER ENTERPRISE: THREE-TIER PRICING WATERFALL, TRY-ON GATING & BOOLEAN RULES
-- Migration: 20261129_three_tier_pricing_and_try_on_rules.sql
-- ==============================================================================

-- 1. Products Table: Bolt 45-Min Try-On Eligibility Flag
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_try_on_eligible BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_products_is_try_on_eligible 
  ON public.products(is_try_on_eligible);

-- 2. Promotion Coupons Table: Explicit Public Auto-Discovery Flag
-- Guardrail 2: Only active, public, unassigned coupons may be auto-surfaced on cards / PDP
ALTER TABLE public.promotion_coupons
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_promotion_coupons_is_public 
  ON public.promotion_coupons(is_public);

-- 3. Extend rule_target_type Enum for Granular Targeting
DO $$ BEGIN
  ALTER TYPE public.rule_target_type ADD VALUE IF NOT EXISTS 'subcategory';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.rule_target_type ADD VALUE IF NOT EXISTS 'try_on_eligible';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.rule_target_type ADD VALUE IF NOT EXISTS 'specific_sku';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. Promotion Rules Table: Boolean Rule Groups & Multi-Value Targeting
ALTER TABLE public.promotion_rules
  ADD COLUMN IF NOT EXISTS rule_group_id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS target_values TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_promotion_rules_group 
  ON public.promotion_rules(rule_group_id);

CREATE INDEX IF NOT EXISTS idx_promotion_rules_target_type 
  ON public.promotion_rules(target_type);

-- 5. Promotions Table: Explicit 3-Tier Discount Classification
-- Tier 1 = Catalog Markdown, Tier 2 = Item/Category Coupon, Tier 3 = Cart Threshold Offer
ALTER TABLE public.promotions
  ADD COLUMN IF NOT EXISTS tier INT NOT NULL DEFAULT 2 CHECK (tier IN (1, 2, 3));

CREATE INDEX IF NOT EXISTS idx_promotions_tier 
  ON public.promotions(tier);

-- 6. Pop-Up Campaigns Relational Table (Live Join to Promotions)
-- Guardrail 5: Link popup_campaigns to promotions via foreign key for real-time validity
CREATE TABLE IF NOT EXISTS public.popup_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID REFERENCES public.promotions(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  headline VARCHAR(255) NOT NULL,
  subheadline TEXT,
  content TEXT,
  badge_text VARCHAR(100),
  type VARCHAR(50) NOT NULL DEFAULT 'sale',
  surface_tier VARCHAR(50) NOT NULL DEFAULT 'bottom_sheet' CHECK (surface_tier IN ('top_bar', 'bottom_sheet', 'floating_pill', 'center_modal')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  banner_image_url TEXT,
  position VARCHAR(50) NOT NULL DEFAULT 'bottom_right',
  trigger_type VARCHAR(50) NOT NULL DEFAULT 'scroll' CHECK (trigger_type IN ('immediate', 'delay', 'scroll', 'exit_intent', 'landing_scroll', 'eligible_pdp_view', 'cart_threshold_near')),
  trigger_delay_seconds INT DEFAULT 3,
  trigger_scroll_percentage INT DEFAULT 40,
  target_pages TEXT[] NOT NULL DEFAULT '{"*"}',
  frequency VARCHAR(50) NOT NULL DEFAULT 'once_per_session',
  priority_rank INT NOT NULL DEFAULT 50,
  cooldown_minutes INT NOT NULL DEFAULT 1440,
  primary_cta JSONB DEFAULT NULL,
  secondary_cta JSONB DEFAULT NULL,
  impression_count INT NOT NULL DEFAULT 0,
  click_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_popup_campaigns_promotion_id ON public.popup_campaigns(promotion_id);
CREATE INDEX IF NOT EXISTS idx_popup_campaigns_surface ON public.popup_campaigns(surface_tier, is_active);

-- Enable RLS for popup_campaigns
ALTER TABLE public.popup_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active popups" ON public.popup_campaigns;
CREATE POLICY "Public can view active popups"
  ON public.popup_campaigns FOR SELECT
  TO public
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage popups" ON public.popup_campaigns;
CREATE POLICY "Admins can manage popups"
  ON public.popup_campaigns FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
