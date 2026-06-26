export type OrderStatus = 'new' | 'processing' | 'ready' | 'completed' | 'cancelled';

export type Order = {
	id: string;
	organizationId: string;
	outletId: string;
	buyerSessionId: string | null;
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
	/** Human-readable sequential number (migration 0016). Display as #XXXX — never show raw UUID to buyers. */
	orderNumber: number;
	// Payment confirmation fields (migration 0015)
	buyerWhatsapp: string | null;
	paymentProofUrl: string | null;
	paymentConfirmedAt: string | null;
	paymentConfirmedBy: string | null;
	paymentRejectedAt: string | null;
	paymentRejectedBy: string | null;
	paymentNotes: string | null;
};

export type OrderItem = {
	id: string;
	orderId: string;
	productId: string | null;
	name: string;
	quantity: number;
	price: number;
	notes: string | null;
};

export type OrderWithItems = Order & { items: OrderItem[] };
