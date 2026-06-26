import type { AuthUser } from '$lib/domain/auth/types';
import type { TenantContext } from '$lib/domain/menu/types';
import type { Outlet } from '$lib/domain/outlet/types';
import { resolveTenantContextFromDatabase } from '$lib/server/repositories/tenant-repository';

export async function resolveTenantContext(
	user: AuthUser,
	selectedOutletSlug?: string
): Promise<TenantContext> {
	return resolveTenantContextFromDatabase(user, selectedOutletSlug);
}

// Alias kept for callers that use the longer name
export { resolveTenantContext as resolveTenantContextForUser };

/**
 * Builds a minimal TenantContext from an AuthUser without a DB call.
 * Used in unit tests only — not called in production code paths.
 */
export function resolveMockTenantContext(
	user: AuthUser,
	selectedOutletSlug?: string
): TenantContext {
	const primaryMembership = user.memberships[0];
	if (!primaryMembership) {
		throw new Error(`No memberships found for user ${user.id}`);
	}

	const mockOrg = {
		id: primaryMembership.organizationId,
		name: 'Test Organization',
		slug: primaryMembership.organizationId,
		workspaceHost: '',
		plan: 'pilot' as const,
		outletIds: primaryMembership.outletIds,
		restaurantIds: primaryMembership.outletIds
	};

	const mockMembership = {
		id: `${user.id}-${primaryMembership.organizationId}`,
		userId: user.id,
		organizationId: primaryMembership.organizationId,
		role: primaryMembership.role,
		outletIds: primaryMembership.outletIds,
		restaurantIds: primaryMembership.outletIds
	};

	const mockOutlets: Outlet[] = primaryMembership.outletIds.map((id, i) => ({
		id,
		organizationId: primaryMembership.organizationId,
		name: `Test Outlet ${i + 1}`,
		slug: id,
		publicHost: '',
		location: '',
		businessType: 'restaurant' as const,
		status: 'active' as const,
		languages: ['id' as const],
		timezone: 'Asia/Makassar',
		defaultLanguageTag: 'id' as const,
		heroImage: '',
		tableCount: 0,
		description: '',
		knowledgeHighlights: [],
		analytics: {
			scansToday: 0,
			helpfulRate: 0,
			fallbackRate: 0,
			topQuestion: '',
			topItem: ''
		},
		checkoutSettings: {
			checkoutMode: 'offline',
			requireBuyerWhatsapp: false,
			paymentConfirmationEnabled: false
		}
	}));

	const activeOutlet =
		mockOutlets.find((o) => o.slug === selectedOutletSlug) ?? mockOutlets[0];

	if (!activeOutlet) {
		throw new Error(`No outlets available for user ${user.id}`);
	}

	return {
		user,
		membership: mockMembership as never,
		organization: mockOrg as never,
		restaurants: mockOutlets as never,
		activeRestaurant: activeOutlet as never,
		outlets: mockOutlets,
		activeOutlet
	};
}
