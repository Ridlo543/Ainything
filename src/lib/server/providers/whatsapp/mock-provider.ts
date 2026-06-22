import type { WhatsappProvider, WhatsappMessageRequest, WhatsappMessageResult } from './types';

export class MockWhatsappProvider implements WhatsappProvider {
	private prefix: string;

	constructor(prefix = 'WA-MOCK') {
		this.prefix = prefix;
	}

	async sendMessage(request: WhatsappMessageRequest): Promise<WhatsappMessageResult> {
		return {
			messageId: `${this.prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
			status: 'sent',
			provider: 'mock',
			latencyMs: 0
		};
	}
}
