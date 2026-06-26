-- Migration 0010: Platform admin policies
--
-- Ensures platform admin (super_admin) SELECT policies exist on every table.
-- Uses CREATE OR REPLACE for helper functions in case 0001 was not yet applied
-- in isolation. All policies use DROP ... IF EXISTS for idempotency.

BEGIN;

-- ---------------------------------------------------------------------------
-- Recreate helper functions (idempotent — safe to re-run)
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
-- Platform admin SELECT policies — one per table
-- (tenant policies already exist from earlier migrations;
--  these are additive and allow super_admin to see everything)
-- ---------------------------------------------------------------------------

-- organizations (already in 0001, recreate for idempotency)
DROP POLICY IF EXISTS organizations_platform_select ON public.organizations;
CREATE POLICY organizations_platform_select ON public.organizations
  FOR SELECT USING (app.has_platform_access());

-- app_users (already in 0001)
DROP POLICY IF EXISTS app_users_platform_select ON public.app_users;
CREATE POLICY app_users_platform_select ON public.app_users
  FOR SELECT USING (app.has_platform_access());

-- memberships (already in 0001)
DROP POLICY IF EXISTS memberships_platform_select ON public.memberships;
CREATE POLICY memberships_platform_select ON public.memberships
  FOR SELECT USING (app.has_platform_access());

-- invites (already in 0001)
DROP POLICY IF EXISTS invites_platform_select ON public.invites;
CREATE POLICY invites_platform_select ON public.invites
  FOR SELECT USING (app.has_platform_access());

-- membership_outlets (already in 0003)
DROP POLICY IF EXISTS membership_outlets_platform_select ON public.membership_outlets;
CREATE POLICY membership_outlets_platform_select ON public.membership_outlets
  FOR SELECT USING (app.has_platform_access());

-- outlets (already in 0003)
DROP POLICY IF EXISTS outlets_platform_select ON public.outlets;
CREATE POLICY outlets_platform_select ON public.outlets
  FOR SELECT USING (app.has_platform_access());

-- outlet_locations (already in 0003)
DROP POLICY IF EXISTS outlet_locations_platform_select ON public.outlet_locations;
CREATE POLICY outlet_locations_platform_select ON public.outlet_locations
  FOR SELECT USING (app.has_platform_access());

-- outlet_tables (already in 0003)
DROP POLICY IF EXISTS outlet_tables_platform_select ON public.outlet_tables;
CREATE POLICY outlet_tables_platform_select ON public.outlet_tables
  FOR SELECT USING (app.has_platform_access());

-- buyer_sessions (already in 0004)
DROP POLICY IF EXISTS buyer_sessions_platform_select ON public.buyer_sessions;
CREATE POLICY buyer_sessions_platform_select ON public.buyer_sessions
  FOR SELECT USING (app.has_platform_access());

-- chat_messages (already in 0004)
DROP POLICY IF EXISTS chat_messages_platform_select ON public.chat_messages;
CREATE POLICY chat_messages_platform_select ON public.chat_messages
  FOR SELECT USING (app.has_platform_access());

-- fallback_requests (already in 0004)
DROP POLICY IF EXISTS fallback_requests_platform_select ON public.fallback_requests;
CREATE POLICY fallback_requests_platform_select ON public.fallback_requests
  FOR SELECT USING (app.has_platform_access());

-- feedback (already in 0004)
DROP POLICY IF EXISTS feedback_platform_select ON public.feedback;
CREATE POLICY feedback_platform_select ON public.feedback
  FOR SELECT USING (app.has_platform_access());

-- ai_events (already in 0004)
DROP POLICY IF EXISTS ai_events_platform_select ON public.ai_events;
CREATE POLICY ai_events_platform_select ON public.ai_events
  FOR SELECT USING (app.has_platform_access());

-- knowledge_documents (already in 0004)
DROP POLICY IF EXISTS knowledge_documents_platform_select ON public.knowledge_documents;
CREATE POLICY knowledge_documents_platform_select ON public.knowledge_documents
  FOR SELECT USING (app.has_platform_access());

-- orders (already in 0007)
DROP POLICY IF EXISTS orders_platform_select ON public.orders;
CREATE POLICY orders_platform_select ON public.orders
  FOR SELECT USING (app.has_platform_access());

-- order_items (already in 0007)
DROP POLICY IF EXISTS order_items_platform_select ON public.order_items;
CREATE POLICY order_items_platform_select ON public.order_items
  FOR SELECT USING (app.has_platform_access());

-- item_embeddings (already in 0005)
DROP POLICY IF EXISTS item_embeddings_platform_select ON public.item_embeddings;
CREATE POLICY item_embeddings_platform_select ON public.item_embeddings
  FOR SELECT USING (app.has_platform_access());

-- catalogs (already in 0003)
DROP POLICY IF EXISTS catalogs_platform_select ON public.catalogs;
CREATE POLICY catalogs_platform_select ON public.catalogs
  FOR SELECT USING (app.has_platform_access());

-- catalog_sections (already in 0003)
DROP POLICY IF EXISTS catalog_sections_platform_select ON public.catalog_sections;
CREATE POLICY catalog_sections_platform_select ON public.catalog_sections
  FOR SELECT USING (app.has_platform_access());

-- products (already in 0003)
DROP POLICY IF EXISTS products_platform_select ON public.products;
CREATE POLICY products_platform_select ON public.products
  FOR SELECT USING (app.has_platform_access());

-- web_vitals (already in 0006)
DROP POLICY IF EXISTS web_vitals_platform_select ON public.web_vitals;
CREATE POLICY web_vitals_platform_select ON public.web_vitals
  FOR SELECT USING (app.has_platform_access());

-- onboarding_progress (already in 0006)
DROP POLICY IF EXISTS onboarding_progress_platform_select ON public.onboarding_progress;
CREATE POLICY onboarding_progress_platform_select ON public.onboarding_progress
  FOR SELECT USING (app.has_platform_access());

COMMIT;
