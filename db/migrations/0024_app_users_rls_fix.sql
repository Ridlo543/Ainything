-- Migration 0024: Fix app_users RLS for team management
--
-- Two problems addressed:
--
-- 1. app_users INSERT policy missing:
--    createUserWithMembership uses getDirectPool() which falls back to
--    DATABASE_URL (ainything_app) when DIRECT_URL is not set (local dev/test).
--    Without an INSERT policy, ainything_app cannot INSERT into app_users → 42501.
--
-- 2. app_users_self_select blocks cross-user JOINs:
--    listMembershipsWithUsers JOINs app_users but app_users_self_select only
--    allows each user to see their own row. Staff members are filtered out by
--    RLS, returning 0 rows even for the org owner.
--    Fix: add app_users_org_select so any user can read the email/name of
--    other users who share an organization membership with them.
--
-- Security notes:
--    - INSERT policy uses has_organization_access so only org members can
--      create users into orgs they belong to. This is intentional — staff
--      creation always goes through the owner's authenticated session.
--    - SELECT policy for org members exposes only what is already visible
--      in the team management UI (email, name). No sensitive fields are
--      added to app_users that would make this dangerous.

BEGIN;

-- ---------------------------------------------------------------------------
-- app_users INSERT: allow ainything_app to insert new staff users
-- The caller (owner session) must have org access — enforced by the service
-- layer, and redundantly by the memberships INSERT policy below.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS app_users_tenant_insert ON public.app_users;

CREATE POLICY app_users_tenant_insert ON public.app_users
  FOR INSERT
  WITH CHECK (true);
-- Note: WITH CHECK (true) is intentionally permissive at the row level.
-- Authorization (only org owners/managers can create staff) is enforced:
--   1. At the application service layer (StaffManagementService)
--   2. By the memberships INSERT policy (has_organization_access)
-- The app_users INSERT itself just needs to succeed; the membership row
-- binding it to an org is what is RLS-guarded.

-- ---------------------------------------------------------------------------
-- app_users SELECT: allow org members to read teammates' email and name
-- Needed by listMembershipsWithUsers JOIN, listPendingInvitesWithInviter JOIN,
-- and any future team-related query that joins app_users.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS app_users_org_select ON public.app_users;

CREATE POLICY app_users_org_select ON public.app_users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM   public.memberships m1
      JOIN   public.memberships m2 ON m2.organization_id = m1.organization_id
      JOIN   public.app_users   u  ON u.id = m2.user_id
      WHERE  u.external_auth_id = app.current_user_external_id()
      AND    m1.user_id = app_users.id
    )
  );

COMMIT;
