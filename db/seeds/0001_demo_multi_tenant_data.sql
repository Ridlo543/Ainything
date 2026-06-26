-- =============================================================
-- ainything seed data — idempotent (upsert, no TRUNCATE)
-- Run: pnpm db:seed
-- Safe to re-run: uses ON CONFLICT DO UPDATE / DO NOTHING
-- =============================================================

-- ── Organizations ─────────────────────────────────────────────
INSERT INTO organizations (id, name, slug, workspace_host, plan) VALUES
	(
		'10000000-0000-0000-0000-000000000001',
		'Bali Table Group',
		'bali-table-group',
		'bali-table.ainything.online',
		'pro'
	),
	(
		'10000000-0000-0000-0000-000000000002',
		'Jakarta Hospitality Lab',
		'jakarta-hospitality-lab',
		'jakarta-hospitality.ainything.online',
		'pilot'
	)
ON CONFLICT (id) DO UPDATE SET
	name           = EXCLUDED.name,
	slug           = EXCLUDED.slug,
	workspace_host = EXCLUDED.workspace_host,
	plan           = EXCLUDED.plan;

-- ── App users ─────────────────────────────────────────────────
-- external_auth_id must match 'local:' + email — required by LocalAuthProvider.register()
-- password_hash is bcrypt(cost=10) of 'demo1234' — generated at seed time via bcryptjs
INSERT INTO app_users (id, external_auth_id, email, name, default_organization_id) VALUES
	(
		'20000000-0000-0000-0000-000000000001',
		'local:owner@bali-table.test',
		'owner@bali-table.test',
		'Made Restaurant Owner',
		'10000000-0000-0000-0000-000000000001'
	),
	(
		'20000000-0000-0000-0000-000000000002',
		'local:staff@jakarta-hospitality.test',
		'staff@jakarta-hospitality.test',
		'Jakarta Service Staff',
		'10000000-0000-0000-0000-000000000002'
	)
ON CONFLICT (id) DO UPDATE SET
	external_auth_id        = EXCLUDED.external_auth_id,
	email                   = EXCLUDED.email,
	name                    = EXCLUDED.name,
	default_organization_id = EXCLUDED.default_organization_id;

-- Set password_hash separately — column added by migration 0013_local_auth.sql
-- Both accounts use password: demo1234
-- Hashes generated with bcryptjs@2.4.3 at cost=12 — verified compareSync('demo1234', hash) = true
-- on Node.js v24.14.0. Re-generate with: node -e "const b=require('./node_modules/bcryptjs'); console.log(b.hashSync('demo1234',12));"
UPDATE app_users SET password_hash = '$2a$12$8X2vu6rtLHQaXQBsIPi0HOU6KlW.NG0Plx6JFwPYVjW.zt1Smt7lS'
WHERE id = '20000000-0000-0000-0000-000000000001';

UPDATE app_users SET password_hash = '$2a$12$oxk2ZGFi6//COVLUMmDeBecv50tcyDCXmL7j4I3erxMuO1/qMfXxy'
WHERE id = '20000000-0000-0000-0000-000000000002';

-- Set platform_role separately — INSERT omits it (column default is 'staff').
-- owner@bali-table.test must be 'org_owner' so resolveRoleRedirect returns /dashboard.
-- Without this, login redirects to /staff/inbox and dashboard E2E tests fail.
UPDATE app_users SET platform_role = 'org_owner'
WHERE id = '20000000-0000-0000-0000-000000000001';

UPDATE app_users SET platform_role = 'staff'
WHERE id = '20000000-0000-0000-0000-000000000002';

-- ── Memberships ───────────────────────────────────────────────
INSERT INTO memberships (id, user_id, organization_id, role) VALUES
	(
		'30000000-0000-0000-0000-000000000001',
		'20000000-0000-0000-0000-000000000001',
		'10000000-0000-0000-0000-000000000001',
		'owner'
	),
	(
		'30000000-0000-0000-0000-000000000002',
		'20000000-0000-0000-0000-000000000002',
		'10000000-0000-0000-0000-000000000002',
		'staff'
	)
ON CONFLICT (id) DO UPDATE SET
	user_id         = EXCLUDED.user_id,
	organization_id = EXCLUDED.organization_id,
	role            = EXCLUDED.role;
-- restaurants and membership_restaurants removed — dropped in migration 0024.
-- Outlets are seeded in the new-tables block below.
-- membership_outlets seeded after outlets (FK dependency).

-- Old restaurant_locations, restaurant_tables, menus, menu_categories, menu_items
-- inserts removed — those tables were dropped in migration 0024.
-- Equivalent data is now seeded into the new tables below.

-- =============================================================
-- NEW TABLE INSERTS (outlets / catalogs / catalog_sections / products)
-- These mirror the old restaurant/menu/menu_categories/menu_items data.
-- Same UUIDs where possible for FK consistency.
-- Safe to re-run: uses ON CONFLICT DO UPDATE / DO NOTHING.
-- =============================================================

-- ── Outlets (replaces restaurants) ────────────────────────────
-- business_type: all 5 seed outlets are food businesses → 'restaurant'
-- catalog_source_type maps from old menu_source_type values
INSERT INTO outlets (
	id, organization_id, name, slug, public_host, location, business_type,
	language_tags, hero_image_url, catalog_scan_url, table_count,
	catalog_source_type, description, knowledge_highlights, analytics
) VALUES
	(
		'40000000-0000-0000-0000-000000000001',
		'10000000-0000-0000-0000-000000000001',
		'Uma Karang', 'uma-karang', 'uma-karang.ainything.online',
		'Canggu, Bali', 'restaurant',
		ARRAY['en','id','zh-Hans','ja']::text[],
		'/assets/covers/uma-karang.svg',
		'/assets/menu-scans/uma-karang-menu.svg',
		24, 'photo',
		'Balinese comfort dishes with grilled seafood, sambal options, and rice plates.',
		ARRAY['Halal-friendly kitchen zone','Sambal served separately on request','No pork menu']::text[],
		'{"scansToday":186,"helpfulRate":88,"fallbackRate":14,"topQuestion":"Is betutu chicken very spicy?","topItem":"Slow Roasted Betutu Chicken"}'::jsonb
	),
	(
		'40000000-0000-0000-0000-000000000002',
		'10000000-0000-0000-0000-000000000002',
		'Taman Sate', 'taman-sate', 'taman-sate.ainything.online',
		'Menteng, Jakarta', 'restaurant',
		ARRAY['en','id','zh-Hans','ja']::text[],
		'/assets/covers/taman-sate.svg',
		'/assets/menu-scans/taman-sate-menu.svg',
		36, 'handwritten',
		'Satay garden restaurant with charcoal grill, peanut sauces, and rice cake sides.',
		ARRAY['Peanut-heavy kitchen','Halal meat supplier','Sauces can be served separately']::text[],
		'{"scansToday":158,"helpfulRate":79,"fallbackRate":28,"topQuestion":"Can satay be served without peanut?","topItem":"Chicken Satay Set"}'::jsonb
	),
	(
		'40000000-0000-0000-0000-000000000003',
		'10000000-0000-0000-0000-000000000001',
		'Senja Ramen Bali', 'senja-ramen-bali', 'senja-ramen-bali.ainything.online',
		'Seminyak, Bali', 'restaurant',
		ARRAY['en','id','zh-Hans','ja']::text[],
		'/assets/covers/senja-ramen-bali.svg',
		'/assets/menu-scans/senja-ramen-bali-menu.svg',
		28, 'pdf-scan',
		'Ramen shop with chicken broth, spicy miso, and Indonesian-inspired toppings.',
		ARRAY['Chicken broth base','No pork chashu','Miso contains soy']::text[],
		'{"scansToday":137,"helpfulRate":87,"fallbackRate":15,"topQuestion":"Does the ramen use pork broth?","topItem":"Spicy Chicken Miso Ramen"}'::jsonb
	),
	(
		'40000000-0000-0000-0000-000000000004',
		'10000000-0000-0000-0000-000000000002',
		'Rempah Terrace', 'rempah-terrace', 'rempah-terrace.ainything.online',
		'Kemang, Jakarta', 'restaurant',
		ARRAY['en','id','zh-Hans','ja']::text[],
		'/assets/covers/rempah-terrace.svg',
		'/assets/menu-scans/rempah-terrace-menu.svg',
		42, 'seasonal',
		'Modern Indonesian tasting plates with spice-led sauces and staff-paired mocktails.',
		ARRAY['No pork','Mocktail pairings available','Seasonal menu changes weekly']::text[],
		'{"scansToday":89,"helpfulRate":93,"fallbackRate":9,"topQuestion":"Is rendang halal certified?","topItem":"Short Rib Rendang"}'::jsonb
	),
	(
		'40000000-0000-0000-0000-000000000005',
		'10000000-0000-0000-0000-000000000001',
		'Pantai Padi', 'pantai-padi', 'pantai-padi.ainything.online',
		'Jimbaran, Bali', 'restaurant',
		ARRAY['en','id','ar']::text[],
		'/assets/covers/pantai-padi.svg',
		'/assets/menu-scans/pantai-padi-menu.svg',
		16, 'seasonal',
		'Beachside seafood grill with Mediterranean and Middle Eastern influences.',
		ARRAY['Halal certified seafood','Fresh daily catch','Arabic mezze available']::text[],
		'{"scansToday":52,"helpfulRate":88,"fallbackRate":16,"topQuestion":"Is all seafood halal certified?","topItem":"Grilled Sea Bass with Tahini"}'::jsonb
	)
