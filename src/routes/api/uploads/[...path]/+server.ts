/**
 * /api/uploads/[...path] — serves files uploaded via LocalDiskStorageProvider.
 *
 * Active only when STORAGE_PROVIDER=local. With cloud storage (R2/S3), files are
 * served from their CDN and this endpoint is never reached.
 *
 * Security:
 *  - Path traversal prevented by resolving against storage root and asserting prefix.
 *  - Object keys include timestamps so files are effectively content-addressed.
 *    Cache-Control: immutable, 1 year.
 *  - No auth required — product catalog images are intentionally public.
 */

import { createReadStream, statSync } from 'node:fs';
import { resolve, join, sep } from 'node:path';
import { error, type RequestHandler } from '@sveltejs/kit';
import { appEnv } from '$lib/server/config/env';

const MIME_MAP: Record<string, string> = {
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	png: 'image/png',
	webp: 'image/webp',
	gif: 'image/gif',
	pdf: 'application/pdf'
};

export const GET: RequestHandler = async ({ params }) => {
	if (appEnv.storageProvider !== 'local') {
		error(404, 'Not found');
	}

	const rawPath = (params as Record<string, string>).path ?? '';
	if (!rawPath) error(400, 'Invalid path');

	const storageRoot = resolve(appEnv.storageLocalPath ?? './uploads');
	const filePath = resolve(join(storageRoot, rawPath));

	// Prevent path traversal — resolved path must stay inside storageRoot
	if (!filePath.startsWith(storageRoot + sep) && filePath !== storageRoot) {
		error(400, 'Invalid path');
	}

	const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
	const contentType = MIME_MAP[ext];
	if (!contentType) error(415, 'Unsupported file type');

	let stat: ReturnType<typeof statSync>;
	try {
		stat = statSync(filePath);
	} catch {
		error(404, 'File not found');
	}

	if (!stat.isFile()) error(404, 'File not found');

	// Stream with immutable cache (timestamp-prefixed keys = content-addressed)
	const readable = createReadStream(filePath) as unknown as ReadableStream;

	return new Response(readable, {
		headers: {
			'Content-Type': contentType,
			'Content-Length': String(stat.size),
			'Cache-Control': 'public, max-age=31536000, immutable'
		}
	});
};
