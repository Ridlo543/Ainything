import { z } from 'zod';
import type { AuthUser } from '$lib/domain/auth/types';
import type { PaymentMethod, PaymentMethodType } from '$lib/domain/outlet/types';
import {
	listAllPaymentMethods,
	upsertPaymentMethod,
	deletePaymentMethod,
	reorderPaymentMethods
} from '$lib/server/repositories/payment-method-repository';

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class PaymentMethodError extends Error {
	constructor(
		message: string,
		public readonly code: string
	) {
		super(message);
		this.name = 'PaymentMethodError';
	}
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const PAYMENT_METHOD_TYPES = ['qris', 'bank_transfer', 'ewallet', 'cash', 'other'] as const;

const upsertPaymentMethodSchema = z.object({
	id: z.string().uuid().optional(),
	type: z.enum(PAYMENT_METHOD_TYPES),
	label: z.string().min(1).max(100),
	accountNumber: z.string().max(100).nullish(),
	accountName: z.string().max(100).nullish(),
	qrImageUrl: z.string().url().max(2048).nullish(),
	instructions: z.string().max(500).nullish(),
	isActive: z.boolean().optional(),
	sortOrder: z.number().int().optional()
});

const deletePaymentMethodSchema = z.object({
	paymentMethodId: z.string().uuid('Invalid payment method ID')
});

const reorderPaymentMethodsSchema = z.object({
	orderedIds: z.array(z.string().uuid()).min(1)
});

export type UpsertPaymentMethodInput = z.infer<typeof upsertPaymentMethodSchema>;

// ---------------------------------------------------------------------------
// Permission guard
// ---------------------------------------------------------------------------

function requireOwnerOrManager(user: AuthUser): void {
	const role = user.memberships?.[0]?.role;
	if (role === 'staff') {
		throw new PaymentMethodError(
			'Only owners and managers can manage payment methods.',
			'FORBIDDEN'
		);
	}
}

function getExternalId(user: AuthUser): string {
	return user.id;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function listPaymentMethodsForDashboard(
	user: AuthUser,
	outletId: string,
	organizationId: string
): Promise<PaymentMethod[]> {
	return listAllPaymentMethods({
		organizationId,
		outletId,
		externalId: getExternalId(user)
	});
}

export async function savePaymentMethod(
	user: AuthUser,
	organizationId: string,
	outletId: string,
	rawInput: unknown
): Promise<PaymentMethod> {
	requireOwnerOrManager(user);

	const parsed = upsertPaymentMethodSchema.safeParse(rawInput);
	if (!parsed.success) {
		const firstIssue = parsed.error.issues[0];
		throw new PaymentMethodError(
			firstIssue?.message ?? 'Invalid payment method data',
			'VALIDATION_ERROR'
		);
	}

	return upsertPaymentMethod({
		organizationId,
		outletId,
		externalId: getExternalId(user),
		data: {
			id: parsed.data.id,
			type: parsed.data.type as PaymentMethodType,
			label: parsed.data.label,
			accountNumber: parsed.data.accountNumber ?? null,
			accountName: parsed.data.accountName ?? null,
			qrImageUrl: parsed.data.qrImageUrl ?? null,
			instructions: parsed.data.instructions ?? null,
			isActive: parsed.data.isActive,
			sortOrder: parsed.data.sortOrder
		}
	});
}

export async function removePaymentMethod(
	user: AuthUser,
	organizationId: string,
	outletId: string,
	rawInput: unknown
): Promise<void> {
	requireOwnerOrManager(user);

	const parsed = deletePaymentMethodSchema.safeParse(rawInput);
	if (!parsed.success) {
		throw new PaymentMethodError('Invalid payment method ID', 'VALIDATION_ERROR');
	}

	await deletePaymentMethod({
		organizationId,
		outletId,
		paymentMethodId: parsed.data.paymentMethodId,
		externalId: getExternalId(user)
	});
}

export async function reorderPaymentMethodItems(
	user: AuthUser,
	organizationId: string,
	outletId: string,
	rawInput: unknown
): Promise<void> {
	requireOwnerOrManager(user);

	const parsed = reorderPaymentMethodsSchema.safeParse(rawInput);
	if (!parsed.success) {
		throw new PaymentMethodError('Invalid order data', 'VALIDATION_ERROR');
	}

	await reorderPaymentMethods({
		organizationId,
		outletId,
		externalId: getExternalId(user),
		orderedIds: parsed.data.orderedIds
	});
}