ON CONFLICT (id) DO UPDATE SET
	name                = EXCLUDED.name,
	slug                = EXCLUDED.slug,
	public_host         = EXCLUDED.public_host,
	location            = EXCLUDED.location,
	business_type       = EXCLUDED.business_type,
	language_tags       = EXCLUDED.language_tags,
	hero_image_url      = EXCLUDED.hero_image_url,
	catalog_scan_url    = EXCLUDED.catalog_scan_url,
	table_count         = EXCLUDED.table_count,
	catalog_source_type = EXCLUDED.catalog_source_type,
	description         = EXCLUDED.description,
	knowledge_highlights = EXCLUDED.knowledge_highlights,
	analytics           = EXCLUDED.analytics;

-- ── Outlet checkout settings (demo scenarios) ─────────────────
-- Uma Karang: online mode + WA required + manual payment confirmation
--   → demo the full buyer flow: WA input → order → upload proof → staff confirms
-- Taman Sate: offline mode
--   → demo the simple flow: order → pay at cashier
-- Senja Ramen Bali: online mode, no WA required, no manual confirmation
--   → demo auto-flow: order → pay via listed methods (no proof upload)
-- Rempah Terrace: online mode + WA required, no manual confirmation
--   → demo WA capture without proof upload
-- Pantai Padi: offline mode
--   → same as Taman Sate scenario
-- Settings keys must be snake_case — mapOutletRow reads s.checkout_mode,
-- s.require_buyer_whatsapp, s.payment_confirmation_enabled (outlet-row-mapper.ts:136-138).
-- camelCase keys are silently ignored and fall through to defaults (offline/false/false).
UPDATE outlets SET settings = '{"checkout_mode":"online","require_buyer_whatsapp":true,"payment_confirmation_enabled":true}'::jsonb
WHERE id = '40000000-0000-0000-0000-000000000001';

UPDATE outlets SET settings = '{"checkout_mode":"offline","require_buyer_whatsapp":false,"payment_confirmation_enabled":false}'::jsonb
WHERE id = '40000000-0000-0000-0000-000000000002';

UPDATE outlets SET settings = '{"checkout_mode":"online","require_buyer_whatsapp":false,"payment_confirmation_enabled":false}'::jsonb
WHERE id = '40000000-0000-0000-0000-000000000003';

UPDATE outlets SET settings = '{"checkout_mode":"online","require_buyer_whatsapp":true,"payment_confirmation_enabled":false}'::jsonb
WHERE id = '40000000-0000-0000-0000-000000000004';

UPDATE outlets SET settings = '{"checkout_mode":"offline","require_buyer_whatsapp":false,"payment_confirmation_enabled":false}'::jsonb
WHERE id = '40000000-0000-0000-0000-000000000005';

-- ── Membership <-> Outlet links ────────────────────────────────
-- Bali Table Group (membership 30..001): uma-karang, senja-ramen-bali, pantai-padi
-- Jakarta Hospitality Lab (membership 30..002): taman-sate, rempah-terrace
INSERT INTO membership_outlets (id, organization_id, membership_id, outlet_id) VALUES
	(
		'35000000-0000-0000-0000-000000000001',
		'10000000-0000-0000-0000-000000000001',
		'30000000-0000-0000-0000-000000000001',
		'40000000-0000-0000-0000-000000000001'
	),
	(
		'35000000-0000-0000-0000-000000000002',
		'10000000-0000-0000-0000-000000000001',
		'30000000-0000-0000-0000-000000000001',
		'40000000-0000-0000-0000-000000000003'
	),
	(
		'35000000-0000-0000-0000-000000000003',
		'10000000-0000-0000-0000-000000000001',
		'30000000-0000-0000-0000-000000000001',
		'40000000-0000-0000-0000-000000000005'
	),
	(
		'35000000-0000-0000-0000-000000000004',
		'10000000-0000-0000-0000-000000000002',
		'30000000-0000-0000-0000-000000000002',
		'40000000-0000-0000-0000-000000000002'
	),
	(
		'35000000-0000-0000-0000-000000000005',
		'10000000-0000-0000-0000-000000000002',
		'30000000-0000-0000-0000-000000000002',
		'40000000-0000-0000-0000-000000000004'
	)
ON CONFLICT (membership_id, outlet_id) DO NOTHING;

-- ── Outlet locations (replaces restaurant_locations) ──────────
-- Fixed UUIDs so outlet_tables can reference them deterministically.
INSERT INTO outlet_locations (id, organization_id, outlet_id, code, name, address, is_primary) VALUES
	('a1000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','main','Uma Karang Main Dining',     'Canggu, Bali',    true),
	('a1000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000002','main','Taman Sate Main Dining',     'Menteng, Jakarta',true),
	('a1000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000003','main','Senja Ramen Bali Main Dining','Seminyak, Bali',  true),
	('a1000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000004','main','Rempah Terrace Main Dining', 'Kemang, Jakarta', true),
	('a1000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000005','main','Pantai Padi Main Dining',    'Jimbaran, Bali',  true)
ON CONFLICT (outlet_id, code) DO UPDATE SET
	name       = EXCLUDED.name,
	address    = EXCLUDED.address,
	is_primary = EXCLUDED.is_primary;

-- ── Outlet tables (replaces restaurant_tables) ────────────────
-- Standard tables T01–T07 + B12 for all 5 outlets; A01 for pantai-padi.
INSERT INTO outlet_tables (organization_id, outlet_id, location_id, code, label, qr_path)
SELECT
	o.organization_id,
	o.id,
	ol.id,
	table_code,
	table_code,
	'/r/' || o.slug || '/table/' || table_code
FROM outlets o
JOIN outlet_locations ol ON ol.outlet_id = o.id AND ol.code = 'main'
CROSS JOIN (VALUES ('T01'),('T02'),('T03'),('T04'),('T05'),('T06'),('T07'),('B12')) AS codes(table_code)
WHERE o.id IN (
	'40000000-0000-0000-0000-000000000001',
	'40000000-0000-0000-0000-000000000002',
	'40000000-0000-0000-0000-000000000003',
	'40000000-0000-0000-0000-000000000004',
	'40000000-0000-0000-0000-000000000005'
)
AND NOT EXISTS (
	SELECT 1 FROM outlet_tables ot
	WHERE ot.outlet_id = o.id AND ot.code = table_code
);

-- Special RTL/Arabic table for pantai-padi
INSERT INTO outlet_tables (organization_id, outlet_id, location_id, code, label, qr_path)
SELECT
	'10000000-0000-0000-0000-000000000001',
	'40000000-0000-0000-0000-000000000005',
	ol.id,
	'A01', 'A01', '/r/pantai-padi/table/A01'
