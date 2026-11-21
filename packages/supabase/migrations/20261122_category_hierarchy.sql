-- Migration: Dynamic 2-Level Category Hierarchy
-- Adds optional parent_id foreign key to public.categories for subcategories

ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

-- Index for rapid hierarchical queries and subcategory lookups
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);
