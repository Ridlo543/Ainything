TRUNCATE
	ai_events,
	feedback,
	fallback_requests,
	chat_messages,
	customer_sessions,
	knowledge_documents,
	menu_import_issues,
	menu_item_allergens,
	menu_item_dietary_flags,
	menu_item_translations,
	menu_items,
	menu_categories,
	menus,
	restaurant_tables,
	restaurant_locations,
	membership_restaurants,
	memberships,
	app_users,
	restaurants,
	organizations,
	dietary_flags,
	allergens
RESTART IDENTITY CASCADE;

INSERT INTO dietary_flags (code, label) VALUES
	('halal', 'Halal'),
	('vegetarian', 'Vegetarian'),
	('vegan', 'Vegan'),
	('gluten-free', 'Gluten-free'),
	('contains-alcohol', 'Contains alcohol'),
	('spicy', 'Spicy'),
	('seafood', 'Seafood'),
	('nut-free', 'Nut-free');

INSERT INTO allergens (code, label) VALUES
	('nuts', 'Nuts'),
	('dairy', 'Dairy'),
	('egg', 'Egg'),
	('shellfish', 'Shellfish'),
	('seafood', 'Seafood'),
	('soy', 'Soy'),
	('gluten', 'Gluten'),
	('sesame', 'Sesame');

INSERT INTO organizations (id, name, slug, workspace_host, plan) VALUES
	(
		'10000000-0000-0000-0000-000000000001',
		'Bali Table Group',
		'bali-table-group',
		'bali-table.linguaserve.app',
		'pro'
	),
	(
		'10000000-0000-0000-0000-000000000002',
		'Jakarta Hospitality Lab',
		'jakarta-hospitality-lab',
		'jakarta-hospitality.linguaserve.app',
		'pilot'
	);

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
	);

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
	);

INSERT INTO restaurants (
	id,
	organization_id,
	name,
	slug,
	public_host,
	location,
	segment,
	language_tags,
	hero_image_url,
	menu_scan_url,
	table_count,
	menu_source_type,
	description,
	knowledge_highlights,
	analytics
) VALUES
	(
		'40000000-0000-0000-0000-000000000001',
		'10000000-0000-0000-0000-000000000001',
		'Uma Karang',
		'uma-karang',
		'uma-karang.linguaserve.app',
		'Canggu, Bali',
		'casual-dining',
		ARRAY['en', 'id', 'zh-Hans', 'ko', 'ja', 'ar']::text[],
		'/assets/covers/uma-karang.svg',
		'/assets/menu-scans/uma-karang-menu.svg',
		24,
		'photo',
		'Balinese comfort dishes with grilled seafood, sambal options, and rice plates.',
		ARRAY['Halal-friendly kitchen zone', 'Sambal served separately on request', 'No pork menu']::text[],
		'{
			"scansToday": 186,
			"helpfulRate": 88,
			"fallbackRate": 14,
			"topQuestion": "Is betutu chicken very spicy?",
			"topItem": "Slow Roasted Betutu Chicken"
		}'::jsonb
	),
	(
		'40000000-0000-0000-0000-000000000002',
		'10000000-0000-0000-0000-000000000002',
		'Taman Sate',
		'taman-sate',
		'taman-sate.linguaserve.app',
		'Menteng, Jakarta',
		'casual-dining',
		ARRAY['en', 'id', 'ar', 'hi', 'zh-Hans']::text[],
		'/assets/covers/taman-sate.svg',
		'/assets/menu-scans/taman-sate-menu.svg',
		36,
		'handwritten',
		'Satay garden restaurant with charcoal grill, peanut sauces, and rice cake sides.',
		ARRAY['Peanut-heavy kitchen', 'Halal meat supplier', 'Sauces can be served separately']::text[],
		'{
			"scansToday": 158,
			"helpfulRate": 79,
			"fallbackRate": 28,
			"topQuestion": "Can satay be served without peanut?",
			"topItem": "Chicken Satay Set"
		}'::jsonb
	),
	(
		'40000000-0000-0000-0000-000000000003',
		'10000000-0000-0000-0000-000000000001',
		'Senja Ramen Bali',
		'senja-ramen-bali',
		'senja-ramen-bali.linguaserve.app',
		'Seminyak, Bali',
		'casual-dining',
		ARRAY['en', 'id', 'ja', 'ko', 'zh-Hans']::text[],
		'/assets/covers/senja-ramen-bali.svg',
		'/assets/menu-scans/senja-ramen-bali-menu.svg',
		28,
		'pdf-scan',
		'Ramen shop with chicken broth, spicy miso, and Indonesian-inspired toppings.',
		ARRAY['Chicken broth base', 'No pork chashu', 'Miso contains soy']::text[],
		'{
			"scansToday": 137,
			"helpfulRate": 87,
			"fallbackRate": 15,
			"topQuestion": "Does the ramen use pork broth?",
			"topItem": "Spicy Chicken Miso Ramen"
		}'::jsonb
	),
	(
		'40000000-0000-0000-0000-000000000004',
		'10000000-0000-0000-0000-000000000002',
		'Rempah Terrace',
		'rempah-terrace',
		'rempah-terrace.linguaserve.app',
		'Kemang, Jakarta',
		'premium',
		ARRAY['en', 'id', 'ar', 'fr', 'de']::text[],
		'/assets/covers/rempah-terrace.svg',
		'/assets/menu-scans/rempah-terrace-menu.svg',
		42,
		'seasonal',
		'Modern Indonesian tasting plates with spice-led sauces and staff-paired mocktails.',
		ARRAY['No pork', 'Mocktail pairings available', 'Seasonal menu changes weekly']::text[],
		'{
			"scansToday": 89,
			"helpfulRate": 93,
			"fallbackRate": 9,
			"topQuestion": "Is rendang halal certified?",
			"topItem": "Short Rib Rendang"
		}'::jsonb
	);

