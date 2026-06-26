-- Migration 0015: Checkout settings + WhatsApp order flow
-- Adds buyer_whatsapp, payment proof, and payment confirmation to orders.
-- Adds whatsapp to buyer_sessions for re-use across orders (no re-entry needed).
-- Checkout mode and WA requirement flags live in outlets.settings JSONB.

-- ---------------------------------------------------------------------------
-- orders: payment and WA fields
-- ---------------------------------------------------------------------------

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS buyer_whatsapp        text,
  ADD COLUMN IF NOT EXISTS payment_proof_url     text,
  ADD COLUMN IF NOT EXISTS payment_confirmed_at  timestamptz,
  ADD COLUMN IF NOT EXISTS payment_confirmed_by  uuid REFERENCES app_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_rejected_at   timestamptz,
  ADD COLUMN IF NOT EXISTS payment_rejected_by   uuid REFERENCES app_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_notes         text;

-- Index for staff dashboard queries: pending payment confirmation per outlet
CREATE INDEX IF NOT EXISTS idx_orders_payment_pending
  ON orders (outlet_id, organization_id, created_at DESC)
  WHERE payment_proof_url IS NOT NULL
    AND payment_confirmed_at IS NULL
    AND payment_rejected_at IS NULL
    AND status NOT IN ('completed', 'cancelled');

-- ---------------------------------------------------------------------------
-- buyer_sessions: persist WA number so buyer doesn't re-enter it
-- ---------------------------------------------------------------------------

ALTER TABLE buyer_sessions
  ADD COLUMN IF NOT EXISTS whatsapp text;

-- ---------------------------------------------------------------------------
-- outlets.settings JSONB: checkout mode flags
-- ---------------------------------------------------------------------------
-- Keys written at runtime by updateOutletCheckoutSettings:
--   checkout_mode:                  'offline' | 'online'  (default: 'offline')
--   require_buyer_whatsapp:         boolean               (default: false)
--   payment_confirmation_enabled:   boolean               (default: false)
--
-- No schema migration needed for JSONB — updating is done via
-- jsonb_set / || operator in the service layer.
-- This comment block documents the expected shape for tooling.
