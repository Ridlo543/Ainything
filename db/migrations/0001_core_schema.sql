-- Migration 0001: Core multi-tenant schema
--
-- Creates foundational schema, helper functions, core tenant tables,
-- and RLS policies. All terms are generic business terminology.

BEGIN;

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Role
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ainything_app') THEN
    CREATE ROLE ainything_app;
  END IF;
END
$$;

GRANT CONNECT ON DATABASE postgres TO ainything_app;

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS app;

GRANT USAGE ON SCHEMA app TO ainything_app;
GRANT USAGE ON SCHEMA public TO ainything_app;

-- ---------------------------------------------------------------------------
-- Helper: updated_at trigger function
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Helper: current authenticated user external id
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app.current_user_external_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT current_setting('app.user_external_id', true);
$$;

-- ---------------------------------------------------------------------------
-- Helper: current public (buyer) session id
-- Drop first — return type changed from text to uuid vs prior schema versions.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS app.current_public_session_id();
CREATE OR REPLACE FUNCTION app.current_public_session_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.public_session_id', true), '')::uuid;
$$;

-- ---------------------------------------------------------------------------
-- Table: organizations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organizations (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text        NOT NULL,
  slug           text        NOT NULL UNIQUE,
  workspace_host text        UNIQUE,
  plan           text        NOT NULL DEFAULT 'pilot'
                             CHECK (plan IN ('pilot', 'starter', 'pro', 'enterprise')),
  status         text        NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active', 'paused', 'archived')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_organizations_updated_at ON public.organizations;
CREATE TRIGGER set_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Table: app_users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_users (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_auth_id        text UNIQUE,
  email                   text UNIQUE,
  name                    text NOT NULL DEFAULT '',
  platform_role           text NOT NULL DEFAULT 'staff'
                          CHECK (platform_role IN ('super_admin', 'org_owner', 'outlet_admin', 'staff')),
  default_organization_id uuid REFERENCES public.organizations (id) ON DELETE SET NULL,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_app_users_updated_at ON public.app_users;
CREATE TRIGGER set_app_users_updated_at
  BEFORE UPDATE ON public.app_users
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Table: memberships
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.memberships (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES public.app_users (id) ON DELETE CASCADE,
  organization_id uuid        NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  role            text        NOT NULL DEFAULT 'staff'
                              CHECK (role IN ('owner', 'manager', 'staff')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id)
);

DROP TRIGGER IF EXISTS set_memberships_updated_at ON public.memberships;
CREATE TRIGGER set_memberships_updated_at
  BEFORE UPDATE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Table: invites
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invites (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid        NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  email               text        NOT NULL,
  role                text        NOT NULL DEFAULT 'staff'
                                  CHECK (role IN ('owner', 'manager', 'staff')),
  invited_by_user_id  uuid        REFERENCES public.app_users (id) ON DELETE CASCADE,
  token               text        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at          timestamptz NOT NULL,
  accepted_at         timestamptz,
  purge_after         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at)
);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Helper: has_organization_access
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app.has_organization_access(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, app
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.memberships m
    JOIN   public.app_users   u ON u.id = m.user_id
    WHERE  u.external_auth_id = app.current_user_external_id()
    AND    m.organization_id  = org_id
  );
$$;

-- ---------------------------------------------------------------------------
-- Helper: current_platform_role
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app.current_platform_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, app
AS $$
  SELECT platform_role
  FROM   public.app_users
  WHERE  external_auth_id = app.current_user_external_id()
  LIMIT  1;
$$;

-- ---------------------------------------------------------------------------
-- Helper: has_platform_access (super_admin check)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app.has_platform_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, app
AS $$
  SELECT COALESCE(app.current_platform_role() = 'super_admin', false);
$$;

-- ---------------------------------------------------------------------------
-- RLS policies: organizations
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS organizations_tenant_select    ON public.organizations;
DROP POLICY IF EXISTS organizations_tenant_update    ON public.organizations;
DROP POLICY IF EXISTS organizations_platform_select  ON public.organizations;

CREATE POLICY organizations_tenant_select ON public.organizations
  FOR SELECT USING (app.has_organization_access(id));

CREATE POLICY organizations_tenant_update ON public.organizations
  FOR UPDATE USING (app.has_organization_access(id));

CREATE POLICY organizations_platform_select ON public.organizations
  FOR SELECT USING (app.has_platform_access());

-- ---------------------------------------------------------------------------
-- RLS policies: app_users
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS app_users_self_select    ON public.app_users;
DROP POLICY IF EXISTS app_users_self_update    ON public.app_users;
DROP POLICY IF EXISTS app_users_platform_select ON public.app_users;

CREATE POLICY app_users_self_select ON public.app_users
  FOR SELECT USING (external_auth_id = app.current_user_external_id());

CREATE POLICY app_users_self_update ON public.app_users
  FOR UPDATE USING (external_auth_id = app.current_user_external_id());

CREATE POLICY app_users_platform_select ON public.app_users
  FOR SELECT USING (app.has_platform_access());

-- ---------------------------------------------------------------------------
-- RLS policies: memberships
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS memberships_tenant_select   ON public.memberships;
DROP POLICY IF EXISTS memberships_platform_select ON public.memberships;

CREATE POLICY memberships_tenant_select ON public.memberships
  FOR SELECT USING (app.has_organization_access(organization_id));

CREATE POLICY memberships_platform_select ON public.memberships
  FOR SELECT USING (app.has_platform_access());

-- ---------------------------------------------------------------------------
-- RLS policies: invites
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS invites_tenant_select   ON public.invites;
DROP POLICY IF EXISTS invites_tenant_insert   ON public.invites;
DROP POLICY IF EXISTS invites_tenant_delete   ON public.invites;
DROP POLICY IF EXISTS invites_platform_select ON public.invites;

CREATE POLICY invites_tenant_select ON public.invites
  FOR SELECT USING (app.has_organization_access(organization_id));

CREATE POLICY invites_tenant_insert ON public.invites
  FOR INSERT WITH CHECK (app.has_organization_access(organization_id));

CREATE POLICY invites_tenant_delete ON public.invites
  FOR DELETE USING (app.has_organization_access(organization_id));

CREATE POLICY invites_platform_select ON public.invites
  FOR SELECT USING (app.has_platform_access());

-- ---------------------------------------------------------------------------
-- GRANTs
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO ainything_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_users     TO ainything_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memberships   TO ainything_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invites       TO ainything_app;

GRANT EXECUTE ON FUNCTION app.set_updated_at()                    TO ainything_app;
GRANT EXECUTE ON FUNCTION app.current_user_external_id()          TO ainything_app;
GRANT EXECUTE ON FUNCTION app.current_public_session_id()         TO ainything_app;
GRANT EXECUTE ON FUNCTION app.has_organization_access(uuid)       TO ainything_app;
GRANT EXECUTE ON FUNCTION app.current_platform_role()             TO ainything_app;
GRANT EXECUTE ON FUNCTION app.has_platform_access()               TO ainything_app;

COMMIT;
