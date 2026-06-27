<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/ui/card';
	import * as Badge from '$lib/ui/badge';
	import * as Button from '$lib/ui/button';
	import * as Separator from '$lib/ui/separator';
	import {
		ArrowLeft,
		Clock,
		CheckCircle,
		XCircle,
		ChefHat,
		Package,
		Phone,
		Check,
		X
	} from '@lucide/svelte';
	import OrderStatusTimeline from '$lib/ui/OrderStatusTimeline.svelte';
	import StaffChatWindow from '$lib/ui/chat/StaffChatWindow.svelte';
	import type { PageData, ActionData } from './$types';
	import type { OrderStatus } from '$lib/domain/order/types';

	let { data, form }: { data: PageData; form?: ActionData } = $props();

	const order = $derived(data.order);

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			minimumFractionDigits: 0
		}).format(amount);
	}

	function formatDateTime(iso: string): string {
		return new Date(iso).toLocaleString('id-ID', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function statusConfig(status: OrderStatus): {
		variant: 'default' | 'secondary' | 'destructive' | 'outline';
		label: string;
		icon: typeof Clock;
	} {
		switch (status) {
			case 'new':
				return { variant: 'default', label: 'Pesanan Baru', icon: Clock };
			case 'processing':
				return { variant: 'secondary', label: 'Sedang Diproses', icon: ChefHat };
			case 'ready':
				return { variant: 'outline', label: 'Siap Diambil', icon: Package };
			case 'completed':
				return { variant: 'outline', label: 'Selesai', icon: CheckCircle };
			case 'cancelled':
				return { variant: 'destructive', label: 'Dibatalkan', icon: XCircle };
		}
	}

	function nextActions(status: OrderStatus): {
		status: OrderStatus;
		label: string;
		variant: 'default' | 'secondary' | 'destructive' | 'outline';
	}[] {
		switch (status) {
			case 'new':
				return [
					{ status: 'processing', label: 'Mulai Proses', variant: 'default' },
					{ status: 'cancelled', label: 'Tolak', variant: 'destructive' }
				];
			case 'processing':
				return [
					{ status: 'ready', label: 'Tandai Siap', variant: 'default' },
					{ status: 'cancelled', label: 'Batalkan', variant: 'destructive' }
				];
			case 'ready':
				return [{ status: 'completed', label: 'Selesai', variant: 'default' }];
			default:
				return [];
		}
	}

	const config = $derived(statusConfig(order.status));
	const actions = $derived(nextActions(order.status));
</script>

<div class="space-y-4">
	<div class="flex items-center gap-3">
		<a
			href="/staff/inbox"
			class="tap-target flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground transition-colors"
		>
			<ArrowLeft size={20} />
		</a>
		<div class="flex-1">
			<h1 class="text-xl font-bold">Pesanan #{String(order.orderNumber).padStart(4, '0')}</h1>
			<p class="text-sm text-muted-foreground">{formatDateTime(order.createdAt)}</p>
		</div>
		<Badge.Badge variant={config.variant}>
			<config.icon size={12} class="mr-1" />
			{config.label}
		</Badge.Badge>
	</div>

	{#if form?.error}
		<div
			class="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
		>
			{form.error}
		</div>
	{/if}

	<Card.Root>
		<Card.Content>
			<OrderStatusTimeline status={order.status} />
		</Card.Content>
	</Card.Root>

	{#if order.tableCode || order.customerName}
		<Card.Root>
			<Card.Content class="space-y-1">
				{#if order.tableCode}
					<p class="text-sm">
						<span class="text-muted-foreground">Meja:</span>
						<span class="font-medium">{order.tableCode}</span>
					</p>
				{/if}
				{#if order.customerName}
					<p class="text-sm">
						<span class="text-muted-foreground">Pelanggan:</span>
						<span class="font-medium">{order.customerName}</span>
					</p>
				{/if}
			</Card.Content>
		</Card.Root>
	{/if}

	<Card.Root>
		<Card.Header>
			<h2 class="font-semibold">Item Pesanan</h2>
		</Card.Header>
		<Card.Content class="space-y-3">
			{#each order.items as item (item.id)}
				<div class="flex items-start justify-between gap-3">
					<div class="min-w-0 flex-1">
						<p class="text-sm font-medium">{item.name}</p>
						{#if item.notes}
							<p class="text-xs italic text-muted-foreground">"{item.notes}"</p>
						{/if}
					</div>
					<div class="flex items-center gap-2 text-sm">
						<span class="text-muted-foreground">{item.quantity}x</span>
						<span class="font-medium">{formatCurrency(item.price * item.quantity)}</span>
					</div>
				</div>
			{/each}
			<Separator.Root />
			<div class="flex items-center justify-between">
				<span class="font-semibold">Total</span>
				<span class="text-lg font-bold">{formatCurrency(order.total)}</span>
			</div>
		</Card.Content>
	</Card.Root>

	{#if order.notes}
		<Card.Root>
			<Card.Content>
				<p class="text-sm text-muted-foreground">Catatan:</p>
				<p class="text-sm italic">"{order.notes}"</p>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Payment section: buyer WA + proof + confirm/reject -->
	{#if order.buyerWhatsapp || order.paymentProofUrl}
		<Card.Root>
			<Card.Content class="space-y-3">
				<p class="text-sm font-semibold">Pembayaran</p>

				{#if order.buyerWhatsapp}
					<a
						href="https://wa.me/{order.buyerWhatsapp.replace(/\D/g, '')}"
						target="_blank"
						rel="noopener noreferrer"
						class="flex min-h-[44px] items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 hover:bg-green-100"
					>
						<Phone size={14} class="shrink-0" />
						Hubungi via WA: {order.buyerWhatsapp}
					</a>
				{/if}

				{#if order.paymentProofUrl}
					<div class="space-y-2">
						<p class="text-xs text-muted-foreground">Bukti pembayaran:</p>
						<a href={order.paymentProofUrl} target="_blank" rel="noopener noreferrer">
							<img
								src={order.paymentProofUrl}
								alt="Bukti pembayaran"
								class="h-32 w-auto rounded-lg object-cover"
							/>
						</a>
					</div>
				{/if}

				{#if order.paymentConfirmedAt}
					<div class="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2">
						<Check size={14} class="shrink-0 text-emerald-600" />
						<p class="text-sm text-emerald-700">Pembayaran dikonfirmasi</p>
					</div>
				{:else if order.paymentRejectedAt}
					<div class="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2">
						<X size={14} class="shrink-0 text-red-600" />
						<p class="text-sm text-red-700">Pembayaran ditolak</p>
					</div>
				{:else if order.paymentProofUrl}
					<!-- Proof uploaded but not yet actioned — show confirm/reject buttons -->
					{#if form?.error}
						<p class="text-sm text-destructive">{form.error}</p>
					{/if}
					<div class="flex gap-2">
						<form method="POST" action="?/confirmPayment" use:enhance class="flex-1">
							<input type="hidden" name="orderId" value={order.id} />
							<Button.Root type="submit" class="w-full tap-target" variant="default">
								<Check size={14} class="mr-1" /> Konfirmasi
							</Button.Root>
						</form>
						<form method="POST" action="?/rejectPayment" use:enhance class="flex-1">
							<input type="hidden" name="orderId" value={order.id} />
							<Button.Root type="submit" class="w-full tap-target" variant="destructive">
								<X size={14} class="mr-1" /> Tolak
							</Button.Root>
						</form>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	{/if}

	{#if actions.length > 0}
		<div class="flex gap-3">
			{#each actions as action (action.status)}
				<form method="POST" action="?/transition" use:enhance class="flex-1">
					<input type="hidden" name="status" value={action.status} />
					<Button.Root type="submit" variant={action.variant} class="w-full tap-target">
						{action.label}
					</Button.Root>
				</form>
			{/each}
		</div>
	{/if}

	{#if order.completedAt}
		<p class="text-center text-xs text-muted-foreground">
			Selesai: {formatDateTime(order.completedAt)}
		</p>
	{/if}

	<!-- Chat panel — only shown when a fallback_request exists for this order's buyer session -->
	{#if data.fallbackRequestId}
		<StaffChatWindow roomId={data.fallbackRequestId} senderName={data.staffName} />
	{/if}
</div>
