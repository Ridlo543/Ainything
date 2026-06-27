import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { generateApiKeySchema, revokeApiKeySchema } from '$lib/domain/api-key/schema';
import { getApiKeys, generateApiKey, revokeApiKey } from '$lib/server/services/api-key-service';

export const load: PageServerLoad = async ({ locals }) => {
	// Guard is already enforced by (platform) layout server — user is super_admin
	if (!locals.user) error(401, 'Unauthorized');

	const keys = await getApiKeys();

	return { keys };
};

export const actions: Actions = {
	generate: async ({ request, locals }) => {
		if (!locals.user) error(401, 'Unauthorized');

		const formData = await request.formData();
		const raw = {
			name: formData.get('name'),
			expiresAt: formData.get('expiresAt') ?? ''
		};

		const result = generateApiKeySchema.safeParse(raw);
		if (!result.success) {
			return fail(422, {
				action: 'generate' as const,
				errors: result.error.flatten().fieldErrors
			});
		}

		const generated = await generateApiKey(
			result.data.name,
			result.data.expiresAt ?? null,
			locals.user
		);

		// Return the raw key once — it cannot be retrieved again
		return {
			action: 'generate' as const,
			generatedKey: generated.key,
			keyName: generated.row.name
		};
	},

	revoke: async ({ request, locals }) => {
		if (!locals.user) error(401, 'Unauthorized');

		const formData = await request.formData();
		const raw = { id: formData.get('id') };

		const result = revokeApiKeySchema.safeParse(raw);
		if (!result.success) {
			return fail(422, {
				action: 'revoke' as const,
				errors: result.error.flatten().fieldErrors
			});
		}

		await revokeApiKey(result.data.id, locals.user);

		return { action: 'revoke' as const, success: true };
	}
};
