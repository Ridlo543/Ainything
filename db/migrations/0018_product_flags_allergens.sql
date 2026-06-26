-- Migration 0018: Add product_dietary_flags and product_allergens tables
--
-- The loadPublishedProducts query in outlet-row-mapper.ts LEFT JOINs both tables,
-- and the Product domain type exposes dietaryFlags and allergens arrays.
-- These tables were referenced in code but never created in a migration.

BEGIN;

-- ---------------------------------------------------------------------------
-- Table: product_dietary_flags
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_dietary_flags (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  outlet_id       uuid        NOT NULL REFERENCES public.outlets (id) ON DELETE CASCADE,
  product_id      uuid        NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  flag_code       text        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, flag_code)
);

ALTER TABLE public.product_dietary_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant can manage product_dietary_flags"
  ON public.product_dietary_flags
  USING (app.has_organization_access(organization_id));

CREATE POLICY "public can read product_dietary_flags"
  ON public.product_dietary_flags
  FOR SELECT
  USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.product_dietary_flags
  TO ainything_app;

-- ---------------------------------------------------------------------------
-- Table: product_allergens
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_allergens (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  outlet_id       uuid        NOT NULL REFERENCES public.outlets (id) ON DELETE CASCADE,
  product_id      uuid        NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  allergen_code   text        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, allergen_code)
);

ALTER TABLE public.product_allergens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant can manage product_allergens"
  ON public.product_allergens
  USING (app.has_organization_access(organization_id));

CREATE POLICY "public can read product_allergens"
  ON public.product_allergens
  FOR SELECT
  USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.product_allergens
  TO ainything_app;

-- Also add is_signature column to products if missing
-- (ProductRow type references is_signature but it's not in migration 0003)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_signature boolean NOT NULL DEFAULT false;

COMMIT;
