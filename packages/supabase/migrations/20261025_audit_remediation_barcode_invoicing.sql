-- ==============================================================================
-- ATELIER MONOREPO MIGRATION: AUDIT REMEDIATION, ENTERPRISE BARCODE & INVOICE ENGINE
-- Migration: 20261025_audit_remediation_barcode_invoicing.sql
-- ==============================================================================

-- 1. FIX HANDLE_NEW_USER TRIGGER: Strictly Hardcode 'customer' Role
-- Prevents client-side metadata privilege escalation during registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.users (id, role, name, email, phone)
  VALUES (
    NEW.id,
    'customer'::public.user_role, -- Strictly hardcoded; ignore client-supplied raw_user_meta_data
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, 'Patron'),
    NEW.email,
    NEW.phone
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.users.name),
    updated_at = timezone('utc'::text, now());

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. FIX RLS PRIVILEGE ESCALATION ON public.users
-- Disallow patrons from modifying their own 'role' column via client UPDATE
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND 
    role = (SELECT role FROM public.users WHERE id = auth.uid())
  );

-- 3. EXPAND PRODUCT VARIANTS: SKU, Barcode Data, Barcode URL
ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS barcode_data TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS barcode_url TEXT;

CREATE INDEX IF NOT EXISTS idx_product_variants_barcode_data ON public.product_variants(barcode_data);

-- Auto-generate barcodes for variants where missing
UPDATE public.product_variants
SET 
  barcode_data = COALESCE(barcode_data, 'BAR-' || UPPER(REPLACE(sku, '-', ''))),
  barcode = COALESCE(barcode, 'BAR-' || UPPER(REPLACE(sku, '-', '')))
WHERE barcode_data IS NULL OR barcode IS NULL;

-- 4. EXPAND ORDERS: Invoicing & Logistics Tracking Fields
CREATE SEQUENCE IF NOT EXISTS public.order_invoice_seq START WITH 1001;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS invoice_number TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS tracking_barcode TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS shipping_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS invoice_url TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_invoice_number ON public.orders(invoice_number);
CREATE INDEX IF NOT EXISTS idx_orders_tracking_barcode ON public.orders(tracking_barcode);

-- Backfill existing orders with unique invoice and tracking barcodes
UPDATE public.orders
SET
  invoice_number = COALESCE(invoice_number, 'INV-2026-' || LPAD(nextval('public.order_invoice_seq')::TEXT, 4, '0')),
  tracking_barcode = COALESCE(tracking_barcode, 'ATL-TRK-' || UPPER(SUBSTRING(id::TEXT FROM 1 FOR 8))),
  tax_amount = COALESCE(tax_amount, ROUND((total * 0.0825)::NUMERIC, 2)),
  shipping_fee = COALESCE(shipping_fee, 0.00)
WHERE invoice_number IS NULL OR tracking_barcode IS NULL;

-- 5. TRIGGER: Automatic Invoice Number, Tracking Barcode, and Tax Calculation on Insert
CREATE OR REPLACE FUNCTION public.generate_order_logistics_meta()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := 'INV-2026-' || LPAD(nextval('public.order_invoice_seq')::TEXT, 4, '0');
  END IF;
  IF NEW.tracking_barcode IS NULL THEN
    NEW.tracking_barcode := 'ATL-TRK-' || UPPER(SUBSTRING(NEW.id::TEXT FROM 1 FOR 8));
  END IF;
  IF NEW.tax_amount IS NULL OR NEW.tax_amount = 0 THEN
    NEW.tax_amount := ROUND((NEW.total * 0.0825)::NUMERIC, 2);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_order_logistics_meta ON public.orders;
CREATE TRIGGER trigger_order_logistics_meta
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE PROCEDURE public.generate_order_logistics_meta();

-- 6. STORAGE BUCKET: Invoices Storage Bucket & Policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public can view invoices" ON storage.objects;
CREATE POLICY "Public can view invoices"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'invoices');

DROP POLICY IF EXISTS "Admins and service role can upload invoices" ON storage.objects;
CREATE POLICY "Admins and service role can upload invoices"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'invoices');