INSERT INTO membership_restaurants (membership_id, organization_id, restaurant_id) VALUES
	(
		'30000000-0000-0000-0000-000000000001',
		'10000000-0000-0000-0000-000000000001',
		'40000000-0000-0000-0000-000000000001'
	),
	(
		'30000000-0000-0000-0000-000000000001',
		'10000000-0000-0000-0000-000000000001',
		'40000000-0000-0000-0000-000000000003'
	),
	(
		'30000000-0000-0000-0000-000000000002',
		'10000000-0000-0000-0000-000000000002',
		'40000000-0000-0000-0000-000000000002'
	),
	(
		'30000000-0000-0000-0000-000000000002',
		'10000000-0000-0000-0000-000000000002',
		'40000000-0000-0000-0000-000000000004'
	);

INSERT INTO restaurant_locations (id, organization_id, restaurant_id, code, name, address, is_primary)
SELECT
	gen_random_uuid(),
	organization_id,
	id,
	'main',
	name || ' Main Dining',
	location,
	true
FROM restaurants;

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
CROSS JOIN (VALUES ('T01'), ('T02'), ('T03'), ('T04'), ('T05'), ('T06'), ('T07'), ('B12')) AS codes(table_code);

INSERT INTO menus (id, organization_id, restaurant_id, version, status, source_type, source_uri, published_at) VALUES
	(
		'50000000-0000-0000-0000-000000000001',
		'10000000-0000-0000-0000-000000000001',
		'40000000-0000-0000-0000-000000000001',
		1,
		'published',
		'photo',
		'/assets/menu-scans/uma-karang-menu.svg',
		now()
	),
	(
		'50000000-0000-0000-0000-000000000002',
		'10000000-0000-0000-0000-000000000002',
		'40000000-0000-0000-0000-000000000002',
		1,
		'published',
		'handwritten',
		'/assets/menu-scans/taman-sate-menu.svg',
		now()
	);

INSERT INTO menu_categories (id, organization_id, restaurant_id, menu_id, name, sort_order) VALUES
	(
		'60000000-0000-0000-0000-000000000001',
		'10000000-0000-0000-0000-000000000001',
		'40000000-0000-0000-0000-000000000001',
		'50000000-0000-0000-0000-000000000001',
		'Signatures',
		1
	),
	(
		'60000000-0000-0000-0000-000000000002',
		'10000000-0000-0000-0000-000000000001',
		'40000000-0000-0000-0000-000000000001',
		'50000000-0000-0000-0000-000000000001',
		'Drinks',
		2
	),
	(
		'60000000-0000-0000-0000-000000000003',
		'10000000-0000-0000-0000-000000000002',
		'40000000-0000-0000-0000-000000000002',
		'50000000-0000-0000-0000-000000000002',
		'Satay',
		1
	),
	(
		'60000000-0000-0000-0000-000000000004',
		'10000000-0000-0000-0000-000000000002',
		'40000000-0000-0000-0000-000000000002',
		'50000000-0000-0000-0000-000000000002',
		'Drinks',
		2
	);

