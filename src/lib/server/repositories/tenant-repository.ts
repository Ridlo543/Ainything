import type { AuthUser, OrgMembership } from '$lib/domain/auth/types';
import type { MenuItem, MenuImportIssue, TenantContext, Membership, Organization } from '$lib/domain/menu/types';
import { query, withUserContext, type DatabaseClient } from '$lib/server/db/postgres';
import { mapRestaurantRow, type RestaurantRow } from '$lib/server/repositories/menu-row-mapper';

function mapMembershipRole(role: Membership['role']): OrgMembership['role'] {
	switch (role) {
		case 'owner':
			return 'org_owner';
		case 'manager':
			return 'outlet_admin';
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


async function loadPublishedCategoriesForTenant(restaurantIds: string[]) {
	// Queries catalog_sections (generalized schema). outletIds == restaurantIds (same UUIDs).
	if (restaurantIds.length === 0) return new Map<string, string[]>();
	const result = await query<{ outlet_id: string; name: string }>(
		`SELECT DISTINCT cs.outlet_id::text, cs.name, cs.sort_order
		 FROM catalog_sections cs
		 JOIN catalogs c ON c.id = cs.catalog_id
		 WHERE cs.outlet_id = ANY($1::uuid[])
		   AND c.status = 'published'
		 ORDER BY cs.outlet_id::text, cs.sort_order, cs.name`,
		[restaurantIds]
	);
	const map = new Map<string, string[]>();
	for (const row of result.rows) {
		map.set(row.outlet_id, [...(map.get(row.outlet_id) ?? []), row.name]);
	}
	return map;
}

async function loadPublishedMenuItemsForTenant(restaurantIds: string[]) {
	// Queries products/catalog_sections/catalogs (generalized schema). outletIds == restaurantIds.
	if (restaurantIds.length === 0) return new Map<string, MenuItem[]>();

	type ProductRow = {
		outlet_id: string;
		category: string;
		id: string;
		name: string;
		local_name: string | null;
		description: string;
		price_amount: number;
		currency: MenuItem['currency'];
		image_url: string;
		is_available: boolean;
		is_featured: boolean;
		confidence: MenuItem['confidence'];
	};

	const result = await query<ProductRow>(
		`SELECT
				p.outlet_id::text,
				cs.name AS category,
				p.id::text,
				p.name,
				p.local_name,
				COALESCE(p.description, '') AS description,
				p.price_amount,
				COALESCE(p.currency, 'IDR') AS currency,
				COALESCE(p.image_url, '') AS image_url,
				p.is_available,
				p.is_featured,
				COALESCE(p.confidence, 'needs-review') AS confidence
		 FROM products p
		 JOIN catalog_sections cs ON cs.id = p.section_id
		 JOIN catalogs c ON c.id = p.catalog_id
		 WHERE p.outlet_id = ANY($1::uuid[])
		   AND c.status = 'published'
		 ORDER BY p.outlet_id::text, p.sort_order, p.name`,
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
			spiceLevel: 0,
			isAvailable: row.is_available,
			isSignature: row.is_featured,
			dietaryFlags: [],
			allergens: [],
			goodFor: [],
			confidence: row.confidence
		};
		items.set(row.outlet_id, [...(items.get(row.outlet_id) ?? []), item]);
	}
	return items;
}

async function loadImportIssuesForTenant(
	_restaurantIds: string[]
): Promise<Map<string, MenuImportIssue[]>> {
	// menu_import_issues was dropped in migration 0024. Return empty map.
	return new Map<string, MenuImportIssue[]>();
}

export async function resolveTenantContextFromDatabase(
	user: AuthUser,
	selectedOutletSlug?: string
): Promise<TenantContext> {
	const { base, restaurants, outletRows } = await withUserContext(user.id, async (client) => {
		const base = await loadMembership(client, user.id, user.memberships[0]?.organizationId ?? '');

		if (!base) {
			throw new Error(`No database membership found for user ${user.id}`);
		}

		const restaurants = await loadRestaurantsForMembership(client, base.membership_id);
		const outletRows = await loadOutletsForMembership(client, base.membership_id);

		if (outletRows.length === 0) {
			throw new Error(`No outlets available for membership ${base.membership_id}`);
		}

		return { base, restaurants, outletRows };
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

	const outlets: Outlet[] = outletRows.map((row) => mapOutletRow(row));
	const outletIds = outlets.map((o) => o.id);

	const activeOutlet =
		outlets.find((o) => o.slug === selectedOutletSlug) ?? outlets[0];

	const activeRestaurant =
		mappedRestaurants.find((r) => r.slug === selectedOutletSlug) ?? mappedRestaurants[0];

	return {
		user: {
			id: base.user_id,
			email: base.email,
			name: base.user_name,
			platformRole: (base.platform_role as AuthUser['platformRole']) ?? 'staff',
			memberships: [
				{
					organizationId: base.organization_id,
					outletIds,
					role: mapMembershipRole(base.role)
				}
			]
		},
		membership: {
			id: base.membership_id,
			userId: base.user_id,
			organizationId: base.organization_id,
			restaurantIds: outletIds,
			role: base.role
		},
		organization: {
			id: base.organization_id,
			name: base.organization_name,
			slug: base.organization_slug,
			workspaceHost: base.workspace_host,
			plan: base.plan,
			restaurantIds: outletIds
		},
		restaurants: mappedRestaurants,
		activeRestaurant,
		outlets,
		activeOutlet
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
	// Query outlets via membership_outlets (generalized schema from migration 0025).
	// Returns OutletRow aliased to RestaurantRow shape for backward compatibility.
	const result = await client.query<RestaurantRow>(
		`
			SELECT
				o.id::text,
				o.organization_id::text,
				o.name,
				o.slug,
				COALESCE(o.public_host, '') AS public_host,
				COALESCE(o.location, '') AS location,
				COALESCE(o.business_type, 'other') AS segment,
				COALESCE(o.language_tags, ARRAY['id']) AS language_tags,
				COALESCE(o.hero_image_url, '') AS hero_image_url,
				COALESCE(o.catalog_scan_url, '') AS menu_scan_url,
				COALESCE(o.table_count, 0) AS table_count,
				COALESCE(o.catalog_source_type, 'photo') AS menu_source_type,
				COALESCE(o.description, '') AS description,
				COALESCE(o.knowledge_highlights, ARRAY[]::text[]) AS knowledge_highlights,
				COALESCE(o.analytics, '{}'::jsonb) AS analytics
			FROM membership_outlets mo
			JOIN outlets o ON o.id = mo.outlet_id
			WHERE mo.membership_id = $1::uuid
				AND o.status = 'active'
			ORDER BY o.name ASC
		`,
		[membershipId]
	);

	return result.rows;
}

// ---------------------------------------------------------------------------
// Outlet-based tenant resolution (new generalized schema from migration 0022)
// ---------------------------------------------------------------------------

import type { Outlet } from '$lib/domain/outlet/types';
import { mapOutletRow, type OutletRow } from '$lib/server/repositories/outlet-row-mapper';

async function loadOutletsForMembership(
	client: DatabaseClient,
	membershipId: string
): Promise<OutletRow[]> {
	const result = await client.query<OutletRow>(
		`
			SELECT
				o.id::text,
				o.organization_id::text,
				o.name,
				o.slug,
				COALESCE(o.public_host, '') AS public_host,
				COALESCE(o.location, '') AS location,
				o.business_type,
				o.status,
				COALESCE(o.language_tags, ARRAY['id']) AS language_tags,
				COALESCE(o.default_language_tag, 'id') AS default_language_tag,
				COALESCE(o.timezone, 'Asia/Jakarta') AS timezone,
				COALESCE(o.hero_image_url, '') AS hero_image_url,
				COALESCE(o.table_count, 0) AS table_count,
				COALESCE(o.description, '') AS description,
				COALESCE(o.knowledge_highlights, ARRAY[]::text[]) AS knowledge_highlights,
				COALESCE(o.analytics, '{}'::jsonb) AS analytics
			FROM membership_outlets mo
			JOIN outlets o ON o.id = mo.outlet_id
			WHERE mo.membership_id = $1::uuid
			  AND o.status = 'active'
			ORDER BY o.name ASC
		`,
		[membershipId]
	);
	return result.rows;
}

/**
 * Resolve outlet-based tenant context. Returns null if no outlets are found
 * (caller should fall back to the legacy restaurant-based path).
 */
export async function resolveOutletTenantContext(
	user: AuthUser,
	selectedOutletSlug?: string
): Promise<{
	user: AuthUser;
	membership: { id: string; userId: string; organizationId: string; outletIds: string[]; role: 'owner' | 'manager' | 'staff' };
	organization: { id: string; name: string; slug: string; workspaceHost: string; plan: Organization['plan']; outletIds: string[] };
	outlets: Outlet[];
	activeOutlet: Outlet;
} | null> {
	const { base, outletRows } = await withUserContext(user.id, async (client) => {
		const base = await loadMembership(client, user.id, user.memberships[0]?.organizationId ?? '');
		if (!base) throw new Error(`No database membership found for user ${user.id}`);
		const outletRows = await loadOutletsForMembership(client, base.membership_id);
		return { base, outletRows };
	});

	if (outletRows.length === 0) return null;

	const outlets: Outlet[] = outletRows.map((row) => mapOutletRow(row));
	const outletIds = outlets.map((o) => o.id);

	const activeOutlet =
		outlets.find((o) => o.slug === selectedOutletSlug) ?? outlets[0];

	return {
		user: {
			id: base.user_id,
			email: base.email,
			name: base.user_name,
			platformRole: (base.platform_role as AuthUser['platformRole']) ?? 'staff',
			memberships: [
				{
					organizationId: base.organization_id,
					outletIds, // outletIds maps to OrgMembership.outletIds
					role: mapMembershipRole(base.role)
				}
			]
		},
		membership: {
			id: base.membership_id,
			userId: base.user_id,
			organizationId: base.organization_id,
			outletIds,
			role: base.role
		},
		organization: {
			id: base.organization_id,
			name: base.organization_name,
			slug: base.organization_slug,
			workspaceHost: base.workspace_host,
			plan: base.plan,
			outletIds
		},
		outlets,
		activeOutlet
	};
}
