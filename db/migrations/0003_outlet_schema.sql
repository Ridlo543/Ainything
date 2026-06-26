-- Migration 0003: Outlet schema
--
-- Core outlet / catalog / product tables. Zero food-specific terminology.
-- All tables are multi-tenant (organization_id) and outlet-scoped.

BEGIN;

-- ---------------------------------------------------------------------------
-- Table: outlets
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.outlets (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      uuid        NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  name                 text        NOT NULL,
  slug                 text        NOT NULL UNIQUE,
  public_host          text        UNIQUE,
  location             text        NOT NULL DEFAULT '',
  business_type        text        NOT NULL DEFAULT 'other'
                                   CHECK (business_type IN (
                                     'restaurant','cafe','retail','fashion',
                                     'service','salon','laundry','repair','hotel','other'
                                   )),
  status               text        NOT NULL DEFAULT 'active'
                                   CHECK (status IN ('active','inactive','archived')),
  timezone             text        NOT NULL DEFAULT 'Asia/Jakarta',
  default_language_tag text        NOT NULL DEFAULT 'id',
  language_tags        text[]      NOT NULL DEFAULT ARRAY['id','en'],
  hero_image_url       text        NOT NULL DEFAULT '',
  catalog_scan_url     text        NOT NULL DEFAULT '',
  table_count          int         NOT NULL DEFAULT 0,
  catalog_source_type  text        CHECK (catalog_source_type IN (
                                     'pdf-scan','photo','bilingual','handwritten','seasonal','spreadsheet'
                                   )),
  description          text        NOT NULL DEFAULT '',
  knowledge_highlights text[],
  analytics            jsonb       NOT NULL DEFAULT '{}',
  settings             jsonb       NOT NULL DEFAULT '{}',
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_outlets_updated_at ON public.outlets;
CREATE TRIGGER set_outlets_updated_at
  BEFORE UPDATE ON public.outlets
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

ALTER TABLE public.outlets ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Table: outlet_locations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.outlet_locations (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  outlet_id       uuid        NOT NULL REFERENCES public.outlets (id) ON DELETE CASCADE,
  code            text        NOT NULL,
  name            text        NOT NULL,
  address         text        NOT NULL DEFAULT '',
  timezone        text        NOT NULL DEFAULT 'Asia/Jakarta',
  is_primary      boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (outlet_id, code)
);

DROP TRIGGER IF EXISTS set_outlet_locations_updated_at ON public.outlet_locations;
CREATE TRIGGER set_outlet_locations_updated_at
  BEFORE UPDATE ON public.outlet_locations
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

ALTER TABLE public.outlet_locations ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Table: outlet_tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.outlet_tables (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  outlet_id       uuid        NOT NULL REFERENCES public.outlets (id) ON DELETE CASCADE,
  location_id     uuid        REFERENCES public.outlet_locations (id) ON DELETE SET NULL,
  code            text        NOT NULL,
  label           text        NOT NULL DEFAULT '',
  is_active       boolean     NOT NULL DEFAULT true,
  qr_path         text        NOT NULL DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (outlet_id, code)
);

DROP TRIGGER IF EXISTS set_outlet_tables_updated_at ON public.outlet_tables;
CREATE TRIGGER set_outlet_tables_updated_at
  BEFORE UPDATE ON public.outlet_tables
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

ALTER TABLE public.outlet_tables ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Table: membership_outlets
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.membership_outlets (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  membership_id   uuid        NOT NULL REFERENCES public.memberships (id) ON DELETE CASCADE,
  outlet_id       uuid        NOT NULL REFERENCES public.outlets (id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (membership_id, outlet_id)
);

ALTER TABLE public.membership_outlets ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Table: catalogs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.catalogs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  outlet_id       uuid        NOT NULL REFERENCES public.outlets (id) ON DELETE CASCADE,
  version         int         NOT NULL DEFAULT 1,
  status          text        NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft','published','archived')),
  source_type     text        CHECK (source_type IN (
                                'pdf-scan','photo','bilingual','handwritten','seasonal','spreadsheet'
                              )),
  source_uri      text,
  published_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (outlet_id, version)
);

-- Only one published catalog per outlet at a time
CREATE UNIQUE INDEX IF NOT EXISTS catalogs_one_published_per_outlet
  ON public.catalogs (outlet_id)
  WHERE status = 'published';

DROP TRIGGER IF EXISTS set_catalogs_updated_at ON public.catalogs;
CREATE TRIGGER set_catalogs_updated_at
  BEFORE UPDATE ON public.catalogs
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

ALTER TABLE public.catalogs ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Table: catalog_sections
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.catalog_sections (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  outlet_id       uuid        NOT NULL REFERENCES public.outlets (id) ON DELETE CASCADE,
  catalog_id      uuid        NOT NULL REFERENCES public.catalogs (id) ON DELETE CASCADE,
  name            text        NOT NULL,
  localized_names jsonb       NOT NULL DEFAULT '{}',
  sort_order      int         NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (catalog_id, name)
);

DROP TRIGGER IF EXISTS set_catalog_sections_updated_at ON public.catalog_sections;
CREATE TRIGGER set_catalog_sections_updated_at
  BEFORE UPDATE ON public.catalog_sections
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

ALTER TABLE public.catalog_sections ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Table: products
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  outlet_id       uuid        NOT NULL REFERENCES public.outlets (id) ON DELETE CASCADE,
  catalog_id      uuid        NOT NULL REFERENCES public.catalogs (id) ON DELETE CASCADE,
  section_id      uuid        NOT NULL REFERENCES public.catalog_sections (id) ON DELETE RESTRICT,
  name            text        NOT NULL,
  local_name      text        NOT NULL DEFAULT '',
  description     text        NOT NULL DEFAULT '',
  price_amount    int         NOT NULL DEFAULT 0,
  currency        text        NOT NULL DEFAULT 'IDR',
  image_url       text        NOT NULL DEFAULT '',
  tags            text[]      NOT NULL DEFAULT '{}',
  is_available    boolean     NOT NULL DEFAULT true,
  is_featured     boolean     NOT NULL DEFAULT false,
  confidence      text        NOT NULL DEFAULT 'needs-review'
                              CHECK (confidence IN ('verified','needs-review','staff-confirm')),
  sort_order      int         NOT NULL DEFAULT 0,
  source_metadata jsonb       NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_products_updated_at ON public.products;
CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- RLS policies: outlets
-- Note: app.has_outlet_access() is defined in 0004_operational_tables.sql
-- after buyer_sessions is created (it references that table).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS outlets_tenant_select          ON public.outlets;
DROP POLICY IF EXISTS outlets_tenant_insert          ON public.outlets;
DROP POLICY IF EXISTS outlets_tenant_update          ON public.outlets;
DROP POLICY IF EXISTS outlets_active_public_select   ON public.outlets;
DROP POLICY IF EXISTS outlets_platform_select        ON public.outlets;

CREATE POLICY outlets_tenant_select ON public.outlets
  FOR SELECT USING (app.has_organization_access(organization_id));

CREATE POLICY outlets_tenant_insert ON public.outlets
  FOR INSERT WITH CHECK (app.has_organization_access(organization_id));

CREATE POLICY outlets_tenant_update ON public.outlets
  FOR UPDATE USING (app.has_organization_access(organization_id));

CREATE POLICY outlets_active_public_select ON public.outlets
  FOR SELECT USING (status = 'active');

CREATE POLICY outlets_platform_select ON public.outlets
  FOR SELECT USING (app.has_platform_access());

-- ---------------------------------------------------------------------------
-- RLS policies: outlet_locations
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS outlet_locations_tenant_select   ON public.outlet_locations;
DROP POLICY IF EXISTS outlet_locations_tenant_insert   ON public.outlet_locations;
DROP POLICY IF EXISTS outlet_locations_tenant_update   ON public.outlet_locations;
DROP POLICY IF EXISTS outlet_locations_platform_select ON public.outlet_locations;

CREATE POLICY outlet_locations_tenant_select ON public.outlet_locations
  FOR SELECT USING (app.has_organization_access(organization_id));

CREATE POLICY outlet_locations_tenant_insert ON public.outlet_locations
  FOR INSERT WITH CHECK (app.has_organization_access(organization_id));

CREATE POLICY outlet_locations_tenant_update ON public.outlet_locations
  FOR UPDATE USING (app.has_organization_access(organization_id));

CREATE POLICY outlet_locations_platform_select ON public.outlet_locations
  FOR SELECT USING (app.has_platform_access());

-- ---------------------------------------------------------------------------
-- RLS policies: outlet_tables
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS outlet_tables_tenant_select          ON public.outlet_tables;
DROP POLICY IF EXISTS outlet_tables_tenant_insert          ON public.outlet_tables;
DROP POLICY IF EXISTS outlet_tables_tenant_update          ON public.outlet_tables;
DROP POLICY IF EXISTS outlet_tables_active_public_select   ON public.outlet_tables;
DROP POLICY IF EXISTS outlet_tables_platform_select        ON public.outlet_tables;

CREATE POLICY outlet_tables_tenant_select ON public.outlet_tables
  FOR SELECT USING (app.has_organization_access(organization_id));

CREATE POLICY outlet_tables_tenant_insert ON public.outlet_tables
  FOR INSERT WITH CHECK (app.has_organization_access(organization_id));

CREATE POLICY outlet_tables_tenant_update ON public.outlet_tables
  FOR UPDATE USING (app.has_organization_access(organization_id));

CREATE POLICY outlet_tables_active_public_select ON public.outlet_tables
  FOR SELECT USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.outlets o
      WHERE o.id = outlet_id AND o.status = 'active'
    )
  );

