-- Idempotent upsert of Kurta Sets taxonomy and subcategory imagery

-- 1. Ensure Kurta Sets Parent Category exists
INSERT INTO public.categories (id, parent_id, name, slug, description, image_url, display_order)
VALUES (
  'c1000000-0000-0000-0000-000000000005',
  NULL,
  'Kurta Sets',
  'kurta-sets',
  'Artisanal hand-embroidered, chanderi silk, and architectural silhouette kurta ensembles.',
  'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1200&q=85',
  1
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  display_order = EXCLUDED.display_order;

-- 2. Upsert Kurta Sets Subcategories
INSERT INTO public.categories (id, parent_id, name, slug, description, image_url, display_order)
VALUES
  (
    'c1000000-0000-0000-0000-000000000051',
    'c1000000-0000-0000-0000-000000000005',
    'Anarkali Sets',
    'anarkali-sets',
    'Flared floor-length kalidar kurtas with churidar and hand-woven dupattas.',
    'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=85',
    1
  ),
  (
    'c1000000-0000-0000-0000-000000000052',
    'c1000000-0000-0000-0000-000000000005',
    'Straight Cut Sets',
    'straight-cut-sets',
    'Clean-lined raw silk and chanderi kurtas paired with cigarette trousers.',
    'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=85',
    2
  ),
  (
    'c1000000-0000-0000-0000-000000000053',
    'c1000000-0000-0000-0000-000000000005',
    'Bandhani & Banarasi Sets',
    'bandhani-banarasi-sets',
    'Heritage zari brocades and tie-dye artisanal silk ensembles.',
    'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=85',
    3
  ),
  (
    'c1000000-0000-0000-0000-000000000054',
    'c1000000-0000-0000-0000-000000000005',
    'Velvet & Festive Sets',
    'velvet-festive-sets',
    'Plush micro-velvet kurtas embellished with zardozi and antique tilla embroidery.',
    'https://images.unsplash.com/photo-1596783074918-c84cb06531ca?auto=format&fit=crop&w=800&q=85',
    4
  ),
  (
    'c1000000-0000-0000-0000-000000000055',
    'c1000000-0000-0000-0000-000000000005',
    'Short Kurta & Sharara Sets',
    'sharara-sets',
    'Contemporary peplum short kurtas with tiered flared sharara bottoms.',
    'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=800&q=85',
    5
  )
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  display_order = EXCLUDED.display_order;

-- 3. Update existing subcategory images
UPDATE public.categories SET image_url = 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=85' WHERE id = 'c1000000-0000-0000-0000-000000000011' AND (image_url IS NULL OR image_url = '');
UPDATE public.categories SET image_url = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=85' WHERE id = 'c1000000-0000-0000-0000-000000000012' AND (image_url IS NULL OR image_url = '');
UPDATE public.categories SET image_url = 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=800&q=85' WHERE id = 'c1000000-0000-0000-0000-000000000013' AND (image_url IS NULL OR image_url = '');
UPDATE public.categories SET image_url = 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=85' WHERE id = 'c1000000-0000-0000-0000-000000000021' AND (image_url IS NULL OR image_url = '');
UPDATE public.categories SET image_url = 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=800&q=85' WHERE id = 'c1000000-0000-0000-0000-000000000022' AND (image_url IS NULL OR image_url = '');
UPDATE public.categories SET image_url = 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=800&q=85' WHERE id = 'c1000000-0000-0000-0000-000000000023' AND (image_url IS NULL OR image_url = '');
UPDATE public.categories SET image_url = 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=85' WHERE id = 'c1000000-0000-0000-0000-000000000031' AND (image_url IS NULL OR image_url = '');
UPDATE public.categories SET image_url = 'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=800&q=85' WHERE id = 'c1000000-0000-0000-0000-000000000032' AND (image_url IS NULL OR image_url = '');
UPDATE public.categories SET image_url = 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=800&q=85' WHERE id = 'c1000000-0000-0000-0000-000000000033' AND (image_url IS NULL OR image_url = '');
UPDATE public.categories SET image_url = 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=800&q=85' WHERE id = 'c1000000-0000-0000-0000-000000000041' AND (image_url IS NULL OR image_url = '');
UPDATE public.categories SET image_url = 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=800&q=85' WHERE id = 'c1000000-0000-0000-0000-000000000042' AND (image_url IS NULL OR image_url = '');
UPDATE public.categories SET image_url = 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?auto=format&fit=crop&w=800&q=85' WHERE id = 'c1000000-0000-0000-0000-000000000043' AND (image_url IS NULL OR image_url = '');
