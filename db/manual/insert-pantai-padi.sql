-- Manual workaround for pantai-padi seed mystery
-- 
-- ISSUE: Pantai-padi data exists in seed file but doesn't appear in database
--         after pnpm db:reset. Root cause unknown despite extensive investigation.
--
-- WORKAROUND: Run this SQL manually after db:reset to insert pantai-padi data
--
-- USAGE:
--   podman exec -i ainything-postgres psql -U ainything -d ainything < db/manual/insert-pantai-padi.sql
--
-- Date: 2026-06-22
-- Investigation: See git commit 2cd0859 for seed file additions

BEGIN;

-- Insert restaurant
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
) VALUES (
    '40000000-0000-0000-0000-000000000005',
    '10000000-0000-0000-0000-000000000001',
    'Pantai Padi',
    'pantai-padi',
    'pantai-padi.ainything.app',
    'Jimbaran, Bali',
    'casual-dining',
    ARRAY['en', 'id', 'ar']::text[],
    '/assets/covers/pantai-padi.svg',
    '/assets/menu-scans/pantai-padi-menu.svg',
    16,
    'seasonal',
    'Beachside seafood grill with Mediterranean and Middle Eastern influences.',
    ARRAY['Halal certified seafood', 'Fresh daily catch', 'Arabic mezze available']::text[],
    '{"scansToday": 52, "helpfulRate": 88, "fallbackRate": 16, "topQuestion": "Is all seafood halal certified?", "topItem": "Grilled Sea Bass with Tahini"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Insert membership link
INSERT INTO membership_restaurants (membership_id, organization_id, restaurant_id)
VALUES (
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000005'
)
ON CONFLICT DO NOTHING;

-- Insert restaurant location (needed for table foreign key)
INSERT INTO restaurant_locations (
    id,
    organization_id,
    restaurant_id,
    code,
    name,
    address,
    is_primary
)
SELECT
    gen_random_uuid(),
    '10000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000005',
    'main',
    'Pantai Padi Main Dining',
    'Jimbaran, Bali',
    true
WHERE NOT EXISTS (
    SELECT 1 FROM restaurant_locations 
    WHERE restaurant_id = '40000000-0000-0000-0000-000000000005'
);

-- Insert standard tables (T01-T07, B12)
INSERT INTO restaurant_tables (organization_id, restaurant_id, location_id, code, label, qr_path)
SELECT
    '10000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000005',
    rl.id,
    codes.table_code,
    codes.table_code,
    '/r/pantai-padi/table/' || codes.table_code
FROM restaurant_locations rl
CROSS JOIN (VALUES ('T01'), ('T02'), ('T03'), ('T04'), ('T05'), ('T06'), ('T07'), ('B12')) AS codes(table_code)
WHERE rl.restaurant_id = '40000000-0000-0000-0000-000000000005' AND rl.code = 'main'
ON CONFLICT DO NOTHING;

-- Insert special table A01 for RTL/Arabic testing
INSERT INTO restaurant_tables (organization_id, restaurant_id, location_id, code, label, qr_path)
SELECT
    '10000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000005',
    rl.id,
    'A01',
    'A01',
    '/r/pantai-padi/table/A01'
FROM restaurant_locations rl
WHERE rl.restaurant_id = '40000000-0000-0000-0000-000000000005' AND rl.code = 'main'
ON CONFLICT DO NOTHING;

-- Insert published menu
INSERT INTO menus (id, organization_id, restaurant_id, version, status, source_type, source_uri, published_at)
VALUES (
    '50000000-0000-0000-0000-000000000005',
    '10000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000005',
    1,
    'published',
    'seasonal',
    '/assets/menu-scans/pantai-padi-menu.svg',
    now()
)
ON CONFLICT (id) DO NOTHING;

-- Insert menu category
INSERT INTO menu_categories (id, organization_id, restaurant_id, menu_id, name, sort_order)
VALUES (
    '60000000-0000-0000-0000-000000000005',
    '10000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000005',
    '50000000-0000-0000-0000-000000000005',
    'Seafood',
    1
)
ON CONFLICT (id) DO NOTHING;

-- Insert menu item with Arabic local name
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
    sort_order,
    is_available,
    is_signature,
    confidence
) VALUES (
    '70000000-0000-0000-0000-000000000007',
    '10000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000005',
    '50000000-0000-0000-0000-000000000005',
    '60000000-0000-0000-0000-000000000005',
    'Grilled Sea Bass with Tahini',
    'سمك مشوي بالطحينة',
    'Fresh sea bass grilled with Mediterranean herbs, served with tahini sauce and lemon.',
    165000,
    'IDR',
    '/assets/covers/pantai-padi.svg',
    1,
    true,
    true,
    'verified'
)
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- Verify insertion
SELECT 'Restaurant pantai-padi:', COUNT(*) FROM restaurants WHERE slug = 'pantai-padi';
SELECT 'Table A01:', COUNT(*) FROM restaurant_tables t JOIN restaurants r ON r.id = t.restaurant_id WHERE r.slug = 'pantai-padi' AND t.code = 'A01';
SELECT 'Published menu:', COUNT(*) FROM menus WHERE restaurant_id = '40000000-0000-0000-0000-000000000005' AND status = 'published';
SELECT 'Menu items:', COUNT(*) FROM menu_items WHERE restaurant_id = '40000000-0000-0000-0000-000000000005';
