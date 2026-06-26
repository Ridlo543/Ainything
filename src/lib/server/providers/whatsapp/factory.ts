import { appEnv } from '$lib/server/config/env';
import { MockWhatsappProvider } from './mock-provider';
import { WahaProvider } from './waha-provider';
import type { WhatsappProvider } from './types';

export function getWhatsappProvider(): WhatsappProvider {
	const providerName = appEnv.whatsappProvider ?? 'mock';

	switch (providerName) {
		case 'mock':
			return new MockWhatsappProvider();

		case 'waha': {
			const baseUrl = appEnv.wahaBaseUrl;
			if (!baseUrl) {
				console.warn('[whatsapp-factory] WAHA_BASE_URL not set — falling back to mock.');
				return new MockWhatsappProvider();
			}
			return new WahaProvider(baseUrl, appEnv.wahaSession ?? 'default', appEnv.wahaApiKey);
		}

		default:
			console.warn(
				`[whatsapp-factory] Unknown WHATSAPP_PROVIDER "${providerName}" — falling back to mock.`
			);
			return new MockWhatsappProvider();
	}
}
