-- Migration 0026: Add UPDATE policy for app_users
--
-- Without an explicit UPDATE policy, RLS silently blocks all UPDATE statements
-- on app_users for ainything_app, even with withUserContext set. This causes
-- editStaffMember to appear to succeed (no error thrown) but the name change
-- is never written to the DB.
--
-- Policy: an org owner may update any app_users row that shares their
-- organization. Uses app.is_org_member (SECURITY DEFINER, defined in 0025)
-- to avoid infinite recursion.

BEGIN;

DROP POLICY IF EXISTS app_users_org_update ON public.app_users;

CREATE POLICY app_users_org_update ON public.app_users
  FOR UPDATE
  USING (app.is_org_member(id))
  WITH CHECK (app.is_org_member(id));

COMMIT;
