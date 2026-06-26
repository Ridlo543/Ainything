import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { applyRateLimit } from '$lib/server/services/public-api-helpers';

const bodySchema = z.object({
	email: z.string().email('A valid email address is required.').max(320)
});

export const POST: RequestHandler = async ({ request }) => {
	// Rate-limit: 5 requests per 5 min per IP to slow enumeration attacks
	await applyRateLimit('password-reset', request);

	let raw: unknown;
	try {
		raw = await request.json();
	} catch {
		return json({ message: 'Invalid JSON body.' }, { status: 400 });
	}

	const parsed = bodySchema.safeParse(raw);
	if (!parsed.success) {
		return json({ message: parsed.error.issues[0]?.message ?? 'Invalid input.' }, { status: 400 });
	}

	// NOTE: This is a stub kept for API backward compat.
	// The form-based flow is at /auth/forgot-password.
	// TODO: trigger SMTP reset email when email provider is configured.
	return json({
		message: 'If an account with that email exists, a password reset link has been sent.'
	});
};
