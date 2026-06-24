-- =============================================================================
-- Migration 0016: Security hardening
-- Fixes identified in security audit:
--   C1. customer_sessions: add UPDATE policy for last_seen_at (was silently denied)
--   M1. invites: replace USING(true) with token-scoped policy
--   Low: app_users: document intentional no-DELETE policy
-- =============================================================================

-- ---------------------------------------------------------------------------
-- C1. customer_sessions: UPDATE policy
-- The sessions endpoint updates last_seen_at. Without an explicit UPDATE policy
-- on an RLS-enabled table, writes are silently denied for lingua_app.
-- Scope: only the session owner (matched by app.current_public_session_id()) can
-- update their own row.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS customer_sessions_public_update ON customer_sessions;
CREATE POLICY customer_sessions_public_update ON customer_sessions
	FOR UPDATE TO lingua_app
	USING (
		id::text = current_setting('app.public_session_id', true)
	)
	WITH CHECK (
		id::text = current_setting('app.public_session_id', true)
	);

-- ---------------------------------------------------------------------------
-- M1. invites: replace USING(true) with scoped policy
-- Previously all invites were readable by any lingua_app connection.
-- Now only the invite owner's organization members can read their org's invites,
-- and unauthenticated accept-invite lookups go through the service role (getPool)
-- which bypasses RLS anyway.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS invites_public_token_select ON invites;
DROP POLICY IF EXISTS invites_tenant_select ON invites;
CREATE POLICY invites_tenant_select ON invites
	FOR SELECT TO lingua_app
	USING (
		app.has_organization_access(organization_id)
	);

-- ---------------------------------------------------------------------------
-- Low: chat_messages and ai_events are intentionally append-only.
-- No UPDATE or DELETE policy needed. Document explicitly.
-- ---------------------------------------------------------------------------
COMMENT ON TABLE chat_messages IS
	'Append-only. No UPDATE or DELETE RLS policy is intentional — chat history is immutable.';

COMMENT ON TABLE ai_events IS
	'Append-only. No UPDATE or DELETE RLS policy is intentional — event log is immutable.';

COMMENT ON TABLE web_vitals IS
	'Write-only from client. No UPDATE or DELETE RLS policy is intentional.';

-- ---------------------------------------------------------------------------
-- Low: dietary_flags and allergens are reference tables seeded by migrations.
-- lingua_app has SELECT only. No write policies intentional.
-- ---------------------------------------------------------------------------
COMMENT ON TABLE dietary_flags IS
	'Reference data. Managed by migrations only. lingua_app has SELECT only — intentional.';

COMMENT ON TABLE allergens IS
	'Reference data. Managed by migrations only. lingua_app has SELECT only — intentional.';
