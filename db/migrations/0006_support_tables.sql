-- Migration 0006: Support tables
--
-- Web vitals reporting and onboarding progress tracking.

BEGIN;

-- ---------------------------------------------------------------------------
-- Table: web_vitals
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.web_vitals (
  id          uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id   uuid           REFERENCES public.outlets (id) ON DELETE CASCADE,
  name        text           NOT NULL
                             CHECK (name IN ('LCP','FID','INP','CLS','TTFB')),
  value       numeric(12,4)  NOT NULL,
  rating      text           NOT NULL
                             CHECK (rating IN ('good','needs-improvement','poor')),
  path        text           NOT NULL DEFAULT '',
  reported_at timestamptz    NOT NULL DEFAULT now()
);

ALTER TABLE public.web_vitals ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Table: onboarding_progress
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  outlet_id       uuid        NOT NULL REFERENCES public.outlets (id) ON DELETE CASCADE,
  step            text        NOT NULL,
  completed_at    timestamptz,
  metadata        jsonb       NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (outlet_id, step)
);

ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- RLS policies: web_vitals
-- Public INSERT (browser beacons), tenant SELECT, platform SELECT
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS web_vitals_public_insert    ON public.web_vitals;
DROP POLICY IF EXISTS web_vitals_tenant_select    ON public.web_vitals;
DROP POLICY IF EXISTS web_vitals_platform_select  ON public.web_vitals;

-- Anyone (including unauthenticated buyers) can INSERT a vitals record
CREATE POLICY web_vitals_public_insert ON public.web_vitals
  FOR INSERT WITH CHECK (true);

-- Outlet owner / staff can SELECT their own outlet's vitals
CREATE POLICY web_vitals_tenant_select ON public.web_vitals
  FOR SELECT USING (
    outlet_id IS NULL
    OR app.has_outlet_access(outlet_id)
  );

CREATE POLICY web_vitals_platform_select ON public.web_vitals
  FOR SELECT USING (app.has_platform_access());

-- ---------------------------------------------------------------------------
-- RLS policies: onboarding_progress
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS onboarding_progress_tenant_select    ON public.onboarding_progress;
DROP POLICY IF EXISTS onboarding_progress_tenant_insert    ON public.onboarding_progress;
DROP POLICY IF EXISTS onboarding_progress_tenant_update    ON public.onboarding_progress;
DROP POLICY IF EXISTS onboarding_progress_platform_select  ON public.onboarding_progress;

CREATE POLICY onboarding_progress_tenant_select ON public.onboarding_progress
  FOR SELECT USING (app.has_organization_access(organization_id));

CREATE POLICY onboarding_progress_tenant_insert ON public.onboarding_progress
  FOR INSERT WITH CHECK (app.has_organization_access(organization_id));

CREATE POLICY onboarding_progress_tenant_update ON public.onboarding_progress
  FOR UPDATE USING (app.has_organization_access(organization_id));

CREATE POLICY onboarding_progress_platform_select ON public.onboarding_progress
  FOR SELECT USING (app.has_platform_access());

-- ---------------------------------------------------------------------------
-- GRANTs
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT         ON public.web_vitals          TO ainything_app;
GRANT SELECT, INSERT, UPDATE ON public.onboarding_progress TO ainything_app;

COMMIT;
