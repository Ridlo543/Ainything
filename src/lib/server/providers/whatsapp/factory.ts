import { appEnv } from '$lib/server/config/env';
import { MockWhatsappProvider } from './mock-provider';
import type { WhatsappProvider } from './types';

export function getWhatsappProvider(): WhatsappProvider {
	const providerName = appEnv.whatsappProvider ?? 'mock';

	switch (providerName) {
		case 'mock':
			return new MockWhatsappProvider();

		default:
			console.warn(
				`[whatsapp-factory] Unknown WHATSAPP_PROVIDER "${providerName}" — falling back to mock.`
			);
			return new MockWhatsappProvider();
	}
}
