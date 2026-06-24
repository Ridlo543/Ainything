import type { AuthUser, OrgMembership } from '$lib/domain/auth/types';
import type { Allergen, DietaryFlag, MenuItem, MenuSourceType, TenantContext } from '$lib/domain/menu/types';
import type { MenuImportIssue } from '$lib/domain/menu/types';
import type { Membership, Organization } from '$lib/domain/menu/types';
import { query, withUserContext, type DatabaseClient } from '$lib/server/db/postgres';
import {
	mapRestaurantRow,
	type RestaurantRow
} from '$lib/server/repositories/menu-row-mapper';

function mapMembershipRole(role: Membership['role']): OrgMembership['role'] {
	switch (role) {
		case 'owner':
			return 'org_owner';
		case 'manager':
			return 'restaurant_admin';
		case 'staff':
			return 'staff';
	}
}

type OrganizationRow = {
	user_id: string;
	email: string;
	user_name: string;
	platform_role: string;
	default_organization_id: string;
	membership_id: string;
	role: Membership['role'];
	organization_id: string;
	organization_name: string;
	organization_slug: string;
	workspace_host: string;
	plan: Organization['plan'];
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
	good_for: string[];
	dietary_flags: string[];
	allergens: string[];
};

type ImportIssueRow = {
	id: string;
	restaurant_id: string;
	source_type: string;
	label: string;
	confidence: string;
	issue: string;
	status: MenuImportIssue['status'];
};

async function loadPublishedCategoriesForTenant(restaurantIds: string[]) {
	if (restaurantIds.length === 0) return new Map<string, string[]>();
	const result = await query<{ restaurant_id: string; name: string }>(
		`SELECT DISTINCT mc.restaurant_id::text, mc.name, mc.sort_order
		 FROM menu_categories mc
		 JOIN menus m ON m.id = mc.menu_id
		 WHERE mc.restaurant_id = ANY($1::uuid[])
		   AND m.status = 'published'
		 ORDER BY mc.restaurant_id::text, mc.sort_order, mc.name`,
		[restaurantIds]
	);
	const map = new Map<string, string[]>();
	for (const row of result.rows) {
		map.set(row.restaurant_id, [...(map.get(row.restaurant_id) ?? []), row.name]);
	}
	return map;
}

async function loadPublishedMenuItemsForTenant(restaurantIds: string[]) {
	if (restaurantIds.length === 0) return new Map<string, MenuItem[]>();
	const result = await query<MenuItemRow>(
		`SELECT mi.id::text, mi.restaurant_id::text, mc.name AS category,
				mi.name, mi.local_name, mi.description,
				mi.price_amount, mi.currency, mi.image_url,
				mi.spice_level, mi.is_available, mi.is_signature,
				mi.confidence,
				COALESCE(mi.source_metadata->'goodFor', '[]'::jsonb) AS good_for,
				COALESCE(ARRAY_AGG(DISTINCT midf.flag_code) FILTER (WHERE midf.flag_code IS NOT NULL), ARRAY[]::text[]) AS dietary_flags,
				COALESCE(ARRAY_AGG(DISTINCT mia.allergen_code) FILTER (WHERE mia.allergen_code IS NOT NULL), ARRAY[]::text[]) AS allergens
		 FROM menu_items mi
		 JOIN menus m ON m.id = mi.menu_id
		 JOIN menu_categories mc ON mc.id = mi.category_id
		 LEFT JOIN menu_item_dietary_flags midf ON midf.menu_item_id = mi.id
		 LEFT JOIN menu_item_allergens mia ON mia.menu_item_id = mi.id
		 WHERE mi.restaurant_id = ANY($1::uuid[])
		   AND m.status = 'published'
		 GROUP BY mi.id, mc.name
		 ORDER BY mi.restaurant_id::text, mi.sort_order, mi.name`,
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
			dietaryFlags: row.dietary_flags as DietaryFlag[],
			allergens: row.allergens as Allergen[],
			goodFor: row.good_for,
			confidence: row.confidence
		};
		items.set(row.restaurant_id, [...(items.get(row.restaurant_id) ?? []), item]);
	}
	return items;
}

async function loadImportIssuesForTenant(restaurantIds: string[]) {
	if (restaurantIds.length === 0) return new Map<string, MenuImportIssue[]>();
	const result = await query<ImportIssueRow>(
		`SELECT id::text, restaurant_id::text, source_type, label,
				confidence::text, issue, status
		 FROM menu_import_issues
		 WHERE restaurant_id = ANY($1::uuid[])
		 ORDER BY created_at DESC`,
		[restaurantIds]
	);
	const issues = new Map<string, MenuImportIssue[]>();
	for (const row of result.rows) {
		const issue: MenuImportIssue = {
			id: row.id,
			sourceType: row.source_type as MenuSourceType,
			label: row.label,
			confidence: Number(row.confidence),
			issue: row.issue,
			status: row.status
		};
		issues.set(row.restaurant_id, [...(issues.get(row.restaurant_id) ?? []), issue]);
	}
	return issues;
}

export async function resolveTenantContextFromDatabase(
	user: AuthUser,
	selectedRestaurantSlug?: string
): Promise<TenantContext> {
	const { base, restaurants } = await withUserContext(user.id, async (client) => {
		const base = await loadMembership(client, user.id, user.memberships[0]?.organizationId ?? '');

		if (!base) {
			throw new Error(`No database membership found for user ${user.id}`);
		}

		const restaurants = await loadRestaurantsForMembership(client, base.membership_id);

		if (restaurants.length === 0) {
			throw new Error(`No restaurants available for membership ${base.membership_id}`);
		}

		return { base, restaurants };
	});

	const restaurantIds = restaurants.map((restaurant) => restaurant.id);
	const [categoriesByRestaurant, itemsByRestaurant, issuesByRestaurant] = await Promise.all([
		loadPublishedCategoriesForTenant(restaurantIds),
		loadPublishedMenuItemsForTenant(restaurantIds),
		loadImportIssuesForTenant(restaurantIds)
	]);

	const mappedRestaurants = restaurants.map((restaurant) =>
		mapRestaurantRow(
			restaurant,
			categoriesByRestaurant.get(restaurant.id) ?? [],
			itemsByRestaurant.get(restaurant.id) ?? [],
			issuesByRestaurant.get(restaurant.id) ?? []
		)
	);

	const activeRestaurant =
		mappedRestaurants.find((restaurant) => restaurant.slug === selectedRestaurantSlug) ??
		mappedRestaurants[0];

	return {
		user: {
			id: base.user_id,
			email: base.email,
			name: base.user_name,
			platformRole: (base.platform_role as AuthUser['platformRole']) ?? 'staff',
			memberships: [
				{
					organizationId: base.organization_id,
					restaurantIds,
					role: mapMembershipRole(base.role)
				}
			]
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
				COALESCE(u.platform_role, 'staff') AS platform_role,
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
