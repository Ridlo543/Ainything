-- Migration 0025: Fix infinite recursion in app_users_org_select
--
-- Migration 0024 introduced app_users_org_select which queries memberships
-- JOIN app_users inside the policy for app_users — causing infinite recursion
-- because evaluating each app_users row triggers the policy again.
--
-- Fix: wrap the inner query in a SECURITY DEFINER function so it runs as the
-- function owner (superuser) and bypasses RLS, exactly like has_organization_access.

BEGIN;

-- Drop the broken policy from 0024
DROP POLICY IF EXISTS app_users_org_select ON public.app_users;

-- ---------------------------------------------------------------------------
-- Helper: is_org_member(target_user_id)
-- Returns true when the current session user shares an organization with
-- target_user_id. SECURITY DEFINER bypasses RLS so the inner query does not
-- trigger app_users policies again (no recursion).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app.is_org_member(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, app
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.memberships m1
    JOIN   public.memberships m2 ON m2.organization_id = m1.organization_id
    JOIN   public.app_users   u  ON u.id = m2.user_id
    WHERE  u.external_auth_id = app.current_user_external_id()
    AND    m1.user_id = target_user_id
  );
$$;

GRANT EXECUTE ON FUNCTION app.is_org_member(uuid) TO ainything_app;

-- ---------------------------------------------------------------------------
-- Recreate app_users SELECT policy using the SECURITY DEFINER helper
-- Allows any user to read the email/name of teammates in the same org.
-- ---------------------------------------------------------------------------
CREATE POLICY app_users_org_select ON public.app_users
  FOR SELECT
  USING (app.is_org_member(id));

COMMIT;
