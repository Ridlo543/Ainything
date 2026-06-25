-- =============================================================
-- Lingua seed data — idempotent (upsert, no TRUNCATE)
-- Run: pnpm db:seed
-- Safe to re-run: uses ON CONFLICT DO UPDATE / DO NOTHING
-- =============================================================

-- ── Reference data ────────────────────────────────────────────
INSERT INTO dietary_flags (code, label) VALUES
	('halal',            'Halal'),
	('vegetarian',       'Vegetarian'),
	('vegan',            'Vegan'),
	('gluten-free',      'Gluten-free'),
	('contains-alcohol', 'Contains alcohol'),
	('spicy',            'Spicy'),
	('seafood',          'Seafood'),
	('nut-free',         'Nut-free')
ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label;

INSERT INTO allergens (code, label) VALUES
	('nuts',     'Nuts'),
	('dairy',    'Dairy'),
	('egg',      'Egg'),
	('shellfish','Shellfish'),
	('seafood',  'Seafood'),
	('soy',      'Soy'),
	('gluten',   'Gluten'),
	('sesame',   'Sesame')
ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label;

-- ── Organizations ─────────────────────────────────────────────
INSERT INTO organizations (id, name, slug, workspace_host, plan) VALUES
	(
		'10000000-0000-0000-0000-000000000001',
		'Bali Table Group',
		'bali-table-group',
		'bali-table.lingua.app',
		'pro'
	),
	(
		'10000000-0000-0000-0000-000000000002',
		'Jakarta Hospitality Lab',
		'jakarta-hospitality-lab',
		'jakarta-hospitality.lingua.app',
		'pilot'
	)
ON CONFLICT (id) DO UPDATE SET
	name           = EXCLUDED.name,
	slug           = EXCLUDED.slug,
	workspace_host = EXCLUDED.workspace_host,
	plan           = EXCLUDED.plan;

-- ── App users ─────────────────────────────────────────────────
INSERT INTO app_users (id, external_auth_id, email, name, default_organization_id) VALUES
	(
		'20000000-0000-0000-0000-000000000001',
		'user-owner-bali',
		'owner@bali-table.test',
		'Made Restaurant Owner',
		'10000000-0000-0000-0000-000000000001'
	),
	(
		'20000000-0000-0000-0000-000000000002',
		'user-staff-jakarta',
		'staff@jakarta-hospitality.test',
		'Jakarta Service Staff',
		'10000000-0000-0000-0000-000000000002'
	)
ON CONFLICT (id) DO UPDATE SET
	external_auth_id       = EXCLUDED.external_auth_id,
	email                  = EXCLUDED.email,
	name                   = EXCLUDED.name,
	default_organization_id = EXCLUDED.default_organization_id;

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
-- ── Restaurants ───────────────────────────────────────────────
INSERT INTO restaurants (
	id, organization_id, name, slug, public_host, location, segment,
	language_tags, hero_image_url, menu_scan_url, table_count,
	menu_source_type, description, knowledge_highlights, analytics
) VALUES
	(
		'40000000-0000-0000-0000-000000000001',
		'10000000-0000-0000-0000-000000000001',
		'Uma Karang', 'uma-karang', 'uma-karang.lingua.app',
		'Canggu, Bali', 'casual-dining',
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
		'Taman Sate', 'taman-sate', 'taman-sate.lingua.app',
		'Menteng, Jakarta', 'casual-dining',
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
		'Senja Ramen Bali', 'senja-ramen-bali', 'senja-ramen-bali.lingua.app',
		'Seminyak, Bali', 'casual-dining',
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
		'Rempah Terrace', 'rempah-terrace', 'rempah-terrace.lingua.app',
		'Kemang, Jakarta', 'premium',
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
		'Pantai Padi', 'pantai-padi', 'pantai-padi.lingua.app',
		'Jimbaran, Bali', 'casual-dining',
		ARRAY['en','id','ar']::text[],
		'/assets/covers/pantai-padi.svg',
		'/assets/menu-scans/pantai-padi-menu.svg',
		16, 'seasonal',
		'Beachside seafood grill with Mediterranean and Middle Eastern influences.',
		ARRAY['Halal certified seafood','Fresh daily catch','Arabic mezze available']::text[],
		'{"scansToday":52,"helpfulRate":88,"fallbackRate":16,"topQuestion":"Is all seafood halal certified?","topItem":"Grilled Sea Bass with Tahini"}'::jsonb
	)
