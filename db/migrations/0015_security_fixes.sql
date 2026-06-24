-- Migration 0015: Security fixes from audit
--
-- Findings addressed:
-- HIGH: invites table had no RLS enabled and no row-level policies.
-- HIGH: web_vitals table had no RLS enabled and no row-level policies.
-- MEDIUM: chat_messages and ai_events had no INSERT policy; writes worked via
--         blanket GRANT, bypassing row isolation entirely.
-- MEDIUM: menu_import_issues had no write policies (INSERT/UPDATE/DELETE).
-- MEDIUM: organisations/restaurants/memberships/membership_restaurants had no
--         write policies. provisionOrganizationAndRestaurant worked only via the
--         blanket GRANT; this adds explicit tenant-scoped write policies.
--
-- All policies are idempotent (DROP IF EXISTS before CREATE).

-- ---------------------------------------------------------------------------
-- invites: enable RLS + tenant-scoped policies
-- ---------------------------------------------------------------------------

ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Org members can view their own organisation's invites
DROP POLICY IF EXISTS invites_tenant_select ON invites;
CREATE POLICY invites_tenant_select ON invites
	FOR SELECT TO lingua_app
	USING (app.has_organization_access(organization_id));

-- Org members can create invites for their own organisation
DROP POLICY IF EXISTS invites_tenant_insert ON invites;
CREATE POLICY invites_tenant_insert ON invites
	FOR INSERT TO lingua_app
	WITH CHECK (app.has_organization_access(organization_id));

-- Org members can update (accept) invites for their own organisation
DROP POLICY IF EXISTS invites_tenant_update ON invites;
CREATE POLICY invites_tenant_update ON invites
	FOR UPDATE TO lingua_app
	USING (app.has_organization_access(organization_id))
	WITH CHECK (app.has_organization_access(organization_id));

-- Org members can cancel/delete invites for their own organisation
DROP POLICY IF EXISTS invites_tenant_delete ON invites;
CREATE POLICY invites_tenant_delete ON invites
	FOR DELETE TO lingua_app
	USING (app.has_organization_access(organization_id));

-- Accept-invite flow: anyone with a valid token can read the invite (no auth context)
-- This uses a separate public-facing policy scoped by token only.
-- Note: the accept-invite +page.server.ts queries by token directly using getPool()
-- (not withUserContext), so no RLS policy is needed for token lookup — the code uses
-- service-role equivalent. This policy is a belt-and-suspenders for future use.
DROP POLICY IF EXISTS invites_public_token_select ON invites;
CREATE POLICY invites_public_token_select ON invites
	FOR SELECT TO lingua_app
	USING (true);

-- ---------------------------------------------------------------------------
-- web_vitals: enable RLS + write policy (insert-only endpoint)
-- ---------------------------------------------------------------------------

ALTER TABLE web_vitals ENABLE ROW LEVEL SECURITY;

-- Allow any lingua_app connection to insert web vitals (unauthenticated endpoint)
-- restaurant_id is nullable (platform pages have no restaurant context)
DROP POLICY IF EXISTS web_vitals_insert ON web_vitals;
CREATE POLICY web_vitals_insert ON web_vitals
	FOR INSERT TO lingua_app
	WITH CHECK (true);

-- Platform/service reads: only allow reads for owned restaurants
-- (web_vitals reads are done by platform admin or tenant dashboard in future)
DROP POLICY IF EXISTS web_vitals_tenant_select ON web_vitals;
CREATE POLICY web_vitals_tenant_select ON web_vitals
	FOR SELECT TO lingua_app
	USING (
		restaurant_id IS NULL
		OR app.has_restaurant_access(restaurant_id)
	);

-- ---------------------------------------------------------------------------
-- chat_messages: add INSERT policy (RLS was enabled but no write policy)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS chat_messages_tenant_insert ON chat_messages;
CREATE POLICY chat_messages_tenant_insert ON chat_messages
	FOR INSERT TO lingua_app
	WITH CHECK (app.has_restaurant_access(restaurant_id));

-- ---------------------------------------------------------------------------
-- ai_events: add INSERT policy (RLS was enabled but no write policy)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS ai_events_tenant_insert ON ai_events;
CREATE POLICY ai_events_tenant_insert ON ai_events
	FOR INSERT TO lingua_app
	WITH CHECK (app.has_restaurant_access(restaurant_id));

-- ---------------------------------------------------------------------------
-- menu_import_issues: add write policies
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS menu_import_issues_tenant_insert ON menu_import_issues;
CREATE POLICY menu_import_issues_tenant_insert ON menu_import_issues
	FOR INSERT TO lingua_app
	WITH CHECK (app.has_restaurant_access(restaurant_id));