CREATE POLICY outlet_tables_platform_select ON public.outlet_tables
  FOR SELECT USING (app.has_platform_access());

-- ---------------------------------------------------------------------------
-- RLS policies: membership_outlets
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS membership_outlets_tenant_select   ON public.membership_outlets;
DROP POLICY IF EXISTS membership_outlets_tenant_insert   ON public.membership_outlets;
DROP POLICY IF EXISTS membership_outlets_tenant_delete   ON public.membership_outlets;
DROP POLICY IF EXISTS membership_outlets_platform_select ON public.membership_outlets;

CREATE POLICY membership_outlets_tenant_select ON public.membership_outlets
  FOR SELECT USING (app.has_organization_access(organization_id));

CREATE POLICY membership_outlets_tenant_insert ON public.membership_outlets
  FOR INSERT WITH CHECK (app.has_organization_access(organization_id));

CREATE POLICY membership_outlets_tenant_delete ON public.membership_outlets
  FOR DELETE USING (app.has_organization_access(organization_id));

CREATE POLICY membership_outlets_platform_select ON public.membership_outlets
  FOR SELECT USING (app.has_platform_access());

-- ---------------------------------------------------------------------------
-- RLS policies: catalogs
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS catalogs_tenant_select          ON public.catalogs;
DROP POLICY IF EXISTS catalogs_tenant_insert          ON public.catalogs;
DROP POLICY IF EXISTS catalogs_tenant_update          ON public.catalogs;
DROP POLICY IF EXISTS catalogs_active_public_select   ON public.catalogs;
DROP POLICY IF EXISTS catalogs_platform_select        ON public.catalogs;

