-- Migration: Widen supplier GSTIN column to VARCHAR(25) to accommodate international tax IDs and prevent hard insert errors
ALTER TABLE public.suppliers ALTER COLUMN gstin TYPE VARCHAR(25);
