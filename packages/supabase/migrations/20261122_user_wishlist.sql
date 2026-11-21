-- Migration: End-to-End User Wishlist Architecture
-- Creates public.wishlist_items table with Row Level Security and indexes

CREATE TABLE IF NOT EXISTS public.wishlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, product_id)
);

-- Indexes for rapid lookup by user and product
CREATE INDEX IF NOT EXISTS idx_wishlist_items_user_id ON public.wishlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_product_id ON public.wishlist_items(product_id);

-- Enable Row Level Security
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

-- Policies: Authenticated users can only read, insert, and delete their own wishlist records
DROP POLICY IF EXISTS "Users read own wishlist items" ON public.wishlist_items;
CREATE POLICY "Users read own wishlist items"
  ON public.wishlist_items
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own wishlist items" ON public.wishlist_items;
CREATE POLICY "Users insert own wishlist items"
  ON public.wishlist_items
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own wishlist items" ON public.wishlist_items;
CREATE POLICY "Users delete own wishlist items"
  ON public.wishlist_items
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
