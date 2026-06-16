UPDATE menu_items
SET source_metadata = jsonb_set(
	source_metadata,
	'{goodFor}',
	to_jsonb(ARRAY['Local classic', 'Big appetite', 'Spice lovers']::text[]),
	true
)
WHERE id = '70000000-0000-0000-0000-000000000001'::uuid;

UPDATE menu_items
SET source_metadata = jsonb_set(
	source_metadata,
	'{goodFor}',
	to_jsonb(ARRAY['Shared meal', 'Fresh seafood']::text[]),
	true
)
WHERE id = '70000000-0000-0000-0000-000000000002'::uuid;

UPDATE menu_items
SET source_metadata = jsonb_set(
	source_metadata,
	'{goodFor}',
	to_jsonb(ARRAY['Refreshing', 'Low spice']::text[]),
	true
)
WHERE id = '70000000-0000-0000-0000-000000000003'::uuid;

UPDATE menu_items
SET source_metadata = jsonb_set(
	source_metadata,
	'{goodFor}',
	to_jsonb(ARRAY['Classic order', 'Shared starter']::text[]),
	true
)
WHERE id = '70000000-0000-0000-0000-000000000004'::uuid;

UPDATE menu_items
SET source_metadata = jsonb_set(
	source_metadata,
	'{goodFor}',
	to_jsonb(ARRAY['Grilled meat', 'No peanut sauce option']::text[]),
	true
)
WHERE id = '70000000-0000-0000-0000-000000000005'::uuid;

UPDATE menu_items
SET source_metadata = jsonb_set(source_metadata, '{goodFor}', to_jsonb(ARRAY['Dessert drink']::text[]), true)
WHERE id = '70000000-0000-0000-0000-000000000006'::uuid;
