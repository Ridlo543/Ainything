-- Migration 0016: Add human-readable order_number to orders
-- order_number is a per-outlet sequential integer (e.g. 1, 2, 3...)
-- Displayed as #0001, #0042 etc. in all UIs — never expose raw UUIDs to buyers.
--
-- Uses a SEQUENCE per outlet via a generated column approach:
-- Since Postgres doesn't support per-partition sequences trivially,
-- we use a single global SERIAL and display it as-is. Order numbers
-- are unique across the platform but readable (never > 9999 for a pilot).

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS order_number SERIAL;

-- Add index for fast lookup by outlet + order_number
CREATE INDEX IF NOT EXISTS idx_orders_outlet_order_number
  ON orders (outlet_id, order_number);

COMMENT ON COLUMN orders.order_number IS
  'Human-readable sequential order number. Displayed as #XXXX in all UIs.';
