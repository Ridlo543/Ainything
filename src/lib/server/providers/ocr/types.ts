import type { MenuSourceType, MenuImportIssue, LanguageTag } from '$lib/domain/menu/types';

/**
 * One menu item extracted by OCR. Fields mirror MenuItem but every field has an
 * associated confidence score (0–1) so the admin review UI can flag items that
 * need manual correction before publish.
 */
export type OcrMenuItem = {
	/** Original name as read from the menu. */
	name: string;
	nameConfidence: number;
	localName?: string;
	localNameConfidence?: number;
	category: string;
	categoryConfidence: number;
	description: string;
	descriptionConfidence: number;
	price: number;
	priceConfidence: number;
	currency: 'IDR';
	spiceLevel: number;
	spiceLevelConfidence: number;
	isSignature: boolean;
	/** Dietary flags detected from text/visual cues. */
	dietaryFlags: string[];
	/** Allergens detected from text/visual cues. */
	allergens: string[];
};

/**
 * Input passed to the OCR adapter for a single scan.
 */
export type OcrScanInput = {
	/** Base64-encoded image data (without the data URI prefix). */
	imageBase64: string;
	/** MIME type of the image (e.g. 'image/png', 'image/jpeg', 'application/pdf'). */
	mimeType: string;
	/** The source format of the menu (pdf-scan, photo, spreadsheet, etc.). */
	sourceType: MenuSourceType;
	/** Language hints in preference order. Provider may use these for OCR engine tuning. */
	languageHints: LanguageTag[];
	/** Restaurant name — used as context for the OCR model to improve accuracy. */
	restaurantName?: string;
};

/**
 * Result returned by an OCR adapter after processing a menu image.
 */
export type OcrScanResult = {
	/** Recognised menu items with per-field confidence. */
	items: OcrMenuItem[];
	/** Full raw OCR text before parsing into items. Useful for admin review / debugging. */
	rawText: string;
	/** Issues flagged by the OCR engine (unreadable sections, ambiguous prices, etc.). */
	issues: MenuImportIssue[];
	/** Provider name used for audit logs (e.g. 'GoogleVision', 'Tesseract', 'mock'). */
	provider: string;
	/** Model or engine version used for this scan. */
	model: string;
	/** Wall-clock latency in ms for the OCR call. */
	latencyMs: number;
};

/**
 * OCR provider adapter interface. Every OCR provider (Google Vision, AWS Textract,
 * Tesseract, etc.) must implement this interface. The import service depends only on
 * this contract.
 *
 * Post-MVP: add `scanBatch()` for multi-page PDFs and `scanReceipt()` for POS receipt
 * ingestion.
 */
export interface OcrProvider {
	scan(input: OcrScanInput): Promise<OcrScanResult>;
}