FROM outlet_locations ol
WHERE ol.outlet_id = '40000000-0000-0000-0000-000000000005' AND ol.code = 'main'
AND NOT EXISTS (
	SELECT 1 FROM outlet_tables ot
	WHERE ot.outlet_id = '40000000-0000-0000-0000-000000000005' AND ot.code = 'A01'
);

-- ── Catalogs (replaces menus) ──────────────────────────────────
-- All 5 outlets get published catalogs for full demo CRUD coverage.
INSERT INTO catalogs (id, organization_id, outlet_id, version, status, source_type, source_uri, published_at) VALUES
	('50000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001',1,'published','photo',       '/assets/menu-scans/uma-karang-menu.svg',     now()),
	('50000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000002',1,'published','handwritten',  '/assets/menu-scans/taman-sate-menu.svg',     now()),
	('50000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000003',1,'published','photo',       '/assets/menu-scans/senja-ramen-menu.svg',    now()),
	('50000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000004',1,'published','handwritten',  '/assets/menu-scans/rempah-terrace-menu.svg', now()),
	('50000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000005',1,'published','seasonal',    '/assets/menu-scans/pantai-padi-menu.svg',    now())
ON CONFLICT (id) DO UPDATE SET
	version     = EXCLUDED.version,
	status      = EXCLUDED.status,
	source_type = EXCLUDED.source_type,
	source_uri  = EXCLUDED.source_uri;

-- ── Catalog sections (replaces menu_categories) ───────────────
-- Sections 1-5: existing outlets 1, 2, 5
-- Sections 6-7: Senja Ramen Bali (outlet 3, catalog 3)
-- Sections 8-9: Rempah Terrace (outlet 4, catalog 4)
INSERT INTO catalog_sections (id, organization_id, outlet_id, catalog_id, name, sort_order) VALUES
	('60000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','Signatures',1),
	('60000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','Drinks',     2),
	('60000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000002','Satay',      1),
	('60000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000002','Drinks',     2),
	('60000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000005','50000000-0000-0000-0000-000000000005','Seafood',    1),
	('60000000-0000-0000-0000-000000000006','10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000003','50000000-0000-0000-0000-000000000003','Ramen',      1),
	('60000000-0000-0000-0000-000000000007','10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000003','50000000-0000-0000-0000-000000000003','Drinks',     2),
	('60000000-0000-0000-0000-000000000008','10000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000004','50000000-0000-0000-0000-000000000004','Mains',      1),
	('60000000-0000-0000-0000-000000000009','10000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000004','50000000-0000-0000-0000-000000000004','Drinks',     2)
ON CONFLICT (id) DO UPDATE SET
	name       = EXCLUDED.name,
	sort_order = EXCLUDED.sort_order;

-- ── Products (replaces menu_items) ────────────────────────────
-- is_signature → is_featured; category_id → section_id
INSERT INTO products (
	id, organization_id, outlet_id, catalog_id, section_id,
	name, local_name, description, price_amount, currency,
	image_url, is_available, is_featured, confidence, sort_order
) VALUES
	-- Uma Karang → Signatures
	('70000000-0000-0000-0000-000000000001',
	 '10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001',
	 '50000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001',
	 'Slow Roasted Betutu Chicken','Ayam Betutu',
	 'Turmeric, lemongrass, galangal, and banana leaf roasted chicken with steamed rice.',
	 98000,'IDR','https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600',true,true,'verified',1),
	('70000000-0000-0000-0000-000000000002',
	 '10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001',
	 '50000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001',
	 'Jimbaran Grilled Fish','Ikan Bakar Jimbaran',
	 'Charcoal grilled fish with sweet soy glaze, lime, sambal matah, and warm rice.',
	 145000,'IDR','https://images.unsplash.com/photo-1544943910-4c1dc44aab44?w=600',true,false,'verified',2),
	-- Uma Karang → Drinks
	('70000000-0000-0000-0000-000000000003',
	 '10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001',
	 '50000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000002',
	 'Young Coconut Shake','Es Kelapa Muda',
	 'Fresh young coconut blended with coconut water, palm sugar, and crushed ice.',
	 38000,'IDR','https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600',true,false,'verified',1),
	-- Taman Sate → Satay
	('70000000-0000-0000-0000-000000000004',
	 '10000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000002',
	 '50000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000003',
	 'Chicken Satay Set','Sate Ayam',
	 'Ten skewers of marinated chicken with peanut sauce, lontong, and pickled cucumber.',
	 72000,'IDR','https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=600',true,true,'verified',1),
	('70000000-0000-0000-0000-000000000005',
	 '10000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000002',
	 '50000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000003',
	 'Lamb Satay with Sweet Soy','Sate Kambing',
	 'Charcoal lamb skewers with sweet soy, tomato, shallot, and lime.',
	 98000,'IDR','https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600',true,false,'verified',2),
	-- Taman Sate → Drinks
	('70000000-0000-0000-0000-000000000006',
	 '10000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000002',
	 '50000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000004',
	 'Coconut Cendol','Es Cendol',
	 'Coconut milk dessert drink with palm sugar and green rice flour jelly.',
	 42000,'IDR','https://images.unsplash.com/photo-1534706270553-2ac0dfa30283?w=600',true,false,'verified',3),
	-- Uma Karang → Signatures (extra)
	('70000000-0000-0000-0000-000000000008',
	 '10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001',
	 '50000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001',
	 'Nasi Campur Bali','Nasi Campur',
	 'Bali mixed rice platter with small portions of lawar, satay lilit, tempeh, and sambal.',
	 68000,'IDR','https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600',true,false,'verified',3),
	('70000000-0000-0000-0000-000000000009',
	 '10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001',
	 '50000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001',
	 'Crispy Duck Betutu','Bebek Betutu Crispy',
	 'Slow-cooked spiced duck crisped to order, served with plecing kangkung and rice.',
	 125000,'IDR','https://images.unsplash.com/photo-1598515213692-b3e32cc2bdc4?w=600',true,false,'verified',4),
	-- Uma Karang → Drinks (extra)
	('70000000-0000-0000-0000-00000000000a',
	 '10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001',
	 '50000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000002',
	 'Bali Lemon Basil Iced Tea','Es Teh Kemangi Lemon',
	 'Chilled black tea with fresh lemon, basil leaves, and a pinch of salt.',
	 28000,'IDR','https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600',true,false,'verified',2),
	-- Taman Sate → Satay (extra)
	('70000000-0000-0000-0000-00000000000b',
	 '10000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000002',
	 '50000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000003',
	 'Mixed Satay Platter','Sate Campur',
	 'Five chicken, five lamb, and five tofu skewers with two sauces and compressed rice.',
	 145000,'IDR','https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=600',true,false,'verified',3),
	-- Senja Ramen Bali → catalog 3, sections 6+7
	('70000000-0000-0000-0000-00000000000c',
	 '10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000003',
	 '50000000-0000-0000-0000-000000000003','60000000-0000-0000-0000-000000000006',
	 'Tonkotsu Sunset Ramen','Ramen Tonkotsu Senja',
	 'Rich pork bone broth, chashu, soft-boiled egg, bamboo shoots, and nori.',
	 89000,'IDR','https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600',true,true,'verified',1),
	('70000000-0000-0000-0000-00000000000d',
	 '10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000003',
	 '50000000-0000-0000-0000-000000000003','60000000-0000-0000-0000-000000000006',
	 'Spicy Miso Ramen','Ramen Miso Pedas',
	 'Hokkaido miso base with chilli oil, corn, butter, and minced pork topping.',
	 85000,'IDR','https://images.unsplash.com/photo-1591814468924-caf88d1232e1?w=600',true,false,'verified',2),
	('70000000-0000-0000-0000-00000000000e',
	 '10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000003',
	 '50000000-0000-0000-0000-000000000003','60000000-0000-0000-0000-000000000007',
	 'Matcha Latte','Matcha Latte Hangat',
	 'Ceremonial grade matcha whisked with steamed full-cream milk.',
	 45000,'IDR','https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600',true,false,'verified',1),
	-- Rempah Terrace → catalog 4, sections 8+9
	('70000000-0000-0000-0000-00000000000f',
	 '10000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000004',
	 '50000000-0000-0000-0000-000000000004','60000000-0000-0000-0000-000000000008',
	 'Rendang Sapi','Beef Rendang',
	 'Slow-cooked beef in Minangkabau spice paste, coconut milk, and kaffir lime.',
	 115000,'IDR','https://images.unsplash.com/photo-1574484284002-952d92456975?w=600',true,true,'verified',1),
	('70000000-0000-0000-0000-000000000010',
	 '10000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000004',
	 '50000000-0000-0000-0000-000000000004','60000000-0000-0000-0000-000000000008',
	 'Soto Ayam Lamongan','Soto Ayam',
	 'Clear turmeric chicken soup with vermicelli, egg, and koya powder.',
	 72000,'IDR','https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600',true,false,'verified',2),
	('70000000-0000-0000-0000-000000000011',
	 '10000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000004',
	 '50000000-0000-0000-0000-000000000004','60000000-0000-0000-0000-000000000009',
	 'Es Jeruk Peras','Fresh Orange Squeeze',
	 'Hand-squeezed Indonesian oranges with a hint of salt, served over ice.',
	 32000,'IDR','https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=600',true,false,'verified',1),
	-- Pantai Padi → Seafood
	('70000000-0000-0000-0000-000000000007',
	 '10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000005',
	 '50000000-0000-0000-0000-000000000005','60000000-0000-0000-0000-000000000005',
	 'Grilled Sea Bass with Tahini','سمك مشوي بالطحينة',
	 'Fresh sea bass grilled with Mediterranean herbs, served with tahini sauce and lemon.',
	 165000,'IDR','https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600',true,true,'verified',1),
	('70000000-0000-0000-0000-000000000012',
	 '10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000005',
	 '50000000-0000-0000-0000-000000000005','60000000-0000-0000-0000-000000000005',
	 'Grilled Tiger Prawn Skewers','Sate Udang Bakar',
	 'Giant tiger prawns marinated in lime, garlic, and chilli, grilled over charcoal.',
	 175000,'IDR','https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=600',true,false,'verified',2)
