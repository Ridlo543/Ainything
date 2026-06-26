import type { PublicMenuBootstrap } from '$lib/domain/menu/types';
import type { Outlet, PublicCatalogBootstrap } from '$lib/domain/outlet/types';
import { resolvePublicMenuBootstrap } from '$lib/server/repositories/public-menu-repository';
import {
	resolvePublicCatalogBootstrap,
	loadPublicOutletBySlug
} from '$lib/server/repositories/public-catalog-repository';

/**
 * Resolves a published outlet by slug — used by cart and order routes
 * that need only the outlet identity (id, organizationId) to create orders.
 *
 * Returns an Outlet or null if the slug is not found or the outlet is inactive.
 */
export async function resolvePublicCatalog(outletSlug: string): Promise<Outlet | null> {
	return loadPublicOutletBySlug(outletSlug);
}

/**
 * Resolves the public QR bootstrap using the outlets/catalog schema.
 * Returns `PublicCatalogBootstrap` (outlet + table + sections + products).
 */
export async function resolvePublicCatalogMenu(
	outletSlug: string,
	tableCode: string
): Promise<PublicCatalogBootstrap | null> {
	return resolvePublicCatalogBootstrap(outletSlug, tableCode);
}

/**
 * @deprecated Use resolvePublicCatalogMenu instead.
 */
export async function resolvePublicMenu(
	outletSlug: string,
	tableCode: string
): Promise<PublicMenuBootstrap | null> {
	return resolvePublicMenuBootstrap(outletSlug, tableCode);
}
