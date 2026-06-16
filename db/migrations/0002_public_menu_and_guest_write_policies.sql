DROP POLICY IF EXISTS restaurants_public_active_select ON restaurants;
CREATE POLICY restaurants_public_active_select ON restaurants
	FOR SELECT TO lingua_app
	USING (status = 'active');

DROP POLICY IF EXISTS restaurant_tables_public_active_select ON restaurant_tables;
CREATE POLICY restaurant_tables_public_active_select ON restaurant_tables
	FOR SELECT TO lingua_app
	USING (
		is_active = true
		AND EXISTS (
			SELECT 1
			FROM restaurants r
			WHERE r.id = restaurant_id
				AND r.status = 'active'
		)
	);

DROP POLICY IF EXISTS menus_public_published_select ON menus;
CREATE POLICY menus_public_published_select ON menus
	FOR SELECT TO lingua_app
	USING (
		status = 'published'
		AND EXISTS (
			SELECT 1
			FROM restaurants r
			WHERE r.id = restaurant_id
				AND r.status = 'active'
		)
	);

DROP POLICY IF EXISTS menu_categories_public_published_select ON menu_categories;
CREATE POLICY menu_categories_public_published_select ON menu_categories
	FOR SELECT TO lingua_app
	USING (
		EXISTS (
			SELECT 1
			FROM menus m
			JOIN restaurants r ON r.id = m.restaurant_id
			WHERE m.id = menu_id
				AND m.status = 'published'
				AND r.status = 'active'
		)
	);

DROP POLICY IF EXISTS menu_items_public_published_select ON menu_items;
CREATE POLICY menu_items_public_published_select ON menu_items
	FOR SELECT TO lingua_app
	USING (
		EXISTS (
			SELECT 1
			FROM menus m
			JOIN restaurants r ON r.id = m.restaurant_id
			WHERE m.id = menu_id
				AND m.status = 'published'
				AND r.status = 'active'
		)
	);

DROP POLICY IF EXISTS menu_item_translations_public_published_select ON menu_item_translations;
CREATE POLICY menu_item_translations_public_published_select ON menu_item_translations
	FOR SELECT TO lingua_app
	USING (
		EXISTS (
			SELECT 1
			FROM menu_items mi
			JOIN menus m ON m.id = mi.menu_id
			JOIN restaurants r ON r.id = mi.restaurant_id
			WHERE mi.id = menu_item_id
				AND m.status = 'published'
				AND r.status = 'active'
		)
	);

DROP POLICY IF EXISTS menu_item_dietary_flags_public_published_select ON menu_item_dietary_flags;
CREATE POLICY menu_item_dietary_flags_public_published_select ON menu_item_dietary_flags
	FOR SELECT TO lingua_app
	USING (
		EXISTS (
			SELECT 1
			FROM menu_items mi
			JOIN menus m ON m.id = mi.menu_id
			JOIN restaurants r ON r.id = mi.restaurant_id
			WHERE mi.id = menu_item_id
				AND m.status = 'published'
				AND r.status = 'active'
		)
	);

DROP POLICY IF EXISTS menu_item_allergens_public_published_select ON menu_item_allergens;
CREATE POLICY menu_item_allergens_public_published_select ON menu_item_allergens
	FOR SELECT TO lingua_app
	USING (
		EXISTS (
			SELECT 1
			FROM menu_items mi
			JOIN menus m ON m.id = mi.menu_id
			JOIN restaurants r ON r.id = mi.restaurant_id
			WHERE mi.id = menu_item_id
				AND m.status = 'published'
				AND r.status = 'active'
		)
	);

DROP POLICY IF EXISTS knowledge_documents_public_published_select ON knowledge_documents;
CREATE POLICY knowledge_documents_public_published_select ON knowledge_documents
	FOR SELECT TO lingua_app
	USING (
		visibility = 'published'
		AND EXISTS (
			SELECT 1
			FROM restaurants r
			WHERE r.id = restaurant_id
				AND r.status = 'active'
		)
	);

DROP POLICY IF EXISTS customer_sessions_public_insert ON customer_sessions;
CREATE POLICY customer_sessions_public_insert ON customer_sessions
	FOR INSERT TO lingua_app
	WITH CHECK (
		EXISTS (
			SELECT 1
			FROM restaurant_tables t
			JOIN restaurants r ON r.id = t.restaurant_id
			WHERE t.id = table_id
				AND t.restaurant_id = customer_sessions.restaurant_id
				AND t.organization_id = customer_sessions.organization_id
				AND t.is_active = true
				AND r.status = 'active'
		)
	);

DROP POLICY IF EXISTS fallback_requests_public_insert ON fallback_requests;
CREATE POLICY fallback_requests_public_insert ON fallback_requests
	FOR INSERT TO lingua_app
	WITH CHECK (
		EXISTS (
			SELECT 1
			FROM restaurant_tables t
			JOIN restaurants r ON r.id = t.restaurant_id
			WHERE t.id = table_id
				AND t.restaurant_id = fallback_requests.restaurant_id
				AND t.organization_id = fallback_requests.organization_id
				AND t.is_active = true
				AND r.status = 'active'
		)
		AND (
			session_id IS NULL
			OR EXISTS (
				SELECT 1
				FROM customer_sessions s
				WHERE s.id = session_id
					AND s.restaurant_id = fallback_requests.restaurant_id
					AND s.organization_id = fallback_requests.organization_id
			)
		)
	);

DROP POLICY IF EXISTS feedback_public_insert ON feedback;
CREATE POLICY feedback_public_insert ON feedback
	FOR INSERT TO lingua_app
	WITH CHECK (
		EXISTS (
			SELECT 1
			FROM restaurants r
			WHERE r.id = restaurant_id
				AND r.organization_id = feedback.organization_id
				AND r.status = 'active'
		)
		AND (
			session_id IS NULL
			OR EXISTS (
				SELECT 1
				FROM customer_sessions s
				WHERE s.id = session_id
					AND s.restaurant_id = feedback.restaurant_id
					AND s.organization_id = feedback.organization_id
			)
		)
	);
