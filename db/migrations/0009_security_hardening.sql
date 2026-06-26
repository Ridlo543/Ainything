-- Migration 0009: Security hardening
--
-- Tightens RLS policies on buyer-writable tables, adds a scoped update
-- policy for buyer sessions, and documents append-only tables.

BEGIN;

-- ---------------------------------------------------------------------------
-- buyer_sessions: ensure own-session update policy is correctly scoped
-- (replaces any earlier version from 0004)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS buyer_sessions_own_update ON public.buyer_sessions;

CREATE POLICY buyer_sessions_own_update ON public.buyer_sessions
  FOR UPDATE
  USING (public_session_id = app.current_public_session_id())
  WITH CHECK (public_session_id = app.current_public_session_id());

-- ---------------------------------------------------------------------------
-- invites: explicit tenant SELECT guard
-- (belt-and-suspenders alongside the policy from 0001)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS invites_tenant_select ON public.invites;

CREATE POLICY invites_tenant_select ON public.invites
  FOR SELECT USING (app.has_organization_access(organization_id));

-- ---------------------------------------------------------------------------
-- Comments: mark append-only tables to prevent accidental mutation grants
-- ---------------------------------------------------------------------------
COMMENT ON TABLE public.chat_messages IS
  'Append-only chat message log. Never UPDATE or DELETE rows directly — use data retention purge only.';

COMMENT ON TABLE public.ai_events IS
  'Append-only AI call event log. Never UPDATE or DELETE rows directly — use data retention purge only.';

-- ---------------------------------------------------------------------------
-- Revoke UPDATE/DELETE on append-only tables from ainything_app
-- (belt-and-suspenders alongside RLS — belt prevents silent policy gaps)
-- ---------------------------------------------------------------------------
REVOKE UPDATE, DELETE ON public.chat_messages FROM ainything_app;
REVOKE UPDATE, DELETE ON public.ai_events     FROM ainything_app;

COMMIT;
