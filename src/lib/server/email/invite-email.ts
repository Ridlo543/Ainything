import type { SendEmailParams } from './types';

/**
 * Builds the invite email for a new staff member.
 */
export function buildInviteEmail(params: {
	organizationName: string;
	inviterName: string;
	role: string;
	acceptUrl: string;
	expiresAt: Date;
}): Omit<SendEmailParams, 'to'> {
	const { organizationName, inviterName, role, acceptUrl, expiresAt } = params;

	const expiryStr = expiresAt.toLocaleDateString('en-US', {
		weekday: 'long',
		month: 'long',
		day: 'numeric'
	});

	const subject = `You've been invited to join ${organizationName} on Ainything`;

	const text = [
		`Hi,`,
		``,
		`${inviterName} has invited you to join ${organizationName} on Ainything as ${role}.`,
		``,
		`Accept your invitation here:`,
		acceptUrl,
		``,
		`This link expires on ${expiryStr}.`,
		``,
		`If you didn't expect this email, you can safely ignore it.`,
		``,
		`— The Ainything Team`
	].join('\n');

	const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f9fafb; margin: 0; padding: 40px 16px;">
  <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 8px; padding: 32px; border: 1px solid #e5e7eb;">
    <h1 style="font-size: 20px; color: #111827; margin: 0 0 16px;">You've been invited</h1>
    <p style="color: #374151; margin: 0 0 8px;">
      <strong>${inviterName}</strong> has invited you to join
      <strong>${organizationName}</strong> on Ainything as <strong>${role}</strong>.
    </p>
    <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px;">This invitation expires on ${expiryStr}.</p>
    <a href="${acceptUrl}"
       style="display: inline-block; background: #4f46e5; color: #fff; text-decoration: none; border-radius: 6px; padding: 12px 24px; font-weight: 600; font-size: 15px;">
      Accept invitation
    </a>
    <p style="color: #9ca3af; font-size: 13px; margin: 24px 0 0;">If you didn't expect this, ignore this email.</p>
  </div>
</body>
</html>`;

	return { subject, text, html };
}
