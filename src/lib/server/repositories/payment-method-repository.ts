import { getPool, withUserContext } from '$lib/server/db/postgres';
import type { PaymentMethod, PaymentMethodType } from '$lib/domain/outlet/types';
import type { PoolClient } from 'pg';

// ---------------------------------------------------------------------------
// Row types
// ---------------------------------------------------------------------------

type PaymentMethodRow = {
	id: string;
	organization_id: string;
	outlet_id: string;
	type: string;
	label: string;
	account_number: string | null;
	account_name: string | null;
	qr_image_url: string | null;
	instructions: string | null;
	is_active: boolean;
	sort_order: number;
	created_at: Date;
	updated_at: Date;
};

function mapRow(row: PaymentMethodRow): PaymentMethod {
	return {
		id: row.id,
		organizationId: row.organization_id,
		outletId: row.outlet_id,
		type: row.type as PaymentMethodType,
		label: row.label,
		accountNumber: row.account_number,
		accountName: row.account_name,
		qrImageUrl: row.qr_image_url,
		instructions: row.instructions,
		isActive: row.is_active,
		sortOrder: row.sort_order,
		createdAt: row.created_at.toISOString(),
		updatedAt: row.updated_at.toISOString()
	};
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** List active payment methods for an outlet. Public-safe — no auth needed. */
export async function listPaymentMethods(params: {
	organizationId: string;
	outletId: string;
}): Promise<PaymentMethod[]> {
	const pool = getPool();
	const result = await pool.query<PaymentMethodRow>(
		`SELECT id, organization_id, outlet_id, type, label,
		        account_number, account_name, qr_image_url, instructions,
		        is_active, sort_order, created_at, updated_at
		 FROM public.outlet_payment_methods
		 WHERE organization_id = $1
		   AND outlet_id = $2
		   AND is_active = true
		 ORDER BY sort_order ASC, created_at ASC`,
		[params.organizationId, params.outletId]
	);
	return result.rows.map(mapRow);
}

/** List all payment methods (including inactive) for the dashboard. */
export async function listAllPaymentMethods(params: {
	organizationId: string;
	outletId: string;
	externalId: string;
}): Promise<PaymentMethod[]> {
	const result = await withUserContext(params.externalId, (client: PoolClient) =>
		client.query<PaymentMethodRow>(
			`SELECT id, organization_id, outlet_id, type, label,
			        account_number, account_name, qr_image_url, instructions,
			        is_active, sort_order, created_at, updated_at
			 FROM public.outlet_payment_methods
			 WHERE organization_id = $1
			   AND outlet_id = $2
			 ORDER BY sort_order ASC, created_at ASC`,
			[params.organizationId, params.outletId]
		)
	);
	return result.rows.map(mapRow);
}

/** Upsert a payment method. Insert when no id, update when id provided. */
export async function upsertPaymentMethod(params: {
	organizationId: string;
	outletId: string;
	externalId: string;
	data: {
		id?: string;
		type: PaymentMethodType;
		label: string;
		accountNumber?: string | null;
		accountName?: string | null;
		qrImageUrl?: string | null;
		instructions?: string | null;
		isActive?: boolean;
		sortOrder?: number;
	};
}): Promise<PaymentMethod> {
	const { data, organizationId, outletId, externalId } = params;

	const result = await withUserContext(externalId, (client: PoolClient) => {
		if (data.id) {
			return client.query<PaymentMethodRow>(
				`UPDATE public.outlet_payment_methods
				 SET type           = $3,
				     label          = $4,
				     account_number = $5,
				     account_name   = $6,
				     qr_image_url   = $7,
				     instructions   = $8,
				     is_active      = COALESCE($9, is_active),
				     sort_order     = COALESCE($10, sort_order),
				     updated_at     = now()
				 WHERE id = $1
				   AND organization_id = $2
				   AND outlet_id = $11
				 RETURNING *`,
				[
					data.id,
					organizationId,
					data.type,
					data.label,
					data.accountNumber ?? null,
					data.accountName ?? null,
					data.qrImageUrl ?? null,
					data.instructions ?? null,
					data.isActive ?? null,
					data.sortOrder ?? null,
					outletId
				]
			);
		} else {
			return client.query<PaymentMethodRow>(
				`INSERT INTO public.outlet_payment_methods
				   (organization_id, outlet_id, type, label, account_number,
				    account_name, qr_image_url, instructions, is_active, sort_order)
				 VALUES ($1, $2, $3, $4, $5, $6, $7, $8,
				         COALESCE($9, true), COALESCE($10, 0))
				 RETURNING *`,
				[
					organizationId,
					outletId,
					data.type,
					data.label,
					data.accountNumber ?? null,
					data.accountName ?? null,
					data.qrImageUrl ?? null,
					data.instructions ?? null,
					data.isActive ?? null,
					data.sortOrder ?? null
				]
			);
		}
	});

	const row = result.rows[0];
	if (!row) throw new Error('upsertPaymentMethod returned no row');
	return mapRow(row);
}

/** Delete a payment method scoped to tenant. */
export async function deletePaymentMethod(params: {
	organizationId: string;
	outletId: string;
	paymentMethodId: string;
	externalId: string;
}): Promise<void> {
	await withUserContext(params.externalId, (client: PoolClient) =>
		client.query(
			`DELETE FROM public.outlet_payment_methods
			 WHERE id = $1
			   AND organization_id = $2
			   AND outlet_id = $3`,
			[params.paymentMethodId, params.organizationId, params.outletId]
		)
	);
}

/** Reorder: bulk-update sort_order using unnest. */
export async function reorderPaymentMethods(params: {
	organizationId: string;
	outletId: string;
	externalId: string;
	orderedIds: string[];
}): Promise<void> {
	if (params.orderedIds.length === 0) return;
	const ids = params.orderedIds;
	const orders = ids.map((_, i) => i);
	await withUserContext(params.externalId, (client: PoolClient) =>
		client.query(
			`UPDATE public.outlet_payment_methods AS p
			 SET sort_order = v.sort_order
			 FROM (
			   SELECT unnest($1::uuid[]) AS id,
			          unnest($2::int[])  AS sort_order
			 ) AS v
			 WHERE p.id = v.id
			   AND p.organization_id = $3
			   AND p.outlet_id = $4`,
			[ids, orders, params.organizationId, params.outletId]
		)
	);
}
