/**
 * Public host → restaurant resolver.
 *
 * Supports two URL strategies for MVP:
 *   1. Path-based:  /r/<slug>/table/<code>     (default in dev/test)
 *   2. Host-based:  <slug>.linguaserve.app/table/<code>   (production)
 *
 * Strategy 1 is the source of truth: we always read the slug from the path.
 * Strategy 2 is a validation layer: when a guest arrives via a custom host
 * (or subdomain), the host must match a known restaurant's `public_host` column.
 * If the host doesn't match any known restaurant, the request is rejected with
 * 404 — this prevents an attacker from impersonating a restaurant by spoofing
 * a different host header.
 *
 * Usage:
 *   const { slug, source } = resolveRestaurantFromRequest(request, params);
 *   // slug: the restaurant slug to use; source: 'path' | 'host' | null
 */

const DEFAULT_DOMAIN = 'linguaserve.app';

export type ResolvedRestaurant = {
	slug: string | null;
	source: 'path' | 'host' | null;
};

/**
 * Strips the port from a Host header. `uma-karang.linguaserve.app:443` → `uma-karang.linguaserve.app`.
 * IPv6 hosts in brackets are preserved: `[::1]:5173` → `[::1]`.
 */
function stripPort(host: string): string {
	if (host.startsWith('[')) {
		// IPv6 host — find closing bracket
		const end = host.indexOf(']');
		if (end !== -1) return host.slice(0, end + 1);
		return host;
	}
	const colon = host.indexOf(':');
	return colon === -1 ? host : host.slice(0, colon);
}

/**
 * Extracts a possible subdomain slug from a host. For example:
 *   uma-karang.linguaserve.app → 'uma-karang'
 *   linguaserve.app            → null  (apex domain)
 *   localhost                  → null
 *
 * The base domain is configurable to support different deployment targets
 * (linguaserve.app, linguaserve-staging.app, etc.).
 */
function extractSubdomain(host: string, baseDomain: string): string | null {
	if (host === baseDomain) return null;

	const suffix = `.${baseDomain}`;
	if (!host.endsWith(suffix)) return null;

	const prefix = host.slice(0, -suffix.length);
	if (prefix.length === 0 || prefix.includes('.')) {
		// Nested subdomains (e.g. staging.uma-karang.linguaserve.app) are
		// not supported in MVP — treat as null.
		return null;
	}

	return prefix;
}

/**
 * Resolves the restaurant slug from a guest request.
 *
 * Priority:
 *   1. Path param `restaurantSlug` if present (path-based URL — always wins).
 *   2. Host header → extract subdomain.
 *   3. Return null with source='host' so the caller can distinguish "no slug
 *      found" from "ambiguous / cross-tenant impersonation attempt".
 *
 * Note: this function only extracts the slug — the caller is responsible
 * for verifying the slug exists in the database via `resolvePublicMenu`.
 */
export function resolveRestaurantFromRequest(
	request: Request,
	pathParams: { restaurantSlug?: string }
): ResolvedRestaurant {
	// Path-based always wins.
	if (pathParams.restaurantSlug) {
		return { slug: pathParams.restaurantSlug, source: 'path' };
	}

	const hostHeader = request.headers.get('host')?.toLowerCase();
	if (!hostHeader) {
		return { slug: null, source: null };
	}

	const host = stripPort(hostHeader);
	const subdomain = extractSubdomain(host, DEFAULT_DOMAIN);

	return { slug: subdomain, source: subdomain ? 'host' : null };
}

/**
 * Validates that a host header matches a restaurant's `public_host` column.
 * Used by routes that arrive on a custom host (no path slug) to confirm
 * the request is targeting the right tenant.
 *
 * Returns true when the full host (without port) matches the stored
 * `public_host` value. Comparison is case-insensitive.
 */
export function hostMatchesRestaurant(
	requestHost: string | null,
	storedPublicHost: string | null
): boolean {
	if (!requestHost || !storedPublicHost) return false;
	return stripPort(requestHost.toLowerCase()) === storedPublicHost.toLowerCase();
}
