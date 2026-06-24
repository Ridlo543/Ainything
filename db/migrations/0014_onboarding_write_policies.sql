-- Migration 0014: write policies for restaurant_tables, restaurant_locations, and menus
--
-- Background: migrations 0001/0002 only defined SELECT policies for these tables.
-- The onboarding wizard needs to:
--   1. bulk-insert restaurant_tables rows (Step 3)
--   2. optionally insert a restaurant_locations row (Step 2)
--   3. insert a draft menus row (Step 5 go-live / Step 2 menu upload)
--
-- All policies use app.has_restaurant_access() matching the SELECT policy shape
-- already in 0001 so tenant identity is enforced consistently.
--
-- Idempotent: every policy uses DROP POLICY IF EXISTS before CREATE.

-- ---------------------------------------------------------------------------
-- restaurant_tables: INSERT / UPDATE / DELETE scoped by restaurant_id
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS restaurant_tables_tenant_insert ON restaurant_tables;
CREATE POLICY restaurant_tables_tenant_insert ON restaurant_tables
	FOR INSERT TO lingua_app
	WITH CHECK (app.has_restaurant_access(restaurant_id));

DROP POLICY IF EXISTS restaurant_tables_tenant_update ON restaurant_tables;
CREATE POLICY restaurant_tables_tenant_update ON restaurant_tables
	FOR UPDATE TO lingua_app
	USING (app.has_restaurant_access(restaurant_id))
	WITH CHECK (app.has_restaurant_access(restaurant_id));

DROP POLICY IF EXISTS restaurant_tables_tenant_delete ON restaurant_tables;
CREATE POLICY restaurant_tables_tenant_delete ON restaurant_tables
	FOR DELETE TO lingua_app
	USING (app.has_restaurant_access(restaurant_id));

-- ---------------------------------------------------------------------------
-- restaurant_locations: INSERT / UPDATE / DELETE scoped by restaurant_id
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS restaurant_locations_tenant_insert ON restaurant_locations;
CREATE POLICY restaurant_locations_tenant_insert ON restaurant_locations
	FOR INSERT TO lingua_app
	WITH CHECK (app.has_restaurant_access(restaurant_id));

DROP POLICY IF EXISTS restaurant_locations_tenant_update ON restaurant_locations;
CREATE POLICY restaurant_locations_tenant_update ON restaurant_locations
	FOR UPDATE TO lingua_app
	USING (app.has_restaurant_access(restaurant_id))
	WITH CHECK (app.has_restaurant_access(restaurant_id));

DROP POLICY IF EXISTS restaurant_locations_tenant_delete ON restaurant_locations;
CREATE POLICY restaurant_locations_tenant_delete ON restaurant_locations
	FOR DELETE TO lingua_app
	USING (app.has_restaurant_access(restaurant_id));

-- ---------------------------------------------------------------------------
-- menus: INSERT / UPDATE / DELETE scoped by restaurant_id
--
-- The onboarding wizard creates the first draft menu. Publishing (archive old +
-- promote new) is also done server-side under the same tenancy.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS menus_tenant_insert ON menus;
CREATE POLICY menus_tenant_insert ON menus
	FOR INSERT TO lingua_app
	WITH CHECK (app.has_restaurant_access(restaurant_id));

DROP POLICY IF EXISTS menus_tenant_update ON menus;
CREATE POLICY menus_tenant_update ON menus
	FOR UPDATE TO lingua_app
	USING (app.has_restaurant_access(restaurant_id))
	WITH CHECK (app.has_restaurant_access(restaurant_id));

DROP POLICY IF EXISTS menus_tenant_delete ON menus;
CREATE POLICY menus_tenant_delete ON menus
	FOR DELETE TO lingua_app
	USING (app.has_restaurant_access(restaurant_id));
