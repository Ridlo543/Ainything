import type { AuthUser } from '$lib/domain/auth/types';
import type { Order, OrderStatus, OrderWithItems } from '$lib/domain/order/types';
import { canTransitionOrder } from '$lib/domain/order/policy';
import { transitionOrderStatusSchema } from '$lib/domain/order/schema';
import { resolveTenantContext } from '$lib/server/tenant/tenant-context';
import {
	listOrdersForOutlet,
	findOrderById,
	updateOrderStatus
} from '$lib/server/repositories/order-repository';
import { withUserContext } from '$lib/server/db/postgres';

export class StaffOrderError extends Error {
	constructor(
		message: string,
		public readonly code: 'NOT_FOUND' | 'INVALID_TRANSITION' | 'UNAUTHORIZED'
	) {
		super(message);
		this.name = 'StaffOrderError';
	}
}

export async function listStaffOrders(
	user: AuthUser,
	{ statuses, outletSlug }: { statuses?: OrderStatus[]; outletSlug?: string } = {}
): Promise<Order[]> {
	const tenant = await resolveTenantContext(user, outletSlug);
	const { activeOutlet } = tenant;

	return listOrdersForOutlet({
		organizationId: activeOutlet.organizationId,
		outletId: activeOutlet.id,
		statuses
	});
}

export async function getStaffOrder(
	user: AuthUser,
	{ orderId, outletSlug }: { orderId: string; outletSlug?: string }
): Promise<OrderWithItems> {
	const tenant = await resolveTenantContext(user, outletSlug);
	const { activeOutlet } = tenant;

	const order: OrderWithItems | null = await withUserContext(user.id, async (client) => {
		return findOrderById(client, {
			organizationId: activeOutlet.organizationId,
			outletId: activeOutlet.id,
			orderId
		});
	});

	if (!order) {
		throw new StaffOrderError('Order not found.', 'NOT_FOUND');
	}

	return order;
}

export async function transitionStaffOrder(
	user: AuthUser,
	input: { orderId: string; outletSlug?: string; newStatus: OrderStatus }
): Promise<Order> {
	const tenant = await resolveTenantContext(user, input.outletSlug);
	const { activeOutlet } = tenant;

	const parsed = transitionOrderStatusSchema.safeParse({
		orderId: input.orderId,
		outletId: activeOutlet.id,
		newStatus: input.newStatus
	});

	if (!parsed.success) {
		throw new StaffOrderError(
			parsed.error.issues[0]?.message ?? 'Invalid input.',
			'INVALID_TRANSITION'
		);
	}

	const currentOrder: OrderWithItems | null = await withUserContext(user.id, async (client) => {
		return findOrderById(client, {
			organizationId: activeOutlet.organizationId,
			outletId: activeOutlet.id,
			orderId: input.orderId
		});
	});

	if (!currentOrder) {
		throw new StaffOrderError('Order not found.', 'NOT_FOUND');
	}

	if (!canTransitionOrder(currentOrder.status, input.newStatus)) {
		throw new StaffOrderError(
			`Cannot transition from ${currentOrder.status} to ${input.newStatus}.`,
			'INVALID_TRANSITION'
		);
	}

	const updated = await updateOrderStatus({
		userId: user.id,
		organizationId: activeOutlet.organizationId,
		outletId: activeOutlet.id,
		orderId: input.orderId,
		newStatus: input.newStatus
	});

	if (!updated) {
		throw new StaffOrderError('Order not found.', 'NOT_FOUND');
	}

	return updated;
}
