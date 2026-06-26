/**
 * Provisions a new organization + restaurant + membership for a freshly verified user.
 * Called once after email verification when the user has no existing membership.
 *
 * All inserts run inside a single transaction. On conflict (slug already taken),
 * an error is thrown so the caller can surface a slug-taken message to the user.
 */

import { getPool, withTransaction } from '$lib/server/db/postgres';

export type ProvisionInput = {
	/** Internal app_users.id (UUID, not the Supabase auth id) */
	appUserId: string;
	/** Display name of the organization (same as restaurant name for solo owners) */
	organizationName: string;
	/** URL-safe slug for the organization, e.g. "uma-karang" */
	organizationSlug: string;
	/** Display name of the first restaurant */
	restaurantName: string;
	/** URL-safe slug for the restaurant, must be globally unique */
	restaurantSlug: string;
	/** Restaurant segment */
	segment: 'cafe' | 'casual-dining' | 'hotel-restaurant' | 'beach-club' | 'premium';
	/** IANA timezone string */
	timezone: string;
	/** BCP-47 language tag for default menu language */
	defaultLanguageTag: string;
	/** Physical location / city */
	location: string;
};

export type ProvisionResult = {
	organizationId: string;
	restaurantId: string;
	membershipId: string;
};

/**
 * Slugify a display name: lowercase, replace spaces/special chars with hyphens,
 * collapse repeated hyphens, trim leading/trailing hyphens.
 */
export function slugify(name: string): string {
	return name
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 60);
}

/**
 * Check if a restaurant slug is already taken.
 * Returns true if available, false if taken.
 */
export async function isRestaurantSlugAvailable(slug: string): Promise<boolean> {
	const { getPool } = await import('$lib/server/db/postgres');
	const pool = getPool();
	const { rows } = await pool.query<{ exists: boolean }>(
		`SELECT EXISTS (SELECT 1 FROM outlets WHERE slug = $1) AS exists`,
		[slug]
	);
	return !rows[0]?.exists;
}

/**
 * Check if an organization slug is already taken.
 */
export async function isOrganizationSlugAvailable(slug: string): Promise<boolean> {
	const { getPool } = await import('$lib/server/db/postgres');
	const pool = getPool();
	const { rows } = await pool.query<{ exists: boolean }>(
		`SELECT EXISTS (SELECT 1 FROM organizations WHERE slug = $1) AS exists`,
		[slug]
	);
	return !rows[0]?.exists;
}

/**
 * Provision org + restaurant + membership in a single transaction.
 * Throws if any slug is already taken.
 */
export async function provisionOrganizationAndRestaurant(
	input: ProvisionInput
): Promise<ProvisionResult> {
	return withTransaction(async (client) => {
		// 1. Create organization
		const { rows: orgRows } = await client.query<{ id: string }>(
			`INSERT INTO organizations (name, slug, plan, status)
			 VALUES ($1, $2, 'pilot', 'active')
			 RETURNING id::text`,
			[input.organizationName, input.organizationSlug]
		);
		const organizationId = orgRows[0]!.id;

		// 2. Create restaurant
		const { rows: restRows } = await client.query<{ id: string }>(
			`INSERT INTO restaurants (
				organization_id, name, slug, segment, timezone,
				default_language_tag, language_tags, location, status
			 )
			 VALUES ($1, $2, $3, $4, $5, $6, ARRAY[$6]::text[], $7, 'active')
			 RETURNING id::text`,
			[
				organizationId,
				input.restaurantName,
				input.restaurantSlug,
				input.segment,
				input.timezone,
				input.defaultLanguageTag,
				input.location
			]
		);
		const restaurantId = restRows[0]!.id;

		// 3. Create membership (owner role)
		const { rows: memberRows } = await client.query<{ id: string }>(
			`INSERT INTO memberships (user_id, organization_id, role)
			 VALUES ($1::uuid, $2::uuid, 'owner')
			 RETURNING id::text`,
			[input.appUserId, organizationId]
		);
		const membershipId = memberRows[0]!.id;

		// 4. Link membership → restaurant
		await client.query(
			`INSERT INTO membership_restaurants (membership_id, organization_id, restaurant_id)
			 VALUES ($1::uuid, $2::uuid, $3::uuid)`,
			[membershipId, organizationId, restaurantId]
		);

		// 5. Set default_organization_id on the user
		await client.query(
			`UPDATE app_users SET default_organization_id = $1::uuid WHERE id = $2::uuid`,
			[organizationId, input.appUserId]
		);

		return { organizationId, restaurantId, membershipId };
	});
}

/**
 * Create the first draft menu for a newly provisioned restaurant.
 * Called during onboarding Step 3 (or lazily on first menu import).
 * Returns the new menu's id.
 */
export async function createDraftMenu(input: {
	organizationId: string;
	restaurantId: string;
}): Promise<string> {
	const pool = getPool();
	const { rows } = await pool.query<{ id: string }>(
		`INSERT INTO menus (organization_id, restaurant_id, version, status, source_type)
		 VALUES ($1::uuid, $2::uuid, 1, 'draft', 'photo')
		 ON CONFLICT DO NOTHING
		 RETURNING id::text`,
		[input.organizationId, input.restaurantId]
	);
	if (!rows[0]) {
		// Menu already exists, fetch the existing draft id
		const existing = await pool.query<{ id: string }>(
			`SELECT id::text FROM menus WHERE restaurant_id = $1::uuid AND status = 'draft' LIMIT 1`,
			[input.restaurantId]
		);
		if (!existing.rows[0]) throw new Error('Failed to create or find draft menu');
		return existing.rows[0].id;
	}
	return rows[0].id;
}
