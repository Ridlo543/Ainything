-- Migration 0010: platform admin role bridge
--
-- Supabase Auth returns only auth.users. Lingua stores the app user profile in
-- app_users and resolves platform role + tenant memberships server-side. This
-- migration adds the platform role column used by SupabaseAuthProvider and allows
-- super_admin users to read cross-tenant data without broad write privileges.

ALTER TABLE app_users
	ADD COLUMN IF NOT EXISTS platform_role text NOT NULL DEFAULT 'staff'
		CHECK (platform_role IN ('super_admin', 'org_owner', 'restaurant_admin', 'staff'));

CREATE INDEX IF NOT EXISTS app_users_platform_role_idx
	ON app_users (platform_role);

CREATE OR REPLACE FUNCTION app.current_platform_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, app, pg_temp
AS $$
	SELECT COALESCE(u.platform_role, 'staff')
	FROM app_users u
	WHERE u.external_auth_id = app.current_user_external_id()
	LIMIT 1
$$;

CREATE OR REPLACE FUNCTION app.has_platform_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, app, pg_temp
AS $$
	SELECT app.current_platform_role() = 'super_admin'
$$;

DROP POLICY IF EXISTS app_users_self_select ON app_users;
CREATE POLICY app_users_self_or_platform_select ON app_users
	FOR SELECT TO lingua_app
	USING (
		external_auth_id = app.current_user_external_id()
		OR app.has_platform_access()
	);

DROP POLICY IF EXISTS app_users_platform_admin_select ON app_users;
CREATE POLICY app_users_platform_admin_select ON app_users
	FOR SELECT TO lingua_app
	USING (app.has_platform_access());

DROP POLICY IF EXISTS organizations_platform_admin_select ON organizations;
CREATE POLICY organizations_platform_admin_select ON organizations
	FOR SELECT TO lingua_app
	USING (app.has_platform_access());

DROP POLICY IF EXISTS memberships_platform_admin_select ON memberships;
CREATE POLICY memberships_platform_admin_select ON memberships
	FOR SELECT TO lingua_app
	USING (app.has_platform_access());

DROP POLICY IF EXISTS membership_restaurants_platform_admin_select ON membership_restaurants;
CREATE POLICY membership_restaurants_platform_admin_select ON membership_restaurants
	FOR SELECT TO lingua_app
	USING (app.has_platform_access());

DROP POLICY IF EXISTS restaurants_platform_admin_select ON restaurants;
CREATE POLICY restaurants_platform_admin_select ON restaurants
	FOR SELECT TO lingua_app
	USING (app.has_platform_access());

DROP POLICY IF EXISTS restaurant_locations_platform_admin_select ON restaurant_locations;
CREATE POLICY restaurant_locations_platform_admin_select ON restaurant_locations
	FOR SELECT TO lingua_app
	USING (app.has_platform_access());

DROP POLICY IF EXISTS restaurant_tables_platform_admin_select ON restaurant_tables;
CREATE POLICY restaurant_tables_platform_admin_select ON restaurant_tables
	FOR SELECT TO lingua_app
	USING (app.has_platform_access());

DROP POLICY IF EXISTS menus_platform_admin_select ON menus;
CREATE POLICY menus_platform_admin_select ON menus
	FOR SELECT TO lingua_app
	USING (app.has_platform_access());

DROP POLICY IF EXISTS menu_categories_platform_admin_select ON menu_categories;
CREATE POLICY menu_categories_platform_admin_select ON menu_categories
	FOR SELECT TO lingua_app
	USING (app.has_platform_access());

DROP POLICY IF EXISTS menu_items_platform_admin_select ON menu_items;
CREATE POLICY menu_items_platform_admin_select ON menu_items
	FOR SELECT TO lingua_app
	USING (app.has_platform_access());

DROP POLICY IF EXISTS menu_item_translations_platform_admin_select ON menu_item_translations;
CREATE POLICY menu_item_translations_platform_admin_select ON menu_item_translations
	FOR SELECT TO lingua_app
	USING (app.has_platform_access());

DROP POLICY IF EXISTS menu_item_dietary_flags_platform_admin_select ON menu_item_dietary_flags;
CREATE POLICY menu_item_dietary_flags_platform_admin_select ON menu_item_dietary_flags
	FOR SELECT TO lingua_app
	USING (app.has_platform_access());

DROP POLICY IF EXISTS menu_item_allergens_platform_admin_select ON menu_item_allergens;
CREATE POLICY menu_item_allergens_platform_admin_select ON menu_item_allergens
	FOR SELECT TO lingua_app
	USING (app.has_platform_access());

DROP POLICY IF EXISTS menu_import_issues_platform_admin_select ON menu_import_issues;
CREATE POLICY menu_import_issues_platform_admin_select ON menu_import_issues
	FOR SELECT TO lingua_app
	USING (app.has_platform_access());

DROP POLICY IF EXISTS knowledge_documents_platform_admin_select ON knowledge_documents;
CREATE POLICY knowledge_documents_platform_admin_select ON knowledge_documents
	FOR SELECT TO lingua_app
	USING (app.has_platform_access());

DROP POLICY IF EXISTS customer_sessions_platform_admin_select ON customer_sessions;
CREATE POLICY customer_sessions_platform_admin_select ON customer_sessions
	FOR SELECT TO lingua_app
	USING (app.has_platform_access());

DROP POLICY IF EXISTS chat_messages_platform_admin_select ON chat_messages;
CREATE POLICY chat_messages_platform_admin_select ON chat_messages
	FOR SELECT TO lingua_app
	USING (app.has_platform_access());

DROP POLICY IF EXISTS fallback_requests_platform_admin_select ON fallback_requests;
CREATE POLICY fallback_requests_platform_admin_select ON fallback_requests
	FOR SELECT TO lingua_app
	USING (app.has_platform_access());

DROP POLICY IF EXISTS feedback_platform_admin_select ON feedback;
CREATE POLICY feedback_platform_admin_select ON feedback
	FOR SELECT TO lingua_app
	USING (app.has_platform_access());

DROP POLICY IF EXISTS ai_events_platform_admin_select ON ai_events;
CREATE POLICY ai_events_platform_admin_select ON ai_events
	FOR SELECT TO lingua_app
	USING (app.has_platform_access());
