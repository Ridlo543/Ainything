import type { OrderStatus } from './types';

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
	new: ['processing', 'cancelled'],
	processing: ['ready', 'cancelled'],
	ready: ['completed'],
	completed: [],
	cancelled: []
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
	return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}
