import type {
	Allergen,
	AppUser,
	DietaryFlag,
	LanguageTag,
	Membership,
	MenuImportIssue,
	MenuItem,
	MenuSourceType,
	Organization,
	Restaurant,
	TenantContext
} from '$lib/domain/menu/types';
import { withUserContext, type DatabaseClient } from '$lib/server/db/postgres';

type OrganizationRow = {
	user_id: string;
	email: string;
	user_name: string;
	default_organization_id: string;
	membership_id: string;
	role: Membership['role'];
	organization_id: string;
	organization_name: string;
	organization_slug: string;
	workspace_host: string;
	plan: Organization['plan'];
};

type RestaurantRow = {
	id: string;
	organization_id: string;
	name: string;
	slug: string;
	public_host: string;
	location: string;
	segment: Restaurant['segment'];
	language_tags: LanguageTag[];
	hero_image_url: string;
	menu_scan_url: string;
	table_count: number;
	menu_source_type: MenuSourceType;
	description: string;
	knowledge_highlights: string[];
	analytics: Restaurant['analytics'];
};

type MenuItemRow = {
	id: string;
	restaurant_id: string;
	category: string;
	name: string;
	local_name: string | null;
	description: string;
	price_amount: number;
	currency: MenuItem['currency'];
	image_url: string;
	spice_level: MenuItem['spiceLevel'];
	is_available: boolean;
	is_signature: boolean;
	confidence: MenuItem['confidence'];
	dietary_flags: DietaryFlag[];
	allergens: Allergen[];
};

type ImportIssueRow = {
	id: string;
	restaurant_id: string;
	source_type: MenuSourceType;
	label: string;
	confidence: string;
	issue: string;
	status: MenuImportIssue['status'];
};

export async function resolveTenantContextFromDatabase(
	user: AppUser,
	selectedRestaurantSlug?: string
): Promise<TenantContext> {
	return withUserContext(user.id, async (client) => {
		const base = await loadMembership(client, user.id, user.defaultOrganizationId);

		if (!base) {
			throw new Error(`No database membership found for user ${user.id}`);
		}

		const restaurants = await loadRestaurantsForMembership(client, base.membership_id);

		if (restaurants.length === 0) {
			throw new Error(`No restaurants available for membership ${base.membership_id}`);
		}

		const restaurantIds = restaurants.map((restaurant) => restaurant.id);
		const categoriesByRestaurant = await loadCategories(client, restaurantIds);
		const itemsByRestaurant = await loadMenuItems(client, restaurantIds);
		const issuesByRestaurant = await loadImportIssues(client, restaurantIds);

		const mappedRestaurants = restaurants.map((restaurant) => ({
			id: restaurant.id,
			organizationId: restaurant.organization_id,
			name: restaurant.name,
			slug: restaurant.slug,
			publicHost: restaurant.public_host,
			location: restaurant.location,
			segment: restaurant.segment,
			languages: restaurant.language_tags,
			heroImage: restaurant.hero_image_url,
			menuScan: restaurant.menu_scan_url,
			tableCount: restaurant.table_count,
			menuSourceType: restaurant.menu_source_type,
			description: restaurant.description,
			knowledgeHighlights: restaurant.knowledge_highlights,
			categories: categoriesByRestaurant.get(restaurant.id) ?? [],
			menuItems: itemsByRestaurant.get(restaurant.id) ?? [],
			importIssues: issuesByRestaurant.get(restaurant.id) ?? [],
			analytics: restaurant.analytics
		}));

		const activeRestaurant =
			mappedRestaurants.find((restaurant) => restaurant.slug === selectedRestaurantSlug) ??
			mappedRestaurants[0];

		return {
			user: {
				id: base.user_id,
				email: base.email,
				name: base.user_name,
				defaultOrganizationId: base.default_organization_id
			},
			membership: {
				id: base.membership_id,
				userId: base.user_id,
				organizationId: base.organization_id,
				restaurantIds,
				role: base.role
			},
			organization: {
				id: base.organization_id,
				name: base.organization_name,
				slug: base.organization_slug,
				workspaceHost: base.workspace_host,
				plan: base.plan,
				restaurantIds
			},
			restaurants: mappedRestaurants,
			activeRestaurant
		};
	});
}

async function loadMembership(
	client: DatabaseClient,
	userExternalId: string,
	defaultOrganizationId: string
) {
	const result = await client.query<OrganizationRow>(
		`
			SELECT
				u.external_auth_id AS user_id,
				u.email,
				u.name AS user_name,
				COALESCE(u.default_organization_id::text, '') AS default_organization_id,
				m.id::text AS membership_id,
				m.role,
				o.id::text AS organization_id,
				o.name AS organization_name,
				o.slug AS organization_slug,
				COALESCE(o.workspace_host, '') AS workspace_host,
				o.plan
			FROM app_users u
			JOIN memberships m ON m.user_id = u.id
			JOIN organizations o ON o.id = m.organization_id
			WHERE u.external_auth_id = $1
			ORDER BY (o.id::text = $2) DESC, o.created_at ASC
			LIMIT 1
		`,
		[userExternalId, defaultOrganizationId]
	);

	return result.rows[0];
}