ON CONFLICT (id) DO UPDATE SET
	name         = EXCLUDED.name,
	local_name   = EXCLUDED.local_name,
	description  = EXCLUDED.description,
	price_amount = EXCLUDED.price_amount,
	currency     = EXCLUDED.currency,
	image_url    = EXCLUDED.image_url,
	is_available = EXCLUDED.is_available,
	is_featured  = EXCLUDED.is_featured,
	confidence   = EXCLUDED.confidence,
	sort_order   = EXCLUDED.sort_order;

-- ── Buyer sessions (replaces customer_sessions) ─────────────────────
-- Must come after outlets + outlet_tables are inserted above.
INSERT INTO buyer_sessions (id, organization_id, outlet_id, table_id, public_session_id, language_tag, metadata)
SELECT
	'80000000-0000-0000-0000-000000000001',
	'10000000-0000-0000-0000-000000000001',
	'40000000-0000-0000-0000-000000000001',
	(SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000001' AND code = 'T07'),
	'80000000-0000-0000-0000-000000000001'::uuid,
	'ja',
	'{"allergens":["shellfish"],"spice":"medium"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM buyer_sessions WHERE id = '80000000-0000-0000-0000-000000000001');

INSERT INTO buyer_sessions (id, organization_id, outlet_id, table_id, public_session_id, language_tag, metadata)
SELECT
	'80000000-0000-0000-0000-000000000002',
	'10000000-0000-0000-0000-000000000002',
	'40000000-0000-0000-0000-000000000002',
	(SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000002' AND code = 'B12'),
	'80000000-0000-0000-0000-000000000002'::uuid,
	'ja',
	'{"allergens":["nuts"],"dietary":["halal"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM buyer_sessions WHERE id = '80000000-0000-0000-0000-000000000002');

-- ── Additional buyer sessions ──────────────────────────────────
-- English session for Uma Karang T01 — for order demo
INSERT INTO buyer_sessions (id, organization_id, outlet_id, table_id, public_session_id, language_tag, metadata)
SELECT
	'80000000-0000-0000-0000-000000000003',
	'10000000-0000-0000-0000-000000000001',
	'40000000-0000-0000-0000-000000000001',
	(SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000001' AND code = 'T01'),
	'80000000-0000-0000-0000-000000000003'::uuid,
	'en',
	'{"dietary":["vegetarian"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM buyer_sessions WHERE id = '80000000-0000-0000-0000-000000000003');

-- Indonesian session for Taman Sate T02
INSERT INTO buyer_sessions (id, organization_id, outlet_id, table_id, public_session_id, language_tag, metadata)
SELECT
	'80000000-0000-0000-0000-000000000004',
	'10000000-0000-0000-0000-000000000002',
	'40000000-0000-0000-0000-000000000002',
	(SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000002' AND code = 'T02'),
	'80000000-0000-0000-0000-000000000004'::uuid,
	'id',
	'{"dietary":["halal"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM buyer_sessions WHERE id = '80000000-0000-0000-0000-000000000004');

-- ── Demo orders ────────────────────────────────────────────────
-- Realistic order history for analytics and staff inbox demo.
-- order IDs: 90000000-... range
-- order_item IDs: 91000000-... range
-- statuses: completed, processing, ready, new, cancelled

-- Uma Karang — completed order (T07, buyer session 1)
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at)
SELECT
	'90000000-0000-0000-0000-000000000001',
	'10000000-0000-0000-0000-000000000001',
	'40000000-0000-0000-0000-000000000001',
	'80000000-0000-0000-0000-000000000001',
	(SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000001' AND code = 'T07'),
	'Guest T07',
	'completed',
	273000, 3,
	'No shellfish please',
	now() - interval '2 hours',
	now() - interval '2 hours 30 minutes'
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '90000000-0000-0000-0000-000000000001');

INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes)
SELECT
	'91000000-0000-0000-0000-000000000001',
	'90000000-0000-0000-0000-000000000001',
	'10000000-0000-0000-0000-000000000001',
	'40000000-0000-0000-0000-000000000001',
	'70000000-0000-0000-0000-000000000001',
	'Slow Roasted Betutu Chicken', 2, 145000, NULL
WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '91000000-0000-0000-0000-000000000001');

INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes)
SELECT
	'91000000-0000-0000-0000-000000000002',
	'90000000-0000-0000-0000-000000000001',
	'10000000-0000-0000-0000-000000000001',
	'40000000-0000-0000-0000-000000000001',
	'70000000-0000-0000-0000-000000000008',
	'Nasi Campur Bali', 1, 68000, 'Extra sambal'
WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '91000000-0000-0000-0000-000000000002');

-- Uma Karang — processing order (T01, buyer session 3)
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, created_at)
SELECT
	'90000000-0000-0000-0000-000000000002',
	'10000000-0000-0000-0000-000000000001',
	'40000000-0000-0000-0000-000000000001',
	'80000000-0000-0000-0000-000000000003',
	(SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000001' AND code = 'T01'),
	'Guest T01',
	'processing',
	153000, 2,
	NULL,
	now() - interval '15 minutes'
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '90000000-0000-0000-0000-000000000002');

INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes)
SELECT
	'91000000-0000-0000-0000-000000000003',
	'90000000-0000-0000-0000-000000000002',
	'10000000-0000-0000-0000-000000000001',
	'40000000-0000-0000-0000-000000000001',
	'70000000-0000-0000-0000-000000000009',
	'Crispy Duck Betutu', 1, 125000, NULL
WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '91000000-0000-0000-0000-000000000003');

INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes)
SELECT
	'91000000-0000-0000-0000-000000000004',
	'90000000-0000-0000-0000-000000000002',
	'10000000-0000-0000-0000-000000000001',
	'40000000-0000-0000-0000-000000000001',
	'70000000-0000-0000-0000-00000000000a',
	'Bali Lemon Basil Iced Tea', 1, 28000, NULL
WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '91000000-0000-0000-0000-000000000004');

