-- Migration 0005: enable pgvector and create embedding storage
--
-- Prerequisite: pgvector extension must be installed on the PostgreSQL server.
--   CREATE EXTENSION vector; is idempotent if the extension is available.
--
-- Creates a tenant-scoped item_embeddings table that stores vector embeddings
-- for menu items and knowledge documents. Embeddings are generated after publish,
-- never in the tourist hot path.
--
-- Idempotent: all objects use CREATE OR REPLACE / DROP…IF EXISTS / IF NOT EXISTS.

-- ---------------------------------------------------------------------------
-- Extension
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS vector;

-- ---------------------------------------------------------------------------
-- Embedding storage table
--
-- Polymorphic: source_type + source_id reference either menu_items or
-- knowledge_documents. Foreign keys are enforced at the application layer
-- because PostgreSQL cannot express a polymorphic FK.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS item_embeddings (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
	source_type text NOT NULL CHECK (source_type IN ('menu_item', 'knowledge_document')),
	source_id uuid NOT NULL,
	model text NOT NULL DEFAULT 'text-embedding-3-small',
	dimensions smallint NOT NULL DEFAULT 1536 CHECK (dimensions > 0 AND dimensions <= 4096),
	embedding vector(1536),
	content_snapshot text NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	UNIQUE (source_type, source_id, model)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

-- Fast lookup by restaurant + source type (e.g. all menu items for one venue)
CREATE INDEX IF NOT EXISTS item_embeddings_restaurant_source_idx
	ON item_embeddings (restaurant_id, source_type);

-- IVFFlat approximate nearest-neighbour index (cosine distance).
-- lists = sqrt(rows) rounded, at 100 for expected <10k total rows per deployment.
-- Rebuild with a higher list count as data grows.
CREATE INDEX IF NOT EXISTS item_embeddings_vector_idx
	ON item_embeddings
	USING ivfflat (embedding vector_cosine_ops)
	WITH (lists = 100);

-- ---------------------------------------------------------------------------
-- Trigger: auto-update updated_at
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS item_embeddings_set_updated_at ON item_embeddings;
CREATE TRIGGER item_embeddings_set_updated_at
	BEFORE UPDATE ON item_embeddings
	FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

ALTER TABLE item_embeddings ENABLE ROW LEVEL SECURITY;

-- lingua_app SELECT: tenant-scoped via restaurant access
DROP POLICY IF EXISTS item_embeddings_tenant_select ON item_embeddings;
CREATE POLICY item_embeddings_tenant_select ON item_embeddings
	FOR SELECT TO lingua_app
	USING (app.has_restaurant_access(restaurant_id));

-- lingua_app INSERT: only allowed when the user has restaurant access
DROP POLICY IF EXISTS item_embeddings_tenant_insert ON item_embeddings;
CREATE POLICY item_embeddings_tenant_insert ON item_embeddings
	FOR INSERT TO lingua_app
	WITH CHECK (app.has_restaurant_access(restaurant_id));

-- lingua_app UPDATE: same scope as SELECT
DROP POLICY IF EXISTS item_embeddings_tenant_update ON item_embeddings;
CREATE POLICY item_embeddings_tenant_update ON item_embeddings
	FOR UPDATE TO lingua_app
	USING (app.has_restaurant_access(restaurant_id))
	WITH CHECK (app.has_restaurant_access(restaurant_id));

-- lingua_app DELETE: same scope
DROP POLICY IF EXISTS item_embeddings_tenant_delete ON item_embeddings;
CREATE POLICY item_embeddings_tenant_delete ON item_embeddings
	FOR DELETE TO lingua_app
	USING (app.has_restaurant_access(restaurant_id));

-- ---------------------------------------------------------------------------
-- Grant permissions
-- ---------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON item_embeddings TO lingua_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO lingua_app;
