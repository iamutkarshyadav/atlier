-- Migration: Enable authoritative RLS policies on public.suppliers
-- Allows administrative and authenticated users to read, insert, update, and delete supplier records

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.suppliers;
CREATE POLICY "Enable read access for all authenticated users"
  ON public.suppliers FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.suppliers;
CREATE POLICY "Enable insert access for authenticated users"
  ON public.suppliers FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.suppliers;
CREATE POLICY "Enable update access for authenticated users"
  ON public.suppliers FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.suppliers;
CREATE POLICY "Enable delete access for authenticated users"
  ON public.suppliers FOR DELETE
  TO authenticated, anon
  USING (true);
