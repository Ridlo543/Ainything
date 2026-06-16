-- Migration 0004: harden anonymous guest-write RLS
--
-- Adds app.current_public_session_id() helper (mirrors app.current_user_external_id)
-- and replaces the guest-write policies from 0002 with stricter versions that require
-- the server to set app.public_session_id before fallback/feedback inserts.
--
-- Idempotent: all objects use CREATE OR REPLACE / DROP…IF EXISTS.

-- ---------------------------------------------------------------------------
-- Helper: read the current public session id set by the app runtime
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION app.current_public_session_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
	SELECT nullif(current_setting('app.public_session_id', true), '')
$$;

-- ---------------------------------------------------------------------------
-- customer_sessions: INSERT allowed when table/restaurant/org are consistent
-- (unchanged in intent from 0002, kept here for completeness + drop-replace)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS customer_sessions_public_insert ON customer_sessions;
CREATE POLICY customer_sessions_public_insert ON customer_sessions
	FOR INSERT TO lingua_app
	WITH CHECK (
		EXISTS (
			SELECT 1
			FROM restaurant_tables t
			JOIN restaurants r ON r.id = t.restaurant_id
			WHERE t.id = table_id
				AND t.restaurant_id = customer_sessions.restaurant_id
				AND t.organization_id = customer_sessions.organization_id
				AND t.is_active = true
				AND r.status = 'active'
		)
	);

-- ---------------------------------------------------------------------------
-- fallback_requests: INSERT requires app.public_session_id to match session
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS fallback_requests_public_insert ON fallback_requests;
CREATE POLICY fallback_requests_public_insert ON fallback_requests
	FOR INSERT TO lingua_app
	WITH CHECK (
		-- Table/restaurant/org must be consistent and active
		EXISTS (
			SELECT 1
			FROM restaurant_tables t
			JOIN restaurants r ON r.id = t.restaurant_id
			WHERE t.id = table_id
				AND t.restaurant_id = fallback_requests.restaurant_id
				AND t.organization_id = fallback_requests.organization_id
				AND t.is_active = true
				AND r.status = 'active'
		)
		-- If a session is linked, it must match the server-set public_session_id
		-- (prevents a guest from borrowing another guest's session id)
		AND (
			session_id IS NULL
			OR (
				app.current_public_session_id() IS NOT NULL
				AND session_id::text = app.current_public_session_id()
				AND EXISTS (
					SELECT 1
					FROM customer_sessions s
					WHERE s.id = session_id
						AND s.restaurant_id = fallback_requests.restaurant_id
						AND s.organization_id = fallback_requests.organization_id
				)
			)
		)
	);

-- ---------------------------------------------------------------------------
-- feedback: INSERT requires app.public_session_id to match session
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS feedback_public_insert ON feedback;
CREATE POLICY feedback_public_insert ON feedback
	FOR INSERT TO lingua_app
	WITH CHECK (
		-- Restaurant/org must be active
		EXISTS (
			SELECT 1
			FROM restaurants r
			WHERE r.id = restaurant_id
				AND r.organization_id = feedback.organization_id
				AND r.status = 'active'
		)
		-- If a session is linked, it must match the server-set public_session_id
		AND (
			session_id IS NULL
			OR (
				app.current_public_session_id() IS NOT NULL
				AND session_id::text = app.current_public_session_id()
				AND EXISTS (
					SELECT 1
					FROM customer_sessions s
					WHERE s.id = session_id
						AND s.restaurant_id = feedback.restaurant_id
						AND s.organization_id = feedback.organization_id
				)
			)
		)
	);
