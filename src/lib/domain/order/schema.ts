import { z } from 'zod';

export const orderStatusSchema = z.enum(['new', 'processing', 'ready', 'completed', 'cancelled']);

export const createOrderSchema = z.object({
	outletId: z.string().uuid(),
	organizationId: z.string().uuid(),
	buyerSessionId: z.string().uuid().nullable().default(null),
	tableId: z.string().uuid().nullable().default(null),
	customerName: z.string().max(100).nullable().default(null),
	notes: z.string().max(500).nullable().default(null),
	items: z
		.array(
			z.object({
				productId: z.string().uuid().nullable().default(null),
				name: z.string().min(1).max(200),
				quantity: z.number().int().min(1).max(99),
				price: z.number().int().min(0),
				notes: z.string().max(500).nullable().default(null)
			})
		)
		.min(1, 'Order must have at least one item.')
});

export const transitionOrderStatusSchema = z.object({
	orderId: z.string().uuid(),
	outletId: z.string().uuid(),
	newStatus: z.enum(['processing', 'ready', 'completed', 'cancelled'])
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type TransitionOrderStatusInput = z.infer<typeof transitionOrderStatusSchema>;
