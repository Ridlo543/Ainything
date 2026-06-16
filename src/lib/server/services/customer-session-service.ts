import type { PublicMenuBootstrap } from '$lib/domain/menu/types';
import {
	createSessionInputSchema,
	type CustomerSessionPreferences
} from '$lib/domain/session/schema';
import { createCustomerSession } from '$lib/server/repositories/public-menu-repository';

export type CreateCustomerSessionResult = {
	sessionId: string;
	languageTag: string;
	preferences: CustomerSessionPreferences;
};

/**
 * Creates an anonymous customer session for a QR table.
 *
 * Tenant scope (organization/restaurant/table) is taken exclusively from the
 * server-resolved `bootstrap`; only language and dietary preferences come from the
 * untrusted request body, and those are validated here before persistence. Routes must
 * call this service rather than the repository directly so this rule lives in one place.
 */
export async function createCustomerSessionForTable(
	bootstrap: PublicMenuBootstrap,
	rawInput: unknown
): Promise<CreateCustomerSessionResult> {
	const input = createSessionInputSchema.parse(rawInput);

	const preferences: CustomerSessionPreferences = {
		dietaryPreferences: input.dietaryPreferences,
		...(input.allergenNotes ? { allergenNotes: input.allergenNotes } : {})
	};

	const created = await createCustomerSession({
		organizationId: bootstrap.table.organizationId,
		restaurantId: bootstrap.table.restaurantId,
		tableId: bootstrap.table.id,
		languageTag: input.languageTag,
		preferences
	});

	return {
		sessionId: created.id,
		languageTag: input.languageTag,
		preferences
	};
}
