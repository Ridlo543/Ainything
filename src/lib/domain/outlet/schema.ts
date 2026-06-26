/**
 * outlet/schema.ts — Zod validation schemas for outlet domain types.
 *
 * Replaces the restaurant-specific schemas in `domain/restaurant/schema.ts`.
 * These are used by form actions, API handlers, and server-side validation.
 */

import { z } from 'zod';
import type { BusinessType } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const BUSINESS_TYPES = [
	'restaurant',
	'cafe',
	'retail',
	'fashion',
	'service',
	'salon',
	'laundry',
	'repair',
	'hotel',
	'other'
] as const satisfies readonly BusinessType[];

export const LANGUAGE_TAGS = ['id', 'en', 'zh-Hans', 'ko', 'ja', 'ar', 'hi', 'fr', 'de'] as const;

export const TIMEZONES = [
	'Asia/Jakarta',
	'Asia/Makassar',
	'Asia/Jayapura',
	'Asia/Singapore',
	'Asia/Kuala_Lumpur',
	'Asia/Bangkok',
	'Asia/Tokyo',
	'UTC'
] as const;

export const CATALOG_STATUSES = ['draft', 'published', 'archived'] as const;

export const USER_ROLES = ['owner', 'manager', 'staff'] as const;

// ---------------------------------------------------------------------------
// Outlet settings schema (used in dashboard settings form)
// ---------------------------------------------------------------------------

export const outletSettingsSchema = z.object({
	name: z.string().min(1, 'Nama wajib diisi').max(100, 'Nama terlalu panjang'),
	location: z.string().max(200, 'Lokasi terlalu panjang').default(''),
	businessType: z.enum(BUSINESS_TYPES, { message: 'Tipe bisnis tidak valid' }),
	timezone: z.enum(TIMEZONES, { message: 'Timezone tidak valid' }),
	defaultLanguageTag: z.enum(LANGUAGE_TAGS, { message: 'Bahasa tidak valid' }),
	description: z.string().max(1000, 'Deskripsi terlalu panjang').default('')
});

export type OutletSettingsInput = z.infer<typeof outletSettingsSchema>;

// ---------------------------------------------------------------------------
// Catalog schema (used when creating/editing a catalog)
// ---------------------------------------------------------------------------

export const catalogSchema = z.object({
	name: z.string().min(1, 'Nama katalog wajib diisi').max(100, 'Nama katalog terlalu panjang'),
	status: z.enum(CATALOG_STATUSES, { message: 'Status tidak valid' }).default('draft'),
	sortOrder: z.number().int().nonnegative().default(0)
});

export type CatalogInput = z.infer<typeof catalogSchema>;

// ---------------------------------------------------------------------------
// Catalog section schema
// ---------------------------------------------------------------------------

export const catalogSectionSchema = z.object({
	name: z.string().min(1, 'Nama seksi wajib diisi').max(100, 'Nama seksi terlalu panjang'),
	description: z.string().max(500, 'Deskripsi terlalu panjang').default(''),
	imageUrl: z.string().url('URL gambar tidak valid').or(z.literal('')).default(''),
	sortOrder: z.number().int().nonnegative().default(0)
});

export type CatalogSectionInput = z.infer<typeof catalogSectionSchema>;

// ---------------------------------------------------------------------------
// Product schema (used when creating/editing a product)
// ---------------------------------------------------------------------------

export const DIETARY_FLAGS = [
	'halal',
	'vegetarian',
	'vegan',
	'gluten-free',
	'contains-alcohol',
	'spicy',
	'seafood',
	'nut-free'
] as const;

export const ALLERGENS = [
	'nuts',
	'dairy',
	'egg',
	'shellfish',
	'seafood',
	'soy',
	'gluten',
	'sesame'
] as const;

export const productSchema = z.object({
	name: z.string().min(1, 'Nama produk wajib diisi').max(200, 'Nama produk terlalu panjang'),
	localName: z.string().max(200, 'Nama lokal terlalu panjang').optional(),
	description: z.string().max(1000, 'Deskripsi terlalu panjang').default(''),
	/** Price in minor units (e.g. IDR, stored as integer). */
	price: z
		.number()
		.int('Harga harus bilangan bulat')
		.nonnegative('Harga tidak boleh negatif')
		.max(999_999_999, 'Harga terlalu besar'),
	currency: z.literal('IDR').default('IDR'),
	imageUrl: z.string().url('URL gambar tidak valid').or(z.literal('')).default(''),
	isAvailable: z.boolean().default(true),
	isSignature: z.boolean().default(false),
	sortOrder: z.number().int().nonnegative().default(0),
	dietaryFlags: z.array(z.enum(DIETARY_FLAGS)).default([]),
	allergens: z.array(z.enum(ALLERGENS)).default([]),
	goodFor: z.array(z.string().max(50)).max(10).default([]),
	confidence: z.enum(['verified', 'needs-review', 'staff-confirm']).default('needs-review')
});

export type ProductInput = z.infer<typeof productSchema>;

// ---------------------------------------------------------------------------
// OutletTable schema
// ---------------------------------------------------------------------------

export const outletTableSchema = z.object({
	code: z.string().min(1, 'Kode meja wajib diisi').max(20, 'Kode meja terlalu panjang'),
	label: z.string().min(1, 'Label meja wajib diisi').max(100, 'Label meja terlalu panjang'),
	isActive: z.boolean().default(true)
});

export type OutletTableInput = z.infer<typeof outletTableSchema>;

// ---------------------------------------------------------------------------
// Create / Update outlet schemas (used in outlet-repository.ts)
// ---------------------------------------------------------------------------

export const createOutletSchema = z.object({
	organizationId: z.string().uuid('Organization ID tidak valid'),
	name: z.string().min(1, 'Nama wajib diisi').max(100, 'Nama terlalu panjang'),
	slug: z
		.string()
		.min(1, 'Slug wajib diisi')
		.max(80, 'Slug terlalu panjang')
		.regex(/^[a-z0-9-]+$/, 'Slug hanya boleh huruf kecil, angka, dan tanda hubung'),
	businessType: z.enum(BUSINESS_TYPES, { message: 'Tipe bisnis tidak valid' }),
	location: z.string().max(200, 'Lokasi terlalu panjang').default(''),
	timezone: z.enum(TIMEZONES, { message: 'Timezone tidak valid' }).default('Asia/Jakarta'),
	defaultLanguageTag: z.enum(LANGUAGE_TAGS, { message: 'Bahasa tidak valid' }).default('id'),
	description: z.string().max(1000, 'Deskripsi terlalu panjang').default(''),
	heroImageUrl: z.string().url('URL gambar tidak valid').or(z.literal('')).default(''),
	publicHost: z.string().max(253, 'Host terlalu panjang').default('')
});

export type CreateOutletInput = z.infer<typeof createOutletSchema>;

export const updateOutletSchema = createOutletSchema
	.omit({ organizationId: true })
	.partial();

export type UpdateOutletInput = z.infer<typeof updateOutletSchema>;