ON CONFLICT (id) DO UPDATE SET
	name             = EXCLUDED.name,
	slug             = EXCLUDED.slug,
	public_host      = EXCLUDED.public_host,
	location         = EXCLUDED.location,
	segment          = EXCLUDED.segment,
	language_tags    = EXCLUDED.language_tags,
	hero_image_url   = EXCLUDED.hero_image_url,
	menu_scan_url    = EXCLUDED.menu_scan_url,
	table_count      = EXCLUDED.table_count,
	menu_source_type = EXCLUDED.menu_source_type,
	description      = EXCLUDED.description,
	knowledge_highlights = EXCLUDED.knowledge_highlights,
	analytics        = EXCLUDED.analytics;

-- ── Membership <-> Restaurant links ───────────────────────────────
INSERT INTO membership_restaurants (membership_id, organization_id, restaurant_id) VALUES
	('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001'),
	('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000003'),
	('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000005'),
	('30000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000002'),
	('30000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000004')
ON CONFLICT DO NOTHING;

-- ── Restaurant locations (one per restaurant) ──────────────────────
INSERT INTO restaurant_locations (id, organization_id, restaurant_id, code, name, address, is_primary)
SELECT
	-- deterministic UUID derived from restaurant id + 'main'
	gen_random_uuid(),
	organization_id,
	id,
	'main',
	name || ' Main Dining',
	location,
	true
FROM restaurants
WHERE id IN (
	'40000000-0000-0000-0000-000000000001',
	'40000000-0000-0000-0000-000000000002',
	'40000000-0000-0000-0000-000000000003',
	'40000000-0000-0000-0000-000000000004',
	'40000000-0000-0000-0000-000000000005'
)
AND NOT EXISTS (
	SELECT 1 FROM restaurant_locations rl
	WHERE rl.restaurant_id = restaurants.id AND rl.code = 'main'
);

-- ── Restaurant tables ───────────────────────────────────────────────
INSERT INTO restaurant_tables (organization_id, restaurant_id, location_id, code, label, qr_path)
SELECT
	r.organization_id,
	r.id,
	rl.id,
	table_code,
	table_code,
	'/r/' || r.slug || '/table/' || table_code
FROM restaurants r
JOIN restaurant_locations rl ON rl.restaurant_id = r.id AND rl.code = 'main'
CROSS JOIN (VALUES ('T01'),('T02'),('T03'),('T04'),('T05'),('T06'),('T07'),('B12')) AS codes(table_code)
WHERE r.id IN (
	'40000000-0000-0000-0000-000000000001',
	'40000000-0000-0000-0000-000000000002',
	'40000000-0000-0000-0000-000000000003',
	'40000000-0000-0000-0000-000000000004',
	'40000000-0000-0000-0000-000000000005'
)
AND NOT EXISTS (
	SELECT 1 FROM restaurant_tables rt
	WHERE rt.restaurant_id = r.id AND rt.code = table_code
);

-- Special RTL/Arabic table for pantai-padi
INSERT INTO restaurant_tables (organization_id, restaurant_id, location_id, code, label, qr_path)
SELECT
	'10000000-0000-0000-0000-000000000001',
	'40000000-0000-0000-0000-000000000005',
	rl.id,
	'A01', 'A01', '/r/pantai-padi/table/A01'
FROM restaurant_locations rl
WHERE rl.restaurant_id = '40000000-0000-0000-0000-000000000005' AND rl.code = 'main'
AND NOT EXISTS (
	SELECT 1 FROM restaurant_tables rt
	WHERE rt.restaurant_id = '40000000-0000-0000-0000-000000000005' AND rt.code = 'A01'
);
-- ── Menus ────────────────────────────────────────────────────────
INSERT INTO menus (id, organization_id, restaurant_id, version, status, source_type, source_uri, published_at) VALUES
	('50000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001',1,'published','photo','/assets/menu-scans/uma-karang-menu.svg',now()),
	('50000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000002',1,'published','handwritten','/assets/menu-scans/taman-sate-menu.svg',now()),
	('50000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000005',1,'published','seasonal','/assets/menu-scans/pantai-padi-menu.svg',now())
ON CONFLICT (id) DO UPDATE SET
	version     = EXCLUDED.version,
	status      = EXCLUDED.status,
	source_type = EXCLUDED.source_type,
	source_uri  = EXCLUDED.source_uri;

-- ── Menu categories ──────────────────────────────────────────────
INSERT INTO menu_categories (id, organization_id, restaurant_id, menu_id, name, sort_order) VALUES
	('60000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','Signatures',1),
	('60000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','Drinks',2),
	('60000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000002','Satay',1),
	('60000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000002','Drinks',2),
	('60000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000005','50000000-0000-0000-0000-000000000005','Seafood',1)
ON CONFLICT (id) DO UPDATE SET
	name       = EXCLUDED.name,
	sort_order = EXCLUDED.sort_order;

