/**
 * R2StorageProvider — Cloudflare R2 object storage via S3-compatible API.
 *
 * Used when STORAGE_PROVIDER=r2 (production / Cloudflare deployment).
 * Requires the following env vars:
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
 *   R2_BUCKET_NAME, R2_PUBLIC_URL
 *
 * Object key format: <orgId>/<sourceType>/<timestamp>-<filename>
 * Public URL format: <R2_PUBLIC_URL>/<objectKey>
 */

import type {
	StorageProvider,
	StorageObjectMeta,
	StorageUploadResult,
	StorageDeleteResult
} from './types';

interface R2Config {
	accountId: string;
	accessKeyId: string;
	secretAccessKey: string;
	bucketName: string;
	/** Base URL for public reads, e.g. https://pub-xyz.r2.dev */
	publicUrl: string;
}

/**
 * Minimal AWS Signature Version 4 implementation for R2's S3-compatible API.
 * Only covers PutObject and DeleteObject — no multipart, no presign.
 */
async function signRequest(
	method: 'PUT' | 'DELETE',
	url: string,
	headers: Record<string, string>,
	body: Uint8Array | null,
	config: R2Config
): Promise<Record<string, string>> {
	const endpoint = new URL(url);
	const now = new Date();
	const datestamp = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
	const amzdate =
		now
			.toISOString()
			.replace(/[:-]|\.\d{3}/g, '')
			.slice(0, 15) + 'Z'; // YYYYMMDDTHHmmssZ

	const region = 'auto'; // R2 uses 'auto'
	const service = 's3';

	// Canonical headers (lowercase, sorted)
	const signedHeaders: Record<string, string> = {
		...headers,
		'x-amz-date': amzdate,
		host: endpoint.host
	};
	const canonicalHeadersStr = Object.keys(signedHeaders)
		.sort()
		.map((k) => `${k.toLowerCase()}:${signedHeaders[k].trim()}`)
		.join('\n');
	const signedHeaderNames = Object.keys(signedHeaders)
		.sort()
		.map((k) => k.toLowerCase())
		.join(';');

	// Payload hash
	const bodyBytes = body ?? new Uint8Array(0);
	const payloadHash = await sha256hex(bodyBytes);

	// Canonical request
	const canonicalUri = endpoint.pathname;
	const canonicalQueryString = endpoint.search.slice(1);
	const canonicalRequest = [
		method,
		canonicalUri,
		canonicalQueryString,
		canonicalHeadersStr + '\n',
		signedHeaderNames,
		payloadHash
	].join('\n');

	// String to sign
	const credentialScope = `${datestamp}/${region}/${service}/aws4_request`;
	const stringToSign = [
		'AWS4-HMAC-SHA256',
		amzdate,
		credentialScope,
		await sha256hex(new TextEncoder().encode(canonicalRequest))
	].join('\n');

	// Signing key
	const kDate = await hmacSha256(
		new TextEncoder().encode(`AWS4${config.secretAccessKey}`),
		datestamp
	);
	const kRegion = await hmacSha256(kDate, region);
	const kService = await hmacSha256(kRegion, service);
	const kSigning = await hmacSha256(kService, 'aws4_request');

	// Signature
	const signature = await hmacSha256Hex(kSigning, stringToSign);

	const authorization = [
		`AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}`,
		`SignedHeaders=${signedHeaderNames}`,
		`Signature=${signature}`
	].join(', ');

	return {
		...signedHeaders,
		'x-amz-date': amzdate,
		'x-amz-content-sha256': payloadHash,
		authorization
	};
}

async function sha256hex(data: Uint8Array): Promise<string> {
	const hash = await crypto.subtle.digest('SHA-256', data.buffer as ArrayBuffer);
	return Array.from(new Uint8Array(hash))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

async function hmacSha256(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
	const rawKey = key instanceof Uint8Array ? (key.buffer as ArrayBuffer) : key;
	const cryptoKey = await crypto.subtle.importKey(
		'raw',
		rawKey,
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const encoded = new TextEncoder().encode(data);
	return crypto.subtle.sign('HMAC', cryptoKey, encoded.buffer as ArrayBuffer);
}

async function hmacSha256Hex(key: ArrayBuffer, data: string): Promise<string> {
	const sig = await hmacSha256(key, data);
	return Array.from(new Uint8Array(sig))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

export class R2StorageProvider implements StorageProvider {
	private readonly config: R2Config;
	/** S3-compatible endpoint base: https://<accountId>.r2.cloudflarestorage.com */
	private readonly s3Base: string;

	constructor(config: R2Config) {
		this.config = config;
		this.s3Base = `https://${config.accountId}.r2.cloudflarestorage.com`;
	}

	async storeFile(buffer: Uint8Array, meta: StorageObjectMeta): Promise<StorageUploadResult> {
		const objectKey = `${meta.organizationId}/${meta.sourceType}/${Date.now()}-${meta.fileName}`;
		const url = `${this.s3Base}/${this.config.bucketName}/${objectKey}`;

		const baseHeaders: Record<string, string> = {
			'content-type': meta.mimeType,
			'content-length': String(buffer.byteLength)
		};

		const signedHeaders = await signRequest('PUT', url, baseHeaders, buffer, this.config);

		const response = await fetch(url, {
			method: 'PUT',
			headers: signedHeaders,
			body: buffer.buffer.slice(
				buffer.byteOffset,
				buffer.byteOffset + buffer.byteLength
			) as ArrayBuffer
		});

		if (!response.ok) {
			const body = await response.text();
			throw new Error(`R2 PutObject failed: ${response.status} ${body}`);
		}

		return {
			objectKey,
			publicUrl: `${this.config.publicUrl}/${objectKey}`,
			provider: 'r2'
		};
	}

	async getPublicUrl(objectKey: string): Promise<string | null> {
		// R2 public bucket: URL is always deterministic — no HEAD needed.
		// If the object does not exist, the CDN returns 404 at request time.
		return `${this.config.publicUrl}/${objectKey}`;
	}

	async deleteFile(objectKey: string): Promise<StorageDeleteResult> {
		const url = `${this.s3Base}/${this.config.bucketName}/${objectKey}`;

		const signedHeaders = await signRequest('DELETE', url, {}, null, this.config);

		const response = await fetch(url, {
			method: 'DELETE',
			headers: signedHeaders
		});

		// 204 = deleted, 404 = already gone — both are acceptable
		if (!response.ok && response.status !== 404) {
			const body = await response.text();
			throw new Error(`R2 DeleteObject failed: ${response.status} ${body}`);
		}

		return {
			objectKey,
			deleted: response.status !== 404,
			provider: 'r2'
		};
	}
}