-- Uma Karang — new order (T03, just placed)
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, created_at)
SELECT
	'90000000-0000-0000-0000-000000000003',
	'10000000-0000-0000-0000-000000000001',
	'40000000-0000-0000-0000-000000000001',
	'80000000-0000-0000-0000-000000000001',
	(SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000001' AND code = 'T03'),
	'Guest T03',
	'new',
	68000, 1,
	NULL,
	now() - interval '3 minutes'
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '90000000-0000-0000-0000-000000000003');

INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes)
SELECT
	'91000000-0000-0000-0000-000000000005',
	'90000000-0000-0000-0000-000000000003',
	'10000000-0000-0000-0000-000000000001',
	'40000000-0000-0000-0000-000000000001',
	'70000000-0000-0000-0000-000000000008',
	'Nasi Campur Bali', 1, 68000, NULL
WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '91000000-0000-0000-0000-000000000005');

-- Taman Sate — completed order (B12, buyer session 2)
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at)
SELECT
	'90000000-0000-0000-0000-000000000004',
	'10000000-0000-0000-0000-000000000002',
	'40000000-0000-0000-0000-000000000002',
	'80000000-0000-0000-0000-000000000002',
	(SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000002' AND code = 'B12'),
	'Guest B12',
	'completed',
	290000, 2,
	'No peanut sauce on satay',
	now() - interval '1 hour',
	now() - interval '1 hour 40 minutes'
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '90000000-0000-0000-0000-000000000004');

INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes)
SELECT
	'91000000-0000-0000-0000-000000000006',
	'90000000-0000-0000-0000-000000000004',
	'10000000-0000-0000-0000-000000000002',
	'40000000-0000-0000-0000-000000000002',
	'70000000-0000-0000-0000-000000000004',
	'Chicken Satay Set', 1, 145000, 'No peanut sauce'
WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '91000000-0000-0000-0000-000000000006');

INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes)
SELECT
	'91000000-0000-0000-0000-000000000007',
	'90000000-0000-0000-0000-000000000004',
	'10000000-0000-0000-0000-000000000002',
	'40000000-0000-0000-0000-000000000002',
	'70000000-0000-0000-0000-00000000000b',
	'Mixed Satay Platter', 1, 145000, NULL
WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '91000000-0000-0000-0000-000000000007');

-- Taman Sate — ready order (T02, buyer session 4)
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, created_at)
SELECT
	'90000000-0000-0000-0000-000000000005',
	'10000000-0000-0000-0000-000000000002',
	'40000000-0000-0000-0000-000000000002',
	'80000000-0000-0000-0000-000000000004',
	(SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000002' AND code = 'T02'),
	'Guest T02',
	'ready',
	145000, 1,
	NULL,
	now() - interval '25 minutes'
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '90000000-0000-0000-0000-000000000005');

INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes)
SELECT
	'91000000-0000-0000-0000-000000000008',
	'90000000-0000-0000-0000-000000000005',
	'10000000-0000-0000-0000-000000000002',
	'40000000-0000-0000-0000-000000000002',
	'70000000-0000-0000-0000-00000000000b',
	'Mixed Satay Platter', 1, 145000, NULL
WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '91000000-0000-0000-0000-000000000008');

-- Taman Sate — cancelled order (historical)
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, created_at)
SELECT
	'90000000-0000-0000-0000-000000000006',
	'10000000-0000-0000-0000-000000000002',
	'40000000-0000-0000-0000-000000000002',
	'80000000-0000-0000-0000-000000000002',
	(SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000002' AND code = 'B12'),
	'Guest B12',
	'cancelled',
	115000, 1,
	'Customer left',
	now() - interval '3 hours'
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '90000000-0000-0000-0000-000000000006');

INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes)
SELECT
	'91000000-0000-0000-0000-000000000009',
	'90000000-0000-0000-0000-000000000006',
	'10000000-0000-0000-0000-000000000002',
	'40000000-0000-0000-0000-000000000002',
	'70000000-0000-0000-0000-000000000004',
	'Chicken Satay Set', 1, 145000, NULL
WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '91000000-0000-0000-0000-000000000009');