-- ── Menu items ───────────────────────────────────────────────────
INSERT INTO menu_items (
	id, organization_id, restaurant_id, menu_id, category_id,
	name, local_name, description, price_amount, currency,
	image_url, spice_level, is_available, is_signature, confidence, sort_order
) VALUES
	('70000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001',
	 'Slow Roasted Betutu Chicken','Ayam Betutu','Turmeric, lemongrass, galangal, and banana leaf roasted chicken with steamed rice.',98000,'IDR','/mock-images/photo-1604908176997-125f25cc6f3d.jpg',4,true,true,'verified',1),
	('70000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001',
	 'Jimbaran Grilled Fish','Ikan Bakar Jimbaran','Charcoal grilled fish with sweet soy glaze, lime, sambal matah, and warm rice.',145000,'IDR','/mock-images/photo-1544943910-4c1dc44aab44.jpg',2,true,false,'verified',2),
	('70000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000002',
	 'Young Coconut with Lime','Es Kelapa Jeruk Nipis','Chilled young coconut water with lime and coconut flesh.',42000,'IDR','/mock-images/photo-1541518763669-27fef04b14ea.jpg',0,true,false,'verified',3),
	('70000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000003',
	 'Chicken Satay Set','Sate Ayam','Ten skewers of chicken satay with peanut sauce, lontong, and pickled cucumber.',76000,'IDR','/mock-images/photo-1529543544282-ea669407fca3.jpg',1,true,true,'staff-confirm',1),
	('70000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000003',
	 'Lamb Satay with Sweet Soy','Sate Kambing','Charcoal lamb skewers with sweet soy, tomato, shallot, and lime.',98000,'IDR','/mock-images/photo-1555939594-58d7cb561ad1.jpg',2,true,false,'verified',2),
	('70000000-0000-0000-0000-000000000006','10000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000004',
	 'Coconut Cendol','Es Cendol','Coconut milk dessert drink with palm sugar and green rice flour jelly.',42000,'IDR','/mock-images/photo-1534706270553-2ac0dfa30283.jpg',0,true,false,'verified',3),
	('70000000-0000-0000-0000-000000000007','10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000005','50000000-0000-0000-0000-000000000005','60000000-0000-0000-0000-000000000005',
	 'Grilled Sea Bass with Tahini','سمك مشوي بالطحينة','Fresh sea bass grilled with Mediterranean herbs, served with tahini sauce and lemon.',165000,'IDR','/mock-images/photo-1519708227418-c8fd9a32b7a2.jpg',1,true,true,'verified',1)
ON CONFLICT (id) DO UPDATE SET
	name          = EXCLUDED.name,
	local_name    = EXCLUDED.local_name,
	description   = EXCLUDED.description,
	price_amount  = EXCLUDED.price_amount,
	currency      = EXCLUDED.currency,
	image_url     = EXCLUDED.image_url,
	spice_level   = EXCLUDED.spice_level,
	is_available  = EXCLUDED.is_available,
	is_signature  = EXCLUDED.is_signature,
	confidence    = EXCLUDED.confidence,
	sort_order    = EXCLUDED.sort_order;

-- ── Dietary flags per item ───────────────────────────────────────────
INSERT INTO menu_item_dietary_flags (menu_item_id, flag_code) VALUES
	('70000000-0000-0000-0000-000000000001','halal'),
	('70000000-0000-0000-0000-000000000001','spicy'),
	('70000000-0000-0000-0000-000000000002','halal'),
	('70000000-0000-0000-0000-000000000002','seafood'),
	('70000000-0000-0000-0000-000000000003','halal'),
	('70000000-0000-0000-0000-000000000003','vegan'),
	('70000000-0000-0000-0000-000000000003','gluten-free'),
	('70000000-0000-0000-0000-000000000004','halal'),
	('70000000-0000-0000-0000-000000000005','halal'),
	('70000000-0000-0000-0000-000000000006','vegetarian')
ON CONFLICT DO NOTHING;

-- ── Allergens per item ────────────────────────────────────────────────
INSERT INTO menu_item_allergens (menu_item_id, allergen_code) VALUES
	('70000000-0000-0000-0000-000000000002','seafood'),
	('70000000-0000-0000-0000-000000000004','nuts'),
	('70000000-0000-0000-0000-000000000004','soy'),
	('70000000-0000-0000-0000-000000000005','soy'),
	('70000000-0000-0000-0000-000000000006','dairy')
ON CONFLICT DO NOTHING;

