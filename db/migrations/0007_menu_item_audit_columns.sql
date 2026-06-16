-- Migration 0007: audit columns + auto-update triggers for menu_items & menu_categories
--
-- Background: 0001 defined both tables with updated_at columns and
-- set_updated_at triggers. This migration is a safety backfill: if either
-- column or trigger was dropped manually or the table was recreated without
-- the audit plumbing, this re-establishes it. The app.set_updated_at()
-- function (created in 0001) is also recreated with CREATE OR REPLACE so
-- the migration is self-contained when run out of order.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS, DROP TRIGGER IF EXISTS,
-- CREATE OR REPLACE FUNCTION.

-- ---------------------------------------------------------------------------
-- Ensure the reusable trigger function exists (no-op if 0001 already ran)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION app.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	NEW.updated_at = now();
	RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- menu_items: audit column + trigger
-- ---------------------------------------------------------------------------

ALTER TABLE menu_items
	ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS menu_items_set_updated_at ON menu_items;
CREATE TRIGGER menu_items_set_updated_at
	BEFORE UPDATE ON menu_items
	FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

-- ---------------------------------------------------------------------------
-- menu_categories: audit column + trigger
-- ---------------------------------------------------------------------------

ALTER TABLE menu_categories
	ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS menu_categories_set_updated_at ON menu_categories;
CREATE TRIGGER menu_categories_set_updated_at
	BEFORE UPDATE ON menu_categories
	FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
