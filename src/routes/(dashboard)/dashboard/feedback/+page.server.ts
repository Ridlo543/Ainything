import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { z } from 'zod';
import { getPool } from '$lib/server/db/postgres';
import { appEnv } from '$lib/server/config/env';

const pilotFeedbackSchema = z.object({
	overallRating: z
		.string()
		.transform(Number)
		.pipe(z.number().int().min(1).max(5, 'Rating must be 1–5')),
	aiAccuracy: z.enum(['excellent', 'good', 'acceptable', 'poor']).optional(),
	setupDifficulty: z
		.enum(['very-easy', 'easy', 'neutral', 'hard', 'very-hard'])
		.optional(),
	wоuldRecommend: z
		.string()
		.optional()
		.transform((v) => (v === undefined ? null : v === 'yes')),
	comment: z.string().max(2000).optional()
});

export const load: PageServerLoad = async ({ parent }) => {
	const { tenant } = await parent();

	// Check if org already submitted feedback in this phase
	let alreadySubmitted = false;
	if (appEnv.databaseUrl) {
		try {
			const pool = getPool();
			const res = await pool.query(
				`SELECT id FROM pilot_feedback
				 WHERE organization_id = $1 AND phase = 'alpha'
				 LIMIT 1`,
				[tenant.organization.id]
			);
			alreadySubmitted = res.rowCount !== null && res.rowCount > 0;
		} catch {
			// fail-open: show form even if check fails
		}
	}

	return { tenant, alreadySubmitted };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Not authenticated' });
		}

		const formData = await request.formData();
		const raw = {
			overallRating: formData.get('overallRating') as string,
			aiAccuracy: (formData.get('aiAccuracy') as string) || undefined,
			setupDifficulty: (formData.get('setupDifficulty') as string) || undefined,
			wоuldRecommend: (formData.get('wouldRecommend') as string) || undefined,
			comment: (formData.get('comment') as string) || undefined
		};

		const result = pilotFeedbackSchema.safeParse(raw);
		if (!result.success) {
			return fail(422, { error: result.error.issues[0]?.message ?? 'Invalid input' });
		}

		const organizationId = formData.get('organizationId') as string;
		if (!organizationId) {
			return fail(400, { error: 'Missing organization context' });
		}

		if (!appEnv.databaseUrl) {
			// Mock mode: just redirect
			redirect(303, '/dashboard/feedback?submitted=1');
		}

		try {
			const pool = getPool();
			const user = locals.user;

			// Find app_users.id from external_auth_id
			const userRes = await pool.query(
				'SELECT id FROM app_users WHERE external_auth_id = $1 LIMIT 1',
				[user.id]
			);
			const appUserId = userRes.rows[0]?.id;
			if (!appUserId) {
				return fail(400, { error: 'User record not found' });
			}

			await pool.query(
				`INSERT INTO pilot_feedback
					(organization_id, submitted_by_user_id, overall_rating, ai_accuracy, setup_difficulty, would_recommend, comment, phase)
				VALUES ($1, $2, $3, $4, $5, $6, $7, 'alpha')
				ON CONFLICT DO NOTHING`,
				[
					organizationId,
					appUserId,
					result.data.overallRating,
					result.data.aiAccuracy ?? null,
					result.data.setupDifficulty ?? null,
					result.data.wоuldRecommend ?? null,
					result.data.comment ?? null
				]
			);
		} catch (err) {
			console.error('[pilot-feedback] insert error:', err);
			return fail(500, { error: 'Failed to save feedback. Please try again.' });
		}

		redirect(303, '/dashboard/feedback?submitted=1');
	}
};
