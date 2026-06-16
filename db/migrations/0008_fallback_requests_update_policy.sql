-- Migration 0008: staff/admin UPDATE policy for fallback_requests + audit column
--
-- Background: 0001 defined fallback_requests_tenant_select and 0004 hardened the
-- guest INSERT policy, but no UPDATE policy ever existed. With RLS ENABLED, any
-- UPDATE by lingua_app was denied at the row level — staff could not transition
-- a request new -> in-progress -> resolved. This migration adds the UPDATE
-- policy scoped through app.has_restaurant_access, plus an updated_at audit
-- column + trigger (previously missing) so polling/pubsub clients can detect
-- row changes and so the audit trail matches other tenant-owned tables.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS, DROP TRIGGER/POLICY IF EXISTS.

-- ---------------------------------------------------------------------------
-- Audit column + trigger (fallback_requests had neither)
-- ---------------------------------------------------------------------------

ALTER TABLE fallback_requests
	ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS fallback_requests_set_updated_at ON fallback_requests;
CREATE TRIGGER fallback_requests_set_updated_at
	BEFORE UPDATE ON fallback_requests
	FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

-- ---------------------------------------------------------------------------
-- UPDATE policy: a membership with restaurant access may transition status,
-- set resolved_at, and assign the request. WITH CHECK keeps the row scoped to
-- the same tenant after the update (restaurant_id is immutable from the app
-- layer; the policy still guards against a tampered payload).
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS fallback_requests_tenant_update ON fallback_requests;
CREATE POLICY fallback_requests_tenant_update ON fallback_requests
	FOR UPDATE TO lingua_app
	USING (app.has_restaurant_access(restaurant_id))
	WITH CHECK (app.has_restaurant_access(restaurant_id));
