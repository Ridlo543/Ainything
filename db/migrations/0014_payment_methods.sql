-- Migration 0014: Outlet payment methods
--
-- Stores per-outlet payment configuration: QRIS static, bank transfer,
-- e-wallet, cash, or other custom methods.
--
-- Design notes:
-- - No payment gateway integration — purely informational display to buyers.
-- - Outlet owner configures their own QRIS/account details.
-- - Buyers see this after placing an order (order confirmation page).
-- - Scoped by organization_id + outlet_id for strict tenant isolation.

BEGIN;

-- ---------------------------------------------------------------------------
-- Table: outlet_payment_methods
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.outlet_payment_methods (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid        NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  outlet_id        uuid        NOT NULL REFERENCES public.outlets (id) ON DELETE CASCADE,

  -- Payment method type
  type             text        NOT NULL
                               CHECK (type IN ('qris','bank_transfer','ewallet','cash','other')),

  -- Display label, e.g. "BCA", "GoPay", "QRIS BRI Syariah"
  label            text        NOT NULL CHECK (char_length(label) BETWEEN 1 AND 100),

  -- Account/wallet number or identifier (nullable for QRIS and cash)
  account_number   text        CHECK (char_length(account_number) <= 100),

  -- Name of account holder (nullable for QRIS and cash)
  account_name     text        CHECK (char_length(account_name) <= 100),

  -- URL to the QR image (QRIS static image uploaded to storage)
  qr_image_url     text        CHECK (char_length(qr_image_url) <= 2048),

  -- Optional extra instructions shown to buyer
  instructions     text        CHECK (char_length(instructions) <= 500),

  is_active        boolean     NOT NULL DEFAULT true,
  sort_order       int         NOT NULL DEFAULT 0,

  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Each outlet can have at most one cash entry (no duplicates needed)
-- All other types allow multiple (e.g. two different bank accounts)

CREATE INDEX IF NOT EXISTS outlet_payment_methods_outlet_idx
  ON public.outlet_payment_methods (outlet_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS outlet_payment_methods_org_idx
  ON public.outlet_payment_methods (organization_id);

DROP TRIGGER IF EXISTS set_outlet_payment_methods_updated_at
  ON public.outlet_payment_methods;
CREATE TRIGGER set_outlet_payment_methods_updated_at
  BEFORE UPDATE ON public.outlet_payment_methods
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.outlet_payment_methods ENABLE ROW LEVEL SECURITY;

-- Org members can read their own payment methods
DROP POLICY IF EXISTS "org members can read payment methods"
  ON public.outlet_payment_methods;
CREATE POLICY "org members can read payment methods"
  ON public.outlet_payment_methods
  FOR SELECT
  USING (
    organization_id::text = current_setting('app.current_org_id', true)
  );

-- Org members can write their own payment methods
DROP POLICY IF EXISTS "org members can write payment methods"
  ON public.outlet_payment_methods;
CREATE POLICY "org members can write payment methods"
  ON public.outlet_payment_methods
  FOR ALL
  USING (
    organization_id::text = current_setting('app.current_org_id', true)
  )
  WITH CHECK (
    organization_id::text = current_setting('app.current_org_id', true)
  );

-- Public reads for order confirmation pages (no auth required)
-- Scoped to outlet_id only — no org context needed for buyer-facing reads.
DROP POLICY IF EXISTS "public can read active payment methods"
  ON public.outlet_payment_methods;
CREATE POLICY "public can read active payment methods"
  ON public.outlet_payment_methods
  FOR SELECT
  USING (is_active = true);

-- ---------------------------------------------------------------------------
-- GRANTs
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.outlet_payment_methods
  TO ainything_app;

COMMIT;
