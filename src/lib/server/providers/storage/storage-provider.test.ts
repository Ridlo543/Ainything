import { describe, it, expect } from 'vitest';
import { getStorageProvider } from './factory';
import { MockStorageProvider } from './mock-provider';
import type { StorageObjectMeta } from './types';

const META: StorageObjectMeta = {
	organizationId: 'org-001',
	sourceType: 'menu-import',
	fileName: 'menu-scan.png',
	mimeType: 'image/png',
	sizeBytes: 1024
};

describe('storage factory', () => {
	it('returns MockStorageProvider by default', () => {
		const provider = getStorageProvider();
		expect(provider).toBeInstanceOf(MockStorageProvider);
	});
});

describe('MockStorageProvider', () => {
	it('stores a file and returns object key + public URL', async () => {
		const provider = new MockStorageProvider();
		const buf = new Uint8Array([1, 2, 3]);

		const result = await provider.storeFile(buf, META);

		expect(result.objectKey).toMatch(/^mock\/org-001\/menu-import\/\d+-menu-scan\.png$/);
		expect(result.publicUrl).toContain(result.objectKey);
		expect(result.provider).toBe('mock');
	});

	it('getPublicUrl returns URL for stored key', async () => {
		const provider = new MockStorageProvider();
		const { objectKey } = await provider.storeFile(new Uint8Array(), META);

		const url = await provider.getPublicUrl(objectKey);
		expect(url).toContain(objectKey);
	});

	it('getPublicUrl returns null for unknown key', async () => {
		const provider = new MockStorageProvider();
		const url = await provider.getPublicUrl('nonexistent');
		expect(url).toBeNull();
	});

	it('deletes a stored file', async () => {
		const provider = new MockStorageProvider();
		const { objectKey } = await provider.storeFile(new Uint8Array(), META);

		const del = await provider.deleteFile(objectKey);
		expect(del.deleted).toBe(true);

		const url = await provider.getPublicUrl(objectKey);
		expect(url).toBeNull();
	});

	it('delete returns deleted=false for unknown key', async () => {
		const provider = new MockStorageProvider();
		const del = await provider.deleteFile('nonexistent');
		expect(del.deleted).toBe(false);
	});
});
