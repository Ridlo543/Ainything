import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import {
	getStaffOrder,
	transitionStaffOrder,
	StaffOrderError
} from '$lib/server/services/staff-order-service';
import { transitionOrderStatusSchema } from '$lib/domain/order/schema';
import type { OrderStatus } from '$lib/domain/order/types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const user = locals.user;
	if (!user) redirect(303, '/login');

	try {
		const order = await getStaffOrder(user, { orderId: params.id });
		return { order };
	} catch (err) {
		if (err instanceof StaffOrderError && err.code === 'NOT_FOUND') {
			redirect(303, '/staff/inbox');
		}
		throw err;
	}
};

export const actions: Actions = {
	transition: async ({ request, locals, params }) => {
		const user = locals.user;
		if (!user) redirect(303, '/login');

		const formData = await request.formData();
		const newStatus = formData.get('status') as string;

		const parsed = transitionOrderStatusSchema.safeParse({
			orderId: params.id,
			restaurantId: '',
			newStatus
		});

		if (!parsed.success) {
			return fail(400, { error: parsed.error.issues[0]?.message ?? 'Status tidak valid.' });
		}

		try {
			await transitionStaffOrder(user, {
				orderId: params.id,
				newStatus: newStatus as OrderStatus
			});
		} catch (err) {
			if (err instanceof StaffOrderError) {
				return fail(400, { error: err.message });
			}
			throw err;
		}

		redirect(303, `/staff/orders/${params.id}`);
	}
};
