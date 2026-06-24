import { appEnv } from '$lib/server/config/env';
import { MockEmailProvider } from './mock-email-provider';
import { SmtpEmailProvider } from './smtp-email-provider';
import type { EmailProvider } from './types';

let _provider: EmailProvider | null = null;

/**
 * Returns the configured email provider (singleton).
 * Uses SMTP when SMTP_HOST is set, otherwise falls back to mock.
 * Never exposes credentials in logs.
 */
export function getEmailProvider(): EmailProvider {
	if (_provider) return _provider;

	const smtpHost = appEnv.smtpHost;

	if (smtpHost) {
		_provider = new SmtpEmailProvider({
			host: smtpHost,
			port: appEnv.smtpPort ?? 587,
			user: appEnv.smtpUser ?? '',
			pass: appEnv.smtpPass ?? '',
			from: appEnv.smtpFrom ?? `Lingua <noreply@${smtpHost}>`
		});
		return _provider;
	}

	_provider = new MockEmailProvider();
	return _provider;
}
