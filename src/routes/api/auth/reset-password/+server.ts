import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, url }) => {
	const { email } = await request.json().catch(() => ({}));

	if (!email || typeof email !== 'string' || !email.includes('@')) {
		return json({ message: 'A valid email address is required.' }, { status: 400 });
	}

	return json({
		message:
			'If an account with that email exists, a password reset link has been sent. This is a stub — no email is actually sent.'
	});
};
