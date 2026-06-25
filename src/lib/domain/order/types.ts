export type OrderStatus = 'new' | 'processing' | 'ready' | 'completed' | 'cancelled';

export type Order = {
	id: string;
	organizationId: string;
	restaurantId: string;
	sessionId: string | null;
	tableId: string | null;
	tableCode: string | null;
	customerName: string | null;
	status: OrderStatus;
	total: number;
	itemCount: number;
	notes: string | null;
	createdAt: string;
	updatedAt: string;
	completedAt: string | null;
};

export type OrderItem = {
	id: string;
	orderId: string;
	menuItemId: string | null;
	name: string;
	quantity: number;
	price: number;
	notes: string | null;
};

export type OrderWithItems = Order & { items: OrderItem[] };
