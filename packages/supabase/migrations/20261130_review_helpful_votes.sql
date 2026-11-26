-- =============================================================================
-- Migration: 20261130_review_helpful_votes.sql
-- Description: Helpful vote counter and unique voter tracking on product reviews
-- =============================================================================

-- 1. Add helpful_count cache column to product_reviews
ALTER TABLE public.product_reviews
ADD COLUMN IF NOT EXISTS helpful_count INT NOT NULL DEFAULT 0;

-- 2. Track individual helpful votes (supports signed-in patrons & anonymous browser tokens)
CREATE TABLE IF NOT EXISTS public.review_helpful_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES public.product_reviews(id) ON DELETE CASCADE,
    voter_key TEXT NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_helpful_vote_per_voter UNIQUE (review_id, voter_key)
);

CREATE INDEX IF NOT EXISTS idx_review_helpful_votes_review_id
ON public.review_helpful_votes(review_id);

-- 3. Trigger to keep product_reviews.helpful_count synchronized
CREATE OR REPLACE FUNCTION sync_review_helpful_count()
RETURNS TRIGGER AS $$
DECLARE
    target_review_id UUID;
BEGIN
    target_review_id := COALESCE(NEW.review_id, OLD.review_id);

    UPDATE public.product_reviews
    SET helpful_count = (
        SELECT COUNT(*)::int
        FROM public.review_helpful_votes
        WHERE review_id = target_review_id
    )
    WHERE id = target_review_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_review_helpful_count ON public.review_helpful_votes;
CREATE TRIGGER trg_sync_review_helpful_count
AFTER INSERT OR DELETE ON public.review_helpful_votes
FOR EACH ROW EXECUTE FUNCTION sync_review_helpful_count();

-- 4. Row Level Security
ALTER TABLE public.review_helpful_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read helpful vote counts" ON public.review_helpful_votes;
CREATE POLICY "Public can read helpful vote counts"
ON public.review_helpful_votes
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage own helpful votes" ON public.review_helpful_votes;
CREATE POLICY "Authenticated users can manage own helpful votes"
ON public.review_helpful_votes
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
