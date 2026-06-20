-- Migration 0009: admin write policies for knowledge_documents
--
-- Background: migrations 0001 and 0002 only defined SELECT policies for the
-- knowledge_documents table (tenant-scoped reads + public published reads).
-- RLS is ENABLED, so without INSERT/UPDATE/DELETE policies the lingua_app role
-- cannot mutate knowledge notes. This is a blocker for the knowledge admin
-- page (CRUD). This migration grants authenticated staff/manager writes scoped
-- through app.has_restaurant_access, matching the SELECT policy shape from 0001.
--
-- Tenant identity is always resolved server-side (from locals.user membership)
-- and app.user_external_id is set per-transaction via withUserContext before any
-- of these writes run, so has_restaurant_access() evaluates correctly.
--
-- Idempotent: every policy uses DROP POLICY IF EXISTS before CREATE.

-- ---------------------------------------------------------------------------
-- knowledge_documents: INSERT / UPDATE / DELETE scoped by restaurant_id
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS knowledge_documents_tenant_insert ON knowledge_documents;
CREATE POLICY knowledge_documents_tenant_insert ON knowledge_documents
	FOR INSERT TO lingua_app
	WITH CHECK (app.has_restaurant_access(restaurant_id));

DROP POLICY IF EXISTS knowledge_documents_tenant_update ON knowledge_documents;
CREATE POLICY knowledge_documents_tenant_update ON knowledge_documents
	FOR UPDATE TO lingua_app
	USING (app.has_restaurant_access(restaurant_id))
	WITH CHECK (app.has_restaurant_access(restaurant_id));

DROP POLICY IF EXISTS knowledge_documents_tenant_delete ON knowledge_documents;
CREATE POLICY knowledge_documents_tenant_delete ON knowledge_documents
	FOR DELETE TO lingua_app
	USING (app.has_restaurant_access(restaurant_id));