async function loadRestaurantsForMembership(client: DatabaseClient, membershipId: string) {
	const result = await client.query<RestaurantRow>(
		`
			SELECT
				r.id::text,
				r.organization_id::text,
				r.name,
				r.slug,
				COALESCE(r.public_host, '') AS public_host,
				r.location,
				r.segment,
				r.language_tags,
				r.hero_image_url,
				r.menu_scan_url,
				r.table_count,
				r.menu_source_type,
				r.description,
				r.knowledge_highlights,
				COALESCE(r.analytics, '{}'::jsonb) AS analytics
			FROM membership_restaurants mr
			JOIN restaurants r ON r.id = mr.restaurant_id
			WHERE mr.membership_id = $1::uuid
				AND r.status = 'active'
			ORDER BY r.name ASC
		`,
		[membershipId]
	);

	return result.rows;
}

async function loadCategories(client: DatabaseClient, restaurantIds: string[]) {
	if (restaurantIds.length === 0) {
		return new Map<string, string[]>();
	}

	const result = await client.query<{ restaurant_id: string; name: string }>(
		`
			SELECT DISTINCT mc.restaurant_id::text, mc.name, mc.sort_order
			FROM menu_categories mc
			JOIN menus m ON m.id = mc.menu_id
			WHERE mc.restaurant_id = ANY($1::uuid[])
				AND m.status = 'published'
			ORDER BY mc.restaurant_id::text, mc.sort_order, mc.name
		`,
		[restaurantIds]
	);

	const categories = new Map<string, string[]>();

	for (const row of result.rows) {
		categories.set(row.restaurant_id, [...(categories.get(row.restaurant_id) ?? []), row.name]);
	}

	return categories;
}

async function loadMenuItems(client: DatabaseClient, restaurantIds: string[]) {
	if (restaurantIds.length === 0) {
		return new Map<string, MenuItem[]>();
	}

	const result = await client.query<MenuItemRow>(
		`
			SELECT
				mi.id::text,
				mi.restaurant_id::text,
				mc.name AS category,
				mi.name,
				mi.local_name,
				mi.description,
				mi.price_amount,
				mi.currency,
				mi.image_url,
				mi.spice_level,
				mi.is_available,
				mi.is_signature,
				mi.confidence,
				COALESCE(
					ARRAY_AGG(DISTINCT midf.flag_code) FILTER (WHERE midf.flag_code IS NOT NULL),
					ARRAY[]::text[]
				) AS dietary_flags,
				COALESCE(
					ARRAY_AGG(DISTINCT mia.allergen_code) FILTER (WHERE mia.allergen_code IS NOT NULL),
					ARRAY[]::text[]
				) AS allergens
			FROM menu_items mi
			JOIN menus m ON m.id = mi.menu_id
			JOIN menu_categories mc ON mc.id = mi.category_id
			LEFT JOIN menu_item_dietary_flags midf ON midf.menu_item_id = mi.id
			LEFT JOIN menu_item_allergens mia ON mia.menu_item_id = mi.id
			WHERE mi.restaurant_id = ANY($1::uuid[])
				AND m.status = 'published'
			GROUP BY mi.id, mc.name
			ORDER BY mi.restaurant_id::text, mi.sort_order, mi.name
		`,
		[restaurantIds]
	);

	const items = new Map<string, MenuItem[]>();

	for (const row of result.rows) {
		const item: MenuItem = {
			id: row.id,
			category: row.category,
			name: row.name,
			localName: row.local_name ?? undefined,
			description: row.description,
			price: row.price_amount,
			currency: row.currency,
			image: row.image_url,
			spiceLevel: row.spice_level,
			isAvailable: row.is_available,
			isSignature: row.is_signature,
			dietaryFlags: row.dietary_flags,
			allergens: row.allergens,
			goodFor: [],
			confidence: row.confidence
		};

		items.set(row.restaurant_id, [...(items.get(row.restaurant_id) ?? []), item]);
	}

	return items;
}

async function loadImportIssues(client: DatabaseClient, restaurantIds: string[]) {
	if (restaurantIds.length === 0) {
		return new Map<string, MenuImportIssue[]>();
	}

	const result = await client.query<ImportIssueRow>(
		`
			SELECT
				id::text,
				restaurant_id::text,
				source_type,
				label,
				confidence::text,
				issue,
				status
			FROM menu_import_issues
			WHERE restaurant_id = ANY($1::uuid[])
			ORDER BY created_at DESC
		`,
		[restaurantIds]
	);

	const issues = new Map<string, MenuImportIssue[]>();

	for (const row of result.rows) {
		const issue: MenuImportIssue = {
			id: row.id,
			sourceType: row.source_type,
			label: row.label,
			confidence: Number(row.confidence),
			issue: row.issue,
			status: row.status
		};

		issues.set(row.restaurant_id, [...(issues.get(row.restaurant_id) ?? []), issue]);
	}

	return issues;
}
