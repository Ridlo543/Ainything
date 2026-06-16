import type { AppUser, Membership, Organization, TenantContext } from '$lib/domain/menu/types';
import { withUserContext, type DatabaseClient } from '$lib/server/db/postgres';
import {
	loadImportIssues,
	loadPublishedCategories,
	loadPublishedMenuItems,
	mapRestaurantRow,
	type RestaurantRow
} from '$lib/server/repositories/menu-row-mapper';

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
		const categoriesByRestaurant = await loadPublishedCategories(client, restaurantIds);
		const itemsByRestaurant = await loadPublishedMenuItems(client, restaurantIds);
		const issuesByRestaurant = await loadImportIssues(client, restaurantIds);

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
