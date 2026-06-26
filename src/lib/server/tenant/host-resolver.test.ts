import { describe, expect, it } from 'vitest';
import { hostMatchesRestaurant, resolveRestaurantFromRequest } from './host-resolver';

function makeRequest(host: string | null): Request {
	const headers = new Headers();
	if (host) headers.set('host', host);
	return new Request('http://example.com', { headers });
}

describe('host-resolver', () => {
	describe('resolveRestaurantFromRequest', () => {
		it('returns the path slug when provided (path always wins)', () => {
			const request = makeRequest('uma-karang.ainything.online');
			const result = resolveRestaurantFromRequest(request, { restaurantSlug: 'taman-sate' });
			expect(result.slug).toBe('taman-sate');
			expect(result.source).toBe('path');
		});

		it('extracts the subdomain from a host header when no path slug is present', () => {
			const request = makeRequest('uma-karang.ainything.online');
			const result = resolveRestaurantFromRequest(request, {});
			expect(result.slug).toBe('uma-karang');
			expect(result.source).toBe('host');
		});

		it('strips the port from the host header', () => {
			const request = makeRequest('uma-karang.ainything.online:443');
			const result = resolveRestaurantFromRequest(request, {});
			expect(result.slug).toBe('uma-karang');
			expect(result.source).toBe('host');
		});

		it('returns null for the apex domain (no subdomain)', () => {
			const request = makeRequest('ainything.online');
			const result = resolveRestaurantFromRequest(request, {});
			expect(result.slug).toBeNull();
			expect(result.source).toBeNull();
		});

		it('returns null for localhost (no subdomain)', () => {
			const request = makeRequest('localhost:5173');
			const result = resolveRestaurantFromRequest(request, {});
			expect(result.slug).toBeNull();
		});

		it('returns null for unknown domains', () => {
			const request = makeRequest('attacker.example.com');
			const result = resolveRestaurantFromRequest(request, {});
			expect(result.slug).toBeNull();
		});

		it('returns null when there is no host header', () => {
			const request = makeRequest(null);
			const result = resolveRestaurantFromRequest(request, {});
			expect(result.slug).toBeNull();
		});

		it('handles IPv6 hosts in brackets', () => {
			const request = makeRequest('[::1]:5173');
			const result = resolveRestaurantFromRequest(request, {});
			// IPv6 loopback is not a subdomain, so null is correct
			expect(result.slug).toBeNull();
		});

		it('rejects nested subdomains', () => {
			const request = makeRequest('staging.uma-karang.ainything.online');
			const result = resolveRestaurantFromRequest(request, {});
			expect(result.slug).toBeNull();
		});
	});

	describe('hostMatchesRestaurant', () => {
		it('matches identical hosts', () => {
			expect(
				hostMatchesRestaurant('uma-karang.ainything.online', 'uma-karang.ainything.online')
			).toBe(true);
		});

		it('strips port from the request host before comparing', () => {
			expect(
				hostMatchesRestaurant('uma-karang.ainything.online:443', 'uma-karang.ainything.online')
			).toBe(true);
		});

		it('is case-insensitive', () => {
			expect(
				hostMatchesRestaurant('UMA-KARANG.ainything.online', 'uma-karang.ainything.online')
			).toBe(true);
		});

		it('returns false for different hosts', () => {
			expect(
				hostMatchesRestaurant('taman-sate.ainything.online', 'uma-karang.ainything.online')
			).toBe(false);
		});

		it('returns false when either side is null', () => {
			expect(hostMatchesRestaurant(null, 'uma-karang.ainything.online')).toBe(false);
			expect(hostMatchesRestaurant('uma-karang.ainything.online', null)).toBe(false);
		});

		it('returns false for an empty stored public_host', () => {
			expect(hostMatchesRestaurant('uma-karang.ainything.online', '')).toBe(false);
		});
	});
});
