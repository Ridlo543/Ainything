<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/ui/card';
	import * as Badge from '$lib/ui/badge';
	import * as Button from '$lib/ui/button';
	import * as Separator from '$lib/ui/separator';
	import { ArrowLeft, Clock, CheckCircle, XCircle, ChefHat, Package } from '@lucide/svelte';
	import OrderStatusTimeline from '$lib/ui/OrderStatusTimeline.svelte';
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
			<h1 class="text-xl font-bold">Pesanan #{order.id.slice(0, 8)}</h1>
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
</div>
