/**
 * LocalDiskStorageProvider — persists uploads to the local filesystem.
 *
 * Used when STORAGE_PROVIDER=local (VPS / self-hosted deployments).
 * Files are served via the /api/uploads/[...path] SvelteKit endpoint.
 *
 * Directory layout:
 *   <STORAGE_LOCAL_PATH>/
 *     <orgId>/
 *       item-image/
 *         <timestamp>-<filename>
 *       menu-import/
 *         ...
 *       knowledge-attachment/
 *         ...
 *
 * Object key format: <orgId>/<sourceType>/<timestamp>-<filename>
 * Public URL format: /api/uploads/<objectKey>
 */

import { mkdir, writeFile, unlink, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type {
	StorageProvider,
	StorageObjectMeta,
	StorageUploadResult,
	StorageDeleteResult
} from './types';

export class LocalDiskStorageProvider implements StorageProvider {
	/** Absolute path to the root upload directory. */
	private readonly root: string;

	constructor(rootPath: string) {
		this.root = rootPath;
	}

	async storeFile(buffer: Uint8Array, meta: StorageObjectMeta): Promise<StorageUploadResult> {
		const objectKey = `${meta.organizationId}/${meta.sourceType}/${Date.now()}-${meta.fileName}`;
		const absPath = join(this.root, objectKey);

		// Ensure parent directory exists (race-safe with recursive flag)
		await mkdir(dirname(absPath), { recursive: true });
		await writeFile(absPath, buffer);

		return {
			objectKey,
			publicUrl: `/api/uploads/${objectKey}`,
			provider: 'local'
		};
	}

	async getPublicUrl(objectKey: string): Promise<string | null> {
		const absPath = join(this.root, objectKey);
		try {
			await access(absPath);
			return `/api/uploads/${objectKey}`;
		} catch {
			return null;
		}
	}

	async deleteFile(objectKey: string): Promise<StorageDeleteResult> {
		const absPath = join(this.root, objectKey);
		try {
			await unlink(absPath);
			return { objectKey, deleted: true, provider: 'local' };
		} catch {
			// File already gone — treat as success (idempotent delete)
			return { objectKey, deleted: false, provider: 'local' };
		}
	}
}