CREATE POLICY catalogs_tenant_select ON public.catalogs
  FOR SELECT USING (app.has_organization_access(organization_id));

CREATE POLICY catalogs_tenant_insert ON public.catalogs
  FOR INSERT WITH CHECK (app.has_organization_access(organization_id));

CREATE POLICY catalogs_tenant_update ON public.catalogs
  FOR UPDATE USING (app.has_organization_access(organization_id));

CREATE POLICY catalogs_active_public_select ON public.catalogs
  FOR SELECT USING (status = 'published');

CREATE POLICY catalogs_platform_select ON public.catalogs
  FOR SELECT USING (app.has_platform_access());

-- ---------------------------------------------------------------------------
-- RLS policies: catalog_sections
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS catalog_sections_tenant_select          ON public.catalog_sections;
DROP POLICY IF EXISTS catalog_sections_tenant_insert          ON public.catalog_sections;
DROP POLICY IF EXISTS catalog_sections_tenant_update          ON public.catalog_sections;
DROP POLICY IF EXISTS catalog_sections_active_public_select   ON public.catalog_sections;
DROP POLICY IF EXISTS catalog_sections_platform_select        ON public.catalog_sections;

CREATE POLICY catalog_sections_tenant_select ON public.catalog_sections
  FOR SELECT USING (app.has_organization_access(organization_id));

CREATE POLICY catalog_sections_tenant_insert ON public.catalog_sections
  FOR INSERT WITH CHECK (app.has_organization_access(organization_id));

CREATE POLICY catalog_sections_tenant_update ON public.catalog_sections
  FOR UPDATE USING (app.has_organization_access(organization_id));

CREATE POLICY catalog_sections_active_public_select ON public.catalog_sections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.catalogs c
      WHERE c.id = catalog_id AND c.status = 'published'
    )
  );

CREATE POLICY catalog_sections_platform_select ON public.catalog_sections
  FOR SELECT USING (app.has_platform_access());

-- ---------------------------------------------------------------------------
-- RLS policies: products
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS products_tenant_select          ON public.products;
DROP POLICY IF EXISTS products_tenant_insert          ON public.products;
DROP POLICY IF EXISTS products_tenant_update          ON public.products;
DROP POLICY IF EXISTS products_tenant_delete          ON public.products;
DROP POLICY IF EXISTS products_active_public_select   ON public.products;
DROP POLICY IF EXISTS products_platform_select        ON public.products;

CREATE POLICY products_tenant_select ON public.products
  FOR SELECT USING (app.has_organization_access(organization_id));

CREATE POLICY products_tenant_insert ON public.products
  FOR INSERT WITH CHECK (app.has_organization_access(organization_id));

CREATE POLICY products_tenant_update ON public.products
  FOR UPDATE USING (app.has_organization_access(organization_id));

CREATE POLICY products_tenant_delete ON public.products
  FOR DELETE USING (app.has_organization_access(organization_id));

CREATE POLICY products_active_public_select ON public.products
  FOR SELECT USING (
    is_available = true
    AND EXISTS (
      SELECT 1 FROM public.catalogs c
      WHERE c.id = catalog_id AND c.status = 'published'
    )
  );

CREATE POLICY products_platform_select ON public.products
  FOR SELECT USING (app.has_platform_access());

-- ---------------------------------------------------------------------------
-- GRANTs
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outlets            TO ainything_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outlet_locations   TO ainything_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outlet_tables      TO ainything_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.membership_outlets TO ainything_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalogs           TO ainything_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalog_sections   TO ainything_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products           TO ainything_app;

-- Note: GRANT EXECUTE ON app.has_outlet_access is in 0004_operational_tables.sql
-- (the function is defined there, after buyer_sessions is created).

COMMIT;
