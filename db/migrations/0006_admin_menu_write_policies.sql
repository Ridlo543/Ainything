-- Migration 0006: admin/manager write policies for menu tables
--
-- Background: migrations 0001 and 0002 only defined SELECT policies (tenant-scoped
-- and public published-menu reads) plus guest INSERT policies for
-- customer_sessions / fallback_requests / feedback. With RLS ENABLED on every
-- menu_* table and no INSERT/UPDATE/DELETE policy present, the lingua_app role
-- could not mutate menu data at all (no policy = deny). This migration grants
-- authenticated staff/manager writes scoped through app.has_restaurant_access,
-- matching the SELECT policy shape already in 0001.
--
-- Tenant identity is always resolved server-side (from locals.user membership)
-- and app.user_external_id is set per-transaction via withUserContext before any
-- of these writes run, so has_restaurant_access() evaluates correctly.
--
-- Idempotent: every policy uses DROP POLICY IF EXISTS before CREATE.

-- ---------------------------------------------------------------------------
-- menu_categories: INSERT / UPDATE / DELETE scoped by restaurant_id
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS menu_categories_tenant_insert ON menu_categories;
CREATE POLICY menu_categories_tenant_insert ON menu_categories
	FOR INSERT TO lingua_app
	WITH CHECK (app.has_restaurant_access(restaurant_id));

DROP POLICY IF EXISTS menu_categories_tenant_update ON menu_categories;
CREATE POLICY menu_categories_tenant_update ON menu_categories
	FOR UPDATE TO lingua_app
	USING (app.has_restaurant_access(restaurant_id))
	WITH CHECK (app.has_restaurant_access(restaurant_id));

DROP POLICY IF EXISTS menu_categories_tenant_delete ON menu_categories;
CREATE POLICY menu_categories_tenant_delete ON menu_categories
	FOR DELETE TO lingua_app
	USING (app.has_restaurant_access(restaurant_id));

-- ---------------------------------------------------------------------------
-- menu_items: INSERT / UPDATE / DELETE scoped by restaurant_id
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS menu_items_tenant_insert ON menu_items;
CREATE POLICY menu_items_tenant_insert ON menu_items
	FOR INSERT TO lingua_app
	WITH CHECK (app.has_restaurant_access(restaurant_id));

DROP POLICY IF EXISTS menu_items_tenant_update ON menu_items;
CREATE POLICY menu_items_tenant_update ON menu_items
	FOR UPDATE TO lingua_app
	USING (app.has_restaurant_access(restaurant_id))
	WITH CHECK (app.has_restaurant_access(restaurant_id));

DROP POLICY IF EXISTS menu_items_tenant_delete ON menu_items;
CREATE POLICY menu_items_tenant_delete ON menu_items
	FOR DELETE TO lingua_app
	USING (app.has_restaurant_access(restaurant_id));

-- ---------------------------------------------------------------------------
-- menu_item_translations: INSERT / UPDATE / DELETE scoped by restaurant_id
-- (the table carries its own restaurant_id column)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS menu_item_translations_tenant_insert ON menu_item_translations;
CREATE POLICY menu_item_translations_tenant_insert ON menu_item_translations
	FOR INSERT TO lingua_app
	WITH CHECK (app.has_restaurant_access(restaurant_id));

DROP POLICY IF EXISTS menu_item_translations_tenant_update ON menu_item_translations;
CREATE POLICY menu_item_translations_tenant_update ON menu_item_translations
	FOR UPDATE TO lingua_app
	USING (app.has_restaurant_access(restaurant_id))
	WITH CHECK (app.has_restaurant_access(restaurant_id));

DROP POLICY IF EXISTS menu_item_translations_tenant_delete ON menu_item_translations;
CREATE POLICY menu_item_translations_tenant_delete ON menu_item_translations
	FOR DELETE TO lingua_app
	USING (app.has_restaurant_access(restaurant_id));

-- ---------------------------------------------------------------------------
-- menu_item_dietary_flags: INSERT / UPDATE / DELETE via EXISTS on menu_items.
-- The join table has no restaurant_id column, so scope through the parent row.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS menu_item_dietary_flags_tenant_insert ON menu_item_dietary_flags;
CREATE POLICY menu_item_dietary_flags_tenant_insert ON menu_item_dietary_flags
	FOR INSERT TO lingua_app
	WITH CHECK (
		EXISTS (
			SELECT 1 FROM menu_items mi
			WHERE mi.id = menu_item_id AND app.has_restaurant_access(mi.restaurant_id)
		)
	);

DROP POLICY IF EXISTS menu_item_dietary_flags_tenant_update ON menu_item_dietary_flags;
CREATE POLICY menu_item_dietary_flags_tenant_update ON menu_item_dietary_flags
	FOR UPDATE TO lingua_app
	USING (
		EXISTS (
			SELECT 1 FROM menu_items mi
			WHERE mi.id = menu_item_id AND app.has_restaurant_access(mi.restaurant_id)
		)
	)
	WITH CHECK (
		EXISTS (
			SELECT 1 FROM menu_items mi
			WHERE mi.id = menu_item_id AND app.has_restaurant_access(mi.restaurant_id)
		)
	);

DROP POLICY IF EXISTS menu_item_dietary_flags_tenant_delete ON menu_item_dietary_flags;
CREATE POLICY menu_item_dietary_flags_tenant_delete ON menu_item_dietary_flags
	FOR DELETE TO lingua_app
	USING (
		EXISTS (
			SELECT 1 FROM menu_items mi
			WHERE mi.id = menu_item_id AND app.has_restaurant_access(mi.restaurant_id)
		)
	);

-- ---------------------------------------------------------------------------
-- menu_item_allergens: INSERT / UPDATE / DELETE via EXISTS on menu_items
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS menu_item_allergens_tenant_insert ON menu_item_allergens;
CREATE POLICY menu_item_allergens_tenant_insert ON menu_item_allergens
	FOR INSERT TO lingua_app
	WITH CHECK (
		EXISTS (
			SELECT 1 FROM menu_items mi
			WHERE mi.id = menu_item_id AND app.has_restaurant_access(mi.restaurant_id)
		)
	);

DROP POLICY IF EXISTS menu_item_allergens_tenant_update ON menu_item_allergens;
CREATE POLICY menu_item_allergens_tenant_update ON menu_item_allergens
	FOR UPDATE TO lingua_app
	USING (
		EXISTS (
			SELECT 1 FROM menu_items mi
			WHERE mi.id = menu_item_id AND app.has_restaurant_access(mi.restaurant_id)
		)
	)
	WITH CHECK (
		EXISTS (
			SELECT 1 FROM menu_items mi
			WHERE mi.id = menu_item_id AND app.has_restaurant_access(mi.restaurant_id)
		)
	);

DROP POLICY IF EXISTS menu_item_allergens_tenant_delete ON menu_item_allergens;
CREATE POLICY menu_item_allergens_tenant_delete ON menu_item_allergens
	FOR DELETE TO lingua_app
	USING (
		EXISTS (
			SELECT 1 FROM menu_items mi
			WHERE mi.id = menu_item_id AND app.has_restaurant_access(mi.restaurant_id)
		)
	);
