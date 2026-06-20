import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	createKnowledgeDocInputSchema,
	updateKnowledgeDocInputSchema,
	deleteKnowledgeDocInputSchema
} from '$lib/domain/knowledge/schema';
import {
	createDoc,
	deleteDoc,
	KnowledgeNotFoundError,
	listDocs,
	updateDoc
} from '$lib/server/services/knowledge-service';
import { appEnv } from '$lib/server/config/env';

/**
 * Server load for the dashboard knowledge (Restaurant Facts) page.
 *
 * Loads real knowledge documents for the active restaurant from PostgreSQL.
 * When the DB is unavailable (USE_MOCK_BACKEND=true or DATABASE_URL unset),
 * the load function fails open with an empty list and `useMockData=true` so
 * the UI can render an explanatory empty state instead of crashing.
 */
export const load: PageServerLoad = async ({ parent }) => {
	const { tenant } = await parent();

	let docs: import('$lib/domain/knowledge/types').KnowledgeDoc[] = [];
	let useMockData = false;

	if (appEnv.databaseUrl && !appEnv.useMockBackend) {
		try {
			docs = await listDocs(tenant.user, {
				restaurantSlug: tenant.activeRestaurant.slug
			});
		} catch (err) {
			console.warn('[knowledge] Could not load docs from DB:', err);
			docs = [];
			useMockData = true;
		}
	} else {
		useMockData = true;
	}

	return { tenant, docs, useMockData };
};

/**
 * Parse common form fields once. All three actions share the same field-extraction
 * shape (restaurant + uuid) so this helper keeps the actions tight.
 */
function readString(form: FormData, name: string): string {
	return String(form.get(name) ?? '');
}

export const actions: Actions = {
	/**
	 * Add a new knowledge note. Progressive enhancement works (form posts
	 * without JS), `use:enhance` adds optimistic updates.
	 */
	addNote: async ({ locals, request }) => {
		if (!locals.user) {
			return fail(401, { message: 'Authentication required.' });
		}

		const formData = await request.formData();
		const raw = {
			restaurant: readString(formData, 'restaurant'),
			title: readString(formData, 'title'),
			content: readString(formData, 'content'),
			visibility: readString(formData, 'visibility') || 'published'
		};

		const parsed = createKnowledgeDocInputSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(422, {
				validation: parsed.error.flatten().fieldErrors,
				message: 'Please fix the highlighted fields.'
			});
		}

		try {
			await createDoc(locals.user, {
				restaurantSlug: raw.restaurant,
				input: parsed.data
			});
		} catch (err) {
			if (err instanceof Error) {
				return fail(500, { message: err.message });
			}
			return fail(500, { message: 'An unexpected error occurred.' });
		}

		return { success: true, action: 'add' as const };
	},

	/**
	 * Update an existing knowledge note. The docId is required and validated
	 * as a UUID at the schema layer.
	 */
	updateNote: async ({ locals, request }) => {
		if (!locals.user) {
			return fail(401, { message: 'Authentication required.' });
		}

		const formData = await request.formData();
		const raw = {
			restaurant: readString(formData, 'restaurant'),
			docId: readString(formData, 'docId'),
			title: readString(formData, 'title'),
			content: readString(formData, 'content'),
			visibility: readString(formData, 'visibility')
		};

		const parsed = updateKnowledgeDocInputSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(422, {
				validation: parsed.error.flatten().fieldErrors,
				message: 'Please fix the highlighted fields.'
			});
		}

		try {
			await updateDoc(locals.user, {
				restaurantSlug: raw.restaurant,
				input: parsed.data
			});
		} catch (err) {
			if (err instanceof KnowledgeNotFoundError) {
				return fail(404, { message: err.message });
			}
			if (err instanceof Error) {
				return fail(500, { message: err.message });
			}
			return fail(500, { message: 'An unexpected error occurred.' });
		}

		return { success: true, action: 'update' as const };
	},

	/**
	 * Delete a knowledge note. The docId is the only required field.
	 */
	deleteNote: async ({ locals, request }) => {
		if (!locals.user) {
			return fail(401, { message: 'Authentication required.' });
		}

		const formData = await request.formData();
		const raw = {
			restaurant: readString(formData, 'restaurant'),
			docId: readString(formData, 'docId')
		};

		const parsed = deleteKnowledgeDocInputSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(422, { message: 'Invalid delete request.' });
		}

		try {
			await deleteDoc(locals.user, {
				restaurantSlug: raw.restaurant,
				input: parsed.data
			});
		} catch (err) {
			if (err instanceof KnowledgeNotFoundError) {
				return fail(404, { message: err.message });
			}
			if (err instanceof Error) {
				return fail(500, { message: err.message });
			}
			return fail(500, { message: 'An unexpected error occurred.' });
		}

		return { success: true, action: 'delete' as const };
	}
};
