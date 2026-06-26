-- Migration 0013: Local password auth + server-side sessions
--
-- Adds password hash storage to app_users and creates a server-managed
-- user_sessions table. This replaces Supabase Auth for self-hosted deployments.
--
-- Security notes:
-- - password_hash stores bcrypt output (never plain text)
-- - session tokens are 32-byte cryptographically random hex strings
-- - sessions expire; expired rows can be purged via pnpm db:purge-sessions
-- - app_users RLS is untouched — sessions bypass RLS via superuser role at
--   login time, then switch to ainything_app with SET app.user_external_id

BEGIN;

-- ---------------------------------------------------------------------------
-- Extend app_users with password hash (nullable — external auth still valid)
-- ---------------------------------------------------------------------------
ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS password_hash text;

-- ---------------------------------------------------------------------------
-- Table: user_sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES public.app_users (id) ON DELETE CASCADE,
  token         text        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at    timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_sessions_token_idx   ON public.user_sessions (token);
CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx ON public.user_sessions (user_id);
CREATE INDEX IF NOT EXISTS user_sessions_expires_idx ON public.user_sessions (expires_at);

-- Sessions table does NOT use RLS — it is always queried by the superuser
-- migration role (never by ainything_app) because session resolution happens
-- before any user context is available.
-- The app queries this table using the DIRECT_URL connection (superuser).

-- ---------------------------------------------------------------------------
-- Cleanup function: remove expired sessions (call from pnpm script)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purge_expired_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.user_sessions WHERE expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.purge_expired_sessions() FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- GRANTs — superuser/migration role only; ainything_app does NOT need access
-- ---------------------------------------------------------------------------
-- user_sessions is intentionally NOT granted to ainything_app.
-- All session operations use the superuser (DIRECT_URL) connection.

COMMIT;
