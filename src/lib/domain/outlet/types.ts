/**
 * Outlet domain types — generalized multi-business entity types.
 *
 * This module replaces the restaurant-specific types in `menu/types.ts` with
 * business-agnostic equivalents that work across all UMKM verticals:
 * restaurant, retail, salon, laundry, repair shop, hotel, etc.
 *
 * Migration path:
 *   Restaurant  → Outlet
 *   Menu        → Catalog
 *   MenuCategory → CatalogSection
 *   MenuItem    → Product
 *   RestaurantTable → OutletTable
 *   CustomerSession → BuyerSession
 */

import type { AuthUser } from '$lib/domain/auth/types';
import type { LanguageTag } from '$lib/domain/menu/types';

// ---------------------------------------------------------------------------
// Business type
// ---------------------------------------------------------------------------

export type BusinessType =
	| 'restaurant'
	| 'cafe'
	| 'retail'
	| 'fashion'
	| 'service'
	| 'salon'
	| 'laundry'
	| 'repair'
	| 'hotel'
	| 'other';

// ---------------------------------------------------------------------------
// Outlet (replaces Restaurant)
// ---------------------------------------------------------------------------

export type OutletStatus = 'active' | 'inactive' | 'archived';

// ---------------------------------------------------------------------------
// CheckoutSettings — stored in outlets.settings JSONB (migration 0015)
// ---------------------------------------------------------------------------

export type CheckoutMode = 'offline' | 'online';

export type CheckoutSettings = {
	/** 'offline' = no payment confirmation needed (bayar ke kasir).
	 *  'online'  = buyer uploads payment proof, owner/staff confirms manually. */
	checkoutMode: CheckoutMode;
	/** When true, buyer must enter WA number at checkout so owner can contact them. */
	requireBuyerWhatsapp: boolean;
	/** When true (online mode only), buyer sees upload-proof button on order page. */
	paymentConfirmationEnabled: boolean;
};

export type Outlet = {
	id: string;
	organizationId: string;
	name: string;
	slug: string;
	publicHost: string;
	location: string;
	/** Generalized business type — replaces the old restaurant-specific `segment`. */
	businessType: BusinessType;
	status: OutletStatus;
	languages: LanguageTag[];
	timezone: string;
	defaultLanguageTag: LanguageTag;
	heroImage: string;
	tableCount: number;
	description: string;
	knowledgeHighlights: string[];
	analytics: {
		scansToday: number;
		helpfulRate: number;
		fallbackRate: number;
		topQuestion: string;
		topItem: string;
	};
	/** Checkout/payment configuration from outlets.settings JSONB. */
	checkoutSettings: CheckoutSettings;
};

// ---------------------------------------------------------------------------
// Catalog (replaces Menu)
// ---------------------------------------------------------------------------

export type CatalogStatus = 'draft' | 'published' | 'archived';

export type Catalog = {
	id: string;
	outletId: string;
	organizationId: string;
	name: string;
	status: CatalogStatus;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
};

// ---------------------------------------------------------------------------
// CatalogSection (replaces MenuCategory)
// ---------------------------------------------------------------------------

export type CatalogSection = {
	id: string;
	catalogId: string;
	outletId: string;
	organizationId: string;
	name: string;
	description: string;
	imageUrl: string;
	sortOrder: number;
};

// ---------------------------------------------------------------------------
// Product (replaces MenuItem)
// ---------------------------------------------------------------------------

/** Dietary flags — relevant for food/beverage outlets; ignored for other business types. */
export type DietaryFlag =
	| 'halal'
	| 'vegetarian'
	| 'vegan'
	| 'gluten-free'
	| 'contains-alcohol'
	| 'spicy'
	| 'seafood'
	| 'nut-free';

/** Allergen codes — relevant for food/beverage outlets only. */
export type Allergen =
	| 'nuts'
	| 'dairy'
	| 'egg'
	| 'shellfish'
	| 'seafood'
	| 'soy'
	| 'gluten'
	| 'sesame';

export type ProductSourceType =
	| 'pdf-scan'
	| 'photo'
	| 'bilingual'
	| 'handwritten'
	| 'seasonal'
	| 'spreadsheet'
	| 'manual';

