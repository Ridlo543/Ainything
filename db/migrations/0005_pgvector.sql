-- Migration 0005: pgvector + item_embeddings
--
-- Enables the pgvector extension and creates the item_embeddings table
-- used for semantic search over products and knowledge documents.

BEGIN;

-- ---------------------------------------------------------------------------
-- Extension
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS vector;

-- ---------------------------------------------------------------------------
-- Table: item_embeddings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.item_embeddings (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid        NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  outlet_id        uuid        NOT NULL REFERENCES public.outlets (id) ON DELETE CASCADE,
  source_type      text        NOT NULL
                               CHECK (source_type IN ('product','knowledge_document')),
  source_id        uuid        NOT NULL,
  model            text        NOT NULL DEFAULT 'text-embedding-3-small',
  dimensions       smallint    NOT NULL DEFAULT 1536
                               CHECK (dimensions > 0 AND dimensions <= 4096),
  embedding        vector(1536),
  content_snapshot text        NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_type, source_id, model)
);

DROP TRIGGER IF EXISTS set_item_embeddings_updated_at ON public.item_embeddings;
CREATE TRIGGER set_item_embeddings_updated_at
  BEFORE UPDATE ON public.item_embeddings
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

ALTER TABLE public.item_embeddings ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS item_embeddings_outlet_source_idx
  ON public.item_embeddings (outlet_id, source_type);

-- IVFFlat index for approximate nearest-neighbour search (cosine distance).
-- lists=100 is a reasonable default for datasets up to ~1M rows.
-- Rebuild with a higher lists value when the dataset grows beyond that.
CREATE INDEX IF NOT EXISTS item_embeddings_ivfflat_idx
  ON public.item_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS item_embeddings_tenant_select    ON public.item_embeddings;
DROP POLICY IF EXISTS item_embeddings_tenant_insert    ON public.item_embeddings;
DROP POLICY IF EXISTS item_embeddings_tenant_update    ON public.item_embeddings;
DROP POLICY IF EXISTS item_embeddings_tenant_delete    ON public.item_embeddings;
DROP POLICY IF EXISTS item_embeddings_outlet_select    ON public.item_embeddings;
DROP POLICY IF EXISTS item_embeddings_platform_select  ON public.item_embeddings;

CREATE POLICY item_embeddings_tenant_select ON public.item_embeddings
  FOR SELECT USING (app.has_organization_access(organization_id));

CREATE POLICY item_embeddings_tenant_insert ON public.item_embeddings
  FOR INSERT WITH CHECK (app.has_organization_access(organization_id));

CREATE POLICY item_embeddings_tenant_update ON public.item_embeddings
  FOR UPDATE USING (app.has_organization_access(organization_id));

CREATE POLICY item_embeddings_tenant_delete ON public.item_embeddings
  FOR DELETE USING (app.has_organization_access(organization_id));

-- Buyers (outlet access via session) can SELECT embeddings for search
CREATE POLICY item_embeddings_outlet_select ON public.item_embeddings
  FOR SELECT USING (app.has_outlet_access(outlet_id));

CREATE POLICY item_embeddings_platform_select ON public.item_embeddings
  FOR SELECT USING (app.has_platform_access());

-- ---------------------------------------------------------------------------
-- GRANTs
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.item_embeddings TO ainything_app;

COMMIT;
