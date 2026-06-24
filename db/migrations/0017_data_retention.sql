-- =============================================================================
-- Migration 0017: Data retention policies
-- Adds retention TTLs and cleanup for guest data tables.
-- Implements GDPR Article 5(1)(e) / ID PDP Pasal 16 storage limitation.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add retention columns to guest data tables
-- ---------------------------------------------------------------------------

-- customer_sessions: auto-expire after 90 days of inactivity.
-- We use a plain column (not generated) because timestamptz + interval
-- is classified as stable (not immutable) in Postgres — generated stored
-- columns require immutable expressions.
ALTER TABLE customer_sessions
	ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Backfill existing rows
UPDATE customer_sessions SET expires_at = last_seen_at + INTERVAL '90 days' WHERE expires_at IS NULL;

-- chat_messages: inherit session expiry (cascade from session delete)
-- No column needed — cascade from customer_sessions covers this.

-- feedback: 180-day retention (restaurant analytics window)
ALTER TABLE feedback
	ADD COLUMN IF NOT EXISTS expires_at timestamptz;

UPDATE feedback SET expires_at = created_at + INTERVAL '180 days' WHERE expires_at IS NULL;

-- fallback_requests: 90-day retention
ALTER TABLE fallback_requests
	ADD COLUMN IF NOT EXISTS expires_at timestamptz;

UPDATE fallback_requests SET expires_at = created_at + INTERVAL '90 days' WHERE expires_at IS NULL;

-- ---------------------------------------------------------------------------
-- 2. Indexes for efficient purge queries
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS customer_sessions_expires_at_idx
	ON customer_sessions (expires_at)
	WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS feedback_expires_at_idx
	ON feedback (expires_at)
	WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS fallback_requests_expires_at_idx
	ON fallback_requests (expires_at)
	WHERE expires_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. Auto-delete expired invites (accepted or expired > 30 days ago)
-- Removes lingering email addresses from the invites table.
-- ---------------------------------------------------------------------------
ALTER TABLE invites
	ADD COLUMN IF NOT EXISTS purge_after timestamptz;

-- Backfill: accepted invites purge 30d after acceptance, others 30d after expiry
UPDATE invites
	SET purge_after = CASE
		WHEN accepted_at IS NOT NULL THEN accepted_at + INTERVAL '30 days'
		ELSE expires_at + INTERVAL '30 days'
	END
	WHERE purge_after IS NULL;

CREATE INDEX IF NOT EXISTS invites_purge_after_idx
	ON invites (purge_after)
	WHERE purge_after IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. Purge function — called by a scheduled job (pg_cron, external cron, or
--    a nightly Podman/systemd timer running: pnpm run db:purge)
-- Returns counts of rows deleted for observability.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION purge_expired_guest_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
	v_sessions   int;
	v_feedback   int;
	v_fallbacks  int;
	v_invites    int;
	v_vitals     int;
BEGIN
	-- Delete expired sessions (chat_messages cascade automatically)
	DELETE FROM customer_sessions WHERE expires_at < now();
	GET DIAGNOSTICS v_sessions = ROW_COUNT;

	-- Delete expired feedback
	DELETE FROM feedback WHERE expires_at < now();
	GET DIAGNOSTICS v_feedback = ROW_COUNT;

	-- Delete expired fallback requests
	DELETE FROM fallback_requests WHERE expires_at < now();
	GET DIAGNOSTICS v_fallbacks = ROW_COUNT;

	-- Delete resolved/expired invites past purge window
	DELETE FROM invites WHERE purge_after < now();
	GET DIAGNOSTICS v_invites = ROW_COUNT;

	-- Delete web_vitals older than 90 days (as per retention comment in 0013)
	DELETE FROM web_vitals WHERE reported_at < now() - INTERVAL '90 days';
	GET DIAGNOSTICS v_vitals = ROW_COUNT;

	RETURN jsonb_build_object(
		'sessions_deleted',   v_sessions,
		'feedback_deleted',   v_feedback,
		'fallbacks_deleted',  v_fallbacks,
		'invites_deleted',    v_invites,
		'vitals_deleted',     v_vitals,
		'purged_at',          now()
	);
END;
$$;

-- Grant execute to lingua_app so the purge job can run without superuser
GRANT EXECUTE ON FUNCTION purge_expired_guest_data() TO lingua_app;

-- ---------------------------------------------------------------------------
-- 5. Comments
-- ---------------------------------------------------------------------------
COMMENT ON FUNCTION purge_expired_guest_data() IS
	'Deletes expired guest sessions, chat messages (cascade), feedback, fallback requests, invites, and old web vitals. Schedule nightly via pg_cron or external cron.';

COMMENT ON COLUMN customer_sessions.expires_at IS
	'Auto-computed: last_seen_at + 90 days. Used by purge_expired_guest_data().';

COMMENT ON COLUMN feedback.expires_at IS
	'Auto-computed: created_at + 180 days. Used by purge_expired_guest_data().';

COMMENT ON COLUMN fallback_requests.expires_at IS
	'Auto-computed: created_at + 90 days. Used by purge_expired_guest_data().';

COMMENT ON COLUMN invites.purge_after IS
	'Auto-computed: accepted_at or expires_at + 30 days. Email is purged after this date.';