INSERT INTO menu_items (
	id,
	organization_id,
	restaurant_id,
	menu_id,
	category_id,
	name,
	local_name,
	description,
	price_amount,
	currency,
	image_url,
	spice_level,
	is_available,
	is_signature,
	confidence,
	sort_order
) VALUES
	(
		'70000000-0000-0000-0000-000000000001',
		'10000000-0000-0000-0000-000000000001',
		'40000000-0000-0000-0000-000000000001',
		'50000000-0000-0000-0000-000000000001',
		'60000000-0000-0000-0000-000000000001',
		'Slow Roasted Betutu Chicken',
		'Ayam Betutu',
		'Turmeric, lemongrass, galangal, and banana leaf roasted chicken with steamed rice.',
		98000,
		'IDR',
		'/assets/covers/uma-karang.svg',
		4,
		true,
		true,
		'verified',
		1
	),
	(
		'70000000-0000-0000-0000-000000000002',
		'10000000-0000-0000-0000-000000000001',
		'40000000-0000-0000-0000-000000000001',
		'50000000-0000-0000-0000-000000000001',
		'60000000-0000-0000-0000-000000000001',
		'Jimbaran Grilled Fish',
		'Ikan Bakar Jimbaran',
		'Charcoal grilled fish with sweet soy glaze, lime, sambal matah, and warm rice.',
		145000,
		'IDR',
		'/assets/covers/uma-karang.svg',
		2,
		true,
		false,
		'verified',
		2
	),
	(
		'70000000-0000-0000-0000-000000000003',
		'10000000-0000-0000-0000-000000000001',
		'40000000-0000-0000-0000-000000000001',
		'50000000-0000-0000-0000-000000000001',
		'60000000-0000-0000-0000-000000000002',
		'Young Coconut with Lime',
		'Es Kelapa Jeruk Nipis',
		'Chilled young coconut water with lime and coconut flesh.',
		42000,
		'IDR',
		'/assets/covers/uma-karang.svg',
		0,
		true,
		false,
		'verified',
		3
	),
	(
		'70000000-0000-0000-0000-000000000004',
		'10000000-0000-0000-0000-000000000002',
		'40000000-0000-0000-0000-000000000002',
		'50000000-0000-0000-0000-000000000002',
		'60000000-0000-0000-0000-000000000003',
		'Chicken Satay Set',
		'Sate Ayam',
		'Ten skewers of chicken satay with peanut sauce, lontong, and pickled cucumber.',
		76000,
		'IDR',
		'/assets/covers/taman-sate.svg',
		1,
		true,
		true,
		'staff-confirm',
		1
	),
	(
		'70000000-0000-0000-0000-000000000005',
		'10000000-0000-0000-0000-000000000002',
		'40000000-0000-0000-0000-000000000002',
		'50000000-0000-0000-0000-000000000002',
		'60000000-0000-0000-0000-000000000003',
		'Lamb Satay with Sweet Soy',
		'Sate Kambing',
		'Charcoal lamb skewers with sweet soy, tomato, shallot, and lime.',
		98000,
		'IDR',
		'/assets/covers/taman-sate.svg',
		2,
		true,
		false,
		'verified',
		2
	),
	(
		'70000000-0000-0000-0000-000000000006',
		'10000000-0000-0000-0000-000000000002',
		'40000000-0000-0000-0000-000000000002',
		'50000000-0000-0000-0000-000000000002',
		'60000000-0000-0000-0000-000000000004',
		'Coconut Cendol',
		'Es Cendol',
		'Coconut milk dessert drink with palm sugar and green rice flour jelly.',
		42000,
		'IDR',
		'/assets/covers/taman-sate.svg',
		0,
		true,
		false,
		'verified',
		3
	);

INSERT INTO menu_item_dietary_flags (menu_item_id, flag_code) VALUES
	('70000000-0000-0000-0000-000000000001', 'halal'),
	('70000000-0000-0000-0000-000000000001', 'spicy'),
	('70000000-0000-0000-0000-000000000002', 'halal'),
	('70000000-0000-0000-0000-000000000002', 'seafood'),
	('70000000-0000-0000-0000-000000000003', 'halal'),
	('70000000-0000-0000-0000-000000000003', 'vegan'),
	('70000000-0000-0000-0000-000000000003', 'gluten-free'),
	('70000000-0000-0000-0000-000000000004', 'halal'),
	('70000000-0000-0000-0000-000000000005', 'halal'),
	('70000000-0000-0000-0000-000000000006', 'vegetarian');