-- =============================================================
-- HISTORICAL ORDERS (60 completed orders over 90 days)
-- Used by analytics page for realistic chart data.
-- Order IDs: 92000000-... Item IDs: 93000000-...
-- Uma Karang (outlet1/org1): orders 1-30, Taman Sate (outlet2/org2): 31-60
-- =============================================================
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000001' AND code = 'T01'), 'Tamu T01', 'completed', 234000, 2, NULL, now() - interval '89 days' + interval '45 minutes', now() - interval '89 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000001');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000001', '92000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'Slow Roasted Betutu Chicken', 2, 98000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000001');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000002', '92000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000003', 'Young Coconut Shake', 1, 38000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000002');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000001' AND code = 'T02'), 'Tamu T02', 'completed', 213000, 2, NULL, now() - interval '87 days' + interval '45 minutes', now() - interval '87 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000002');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000003', '92000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', 'Jimbaran Grilled Fish', 1, 145000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000003');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000004', '92000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000008', 'Nasi Campur Bali', 1, 68000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000004');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000001' AND code = 'T03'), 'Tamu T03', 'completed', 163000, 2, NULL, now() - interval '85 days' + interval '45 minutes', now() - interval '85 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000003');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000005', '92000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000003', 'Young Coconut Shake', 1, 38000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000005');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000006', '92000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000009', 'Crispy Duck Betutu', 1, 125000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000006');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000001' AND code = 'T04'), 'Tamu T04', 'completed', 164000, 2, NULL, now() - interval '83 days' + interval '45 minutes', now() - interval '83 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000004');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000007', '92000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000008', 'Nasi Campur Bali', 2, 68000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000007');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000008', '92000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-00000000000a', 'Bali Lemon Basil Iced Tea', 1, 28000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000008');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000001' AND code = 'T05'), 'Tamu T05', 'completed', 223000, 2, NULL, now() - interval '80 days' + interval '45 minutes', now() - interval '80 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000005');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000009', '92000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000009', 'Crispy Duck Betutu', 1, 125000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000009');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000010', '92000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'Slow Roasted Betutu Chicken', 1, 98000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000010');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000001' AND code = 'T06'), 'Tamu T06', 'completed', 173000, 2, NULL, now() - interval '78 days' + interval '45 minutes', now() - interval '78 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000006');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000011', '92000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-00000000000a', 'Bali Lemon Basil Iced Tea', 1, 28000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000011');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000012', '92000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', 'Jimbaran Grilled Fish', 1, 145000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000012');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000001' AND code = 'T07'), 'Tamu T07', 'completed', 234000, 2, NULL, now() - interval '75 days' + interval '45 minutes', now() - interval '75 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000007');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000013', '92000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'Slow Roasted Betutu Chicken', 2, 98000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000013');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000014', '92000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000003', 'Young Coconut Shake', 1, 38000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000014');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000001' AND code = 'T01'), 'Tamu T01', 'completed', 213000, 2, NULL, now() - interval '72 days' + interval '45 minutes', now() - interval '72 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000008');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000015', '92000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', 'Jimbaran Grilled Fish', 1, 145000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000015');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000016', '92000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000008', 'Nasi Campur Bali', 1, 68000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000016');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000001' AND code = 'T02'), 'Tamu T02', 'completed', 163000, 2, NULL, now() - interval '69 days' + interval '45 minutes', now() - interval '69 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000009');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000017', '92000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000003', 'Young Coconut Shake', 1, 38000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000017');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000018', '92000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000009', 'Crispy Duck Betutu', 1, 125000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000018');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000001' AND code = 'T03'), 'Tamu T03', 'completed', 164000, 2, NULL, now() - interval '66 days' + interval '45 minutes', now() - interval '66 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000010');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000019', '92000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000008', 'Nasi Campur Bali', 2, 68000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000019');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000020', '92000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-00000000000a', 'Bali Lemon Basil Iced Tea', 1, 28000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000020');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000001' AND code = 'T04'), 'Tamu T04', 'completed', 223000, 2, NULL, now() - interval '63 days' + interval '45 minutes', now() - interval '63 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000011');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000021', '92000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000009', 'Crispy Duck Betutu', 1, 125000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000021');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000022', '92000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'Slow Roasted Betutu Chicken', 1, 98000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000022');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000001' AND code = 'T05'), 'Tamu T05', 'completed', 173000, 2, NULL, now() - interval '60 days' + interval '45 minutes', now() - interval '60 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000012');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000023', '92000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-00000000000a', 'Bali Lemon Basil Iced Tea', 1, 28000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000023');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000024', '92000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', 'Jimbaran Grilled Fish', 1, 145000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000024');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000001' AND code = 'T06'), 'Tamu T06', 'completed', 234000, 2, NULL, now() - interval '57 days' + interval '45 minutes', now() - interval '57 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000013');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000025', '92000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'Slow Roasted Betutu Chicken', 2, 98000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000025');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000026', '92000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000003', 'Young Coconut Shake', 1, 38000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000026');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000001' AND code = 'T07'), 'Tamu T07', 'completed', 213000, 2, NULL, now() - interval '54 days' + interval '45 minutes', now() - interval '54 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000014');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000027', '92000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', 'Jimbaran Grilled Fish', 1, 145000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000027');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000028', '92000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000008', 'Nasi Campur Bali', 1, 68000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000028');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000015', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000001' AND code = 'T01'), 'Tamu T01', 'completed', 163000, 2, NULL, now() - interval '51 days' + interval '45 minutes', now() - interval '51 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000015');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000029', '92000000-0000-0000-0000-000000000015', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000003', 'Young Coconut Shake', 1, 38000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000029');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000030', '92000000-0000-0000-0000-000000000015', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000009', 'Crispy Duck Betutu', 1, 125000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000030');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000016', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000001' AND code = 'T02'), 'Tamu T02', 'completed', 164000, 2, NULL, now() - interval '48 days' + interval '45 minutes', now() - interval '48 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000016');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000031', '92000000-0000-0000-0000-000000000016', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000008', 'Nasi Campur Bali', 2, 68000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000031');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000032', '92000000-0000-0000-0000-000000000016', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-00000000000a', 'Bali Lemon Basil Iced Tea', 1, 28000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000032');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000017', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000001' AND code = 'T03'), 'Tamu T03', 'completed', 223000, 2, NULL, now() - interval '45 days' + interval '45 minutes', now() - interval '45 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000017');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000033', '92000000-0000-0000-0000-000000000017', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000009', 'Crispy Duck Betutu', 1, 125000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000033');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000034', '92000000-0000-0000-0000-000000000017', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'Slow Roasted Betutu Chicken', 1, 98000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000034');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000018', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000001' AND code = 'T04'), 'Tamu T04', 'completed', 173000, 2, NULL, now() - interval '42 days' + interval '45 minutes', now() - interval '42 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000018');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000035', '92000000-0000-0000-0000-000000000018', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-00000000000a', 'Bali Lemon Basil Iced Tea', 1, 28000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000035');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000036', '92000000-0000-0000-0000-000000000018', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', 'Jimbaran Grilled Fish', 1, 145000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000036');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000019', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000001' AND code = 'T05'), 'Tamu T05', 'completed', 234000, 2, NULL, now() - interval '39 days' + interval '45 minutes', now() - interval '39 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000019');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000037', '92000000-0000-0000-0000-000000000019', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'Slow Roasted Betutu Chicken', 2, 98000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000037');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000038', '92000000-0000-0000-0000-000000000019', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000003', 'Young Coconut Shake', 1, 38000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000038');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000020', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000001' AND code = 'T06'), 'Tamu T06', 'completed', 213000, 2, NULL, now() - interval '36 days' + interval '45 minutes', now() - interval '36 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000020');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000039', '92000000-0000-0000-0000-000000000020', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', 'Jimbaran Grilled Fish', 1, 145000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000039');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000040', '92000000-0000-0000-0000-000000000020', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000008', 'Nasi Campur Bali', 1, 68000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000040');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000001' AND code = 'T07'), 'Tamu T07', 'completed', 163000, 2, NULL, now() - interval '33 days' + interval '45 minutes', now() - interval '33 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000021');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000041', '92000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000003', 'Young Coconut Shake', 1, 38000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000041');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000042', '92000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000009', 'Crispy Duck Betutu', 1, 125000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000042');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000022', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000001' AND code = 'T01'), 'Tamu T01', 'completed', 164000, 2, NULL, now() - interval '30 days' + interval '45 minutes', now() - interval '30 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000022');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000043', '92000000-0000-0000-0000-000000000022', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000008', 'Nasi Campur Bali', 2, 68000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000043');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000044', '92000000-0000-0000-0000-000000000022', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-00000000000a', 'Bali Lemon Basil Iced Tea', 1, 28000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000044');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000023', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000001' AND code = 'T02'), 'Tamu T02', 'completed', 223000, 2, NULL, now() - interval '27 days' + interval '45 minutes', now() - interval '27 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000023');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000045', '92000000-0000-0000-0000-000000000023', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000009', 'Crispy Duck Betutu', 1, 125000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000045');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000046', '92000000-0000-0000-0000-000000000023', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'Slow Roasted Betutu Chicken', 1, 98000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000046');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000024', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000001' AND code = 'T03'), 'Tamu T03', 'completed', 173000, 2, NULL, now() - interval '24 days' + interval '45 minutes', now() - interval '24 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000024');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000047', '92000000-0000-0000-0000-000000000024', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-00000000000a', 'Bali Lemon Basil Iced Tea', 1, 28000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000047');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000048', '92000000-0000-0000-0000-000000000024', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', 'Jimbaran Grilled Fish', 1, 145000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000048');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000025', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000001' AND code = 'T04'), 'Tamu T04', 'completed', 234000, 2, NULL, now() - interval '21 days' + interval '45 minutes', now() - interval '21 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000025');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000049', '92000000-0000-0000-0000-000000000025', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'Slow Roasted Betutu Chicken', 2, 98000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000049');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000050', '92000000-0000-0000-0000-000000000025', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000003', 'Young Coconut Shake', 1, 38000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000050');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000026', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000001' AND code = 'T05'), 'Tamu T05', 'completed', 213000, 2, NULL, now() - interval '18 days' + interval '45 minutes', now() - interval '18 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000026');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000051', '92000000-0000-0000-0000-000000000026', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', 'Jimbaran Grilled Fish', 1, 145000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000051');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000052', '92000000-0000-0000-0000-000000000026', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000008', 'Nasi Campur Bali', 1, 68000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000052');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000027', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000001' AND code = 'T06'), 'Tamu T06', 'completed', 163000, 2, NULL, now() - interval '15 days' + interval '45 minutes', now() - interval '15 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000027');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000053', '92000000-0000-0000-0000-000000000027', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000003', 'Young Coconut Shake', 1, 38000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000053');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000054', '92000000-0000-0000-0000-000000000027', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000009', 'Crispy Duck Betutu', 1, 125000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000054');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000028', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000001' AND code = 'T07'), 'Tamu T07', 'completed', 164000, 2, NULL, now() - interval '12 days' + interval '45 minutes', now() - interval '12 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000028');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000055', '92000000-0000-0000-0000-000000000028', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000008', 'Nasi Campur Bali', 2, 68000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000055');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000056', '92000000-0000-0000-0000-000000000028', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-00000000000a', 'Bali Lemon Basil Iced Tea', 1, 28000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000056');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000029', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000001' AND code = 'T01'), 'Tamu T01', 'completed', 223000, 2, NULL, now() - interval '9 days' + interval '45 minutes', now() - interval '9 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000029');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000057', '92000000-0000-0000-0000-000000000029', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000009', 'Crispy Duck Betutu', 1, 125000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000057');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000058', '92000000-0000-0000-0000-000000000029', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'Slow Roasted Betutu Chicken', 1, 98000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000058');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000030', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000001' AND code = 'T02'), 'Tamu T02', 'completed', 173000, 2, NULL, now() - interval '6 days' + interval '45 minutes', now() - interval '6 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000030');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000059', '92000000-0000-0000-0000-000000000030', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-00000000000a', 'Bali Lemon Basil Iced Tea', 1, 28000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000059');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000060', '92000000-0000-0000-0000-000000000030', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', 'Jimbaran Grilled Fish', 1, 145000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000060');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000031', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000002' AND code = 'T01'), 'Tamu T01', 'completed', 242000, 2, NULL, now() - interval '88 days' + interval '50 minutes', now() - interval '88 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000031');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000061', '92000000-0000-0000-0000-000000000031', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000004', 'Chicken Satay Set', 2, 72000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000061');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000062', '92000000-0000-0000-0000-000000000031', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000005', 'Lamb Satay with Sweet Soy', 1, 98000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000062');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000032', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000002' AND code = 'T02'), 'Tamu T02', 'completed', 140000, 2, NULL, now() - interval '86 days' + interval '50 minutes', now() - interval '86 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000032');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000063', '92000000-0000-0000-0000-000000000032', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000005', 'Lamb Satay with Sweet Soy', 1, 98000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000063');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000064', '92000000-0000-0000-0000-000000000032', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000006', 'Coconut Cendol', 1, 42000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000064');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000033', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000002' AND code = 'T03'), 'Tamu T03', 'completed', 187000, 2, NULL, now() - interval '84 days' + interval '50 minutes', now() - interval '84 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000033');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000065', '92000000-0000-0000-0000-000000000033', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000006', 'Coconut Cendol', 1, 42000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000065');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000066', '92000000-0000-0000-0000-000000000033', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-00000000000b', 'Mixed Satay Platter', 1, 145000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000066');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000034', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000002' AND code = 'B12'), 'Tamu B12', 'completed', 217000, 2, NULL, now() - interval '82 days' + interval '50 minutes', now() - interval '82 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000034');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000067', '92000000-0000-0000-0000-000000000034', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-00000000000b', 'Mixed Satay Platter', 1, 145000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000067');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000068', '92000000-0000-0000-0000-000000000034', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000004', 'Chicken Satay Set', 1, 72000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000068');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000035', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000002' AND code = 'T01'), 'Tamu T01', 'completed', 242000, 2, NULL, now() - interval '79 days' + interval '50 minutes', now() - interval '79 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000035');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000069', '92000000-0000-0000-0000-000000000035', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000004', 'Chicken Satay Set', 2, 72000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000069');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000070', '92000000-0000-0000-0000-000000000035', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000005', 'Lamb Satay with Sweet Soy', 1, 98000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000070');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000036', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000002' AND code = 'T02'), 'Tamu T02', 'completed', 140000, 2, NULL, now() - interval '77 days' + interval '50 minutes', now() - interval '77 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000036');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000071', '92000000-0000-0000-0000-000000000036', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000005', 'Lamb Satay with Sweet Soy', 1, 98000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000071');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000072', '92000000-0000-0000-0000-000000000036', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000006', 'Coconut Cendol', 1, 42000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000072');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000037', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000002' AND code = 'T03'), 'Tamu T03', 'completed', 187000, 2, NULL, now() - interval '74 days' + interval '50 minutes', now() - interval '74 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000037');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000073', '92000000-0000-0000-0000-000000000037', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000006', 'Coconut Cendol', 1, 42000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000073');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000074', '92000000-0000-0000-0000-000000000037', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-00000000000b', 'Mixed Satay Platter', 1, 145000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000074');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000038', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000002' AND code = 'B12'), 'Tamu B12', 'completed', 217000, 2, NULL, now() - interval '71 days' + interval '50 minutes', now() - interval '71 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000038');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000075', '92000000-0000-0000-0000-000000000038', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-00000000000b', 'Mixed Satay Platter', 1, 145000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000075');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000076', '92000000-0000-0000-0000-000000000038', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000004', 'Chicken Satay Set', 1, 72000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000076');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000039', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000002' AND code = 'T01'), 'Tamu T01', 'completed', 242000, 2, NULL, now() - interval '68 days' + interval '50 minutes', now() - interval '68 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000039');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000077', '92000000-0000-0000-0000-000000000039', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000004', 'Chicken Satay Set', 2, 72000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000077');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000078', '92000000-0000-0000-0000-000000000039', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000005', 'Lamb Satay with Sweet Soy', 1, 98000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000078');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000040', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000002' AND code = 'T02'), 'Tamu T02', 'completed', 140000, 2, NULL, now() - interval '65 days' + interval '50 minutes', now() - interval '65 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000040');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000079', '92000000-0000-0000-0000-000000000040', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000005', 'Lamb Satay with Sweet Soy', 1, 98000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000079');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000080', '92000000-0000-0000-0000-000000000040', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000006', 'Coconut Cendol', 1, 42000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000080');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000041', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000002' AND code = 'T03'), 'Tamu T03', 'completed', 187000, 2, NULL, now() - interval '62 days' + interval '50 minutes', now() - interval '62 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000041');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000081', '92000000-0000-0000-0000-000000000041', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000006', 'Coconut Cendol', 1, 42000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000081');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000082', '92000000-0000-0000-0000-000000000041', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-00000000000b', 'Mixed Satay Platter', 1, 145000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000082');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000042', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000002' AND code = 'B12'), 'Tamu B12', 'completed', 217000, 2, NULL, now() - interval '59 days' + interval '50 minutes', now() - interval '59 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000042');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000083', '92000000-0000-0000-0000-000000000042', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-00000000000b', 'Mixed Satay Platter', 1, 145000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000083');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000084', '92000000-0000-0000-0000-000000000042', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000004', 'Chicken Satay Set', 1, 72000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000084');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000043', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000002' AND code = 'T01'), 'Tamu T01', 'completed', 242000, 2, NULL, now() - interval '56 days' + interval '50 minutes', now() - interval '56 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000043');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000085', '92000000-0000-0000-0000-000000000043', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000004', 'Chicken Satay Set', 2, 72000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000085');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000086', '92000000-0000-0000-0000-000000000043', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000005', 'Lamb Satay with Sweet Soy', 1, 98000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000086');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000044', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000002' AND code = 'T02'), 'Tamu T02', 'completed', 140000, 2, NULL, now() - interval '53 days' + interval '50 minutes', now() - interval '53 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000044');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000087', '92000000-0000-0000-0000-000000000044', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000005', 'Lamb Satay with Sweet Soy', 1, 98000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000087');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000088', '92000000-0000-0000-0000-000000000044', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000006', 'Coconut Cendol', 1, 42000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000088');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000045', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000002' AND code = 'T03'), 'Tamu T03', 'completed', 187000, 2, NULL, now() - interval '50 days' + interval '50 minutes', now() - interval '50 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000045');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000089', '92000000-0000-0000-0000-000000000045', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000006', 'Coconut Cendol', 1, 42000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000089');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000090', '92000000-0000-0000-0000-000000000045', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-00000000000b', 'Mixed Satay Platter', 1, 145000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000090');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000046', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000002' AND code = 'B12'), 'Tamu B12', 'completed', 217000, 2, NULL, now() - interval '47 days' + interval '50 minutes', now() - interval '47 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000046');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000091', '92000000-0000-0000-0000-000000000046', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-00000000000b', 'Mixed Satay Platter', 1, 145000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000091');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000092', '92000000-0000-0000-0000-000000000046', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000004', 'Chicken Satay Set', 1, 72000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000092');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000047', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000002' AND code = 'T01'), 'Tamu T01', 'completed', 242000, 2, NULL, now() - interval '44 days' + interval '50 minutes', now() - interval '44 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000047');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000093', '92000000-0000-0000-0000-000000000047', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000004', 'Chicken Satay Set', 2, 72000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000093');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000094', '92000000-0000-0000-0000-000000000047', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000005', 'Lamb Satay with Sweet Soy', 1, 98000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000094');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000048', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000002' AND code = 'T02'), 'Tamu T02', 'completed', 140000, 2, NULL, now() - interval '41 days' + interval '50 minutes', now() - interval '41 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000048');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000095', '92000000-0000-0000-0000-000000000048', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000005', 'Lamb Satay with Sweet Soy', 1, 98000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000095');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000096', '92000000-0000-0000-0000-000000000048', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000006', 'Coconut Cendol', 1, 42000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000096');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000049', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000002' AND code = 'T03'), 'Tamu T03', 'completed', 187000, 2, NULL, now() - interval '38 days' + interval '50 minutes', now() - interval '38 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000049');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000097', '92000000-0000-0000-0000-000000000049', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000006', 'Coconut Cendol', 1, 42000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000097');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000098', '92000000-0000-0000-0000-000000000049', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-00000000000b', 'Mixed Satay Platter', 1, 145000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000098');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000050', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000002' AND code = 'B12'), 'Tamu B12', 'completed', 217000, 2, NULL, now() - interval '35 days' + interval '50 minutes', now() - interval '35 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000050');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000099', '92000000-0000-0000-0000-000000000050', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-00000000000b', 'Mixed Satay Platter', 1, 145000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000099');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000100', '92000000-0000-0000-0000-000000000050', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000004', 'Chicken Satay Set', 1, 72000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000100');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000051', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000002' AND code = 'T01'), 'Tamu T01', 'completed', 242000, 2, NULL, now() - interval '32 days' + interval '50 minutes', now() - interval '32 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000051');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000101', '92000000-0000-0000-0000-000000000051', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000004', 'Chicken Satay Set', 2, 72000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000101');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000102', '92000000-0000-0000-0000-000000000051', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000005', 'Lamb Satay with Sweet Soy', 1, 98000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000102');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000052', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000002' AND code = 'T02'), 'Tamu T02', 'completed', 140000, 2, NULL, now() - interval '29 days' + interval '50 minutes', now() - interval '29 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000052');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000103', '92000000-0000-0000-0000-000000000052', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000005', 'Lamb Satay with Sweet Soy', 1, 98000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000103');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000104', '92000000-0000-0000-0000-000000000052', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000006', 'Coconut Cendol', 1, 42000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000104');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000053', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000002' AND code = 'T03'), 'Tamu T03', 'completed', 187000, 2, NULL, now() - interval '26 days' + interval '50 minutes', now() - interval '26 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000053');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000105', '92000000-0000-0000-0000-000000000053', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000006', 'Coconut Cendol', 1, 42000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000105');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000106', '92000000-0000-0000-0000-000000000053', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-00000000000b', 'Mixed Satay Platter', 1, 145000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000106');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000054', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000002' AND code = 'B12'), 'Tamu B12', 'completed', 217000, 2, NULL, now() - interval '23 days' + interval '50 minutes', now() - interval '23 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000054');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000107', '92000000-0000-0000-0000-000000000054', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-00000000000b', 'Mixed Satay Platter', 1, 145000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000107');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000108', '92000000-0000-0000-0000-000000000054', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000004', 'Chicken Satay Set', 1, 72000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000108');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000055', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000002' AND code = 'T01'), 'Tamu T01', 'completed', 242000, 2, NULL, now() - interval '20 days' + interval '50 minutes', now() - interval '20 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000055');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000109', '92000000-0000-0000-0000-000000000055', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000004', 'Chicken Satay Set', 2, 72000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000109');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000110', '92000000-0000-0000-0000-000000000055', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000005', 'Lamb Satay with Sweet Soy', 1, 98000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000110');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000056', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000002' AND code = 'T02'), 'Tamu T02', 'completed', 140000, 2, NULL, now() - interval '17 days' + interval '50 minutes', now() - interval '17 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000056');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000111', '92000000-0000-0000-0000-000000000056', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000005', 'Lamb Satay with Sweet Soy', 1, 98000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000111');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000112', '92000000-0000-0000-0000-000000000056', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000006', 'Coconut Cendol', 1, 42000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000112');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000057', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000002' AND code = 'T03'), 'Tamu T03', 'completed', 187000, 2, NULL, now() - interval '14 days' + interval '50 minutes', now() - interval '14 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000057');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000113', '92000000-0000-0000-0000-000000000057', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000006', 'Coconut Cendol', 1, 42000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000113');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000114', '92000000-0000-0000-0000-000000000057', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-00000000000b', 'Mixed Satay Platter', 1, 145000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000114');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000058', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000002' AND code = 'B12'), 'Tamu B12', 'completed', 217000, 2, NULL, now() - interval '11 days' + interval '50 minutes', now() - interval '11 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000058');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000115', '92000000-0000-0000-0000-000000000058', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-00000000000b', 'Mixed Satay Platter', 1, 145000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000115');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000116', '92000000-0000-0000-0000-000000000058', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000004', 'Chicken Satay Set', 1, 72000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000116');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000059', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000002' AND code = 'T01'), 'Tamu T01', 'completed', 242000, 2, NULL, now() - interval '8 days' + interval '50 minutes', now() - interval '8 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000059');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000117', '92000000-0000-0000-0000-000000000059', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000004', 'Chicken Satay Set', 2, 72000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000117');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000118', '92000000-0000-0000-0000-000000000059', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000005', 'Lamb Satay with Sweet Soy', 1, 98000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000118');
INSERT INTO orders (id, organization_id, outlet_id, buyer_session_id, table_id, customer_name, status, total, item_count, notes, completed_at, created_at) SELECT '92000000-0000-0000-0000-000000000060', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002', (SELECT id FROM outlet_tables WHERE outlet_id = '40000000-0000-0000-0000-000000000002' AND code = 'T02'), 'Tamu T02', 'completed', 140000, 2, NULL, now() - interval '5 days' + interval '50 minutes', now() - interval '5 days' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '92000000-0000-0000-0000-000000000060');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000119', '92000000-0000-0000-0000-000000000060', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000005', 'Lamb Satay with Sweet Soy', 1, 98000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000119');
INSERT INTO order_items (id, order_id, organization_id, outlet_id, product_id, name, quantity, price, notes) SELECT '93000000-0000-0000-0000-000000000120', '92000000-0000-0000-0000-000000000060', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000006', 'Coconut Cendol', 1, 42000, NULL WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE id = '93000000-0000-0000-0000-000000000120');

