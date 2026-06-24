import type { EmailProvider, SendEmailParams } from './types';

/**
 * Mock email provider for local development and testing.
 * Prints emails to the console instead of sending them.
 */
export class MockEmailProvider implements EmailProvider {
	async send(params: SendEmailParams): Promise<void> {
		console.log(
			`[MockEmail] To: ${params.to}\n` +
				`[MockEmail] Subject: ${params.subject}\n` +
				`[MockEmail] Text: ${params.text.slice(0, 200)}`
		);
	}
}