INSERT INTO menu_item_allergens (menu_item_id, allergen_code) VALUES
	('70000000-0000-0000-0000-000000000002', 'seafood'),
	('70000000-0000-0000-0000-000000000004', 'nuts'),
	('70000000-0000-0000-0000-000000000004', 'soy'),
	('70000000-0000-0000-0000-000000000005', 'soy'),
	('70000000-0000-0000-0000-000000000006', 'dairy');

INSERT INTO menu_import_issues (
	organization_id,
	restaurant_id,
	source_type,
	label,
	confidence,
	issue,
	status
) VALUES
	(
		'10000000-0000-0000-0000-000000000001',
		'40000000-0000-0000-0000-000000000001',
		'photo',
		'Sambal matah note',
		0.72,
		'OCR reads "sambal mentah"; needs staff confirmation.',
		'needs-review'
	),
	(
		'10000000-0000-0000-0000-000000000002',
		'40000000-0000-0000-0000-000000000002',
		'handwritten',
		'Peanut sauce note',
		0.51,
		'Handwritten note looks like "no peanut option"; needs review.',
		'blocked'
	);

INSERT INTO knowledge_documents (organization_id, restaurant_id, title, content, visibility) VALUES
	(
		'10000000-0000-0000-0000-000000000001',
		'40000000-0000-0000-0000-000000000001',
		'Kitchen safety notes',
		'Halal-friendly kitchen zone. Sambal can be served separately. Staff must confirm seafood cross-contact.',
		'published'
	),
	(
		'10000000-0000-0000-0000-000000000002',
		'40000000-0000-0000-0000-000000000002',
		'Peanut handling',
		'Peanut sauce is prepared in a peanut-heavy kitchen. Allergy requests should always be escalated to staff.',
		'published'
	);

INSERT INTO customer_sessions (
	id,
	organization_id,
	restaurant_id,
	table_id,
	language_tag,
	preferences
) VALUES
	(
		'80000000-0000-0000-0000-000000000001',
		'10000000-0000-0000-0000-000000000001',
		'40000000-0000-0000-0000-000000000001',
		(
			SELECT id FROM restaurant_tables
			WHERE restaurant_id = '40000000-0000-0000-0000-000000000001' AND code = 'T07'
		),
		'ko',
		'{"allergens":["shellfish"],"spice":"medium"}'::jsonb
	),
	(
		'80000000-0000-0000-0000-000000000002',
		'10000000-0000-0000-0000-000000000002',
		'40000000-0000-0000-0000-000000000002',
		(
			SELECT id FROM restaurant_tables
			WHERE restaurant_id = '40000000-0000-0000-0000-000000000002' AND code = 'B12'
		),
		'ar',
		'{"allergens":["nuts"],"dietary":["halal"]}'::jsonb
	);

INSERT INTO fallback_requests (
	id,
	organization_id,
	restaurant_id,
	session_id,
	table_id,
	status,
	priority,
	language_tag,
	guest_need,
	summary
) VALUES
	(
		'90000000-0000-0000-0000-000000000001',
		'10000000-0000-0000-0000-000000000001',
		'40000000-0000-0000-0000-000000000001',
		'80000000-0000-0000-0000-000000000001',
		(
			SELECT id FROM restaurant_tables
			WHERE restaurant_id = '40000000-0000-0000-0000-000000000001' AND code = 'T07'
		),
		'new',
		'high',
		'ko',
		'Allergy confirmation',
		'Guest asks whether Jimbaran grilled fish touches shellfish on the grill.'
	),
	(
		'90000000-0000-0000-0000-000000000002',
		'10000000-0000-0000-0000-000000000002',
		'40000000-0000-0000-0000-000000000002',
		'80000000-0000-0000-0000-000000000002',
		(
			SELECT id FROM restaurant_tables
			WHERE restaurant_id = '40000000-0000-0000-0000-000000000002' AND code = 'B12'
		),
		'in-progress',
		'high',
		'ar',
		'Peanut-free option',
		'Guest wants chicken satay without peanut sauce and asks if cross-contact is possible.'
	);