-- ── Payment Methods ────────────────────────────────────────────
-- Bali Table Group (org1) — Uma Karang outlet (outlet1)
INSERT INTO outlet_payment_methods (id, organization_id, outlet_id, type, label, account_number, account_name, instructions, is_active, sort_order) VALUES
	('60000000-0000-4000-8000-000000000001', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'qris',          'QRIS Uma Karang', NULL,         NULL,            'Scan QR, masukkan nominal, konfirmasi pembayaran',              true, 0),
	('60000000-0000-4000-8000-000000000002', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'bank_transfer',  'BCA',             '1234567890', 'Uma Karang Bali', 'Transfer nominal tepat, sertakan 3 digit terakhir nomor meja', true, 1),
	('60000000-0000-4000-8000-000000000003', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'ewallet',        'GoPay',           '081234567890', 'Uma Karang',  NULL,                                                           true, 2),
	('60000000-0000-4000-8000-000000000004', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'cash',           'Tunai',           NULL,         NULL,            'Bayar langsung ke kasir saat pesanan siap',                     true, 3),
-- Jakarta Hospitality Lab (org2) — Taman Sate outlet (outlet2)
	('60000000-0000-4000-8000-000000000005', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', 'qris',          'QRIS Taman Sate', NULL,         NULL,            'Scan QRIS di meja, bayar sesuai total tagihan',                 true, 0),
	('60000000-0000-4000-8000-000000000006', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', 'bank_transfer',  'Mandiri',         '9876543210', 'Taman Sate Jakarta', 'Transfer ke rekening di atas, kirim bukti ke staff',      true, 1),
	('60000000-0000-4000-8000-000000000007', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', 'ewallet',        'OVO',             '089876543210', 'Taman Sate', NULL,                                                           true, 2)
ON CONFLICT (id) DO UPDATE SET
	organization_id = EXCLUDED.organization_id,
	outlet_id       = EXCLUDED.outlet_id,
	type            = EXCLUDED.type,
	label           = EXCLUDED.label,
	account_number  = EXCLUDED.account_number,
	account_name    = EXCLUDED.account_name,
	instructions    = EXCLUDED.instructions,
	is_active       = EXCLUDED.is_active,
	sort_order      = EXCLUDED.sort_order;
