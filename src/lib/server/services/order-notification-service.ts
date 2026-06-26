/**
 * Order Notification Service
 *
 * Handles WhatsApp notifications for order lifecycle events:
 *   - New order placed (to buyer, if WA available)
 *   - Payment confirmed by staff (to buyer)
 *   - Payment rejected by staff (to buyer)
 *
 * All notification calls are fire-and-forget — a WA failure must NEVER
 * block the order flow. Errors are logged but not re-thrown.
 *
 * Message templates are written in Bahasa Indonesia (buyer-facing).
 * Keep them short and tap-readable on a phone screen.
 *
 * Architecture:
 *   Route action → OrderNotificationService → WhatsappProvider (adapter)
 *   No repository access — notifications are stateless.
 */

import { getWhatsappProvider } from '$lib/server/providers/whatsapp/factory';
import { formatPrice } from '$lib/domain/menu/policy';
import type { OrderItem } from '$lib/domain/order/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NewOrderNotificationParams = {
	buyerWhatsapp: string;
	outletName: string;
	/** Human-readable order number, e.g. "#0042" */
	orderNumber: string;
	orderId: string;
	tableCode: string | null;
	customerName: string | null;
	items: Pick<OrderItem, 'name' | 'quantity' | 'price'>[];
	total: number;
	checkoutMode: 'offline' | 'online';
};

export type PaymentConfirmedNotificationParams = {
	buyerWhatsapp: string;
	outletName: string;
	orderNumber: string;
	orderId: string;
	total: number;
};

export type PaymentRejectedNotificationParams = {
	buyerWhatsapp: string;
	outletName: string;
	orderNumber: string;
	orderId: string;
	notes: string | null;
};

// ---------------------------------------------------------------------------
// Message builders
// ---------------------------------------------------------------------------

function buildNewOrderMessage(params: NewOrderNotificationParams): string {
	const lines: string[] = [];

	lines.push(`✅ *Pesanan Diterima!*`);
	lines.push(`${params.outletName}`);
	lines.push('');

	if (params.tableCode) {
		lines.push(`🪑 Meja: ${params.tableCode}`);
	}
	if (params.customerName) {
		lines.push(`👤 ${params.customerName}`);
	}
	lines.push(`🧾 No. Pesanan: *${params.orderNumber}*`);
	lines.push('');

	lines.push(`*Rincian Pesanan:*`);
	for (const item of params.items) {
		lines.push(`  ${item.quantity}x ${item.name}  ${formatPrice(item.price * item.quantity)}`);
	}
	lines.push('');
	lines.push(`*Total: ${formatPrice(params.total)}*`);

	if (params.checkoutMode === 'online') {
		lines.push('');
		lines.push(`💳 Silakan lakukan pembayaran dan unggah bukti transfer.`);
	} else {
		lines.push('');
		lines.push(`💵 Silakan lakukan pembayaran ke kasir.`);
	}

	return lines.join('\n');
}

function buildPaymentConfirmedMessage(params: PaymentConfirmedNotificationParams): string {
	const lines: string[] = [];

	lines.push(`✅ *Pembayaran Dikonfirmasi!*`);
	lines.push(`${params.outletName}`);
	lines.push('');
	lines.push(`🧾 No. Pesanan: *${params.orderNumber}*`);
	lines.push(`💰 Total: ${formatPrice(params.total)}`);
	lines.push('');
	lines.push(`Terima kasih sudah memesan di ${params.outletName}! 🙏`);

	return lines.join('\n');
}

function buildPaymentRejectedMessage(params: PaymentRejectedNotificationParams): string {
	const lines: string[] = [];

	lines.push(`❌ *Bukti Pembayaran Ditolak*`);
	lines.push(`${params.outletName}`);
	lines.push('');
	lines.push(`🧾 No. Pesanan: *${params.orderNumber}*`);

	if (params.notes) {
		lines.push('');
		lines.push(`📝 Catatan staf: ${params.notes}`);
	}

	lines.push('');
	lines.push(
		`Silakan unggah ulang bukti pembayaran yang benar, atau hubungi staf ${params.outletName}.`
	);

	return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Send a "new order placed" WA notification to the buyer.
 * Fire-and-forget — never throws.
 */
export async function notifyBuyerOrderPlaced(params: NewOrderNotificationParams): Promise<void> {
	try {
		const provider = getWhatsappProvider();
		const message = buildNewOrderMessage(params);

		const result = await provider.sendMessage({
			guestSessionId: params.orderId,
			phoneNumber: params.buyerWhatsapp,
			message,
			languageTag: 'id'
		});

		if (result.status === 'failed') {
			console.warn(
				`[order-notification] notifyBuyerOrderPlaced failed for order ${params.orderNumber}:`,
				result.errorReason
			);
		}
	} catch (err) {
		// Never let WA failure block the order flow.
		console.error('[order-notification] notifyBuyerOrderPlaced threw:', err);
	}
}

/**
 * Send a "payment confirmed" WA notification to the buyer.
 * Fire-and-forget — never throws.
 */
export async function notifyBuyerPaymentConfirmed(
	params: PaymentConfirmedNotificationParams
): Promise<void> {
	try {
		const provider = getWhatsappProvider();
		const message = buildPaymentConfirmedMessage(params);

		const result = await provider.sendMessage({
			guestSessionId: params.orderId,
			phoneNumber: params.buyerWhatsapp,
			message,
			languageTag: 'id'
		});

		if (result.status === 'failed') {
			console.warn(
				`[order-notification] notifyBuyerPaymentConfirmed failed for order ${params.orderNumber}:`,
				result.errorReason
			);
		}
	} catch (err) {
		console.error('[order-notification] notifyBuyerPaymentConfirmed threw:', err);
	}
}

/**
 * Send a "payment rejected" WA notification to the buyer.
 * Fire-and-forget — never throws.
 */
export async function notifyBuyerPaymentRejected(
	params: PaymentRejectedNotificationParams
): Promise<void> {
	try {
		const provider = getWhatsappProvider();
		const message = buildPaymentRejectedMessage(params);

		const result = await provider.sendMessage({
			guestSessionId: params.orderId,
			phoneNumber: params.buyerWhatsapp,
			message,
			languageTag: 'id'
		});

		if (result.status === 'failed') {
			console.warn(
				`[order-notification] notifyBuyerPaymentRejected failed for order ${params.orderNumber}:`,
				result.errorReason
			);
		}
	} catch (err) {
		console.error('[order-notification] notifyBuyerPaymentRejected threw:', err);
	}
}