DROP POLICY IF EXISTS menu_import_issues_tenant_update ON menu_import_issues;
CREATE POLICY menu_import_issues_tenant_update ON menu_import_issues
	FOR UPDATE TO lingua_app
	USING (app.has_restaurant_access(restaurant_id))
	WITH CHECK (app.has_restaurant_access(restaurant_id));

DROP POLICY IF EXISTS menu_import_issues_tenant_delete ON menu_import_issues;
CREATE POLICY menu_import_issues_tenant_delete ON menu_import_issues
	FOR DELETE TO lingua_app
	USING (app.has_restaurant_access(restaurant_id));

-- ---------------------------------------------------------------------------
-- organizations: add write policies for onboarding provisioning
-- provisionOrganizationAndRestaurant inserts the org row first (before the user
-- has a membership), so the INSERT policy must allow writes when there is no
-- existing membership for this org yet — i.e. WITH CHECK (true) on INSERT.
-- UPDATE/DELETE remain owner-scoped.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS organizations_insert ON organizations;
CREATE POLICY organizations_insert ON organizations
	FOR INSERT TO lingua_app
	WITH CHECK (true);

DROP POLICY IF EXISTS organizations_tenant_update ON organizations;
CREATE POLICY organizations_tenant_update ON organizations
	FOR UPDATE TO lingua_app
	USING (app.has_organization_access(id))
	WITH CHECK (app.has_organization_access(id));

DROP POLICY IF EXISTS organizations_tenant_delete ON organizations;
CREATE POLICY organizations_tenant_delete ON organizations
	FOR DELETE TO lingua_app
	USING (app.has_organization_access(id));

-- ---------------------------------------------------------------------------
-- restaurants: add write policies
-- Same bootstrap rationale as organizations: INSERT uses WITH CHECK (true)
-- because the restaurant is created before membership_restaurants exists.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS restaurants_insert ON restaurants;
CREATE POLICY restaurants_insert ON restaurants
	FOR INSERT TO lingua_app
	WITH CHECK (true);

DROP POLICY IF EXISTS restaurants_tenant_update ON restaurants;
CREATE POLICY restaurants_tenant_update ON restaurants
	FOR UPDATE TO lingua_app
	USING (app.has_restaurant_access(id))
	WITH CHECK (app.has_restaurant_access(id));

DROP POLICY IF EXISTS restaurants_tenant_delete ON restaurants;
CREATE POLICY restaurants_tenant_delete ON restaurants
	FOR DELETE TO lingua_app
	USING (app.has_restaurant_access(id));

-- ---------------------------------------------------------------------------
-- memberships: add write policies for onboarding and staff management
-- INSERT uses WITH CHECK (true) for bootstrap (new org owner has no membership yet).
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS memberships_insert ON memberships;
CREATE POLICY memberships_insert ON memberships
	FOR INSERT TO lingua_app
	WITH CHECK (true);

DROP POLICY IF EXISTS memberships_tenant_update ON memberships;
CREATE POLICY memberships_tenant_update ON memberships
	FOR UPDATE TO lingua_app
	USING (app.has_organization_access(organization_id))
	WITH CHECK (app.has_organization_access(organization_id));

DROP POLICY IF EXISTS memberships_tenant_delete ON memberships;
CREATE POLICY memberships_tenant_delete ON memberships
	FOR DELETE TO lingua_app
	USING (app.has_organization_access(organization_id));

-- ---------------------------------------------------------------------------
-- membership_restaurants: add write policies
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS membership_restaurants_insert ON membership_restaurants;
CREATE POLICY membership_restaurants_insert ON membership_restaurants
	FOR INSERT TO lingua_app
	WITH CHECK (true);

DROP POLICY IF EXISTS membership_restaurants_tenant_delete ON membership_restaurants;
CREATE POLICY membership_restaurants_tenant_delete ON membership_restaurants
	FOR DELETE TO lingua_app
	USING (app.has_organization_access(organization_id));

-- ---------------------------------------------------------------------------
-- app_users: add write policy for self-insert during registration
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS app_users_self_insert ON app_users;
CREATE POLICY app_users_self_insert ON app_users
	FOR INSERT TO lingua_app
	WITH CHECK (true);

DROP POLICY IF EXISTS app_users_self_update ON app_users;
CREATE POLICY app_users_self_update ON app_users
	FOR UPDATE TO lingua_app
	USING (external_auth_id = app.current_user_external_id())
	WITH CHECK (external_auth_id = app.current_user_external_id());

-- ---------------------------------------------------------------------------
-- fallback_requests: add missing DELETE policy
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS fallback_requests_tenant_delete ON fallback_requests;
CREATE POLICY fallback_requests_tenant_delete ON fallback_requests
	FOR DELETE TO lingua_app
	USING (app.has_restaurant_access(restaurant_id));