-- ── Menu import issues ──────────────────────────────────────────────
INSERT INTO menu_import_issues (organization_id, restaurant_id, source_type, label, confidence, issue, status)
SELECT * FROM (VALUES
	('10000000-0000-0000-0000-000000000001'::uuid,'40000000-0000-0000-0000-000000000001'::uuid,'photo','Sambal matah note',0.72,'OCR reads "sambal mentah"; needs staff confirmation.','needs-review'),
	('10000000-0000-0000-0000-000000000002'::uuid,'40000000-0000-0000-0000-000000000002'::uuid,'handwritten','Peanut sauce note',0.51,'Handwritten note looks like "no peanut option"; needs review.','blocked')
) AS v(organization_id, restaurant_id, source_type, label, confidence, issue, status)
WHERE NOT EXISTS (
	SELECT 1 FROM menu_import_issues m
	WHERE m.restaurant_id = v.restaurant_id AND m.label = v.label
);

-- ── Knowledge documents ─────────────────────────────────────────────
INSERT INTO knowledge_documents (organization_id, restaurant_id, title, content, visibility)
SELECT * FROM (VALUES
	('10000000-0000-0000-0000-000000000001'::uuid,'40000000-0000-0000-0000-000000000001'::uuid,
	 'Kitchen safety notes','Halal-friendly kitchen zone. Sambal can be served separately. Staff must confirm seafood cross-contact.','published'),
	('10000000-0000-0000-0000-000000000002'::uuid,'40000000-0000-0000-0000-000000000002'::uuid,
	 'Peanut handling','Peanut sauce is prepared in a peanut-heavy kitchen. Allergy requests should always be escalated to staff.','published')
) AS v(organization_id, restaurant_id, title, content, visibility)
WHERE NOT EXISTS (
	SELECT 1 FROM knowledge_documents k
	WHERE k.restaurant_id = v.restaurant_id AND k.title = v.title
);

-- ── Customer sessions ───────────────────────────────────────────────
INSERT INTO customer_sessions (id, organization_id, restaurant_id, table_id, language_tag, preferences)
SELECT
	'80000000-0000-0000-0000-000000000001',
	'10000000-0000-0000-0000-000000000001',
	'40000000-0000-0000-0000-000000000001',
	(SELECT id FROM restaurant_tables WHERE restaurant_id = '40000000-0000-0000-0000-000000000001' AND code = 'T07'),
	'ja',
	'{"allergens":["shellfish"],"spice":"medium"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM customer_sessions WHERE id = '80000000-0000-0000-0000-000000000001');

INSERT INTO customer_sessions (id, organization_id, restaurant_id, table_id, language_tag, preferences)
SELECT
	'80000000-0000-0000-0000-000000000002',
	'10000000-0000-0000-0000-000000000002',
	'40000000-0000-0000-0000-000000000002',
	(SELECT id FROM restaurant_tables WHERE restaurant_id = '40000000-0000-0000-0000-000000000002' AND code = 'B12'),
	'ja',
	'{"allergens":["nuts"],"dietary":["halal"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM customer_sessions WHERE id = '80000000-0000-0000-0000-000000000002');

-- ── Fallback requests ────────────────────────────────────────────────
INSERT INTO fallback_requests (
	id, organization_id, restaurant_id, session_id, table_id,
	status, priority, language_tag, guest_need, summary
)
SELECT
	'90000000-0000-0000-0000-000000000001',
	'10000000-0000-0000-0000-000000000001',
	'40000000-0000-0000-0000-000000000001',
	'80000000-0000-0000-0000-000000000001',
	(SELECT id FROM restaurant_tables WHERE restaurant_id = '40000000-0000-0000-0000-000000000001' AND code = 'T07'),
	'new', 'high', 'ja', 'Allergy confirmation',
	'Guest asks whether Jimbaran grilled fish touches shellfish on the grill.'
WHERE NOT EXISTS (SELECT 1 FROM fallback_requests WHERE id = '90000000-0000-0000-0000-000000000001');

INSERT INTO fallback_requests (
	id, organization_id, restaurant_id, session_id, table_id,
	status, priority, language_tag, guest_need, summary
)
SELECT
	'90000000-0000-0000-0000-000000000002',
	'10000000-0000-0000-0000-000000000002',
	'40000000-0000-0000-0000-000000000002',
	'80000000-0000-0000-0000-000000000002',
	(SELECT id FROM restaurant_tables WHERE restaurant_id = '40000000-0000-0000-0000-000000000002' AND code = 'B12'),
	'in-progress', 'high', 'ja', 'Peanut-free option',
	'Guest wants chicken satay without peanut sauce and asks if cross-contact is possible.'
WHERE NOT EXISTS (SELECT 1 FROM fallback_requests WHERE id = '90000000-0000-0000-0000-000000000002');
