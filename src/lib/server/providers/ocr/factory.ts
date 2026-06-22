import { appEnv } from '$lib/server/config/env';
import { MockOcrProvider } from './mock-provider';
import type { OcrProvider } from './types';

/**
 * Returns the active OCR provider based on OCR_PROVIDER env.
 *
 * Supported values:
 *   'mock'  — No API key needed. Returns deterministic fixture data (default).
 *   'google-vision' — Google Cloud Vision API (GOOGLE_VISION_API_KEY required). Post-MVP.
 *   'tesseract'     — Local Tesseract OCR (no API key, but server-side only). Post-MVP.
 *
 * Adding a new provider: add a case here + a new *-provider.ts file that implements
 * OcrProvider. No import service or route files need to change.
 */
export function getOcrProvider(): OcrProvider {
	const providerName = appEnv.ocrProvider;

	switch (providerName) {
		case 'mock':
		default:
			if (providerName && providerName !== 'mock') {
				console.warn(
					`[ocr-factory] Unknown OCR_PROVIDER "${providerName}" — falling back to mock.`
				);
			}
			return new MockOcrProvider();
	}
}
