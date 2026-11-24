-- =============================================================================
-- Migration: 20261128_verified_reviews_and_ratings.sql
-- Description: Verified Purchase Reviews, Ratings, Fit Consensus & Photo Feedback
-- =============================================================================

-- 1. Create Enums for Review Status and Fashion Fit Indicator
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_status') THEN
        CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected', 'hidden');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fashion_fit_indicator') THEN
        CREATE TYPE fashion_fit_indicator AS ENUM ('runs_small', 'true_to_size', 'runs_large');
    END IF;
END $$;

-- 2. Master Product Reviews Table
CREATE TABLE IF NOT EXISTS public.product_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Rating & Detailed Feedback
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(150) NOT NULL,
    comment TEXT NOT NULL,
    fit_indicator fashion_fit_indicator NOT NULL DEFAULT 'true_to_size',
    
    -- Verified Purchase Context
    verified_purchase BOOLEAN NOT NULL DEFAULT true,
    size_purchased VARCHAR(50),
    is_bolt_try_on BOOLEAN NOT NULL DEFAULT false,
    
    -- Moderation Lifecycle
    status review_status NOT NULL DEFAULT 'pending',
    moderated_by UUID REFERENCES public.users(id),
    moderated_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- Official Atelier Concierge Response
    admin_reply TEXT,
    admin_replied_at TIMESTAMPTZ,
    admin_replied_by UUID REFERENCES public.users(id),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Exactly one review per order item (patron buying two sizes can review each size independently)
    CONSTRAINT unique_review_per_order_item UNIQUE (order_item_id)
);

-- 3. Review Media Attachments Table (Customer Photos)
CREATE TABLE IF NOT EXISTS public.review_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES public.product_reviews(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Add Cached Rating & Fit Aggregates to public.products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3, 2) NOT NULL DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS review_count INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS fit_runs_small_count INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS fit_true_to_size_count INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS fit_runs_large_count INT NOT NULL DEFAULT 0;

-- 5. Trigger Function to Update Product Aggregates Automatically
CREATE OR REPLACE FUNCTION update_product_review_aggregates()
RETURNS TRIGGER AS $$
DECLARE
    target_product_id UUID;
    old_product_id UUID;
BEGIN
    target_product_id := COALESCE(NEW.product_id, OLD.product_id);

    -- If product_id changed during an update, recompute both products
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

    -- Recompute aggregate statistics on the target product
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

-- 6. Indexes for High Performance Queries
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id_status ON public.product_reviews(product_id, status);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON public.product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_order_item_id ON public.product_reviews(order_item_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_status ON public.product_reviews(status);
CREATE INDEX IF NOT EXISTS idx_review_media_review_id ON public.review_media(review_id);

-- 7. Row Level Security Policies
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_media ENABLE ROW LEVEL SECURITY;

-- Product Reviews RLS
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

-- Review Media RLS
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

-- 8. Storage Bucket Registration & Policies
-- Create review-media bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'review-media',
    'review-media',
    true,
    5242880, -- 5 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']::text[];

-- Public can read review media objects
DROP POLICY IF EXISTS "Public Access to review-media" ON storage.objects;
CREATE POLICY "Public Access to review-media"
ON storage.objects
FOR SELECT
USING (bucket_id = 'review-media');

-- Uploads restricted to service_role (via POST /api/reviews/upload server verification)
-- No direct anon/authenticated insert on review-media storage to prevent unauthorized image dumping
