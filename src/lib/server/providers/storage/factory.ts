import { appEnv } from '$lib/server/config/env';
import { MockStorageProvider } from './mock-provider';
import type { StorageProvider } from './types';

export function getStorageProvider(): StorageProvider {
	const providerName = appEnv.storageProvider ?? 'mock';

	switch (providerName) {
		case 'mock':
			return new MockStorageProvider();

		default:
			console.warn(
				`[storage-factory] Unknown STORAGE_PROVIDER "${providerName}" — falling back to mock.`
			);
			return new MockStorageProvider();
	}
}
