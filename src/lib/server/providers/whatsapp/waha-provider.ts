/**
 * WAHA (WhatsApp HTTP API) provider.
 *
 * Self-hosted WAHA Docker container wraps the Baileys engine and exposes a
 * simple REST API. This adapter calls /api/sendText to deliver order
 * notifications and payment confirmations.
 *
 * Config (env vars):
 *   WAHA_BASE_URL   — e.g. http://localhost:3000  (no trailing slash)
 *   WAHA_SESSION    — WAHA session name, default "default"
 *   WAHA_API_KEY    — optional API key if WAHA_BASIC_AUTH_USERNAME/PASSWORD set
 */

import type { WhatsappProvider, WhatsappMessageRequest, WhatsappMessageResult } from './types';

export class WahaProvider implements WhatsappProvider {
	private readonly baseUrl: string;
	private readonly session: string;
	private readonly apiKey: string | undefined;

	constructor(baseUrl: string, session = 'default', apiKey?: string) {
		this.baseUrl = baseUrl.replace(/\/$/, '');
		this.session = session;
		this.apiKey = apiKey;
	}

	async sendMessage(request: WhatsappMessageRequest): Promise<WhatsappMessageResult> {
		const start = Date.now();

		// Normalize phone number: strip non-digits, add @c.us suffix for WAHA.
		const chatId = this.#normalizeChatId(request.phoneNumber);

		const body = JSON.stringify({
			session: this.session,
			chatId,
			text: request.message
		});

		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};
		if (this.apiKey) {
			headers['X-Api-Key'] = this.apiKey;
		}

		try {
			const res = await fetch(`${this.baseUrl}/api/sendText`, {
				method: 'POST',
				headers,
				body,
				// 10-second timeout — WA delivery is async on WAHA side.
				signal: AbortSignal.timeout(10_000)
			});

			const latencyMs = Date.now() - start;

			if (!res.ok) {
				const text = await res.text().catch(() => '');
				console.error(`[waha] sendText failed ${res.status}: ${text}`);
				return {
					messageId: '',
					status: 'failed',
					errorReason: `HTTP ${res.status}: ${text.slice(0, 200)}`,
					provider: 'waha',
					latencyMs
				};
			}

			const data = (await res.json()) as { id?: { id?: string }; key?: { id?: string } };
			// WAHA response shape varies by version: { key: { id: '...' } } or { id: { id: '...' } }
			const messageId =
				data?.key?.id ??
				data?.id?.id ??
				`waha-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

			return {
				messageId,
				status: 'sent',
				provider: 'waha',
				latencyMs
			};
		} catch (err) {
			const latencyMs = Date.now() - start;
			const errorReason = err instanceof Error ? err.message : String(err);
			console.error('[waha] sendText error:', errorReason);
			return {
				messageId: '',
				status: 'failed',
				errorReason,
				provider: 'waha',
				latencyMs
			};
		}
	}

	#normalizeChatId(phone: string): string {
		// Strip everything except digits and leading +
		const digits = phone.replace(/\D/g, '');
		// WAHA expects international format without + and with @c.us
		return `${digits}@c.us`;
	}
}
