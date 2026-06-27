-- Migration 0022: Add sort_order column to catalogs table
--
-- The catalogs table (created in 0003) was missing sort_order, but the
-- catalog-admin-service.ts INSERT query and return type already reference it.
-- This is a consistency fix so catalog ordering works like catalog_sections,
-- products, and outlet_payment_methods.

ALTER TABLE public.catalogs
  ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0;

-- Index for default ordering queries
CREATE INDEX IF NOT EXISTS idx_catalogs_sort_order
  ON public.catalogs (outlet_id, sort_order, created_at);
