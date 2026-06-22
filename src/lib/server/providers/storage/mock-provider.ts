import type {
	StorageProvider,
	StorageObjectMeta,
	StorageUploadResult,
	StorageDeleteResult
} from './types';

export class MockStorageProvider implements StorageProvider {
	private store = new Map<string, { buffer: Uint8Array; meta: StorageObjectMeta }>();

	async storeFile(buffer: Uint8Array, meta: StorageObjectMeta): Promise<StorageUploadResult> {
		const objectKey = `mock/${meta.restaurantId}/${meta.sourceType}/${Date.now()}-${meta.fileName}`;
		this.store.set(objectKey, { buffer, meta });

		return {
			objectKey,
			publicUrl: `/mock-storage/${objectKey}`,
			provider: 'mock'
		};
	}

	async getPublicUrl(objectKey: string): Promise<string | null> {
		return this.store.has(objectKey) ? `/mock-storage/${objectKey}` : null;
	}

	async deleteFile(objectKey: string): Promise<StorageDeleteResult> {
		const existed = this.store.has(objectKey);
		if (existed) this.store.delete(objectKey);

		return {
			objectKey,
			deleted: existed,
			provider: 'mock'
		};
	}
}
