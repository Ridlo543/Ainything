import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { withTransaction } from '$lib/server/db/postgres';
import {
	loadProductsForOutlet,
	loadCatalogsForOutlet
} from '$lib/server/repositories/admin-menu-repository';
import {
	setProductAvailability,
	createProduct,
	updateProduct
} from '$lib/server/services/catalog-admin-service';
import { getStorageProvider } from '$lib/server/providers/storage/factory';
import { productSchema } from '$lib/domain/outlet/schema';

// Max image upload size: 5 MB
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const PLACEHOLDER_IMG = '/assets/placeholder-product.svg';

export const load: PageServerLoad = async ({ parent }) => {
	const { tenant } = await parent();
	const org = tenant.organization;
	const outlet = tenant.activeOutlet;

	const [products, catalogs] = await withTransaction((client) =>
		Promise.all([
			loadProductsForOutlet(client, { organizationId: org.id, outletId: outlet.id }),
			loadCatalogsForOutlet(client, { organizationId: org.id, outletId: outlet.id })
		])
	);

	const uiProducts = products.map((p) => ({
		id: p.id,
		name: p.name,
		category: p.section,
		price: p.price,
		status: p.isAvailable ? ('active' as const) : ('hidden' as const),
		img: p.imageUrl || PLACEHOLDER_IMG,
		orders: 0,
		description: p.description,
		dietaryFlags: p.dietaryFlags,
		allergens: p.allergens,
		isSignature: p.isSignature
	}));

	const cats = [...new Set(uiProducts.map((p) => p.category))].sort();
	const publishedCatalog = catalogs.find((c) => c.status === 'published') ?? catalogs[0] ?? null;

	return {
		products: uiProducts,
		categories: ['Semua', ...cats],
		defaultCatalogId: publishedCatalog?.id ?? null
	};
};

export const actions: Actions = {
	/**
	 * Toggle a product's visibility status (active ↔ hidden).
	 */
	toggleAvailability: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Not authenticated' });

		const formData = await request.formData();
		const itemId = formData.get('itemId') as string;
		const currentStatus = formData.get('currentStatus') as string;

		if (!itemId) return fail(400, { error: 'Missing item ID' });

		const newAvailable = currentStatus === 'hidden';

		try {
			await setProductAvailability(user, itemId, newAvailable);
			return { success: true, itemId, newStatus: newAvailable ? 'active' : 'hidden' };
		} catch (err) {
			console.error('[catalog] toggleAvailability failed:', err);
			return fail(500, { error: 'Failed to update product availability' });
		}
	},

	/**
	 * Create or update a product.
	 * Accepts an optional image file — uploads via the storage provider and persists
	 * the resulting URL in image_url. Use enctype="multipart/form-data" on the form.
	 */
	upsertProduct: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Not authenticated' });

		let formData: FormData;
		try {
			formData = await request.formData();
		} catch {
			return fail(400, { error: 'Invalid form data' });
		}

		const productId = formData.get('productId')?.toString().trim() || null;
		const name = formData.get('name')?.toString().trim();
		const priceRaw = formData.get('price')?.toString().trim();
		const description = formData.get('description')?.toString().trim() ?? '';
		const status = formData.get('status')?.toString() ?? 'active';
		const catalogId = formData.get('catalogId')?.toString().trim() || null;
		const sectionId = formData.get('sectionId')?.toString().trim() || null;
		const imageFile = formData.get('image') instanceof File ? (formData.get('image') as File) : null;

		// Validate required fields.
		if (!name) return fail(400, { errors: { name: ['Nama produk wajib diisi.'] } });
		const price = Number(priceRaw);
		if (!priceRaw || isNaN(price) || price < 0) {
			return fail(400, { errors: { price: ['Harga tidak valid.'] } });
		}

		// Handle image upload if a file was provided and has content.
		let imageUrl: string | undefined;
		if (imageFile && imageFile.size > 0) {
			if (!ALLOWED_MIME.has(imageFile.type)) {
				return fail(400, {
					errors: { image: ['Format gambar tidak didukung. Gunakan JPG, PNG, atau WebP.'] }
				});
			}
			if (imageFile.size > MAX_IMAGE_BYTES) {
				return fail(400, { errors: { image: ['Ukuran gambar maksimal 5 MB.'] } });
			}

			try {
				const { resolveTenantContext } = await import('$lib/server/tenant/tenant-context');
				const tenant = await resolveTenantContext(user);
				const buffer = new Uint8Array(await imageFile.arrayBuffer());
				const storage = getStorageProvider();
				const result = await storage.storeFile(buffer, {
					organizationId: tenant.organization.id,
					sourceType: 'item-image',
					fileName: imageFile.name,
					mimeType: imageFile.type,
					sizeBytes: imageFile.size
				});
				imageUrl = result.publicUrl;
			} catch (err) {
				console.error('[catalog] image upload failed:', err);
				return fail(500, { error: 'Gagal mengupload gambar. Coba lagi.' });
			}
		}

		const isAvailable = status === 'active';

		try {
			if (productId) {
				// Update existing product.
				const { resolveTenantContext } = await import('$lib/server/tenant/tenant-context');
				const tenant = await resolveTenantContext(user);
				await updateProduct(user, productId, tenant.activeOutlet.id, {
					name,
					description,
					price,
					isAvailable,
					...(imageUrl !== undefined ? { imageUrl } : {})
				});
				return { success: true, action: 'updated' as const };
			} else {
				// Create new product — catalogId is required.
				if (!catalogId) {
					return fail(400, {
						error: 'Outlet belum memiliki katalog. Buat katalog terlebih dahulu.'
					});
				}
				const { resolveTenantContext } = await import('$lib/server/tenant/tenant-context');
				const tenant = await resolveTenantContext(user);
				const productInput = productSchema.parse({
					name,
					description,
					price,
					isAvailable,
					imageUrl: imageUrl ?? ''
				});
				await createProduct(
					user,
					{ outletId: tenant.activeOutlet.id, catalogId, sectionId: sectionId ?? undefined },
					productInput
				);
				return { success: true, action: 'created' as const };
			}
		} catch (err) {
			console.error('[catalog] upsertProduct failed:', err);
			return fail(500, { error: 'Gagal menyimpan produk.' });
		}
	},

	/**
	 * Delete a product by ID, scoped by tenant for safety.
	 */
	deleteProduct: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Not authenticated' });

		const formData = await request.formData();
		const productId = formData.get('productId')?.toString().trim();
		if (!productId) return fail(400, { error: 'Missing productId' });

		try {
			const { resolveTenantContext } = await import('$lib/server/tenant/tenant-context');
			const tenant = await resolveTenantContext(user);

			await withTransaction(async (client) => {
				const result = await client.query(
					`DELETE FROM products
					 WHERE id = $1::uuid
					   AND organization_id = $2::uuid
					   AND outlet_id = $3::uuid`,
					[productId, tenant.organization.id, tenant.activeOutlet.id]
				);
				if ((result.rowCount ?? 0) === 0) {
					throw new Error('Product not found or access denied');
				}
			});

			return { success: true, action: 'deleted' as const };
		} catch (err) {
			console.error('[catalog] deleteProduct failed:', err);
			return fail(500, { error: 'Gagal menghapus produk.' });
		}
	}
};
