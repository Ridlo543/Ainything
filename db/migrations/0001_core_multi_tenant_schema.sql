CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lingua_app') THEN
		CREATE ROLE lingua_app LOGIN PASSWORD 'lingua_app';
	END IF;

	EXECUTE format('GRANT CONNECT ON DATABASE %I TO lingua_app', current_database());
END
$$;

CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	NEW.updated_at = now();
	RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS organizations (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	name text NOT NULL,
	slug text NOT NULL UNIQUE,
	workspace_host text UNIQUE,
	plan text NOT NULL DEFAULT 'pilot' CHECK (plan IN ('pilot', 'starter', 'pro', 'enterprise')),
	status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_users (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	external_auth_id text NOT NULL UNIQUE,
	email text NOT NULL UNIQUE,
	name text NOT NULL,
	default_organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memberships (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
	organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	role text NOT NULL CHECK (role IN ('owner', 'manager', 'staff')),
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	UNIQUE (user_id, organization_id)
);

CREATE TABLE IF NOT EXISTS restaurants (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	name text NOT NULL,
	slug text NOT NULL UNIQUE,
	public_host text UNIQUE,
	location text NOT NULL DEFAULT '',
	segment text NOT NULL CHECK (
		segment IN ('cafe', 'casual-dining', 'hotel-restaurant', 'beach-club', 'premium')
	),
	timezone text NOT NULL DEFAULT 'Asia/Jakarta',
	default_language_tag text NOT NULL DEFAULT 'id',
	language_tags text[] NOT NULL DEFAULT ARRAY['id', 'en']::text[],
	hero_image_url text NOT NULL DEFAULT '',
	menu_scan_url text NOT NULL DEFAULT '',
	table_count integer NOT NULL DEFAULT 0 CHECK (table_count >= 0),
	menu_source_type text NOT NULL DEFAULT 'photo' CHECK (
		menu_source_type IN ('pdf-scan', 'photo', 'bilingual', 'handwritten', 'seasonal', 'spreadsheet')
	),
	description text NOT NULL DEFAULT '',
	knowledge_highlights text[] NOT NULL DEFAULT ARRAY[]::text[],
	analytics jsonb NOT NULL DEFAULT '{}'::jsonb,
	status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS membership_restaurants (
	membership_id uuid NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
	organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
	created_at timestamptz NOT NULL DEFAULT now(),
	PRIMARY KEY (membership_id, restaurant_id)
);

CREATE TABLE IF NOT EXISTS restaurant_locations (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
	code text NOT NULL,
	name text NOT NULL,
	address text NOT NULL DEFAULT '',
	timezone text NOT NULL DEFAULT 'Asia/Jakarta',
	is_primary boolean NOT NULL DEFAULT false,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	UNIQUE (restaurant_id, code)
);

CREATE TABLE IF NOT EXISTS restaurant_tables (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
	location_id uuid REFERENCES restaurant_locations(id) ON DELETE SET NULL,
	code text NOT NULL,
	label text NOT NULL,
	is_active boolean NOT NULL DEFAULT true,
	qr_path text NOT NULL DEFAULT '',
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	UNIQUE (restaurant_id, code)
);

CREATE TABLE IF NOT EXISTS menus (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
	version integer NOT NULL DEFAULT 1 CHECK (version > 0),
	status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
	source_type text NOT NULL DEFAULT 'photo' CHECK (
		source_type IN ('pdf-scan', 'photo', 'bilingual', 'handwritten', 'seasonal', 'spreadsheet')
	),
	source_uri text,
	published_at timestamptz,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	UNIQUE (restaurant_id, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS menus_one_published_per_restaurant
	ON menus (restaurant_id)
	WHERE status = 'published';

CREATE TABLE IF NOT EXISTS menu_categories (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
	menu_id uuid NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
	name text NOT NULL,
	localized_names jsonb NOT NULL DEFAULT '{}'::jsonb,
	sort_order integer NOT NULL DEFAULT 0,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	UNIQUE (menu_id, name)
);

CREATE TABLE IF NOT EXISTS menu_items (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
	menu_id uuid NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
	category_id uuid NOT NULL REFERENCES menu_categories(id) ON DELETE RESTRICT,
	name text NOT NULL,
	local_name text,
	description text NOT NULL DEFAULT '',
	price_amount integer NOT NULL CHECK (price_amount >= 0),
	currency text NOT NULL DEFAULT 'IDR',
	image_url text NOT NULL DEFAULT '',
	spice_level smallint NOT NULL DEFAULT 0 CHECK (spice_level BETWEEN 0 AND 5),
	is_available boolean NOT NULL DEFAULT true,
	is_signature boolean NOT NULL DEFAULT false,
	confidence text NOT NULL DEFAULT 'verified' CHECK (
		confidence IN ('verified', 'needs-review', 'staff-confirm')
	),
	sort_order integer NOT NULL DEFAULT 0,
	source_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS menu_item_translations (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
	menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
	language_tag text NOT NULL,
	name text NOT NULL,
	description text NOT NULL DEFAULT '',
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	UNIQUE (menu_item_id, language_tag)
);

CREATE TABLE IF NOT EXISTS dietary_flags (
	code text PRIMARY KEY,
	label text NOT NULL
);

CREATE TABLE IF NOT EXISTS allergens (
	code text PRIMARY KEY,
	label text NOT NULL
);

CREATE TABLE IF NOT EXISTS menu_item_dietary_flags (
	menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
	flag_code text NOT NULL REFERENCES dietary_flags(code) ON DELETE RESTRICT,
	PRIMARY KEY (menu_item_id, flag_code)
);

CREATE TABLE IF NOT EXISTS menu_item_allergens (
	menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
	allergen_code text NOT NULL REFERENCES allergens(code) ON DELETE RESTRICT,
	PRIMARY KEY (menu_item_id, allergen_code)
);

CREATE TABLE IF NOT EXISTS menu_import_issues (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
	source_type text NOT NULL,
	label text NOT NULL,
	confidence numeric(4, 3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
	issue text NOT NULL,
	status text NOT NULL CHECK (status IN ('needs-review', 'approved', 'blocked')),
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS knowledge_documents (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
	title text NOT NULL,
	content text NOT NULL,
	visibility text NOT NULL DEFAULT 'published' CHECK (visibility IN ('draft', 'published', 'internal')),
	source_type text NOT NULL DEFAULT 'manual',
	metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_sessions (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
	table_id uuid REFERENCES restaurant_tables(id) ON DELETE SET NULL,
	language_tag text NOT NULL DEFAULT 'en',
	preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
	started_at timestamptz NOT NULL DEFAULT now(),
	last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
	session_id uuid NOT NULL REFERENCES customer_sessions(id) ON DELETE CASCADE,
	role text NOT NULL CHECK (role IN ('customer', 'assistant', 'staff', 'system')),
	content text NOT NULL,
	safety_status text NOT NULL DEFAULT 'ok' CHECK (
		safety_status IN ('ok', 'low-confidence', 'needs-staff', 'blocked')
	),
	created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fallback_requests (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
	session_id uuid REFERENCES customer_sessions(id) ON DELETE SET NULL,
	table_id uuid REFERENCES restaurant_tables(id) ON DELETE SET NULL,
	status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in-progress', 'resolved', 'cancelled')),
	priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high')),
	language_tag text NOT NULL DEFAULT 'en',
	guest_need text NOT NULL,
	summary text NOT NULL,
	assigned_membership_id uuid REFERENCES memberships(id) ON DELETE SET NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	resolved_at timestamptz
);

CREATE TABLE IF NOT EXISTS feedback (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
	session_id uuid REFERENCES customer_sessions(id) ON DELETE SET NULL,
	chat_message_id uuid REFERENCES chat_messages(id) ON DELETE SET NULL,
	helpful boolean,
	issue_type text,
	comment text,
	created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_events (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
	session_id uuid REFERENCES customer_sessions(id) ON DELETE SET NULL,
	provider text NOT NULL,
	model text NOT NULL,
	prompt_version text NOT NULL,
	event_type text NOT NULL,
	latency_ms integer CHECK (latency_ms >= 0),
	input_tokens integer CHECK (input_tokens >= 0),
	output_tokens integer CHECK (output_tokens >= 0),
	confidence numeric(4, 3) CHECK (confidence >= 0 AND confidence <= 1),
	retrieved_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
	safety_flags text[] NOT NULL DEFAULT ARRAY[]::text[],
	error_code text,
	created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS memberships_user_id_idx ON memberships (user_id);
CREATE INDEX IF NOT EXISTS memberships_organization_id_idx ON memberships (organization_id);
CREATE INDEX IF NOT EXISTS membership_restaurants_restaurant_id_idx ON membership_restaurants (restaurant_id);
CREATE INDEX IF NOT EXISTS restaurants_organization_id_idx ON restaurants (organization_id);
CREATE INDEX IF NOT EXISTS restaurant_tables_restaurant_code_idx ON restaurant_tables (restaurant_id, code);
CREATE INDEX IF NOT EXISTS menus_restaurant_status_idx ON menus (restaurant_id, status);
CREATE INDEX IF NOT EXISTS menu_categories_menu_sort_idx ON menu_categories (menu_id, sort_order);
CREATE INDEX IF NOT EXISTS menu_items_restaurant_menu_idx ON menu_items (restaurant_id, menu_id);
CREATE INDEX IF NOT EXISTS knowledge_documents_restaurant_visibility_idx
	ON knowledge_documents (restaurant_id, visibility);
CREATE INDEX IF NOT EXISTS customer_sessions_restaurant_started_idx
	ON customer_sessions (restaurant_id, started_at DESC);
CREATE INDEX IF NOT EXISTS chat_messages_session_created_idx
	ON chat_messages (session_id, created_at);
CREATE INDEX IF NOT EXISTS fallback_requests_restaurant_status_idx
	ON fallback_requests (restaurant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS feedback_restaurant_created_idx ON feedback (restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_events_restaurant_created_idx ON ai_events (restaurant_id, created_at DESC);

DROP TRIGGER IF EXISTS organizations_set_updated_at ON organizations;
CREATE TRIGGER organizations_set_updated_at
	BEFORE UPDATE ON organizations
	FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

DROP TRIGGER IF EXISTS app_users_set_updated_at ON app_users;
CREATE TRIGGER app_users_set_updated_at
	BEFORE UPDATE ON app_users
	FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

DROP TRIGGER IF EXISTS memberships_set_updated_at ON memberships;
CREATE TRIGGER memberships_set_updated_at
	BEFORE UPDATE ON memberships
	FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

DROP TRIGGER IF EXISTS restaurants_set_updated_at ON restaurants;
CREATE TRIGGER restaurants_set_updated_at
	BEFORE UPDATE ON restaurants
	FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

DROP TRIGGER IF EXISTS restaurant_locations_set_updated_at ON restaurant_locations;
CREATE TRIGGER restaurant_locations_set_updated_at
	BEFORE UPDATE ON restaurant_locations
	FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

DROP TRIGGER IF EXISTS restaurant_tables_set_updated_at ON restaurant_tables;
CREATE TRIGGER restaurant_tables_set_updated_at
	BEFORE UPDATE ON restaurant_tables
	FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

DROP TRIGGER IF EXISTS menus_set_updated_at ON menus;
CREATE TRIGGER menus_set_updated_at
	BEFORE UPDATE ON menus
	FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

DROP TRIGGER IF EXISTS menu_categories_set_updated_at ON menu_categories;
CREATE TRIGGER menu_categories_set_updated_at
	BEFORE UPDATE ON menu_categories
	FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

DROP TRIGGER IF EXISTS menu_items_set_updated_at ON menu_items;
CREATE TRIGGER menu_items_set_updated_at
	BEFORE UPDATE ON menu_items
	FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

DROP TRIGGER IF EXISTS menu_item_translations_set_updated_at ON menu_item_translations;
CREATE TRIGGER menu_item_translations_set_updated_at
	BEFORE UPDATE ON menu_item_translations
	FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

DROP TRIGGER IF EXISTS menu_import_issues_set_updated_at ON menu_import_issues;
CREATE TRIGGER menu_import_issues_set_updated_at
	BEFORE UPDATE ON menu_import_issues
	FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

DROP TRIGGER IF EXISTS knowledge_documents_set_updated_at ON knowledge_documents;
CREATE TRIGGER knowledge_documents_set_updated_at
	BEFORE UPDATE ON knowledge_documents
	FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE OR REPLACE FUNCTION app.current_user_external_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
	SELECT nullif(current_setting('app.user_external_id', true), '')
$$;

CREATE OR REPLACE FUNCTION app.has_organization_access(target_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, app, pg_temp
AS $$
	SELECT EXISTS (
		SELECT 1
		FROM memberships m
		JOIN app_users u ON u.id = m.user_id
		WHERE u.external_auth_id = app.current_user_external_id()
			AND m.organization_id = target_organization_id
	)
$$;

CREATE OR REPLACE FUNCTION app.has_restaurant_access(target_restaurant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, app, pg_temp
AS $$
	SELECT EXISTS (
		SELECT 1
		FROM memberships m
		JOIN app_users u ON u.id = m.user_id
		JOIN membership_restaurants mr ON mr.membership_id = m.id
		WHERE u.external_auth_id = app.current_user_external_id()
			AND mr.restaurant_id = target_restaurant_id
	)
$$;

GRANT USAGE ON SCHEMA public, app TO lingua_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO lingua_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO lingua_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO lingua_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
	GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO lingua_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
	GRANT USAGE, SELECT ON SEQUENCES TO lingua_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA app
	GRANT EXECUTE ON FUNCTIONS TO lingua_app;

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_dietary_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_allergens ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_import_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE fallback_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE dietary_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE allergens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS organizations_tenant_select ON organizations;
CREATE POLICY organizations_tenant_select ON organizations
	FOR SELECT TO lingua_app
	USING (app.has_organization_access(id));

DROP POLICY IF EXISTS app_users_self_select ON app_users;
CREATE POLICY app_users_self_select ON app_users
	FOR SELECT TO lingua_app
	USING (external_auth_id = app.current_user_external_id());

DROP POLICY IF EXISTS memberships_tenant_select ON memberships;
CREATE POLICY memberships_tenant_select ON memberships
	FOR SELECT TO lingua_app
	USING (app.has_organization_access(organization_id));

DROP POLICY IF EXISTS membership_restaurants_tenant_select ON membership_restaurants;
CREATE POLICY membership_restaurants_tenant_select ON membership_restaurants
	FOR SELECT TO lingua_app
	USING (app.has_organization_access(organization_id));

DROP POLICY IF EXISTS restaurants_tenant_select ON restaurants;
CREATE POLICY restaurants_tenant_select ON restaurants
	FOR SELECT TO lingua_app
	USING (app.has_restaurant_access(id));

DROP POLICY IF EXISTS restaurant_locations_tenant_select ON restaurant_locations;
CREATE POLICY restaurant_locations_tenant_select ON restaurant_locations
	FOR SELECT TO lingua_app
	USING (app.has_restaurant_access(restaurant_id));

DROP POLICY IF EXISTS restaurant_tables_tenant_select ON restaurant_tables;
CREATE POLICY restaurant_tables_tenant_select ON restaurant_tables
	FOR SELECT TO lingua_app
	USING (app.has_restaurant_access(restaurant_id));

DROP POLICY IF EXISTS menus_tenant_select ON menus;
CREATE POLICY menus_tenant_select ON menus
	FOR SELECT TO lingua_app
	USING (app.has_restaurant_access(restaurant_id));

DROP POLICY IF EXISTS menu_categories_tenant_select ON menu_categories;
CREATE POLICY menu_categories_tenant_select ON menu_categories
	FOR SELECT TO lingua_app
	USING (app.has_restaurant_access(restaurant_id));

DROP POLICY IF EXISTS menu_items_tenant_select ON menu_items;
CREATE POLICY menu_items_tenant_select ON menu_items
	FOR SELECT TO lingua_app
	USING (app.has_restaurant_access(restaurant_id));

DROP POLICY IF EXISTS menu_item_translations_tenant_select ON menu_item_translations;
CREATE POLICY menu_item_translations_tenant_select ON menu_item_translations
	FOR SELECT TO lingua_app
	USING (app.has_restaurant_access(restaurant_id));

DROP POLICY IF EXISTS menu_item_dietary_flags_tenant_select ON menu_item_dietary_flags;
CREATE POLICY menu_item_dietary_flags_tenant_select ON menu_item_dietary_flags
	FOR SELECT TO lingua_app
	USING (
		EXISTS (
			SELECT 1 FROM menu_items mi
			WHERE mi.id = menu_item_id AND app.has_restaurant_access(mi.restaurant_id)
		)
	);

DROP POLICY IF EXISTS menu_item_allergens_tenant_select ON menu_item_allergens;
CREATE POLICY menu_item_allergens_tenant_select ON menu_item_allergens
	FOR SELECT TO lingua_app
	USING (
		EXISTS (
			SELECT 1 FROM menu_items mi
			WHERE mi.id = menu_item_id AND app.has_restaurant_access(mi.restaurant_id)
		)
	);

DROP POLICY IF EXISTS menu_import_issues_tenant_select ON menu_import_issues;
CREATE POLICY menu_import_issues_tenant_select ON menu_import_issues
	FOR SELECT TO lingua_app
	USING (app.has_restaurant_access(restaurant_id));

DROP POLICY IF EXISTS knowledge_documents_tenant_select ON knowledge_documents;
CREATE POLICY knowledge_documents_tenant_select ON knowledge_documents
	FOR SELECT TO lingua_app
	USING (app.has_restaurant_access(restaurant_id));

DROP POLICY IF EXISTS customer_sessions_tenant_select ON customer_sessions;
CREATE POLICY customer_sessions_tenant_select ON customer_sessions
	FOR SELECT TO lingua_app
	USING (app.has_restaurant_access(restaurant_id));

DROP POLICY IF EXISTS chat_messages_tenant_select ON chat_messages;
CREATE POLICY chat_messages_tenant_select ON chat_messages
	FOR SELECT TO lingua_app
	USING (app.has_restaurant_access(restaurant_id));

DROP POLICY IF EXISTS fallback_requests_tenant_select ON fallback_requests;
CREATE POLICY fallback_requests_tenant_select ON fallback_requests
	FOR SELECT TO lingua_app
	USING (app.has_restaurant_access(restaurant_id));

DROP POLICY IF EXISTS feedback_tenant_select ON feedback;
CREATE POLICY feedback_tenant_select ON feedback
	FOR SELECT TO lingua_app
	USING (app.has_restaurant_access(restaurant_id));

DROP POLICY IF EXISTS ai_events_tenant_select ON ai_events;
CREATE POLICY ai_events_tenant_select ON ai_events
	FOR SELECT TO lingua_app
	USING (app.has_restaurant_access(restaurant_id));

DROP POLICY IF EXISTS dietary_flags_read_all ON dietary_flags;
CREATE POLICY dietary_flags_read_all ON dietary_flags
	FOR SELECT TO lingua_app
	USING (true);

DROP POLICY IF EXISTS allergens_read_all ON allergens;
CREATE POLICY allergens_read_all ON allergens
	FOR SELECT TO lingua_app
	USING (true);