export type Product = {
	id: string;
	/** Section/category name for display grouping. */
	section: string;
	name: string;
	localName?: string;
	description: string;
	/** Price in the outlet's currency, stored as integer minor units (e.g. IDR cents). */
	price: number;
	currency: 'IDR';
	imageUrl: string;
	isAvailable: boolean;
	isSignature: boolean;
	sortOrder: number;
	/** Food/beverage only — empty array for non-food business types. */
	dietaryFlags: DietaryFlag[];
	/** Food/beverage only — empty array for non-food business types. */
	allergens: Allergen[];
	/** Suggested pairings or "good for" occasions. */
	goodFor: string[];
	confidence: 'verified' | 'needs-review' | 'staff-confirm';
};

// ---------------------------------------------------------------------------
// ProductImportIssue (replaces MenuImportIssue)
// ---------------------------------------------------------------------------

export type ProductImportIssue = {
	id: string;
	sourceType: ProductSourceType;
	label: string;
	confidence: number;
	issue: string;
	status: 'needs-review' | 'approved' | 'blocked';
};

// ---------------------------------------------------------------------------
// OutletTable (replaces RestaurantTable)
// ---------------------------------------------------------------------------

export type OutletTable = {
	id: string;
	organizationId: string;
	outletId: string;
	code: string;
	label: string;
	isActive: boolean;
	qrPath: string;
};

// ---------------------------------------------------------------------------
// BuyerSession (replaces CustomerSession)
// ---------------------------------------------------------------------------

export type BuyerSession = {
	id: string;
	publicSessionId: string;
	organizationId: string;
	outletId: string;
	tableId: string | null;
	languageTag: LanguageTag;
	/** WA number persisted so buyer doesn't re-enter on repeat orders (migration 0015). */
	whatsapp: string | null;
	createdAt: string;
};

// ---------------------------------------------------------------------------
// Aggregate: OutletWithCatalog — used for public buyer QR flow
// ---------------------------------------------------------------------------

export type OutletWithCatalog = {
	outlet: Outlet;
	table: OutletTable;
	sections: CatalogSection[];
	products: Product[];
};

// ---------------------------------------------------------------------------
// Organization and membership (re-exports with outlet-aware types)
// ---------------------------------------------------------------------------

export type UserRole = 'owner' | 'manager' | 'staff';

export type Organization = {
	id: string;
	name: string;
	slug: string;
	workspaceHost: string;
	plan: 'pilot' | 'starter' | 'pro' | 'enterprise';
	/** IDs of all outlets belonging to this organization. */
	outletIds: string[];
};

export type Membership = {
	id: string;
	userId: string;
	organizationId: string;
	/** IDs of outlets this member has access to. */
	outletIds: string[];
	role: UserRole;
};

// ---------------------------------------------------------------------------
// TenantContext — generalized from restaurant to outlet
// ---------------------------------------------------------------------------

export type TenantContext = {
	user: AuthUser;
	membership: Membership;
	organization: Organization;
	outlets: Outlet[];
	activeOutlet: Outlet;
};

// ---------------------------------------------------------------------------
// PaymentMethod — outlet-configured payment options shown to buyers
// ---------------------------------------------------------------------------

export type PaymentMethodType = 'qris' | 'bank_transfer' | 'ewallet' | 'cash' | 'other';

export type PaymentMethod = {
	id: string;
	organizationId: string;
	outletId: string;
	type: PaymentMethodType;
	/** Display label, e.g. "BCA", "GoPay", "QRIS BRI Syariah" */
	label: string;
	/** Bank/e-wallet account number or identifier */
	accountNumber: string | null;
	/** Account holder name */
	accountName: string | null;
	/** URL to uploaded QRIS static image */
	qrImageUrl: string | null;
	/** Optional instructions shown to buyer */
	instructions: string | null;
	isActive: boolean;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
};

// ---------------------------------------------------------------------------
// Public bootstrap — what the QR scanner route needs to bootstrap the UX
// ---------------------------------------------------------------------------

export type PublicCatalogBootstrap = {
	/** Full outlet with catalog data (sections + products) for the public QR flow. */
	outlet: OutletWithCatalog['outlet'] & { sections: CatalogSection[]; products: Product[] };
	table: OutletTable;
};
