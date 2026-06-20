/**
 * Service layer for admin/manager knowledge-document CRUD.
 *
 * Mirrors the pattern in `menu-admin-service.ts`:
 *  - Every write runs inside `withUserContext` so the 0009 RLS policies
 *    evaluate against the authenticated membership.
 *  - Tenant scope (organizationId, restaurantId) is ALWAYS derived from the
 *    server-side `TenantContext` — never from the request body. The body
 *    carries a `restaurant` slug only to pick the active scope, which is
 *    re-validated against the membership.
 *  - Zod input validation happens in the form action layer; the service
 *    receives typed input.
 */

import type { AppUser } from '$lib/domain/menu/types';
import type { KnowledgeDoc } from '$lib/domain/knowledge/types';
import type {
	CreateKnowledgeDocInput,
	DeleteKnowledgeDocInput,
	UpdateKnowledgeDocInput
} from '$lib/domain/knowledge/schema';
import { withUserContext } from '$lib/server/db/postgres';
import { resolveTenantContext } from '$lib/server/tenant/tenant-context';
import {
	deleteKnowledgeDoc as repoDeleteKnowledgeDoc,
	findKnowledgeDocById,
	insertKnowledgeDoc as repoInsertKnowledgeDoc,
	listKnowledgeDocsForRestaurant as repoListKnowledgeDocsForRestaurant,
	updateKnowledgeDoc as repoUpdateKnowledgeDoc
} from '$lib/server/repositories/knowledge-repository';

// ---------------------------------------------------------------------------
// Custom error types
// ---------------------------------------------------------------------------

export class KnowledgeNotFoundError extends Error {
	constructor() {
		super('Knowledge document not found or access denied.');
		this.name = 'KnowledgeNotFoundError';
	}
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/**
 * Lists all knowledge documents for the active restaurant. Tenant scope is
 * resolved server-side from the authenticated user's membership.
 *
 * No `withUserContext` is needed for the read — the RLS SELECT policy from
 * migration 0001 already restricts `lingua_app` to rows where
 * `app.has_restaurant_access(restaurant_id)`. The bare pool connection is
 * enough.
 */
export async function listDocs(
	user: AppUser,
	{ restaurantSlug }: { restaurantSlug: string }
): Promise<KnowledgeDoc[]> {
	const tenant = await resolveTenantContext(user, restaurantSlug);
	const { activeRestaurant } = tenant;

	return repoListKnowledgeDocsForRestaurant(activeRestaurant.id);
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * Creates a new knowledge document for the active restaurant. Runs inside
 * `withUserContext` so the 0009 INSERT policy allows the write.
 */
export async function createDoc(
	user: AppUser,
	{ restaurantSlug, input }: { restaurantSlug: string; input: CreateKnowledgeDocInput }
): Promise<KnowledgeDoc> {
	const tenant = await resolveTenantContext(user, restaurantSlug);
	const { activeRestaurant } = tenant;

	return withUserContext(user.id, async (client) =>
		repoInsertKnowledgeDoc(client, {
			organizationId: activeRestaurant.organizationId,
			restaurantId: activeRestaurant.id,
			title: input.title,
			content: input.content,
			visibility: input.visibility,
			sourceType: 'manual'
		})
	);
}

/**
 * Updates an existing knowledge document. Throws `KnowledgeNotFoundError`
 * when the document does not exist or the RLS policy denies access — both
 * cases are indistinguishable to the caller (which is the secure default).
 */
export async function updateDoc(
	user: AppUser,
	{ restaurantSlug, input }: { restaurantSlug: string; input: UpdateKnowledgeDocInput }
): Promise<KnowledgeDoc> {
	const tenant = await resolveTenantContext(user, restaurantSlug);
	const { activeRestaurant } = tenant;

	const updated = await withUserContext(user.id, async (client) =>
		repoUpdateKnowledgeDoc(client, {
			organizationId: activeRestaurant.organizationId,
			restaurantId: activeRestaurant.id,
			docId: input.docId,
			title: input.title,
			content: input.content,
			visibility: input.visibility
		})
	);

	if (!updated) {
		throw new KnowledgeNotFoundError();
	}
	return updated;
}

/**
 * Deletes an existing knowledge document. Throws `KnowledgeNotFoundError`
 * when no row was deleted (does not exist or RLS denied).
 */
export async function deleteDoc(
	user: AppUser,
	{ restaurantSlug, input }: { restaurantSlug: string; input: DeleteKnowledgeDocInput }
): Promise<void> {
	const tenant = await resolveTenantContext(user, restaurantSlug);
	const { activeRestaurant } = tenant;

	const deleted = await withUserContext(user.id, async (client) =>
		repoDeleteKnowledgeDoc(client, {
			organizationId: activeRestaurant.organizationId,
			restaurantId: activeRestaurant.id,
			docId: input.docId
		})
	);

	if (!deleted) {
		throw new KnowledgeNotFoundError();
	}
}

/**
 * Internal helper used by tests to assert RLS visibility — fetches a single
 * document by id. The form actions should prefer `listDocs` + filtering
 * client-side because the dashboard renders a flat list per restaurant.
 */
export async function findDoc(
	user: AppUser,
	{ restaurantSlug, docId }: { restaurantSlug: string; docId: string }
): Promise<KnowledgeDoc | null> {
	const tenant = await resolveTenantContext(user, restaurantSlug);
	const { activeRestaurant } = tenant;

	return withUserContext(user.id, async (client) =>
		findKnowledgeDocById(client, {
			organizationId: activeRestaurant.organizationId,
			restaurantId: activeRestaurant.id,
			docId
		})
	);
}
