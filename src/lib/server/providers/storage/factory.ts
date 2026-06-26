import { appEnv } from '$lib/server/config/env';
import { MockStorageProvider } from './mock-provider';
import { LocalDiskStorageProvider } from './local-disk-provider';
import { R2StorageProvider } from './r2-provider';
import type { StorageProvider } from './types';

/** Default upload directory for local disk storage. Can be overridden via STORAGE_LOCAL_PATH. */
const DEFAULT_LOCAL_PATH = './uploads';

export function getStorageProvider(): StorageProvider {
	const providerName = appEnv.storageProvider ?? 'mock';

	switch (providerName) {
		case 'local':
			return new LocalDiskStorageProvider(appEnv.storageLocalPath ?? DEFAULT_LOCAL_PATH);

		case 'r2': {
			const { r2AccountId, r2AccessKeyId, r2SecretAccessKey, r2BucketName, r2PublicUrl } = appEnv;
			if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey || !r2BucketName || !r2PublicUrl) {
				throw new Error(
					'[storage-factory] STORAGE_PROVIDER=r2 requires R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, ' +
						'R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, and R2_PUBLIC_URL to be set.'
				);
			}
			return new R2StorageProvider({
				accountId: r2AccountId,
				accessKeyId: r2AccessKeyId,
				secretAccessKey: r2SecretAccessKey,
				bucketName: r2BucketName,
				publicUrl: r2PublicUrl
			});
		}

		case 'mock':
			return new MockStorageProvider();

		default:
			console.warn(
				`[storage-factory] Unknown STORAGE_PROVIDER "${providerName}" — falling back to mock.`
			);
			return new MockStorageProvider();
	}
}
