/**
 * Unit tests for LocalDiskStorageProvider.
 *
 * Uses node:fs/promises mocks so no actual disk I/O occurs.
 */

import path from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock node:fs/promises before importing the module under test
vi.mock('node:fs/promises', () => ({
	mkdir: vi.fn().mockResolvedValue(undefined),
	writeFile: vi.fn().mockResolvedValue(undefined),
	unlink: vi.fn().mockResolvedValue(undefined),
	access: vi.fn().mockResolvedValue(undefined)
}));

import * as fsp from 'node:fs/promises';
import { LocalDiskStorageProvider } from './local-disk-provider';
import type { StorageObjectMeta } from './types';

// Use a platform-neutral root so path.join produces correct separators on all OS
const ROOT = path.join(path.sep === '\\' ? 'C:\\var\\uploads' : '/var/uploads');

const META: StorageObjectMeta = {
	organizationId: 'org-abc',
	sourceType: 'item-image',
	fileName: 'burger.jpg',
	mimeType: 'image/jpeg',
	sizeBytes: 2048
};

const mkdirMock = vi.mocked(fsp.mkdir);
const writeFileMock = vi.mocked(fsp.writeFile);
const unlinkMock = vi.mocked(fsp.unlink);
const accessMock = vi.mocked(fsp.access);

beforeEach(() => {
	vi.clearAllMocks();
});

describe('LocalDiskStorageProvider.storeFile', () => {
	it('writes file to correct path and returns expected result', async () => {
		const provider = new LocalDiskStorageProvider(ROOT);
		const buf = new Uint8Array([10, 20, 30]);

		const result = await provider.storeFile(buf, META);

		// objectKey format: orgId/sourceType/<timestamp>-filename
		expect(result.objectKey).toMatch(/^org-abc\/item-image\/\d+-burger\.jpg$/);
		expect(result.publicUrl).toBe(`/api/uploads/${result.objectKey}`);
		expect(result.provider).toBe('local');
	});

	it('creates parent directory with recursive flag', async () => {
		const provider = new LocalDiskStorageProvider(ROOT);
		await provider.storeFile(new Uint8Array(), META);

		expect(mkdirMock).toHaveBeenCalledOnce();
		const [dirPath, opts] = mkdirMock.mock.calls[0];
		// Use path.join to produce the correct separator for the current OS
		expect(String(dirPath)).toContain(path.join('org-abc', 'item-image'));
		expect(opts).toEqual({ recursive: true });
	});

	it('calls writeFile with the provided buffer', async () => {
		const provider = new LocalDiskStorageProvider(ROOT);
		const buf = new Uint8Array([1, 2, 3]);
		await provider.storeFile(buf, META);

		expect(writeFileMock).toHaveBeenCalledOnce();
		const [, writtenBuf] = writeFileMock.mock.calls[0];
		expect(writtenBuf).toBe(buf);
	});

	it('uses different timestamps for back-to-back uploads (no key collision)', async () => {
		const provider = new LocalDiskStorageProvider(ROOT);
		// Stub Date.now to return distinct values
		let call = 0;
		vi.spyOn(Date, 'now').mockImplementation(() => (call++ === 0 ? 1000 : 2000));

		const r1 = await provider.storeFile(new Uint8Array(), META);
		const r2 = await provider.storeFile(new Uint8Array(), META);

		expect(r1.objectKey).not.toBe(r2.objectKey);
		vi.restoreAllMocks();
	});

	it('uses the correct root path from constructor', async () => {
		const customRoot = path.join(path.sep === '\\' ? 'C:\\custom\\root' : '/custom/root');
		const provider = new LocalDiskStorageProvider(customRoot);
		await provider.storeFile(new Uint8Array(), META);

		const writtenPath = String(writeFileMock.mock.calls[0][0]);
		expect(writtenPath.startsWith(customRoot)).toBe(true);
	});
});

describe('LocalDiskStorageProvider.getPublicUrl', () => {
	it('returns /api/uploads/<key> when file exists', async () => {
		const provider = new LocalDiskStorageProvider(ROOT);
		accessMock.mockResolvedValueOnce(undefined);

		const url = await provider.getPublicUrl('org-abc/item-image/1000-burger.jpg');

		expect(url).toBe('/api/uploads/org-abc/item-image/1000-burger.jpg');
	});

	it('returns null when file does not exist (access throws)', async () => {
		const provider = new LocalDiskStorageProvider(ROOT);
		accessMock.mockRejectedValueOnce(new Error('ENOENT'));

		const url = await provider.getPublicUrl('org-abc/item-image/missing.jpg');

		expect(url).toBeNull();
	});
});

describe('LocalDiskStorageProvider.deleteFile', () => {
	it('deletes an existing file and returns deleted=true', async () => {
		const provider = new LocalDiskStorageProvider(ROOT);
		unlinkMock.mockResolvedValueOnce(undefined);

		const result = await provider.deleteFile('org-abc/item-image/1000-burger.jpg');

		expect(result.deleted).toBe(true);
		expect(result.objectKey).toBe('org-abc/item-image/1000-burger.jpg');
		expect(result.provider).toBe('local');
		expect(unlinkMock).toHaveBeenCalledOnce();
	});

	it('returns deleted=false (idempotent) when file is already gone', async () => {
		const provider = new LocalDiskStorageProvider(ROOT);
		unlinkMock.mockRejectedValueOnce(new Error('ENOENT'));

		const result = await provider.deleteFile('org-abc/item-image/gone.jpg');

		expect(result.deleted).toBe(false);
		expect(result.provider).toBe('local');
	});

	it('uses the correct absolute path for unlink', async () => {
		const provider = new LocalDiskStorageProvider(ROOT);
		const key = 'org-abc/item-image/1000-burger.jpg';
		await provider.deleteFile(key);

		const calledPath = String(unlinkMock.mock.calls[0][0]);
		// path.join normalises separators for the current OS
		expect(calledPath).toBe(path.join(ROOT, key));
	});
});
