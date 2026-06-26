-- Migration 0008: Data retention
--
-- Ensures expires_at columns exist on ephemeral tables, adds supporting
-- indexes, and provides a purge function for expired guest data.

BEGIN;

-- ---------------------------------------------------------------------------
-- Ensure expires_at columns exist (idempotent via DO block)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  -- buyer_sessions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'buyer_sessions'
      AND column_name  = 'expires_at'
  ) THEN
    ALTER TABLE public.buyer_sessions ADD COLUMN expires_at timestamptz;
  END IF;

  -- fallback_requests
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'fallback_requests'
      AND column_name  = 'expires_at'
  ) THEN
    ALTER TABLE public.fallback_requests ADD COLUMN expires_at timestamptz;
  END IF;

  -- feedback
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'feedback'
      AND column_name  = 'expires_at'
  ) THEN
    ALTER TABLE public.feedback ADD COLUMN expires_at timestamptz;
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- Indexes on expires_at columns (partial — only rows that have a value)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS buyer_sessions_expires_at_idx
  ON public.buyer_sessions (expires_at)
  WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS fallback_requests_expires_at_idx
  ON public.fallback_requests (expires_at)
  WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS feedback_expires_at_idx
  ON public.feedback (expires_at)
  WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS invites_expires_at_idx
  ON public.invites (expires_at);

CREATE INDEX IF NOT EXISTS web_vitals_reported_at_idx
  ON public.web_vitals (reported_at);

-- ---------------------------------------------------------------------------
-- Purge function
-- Deletes expired rows from ephemeral guest tables plus stale invites and
-- old web_vitals. CASCADE on buyer_sessions cleans chat_messages and
-- ai_events automatically via FK ON DELETE CASCADE.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purge_expired_guest_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cutoff_vitals timestamptz := now() - INTERVAL '90 days';
BEGIN
  -- Expired buyer sessions (cascades to chat_messages, ai_events)
  DELETE FROM public.buyer_sessions
  WHERE expires_at IS NOT NULL
    AND expires_at < now();

  -- Expired feedback
  DELETE FROM public.feedback
  WHERE expires_at IS NOT NULL
    AND expires_at < now();

  -- Expired fallback requests
  DELETE FROM public.fallback_requests
  WHERE expires_at IS NOT NULL
    AND expires_at < now();

  -- Expired / superseded invites
  DELETE FROM public.invites
  WHERE (
    expires_at < now()
    OR (purge_after IS NOT NULL AND purge_after < now())
  );

  -- Old web vitals (rolling 90-day window)
  DELETE FROM public.web_vitals
  WHERE reported_at < v_cutoff_vitals;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.purge_expired_guest_data() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.purge_expired_guest_data() TO ainything_app;

COMMIT;
