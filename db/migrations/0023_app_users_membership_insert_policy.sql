-- Migration 0023: memberships INSERT/UPDATE/DELETE policies
--
-- createUserWithMembership now uses getDirectPool() (superuser) for the
-- app_users INSERT and duplicate-email SELECT, bypassing RLS. This migration
-- adds the missing RLS policies for memberships so that:
--   - deleteMembership (uses getPool/ainything_app) can DELETE
--   - updateMembershipRole (uses getPool/ainything_app) can UPDATE
--   - onboarding createProvisionedOrganization INSERT into memberships works
--     for org owners creating staff
--
-- Security: all policies are scoped to app.has_organization_access(organization_id),
-- the same guard already used by memberships SELECT.

BEGIN;

-- ---------------------------------------------------------------------------
-- memberships: allow INSERT when the session has org access for the target org
-- Needed by: onboarding flow (owner creates first membership)
--            and any future staff-invite accept flow
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS memberships_tenant_insert ON public.memberships;

CREATE POLICY memberships_tenant_insert ON public.memberships
  FOR INSERT
  WITH CHECK (app.has_organization_access(organization_id));

-- ---------------------------------------------------------------------------
-- memberships: allow UPDATE/DELETE scoped to the same org
-- Needed by: updateMembershipRole, deleteMembership in staff-repository.ts
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS memberships_tenant_update ON public.memberships;
DROP POLICY IF EXISTS memberships_tenant_delete ON public.memberships;

CREATE POLICY memberships_tenant_update ON public.memberships
  FOR UPDATE
  USING (app.has_organization_access(organization_id));

CREATE POLICY memberships_tenant_delete ON public.memberships
  FOR DELETE
  USING (app.has_organization_access(organization_id));

COMMIT;
