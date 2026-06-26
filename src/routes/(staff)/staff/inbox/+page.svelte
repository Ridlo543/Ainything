<script lang="ts">
	import { page } from '$app/state';
	import { goto, invalidate } from '$app/navigation';
	import { enhance } from '$app/forms';
	import * as Card from '$lib/ui/card';
	import { Clock, ShoppingBag, Inbox, ChefHat, CheckCircle, Package } from '@lucide/svelte';
	import type { PageData } from './$types';
	import type { Order, OrderStatus } from '$lib/domain/order/types';

	let { data }: { data: PageData } = $props();

	const orders = $derived(data.orders);

	const statusFilter = $derived(page.url.searchParams.get('status') ?? 'active');

	const filteredOrders = $derived.by(() => {
		if (statusFilter === 'active') {
			return orders.filter((o: Order) => o.status !== 'completed' && o.status !== 'cancelled');
		}
		if (statusFilter === 'completed') {
			return orders.filter((o: Order) => o.status === 'completed');
		}
		return orders;
	});

	const activeCount = $derived(
		orders.filter((o: Order) => o.status === 'new' || o.status === 'processing').length
	);

	// Poll every 15s to surface new orders without manual refresh.
	// Uses invalidate() so only this page's load re-runs, not the full layout.
	$effect(() => {
		const id = setInterval(() => invalidate('app:inbox'), 15_000);
		return () => clearInterval(id);
	});

	function formatTime(iso: string): string {
		return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			minimumFractionDigits: 0
		}).format(amount);
	}

	type StatusMeta = { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string };

	function statusVariant(status: OrderStatus): StatusMeta {
		switch (status) {
			case 'new':
				return { variant: 'default', label: 'Baru' };
			case 'processing':
				return { variant: 'secondary', label: 'Diproses' };
			case 'ready':
				return { variant: 'outline', label: 'Siap' };
			case 'completed':
				return { variant: 'outline', label: 'Selesai' };
			case 'cancelled':
				return { variant: 'destructive', label: 'Dibatalkan' };
			default:
				return { variant: 'secondary', label: status };
		}
	}

	/**
	 * The valid one-tap transitions shown on each card:
	 *   new       → processing  (Proses)
	 *   processing → ready      (Siap)
	 *   ready     → completed   (Selesai)
	 *
	 * Cancellation is available on new + processing only (destructive — use detail page).
	 */
	type NextTransition = { status: OrderStatus; label: string; icon: typeof ChefHat };

	function nextTransition(status: OrderStatus): NextTransition | null {
		switch (status) {
			case 'new':
				return { status: 'processing', label: 'Proses', icon: ChefHat };
			case 'processing':
				return { status: 'ready', label: 'Siap', icon: Package };
			case 'ready':
				return { status: 'completed', label: 'Selesai', icon: CheckCircle };
			default:
				return null;
		}
	}

	function setFilter(status: string) {
		const url = new URL(page.url);
		url.searchParams.set('status', status);
		goto(url.pathname + url.search);
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-xl font-bold">Antrian Pesanan</h1>
			<p class="text-sm text-muted-foreground">
				{activeCount > 0 ? `${activeCount} pesanan aktif` : 'Tidak ada pesanan aktif'}
			</p>
		</div>
	</div>

	<!-- Status filter tabs -->
	<div class="flex gap-1 rounded-lg bg-muted p-1">
		{#each [['active', 'Aktif'], ['completed', 'Selesai'], ['all', 'Semua']] as [val, lbl] (val)}
			<button
				onclick={() => setFilter(val)}
				class="flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors
					{statusFilter === val
					? 'bg-background shadow-sm text-foreground'
					: 'text-muted-foreground hover:text-foreground'}"
			>
				{lbl}
				{#if val === 'active' && activeCount > 0}
					<span
						class="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground"
					>
						{activeCount}
					</span>
				{/if}
			</button>
		{/each}
	</div>

	<!-- Order list -->
	{#if filteredOrders.length === 0}
		<div class="flex flex-col items-center gap-3 py-16 text-center">
			<Inbox size={40} class="text-muted-foreground/40" />
			<p class="text-sm text-muted-foreground">
				{statusFilter === 'active' ? 'Tidak ada pesanan aktif.' : 'Tidak ada pesanan.'}
			</p>
		</div>
	{:else}
		<div class="space-y-3">
			{#each filteredOrders as order (order.id)}
				{@const sv = statusVariant(order.status)}
				{@const next = nextTransition(order.status)}
				<Card.Root>
					<Card.Content class="p-4">
						<div class="flex items-start justify-between gap-3">
							<!-- Left: order info -->
							<a href="/staff/orders/{order.id}" class="min-w-0 flex-1 space-y-1">
								<div class="flex items-center gap-2">
									<span class="font-semibold">{order.tableCode ?? '—'}</span>
									<span
										class="rounded-full px-2 py-0.5 text-xs font-medium
											{sv.variant === 'default'
											? 'bg-primary text-primary-foreground'
											: sv.variant === 'secondary'
												? 'bg-secondary text-secondary-foreground'
												: sv.variant === 'destructive'
													? 'bg-destructive text-destructive-foreground'
													: 'border text-foreground'}"
									>
										{sv.label}
									</span>
								</div>
								<div class="flex items-center gap-1.5 text-xs text-muted-foreground">
									<ShoppingBag size={12} />
									{order.itemCount} item — {formatCurrency(order.total)}
									<span class="ml-auto flex items-center gap-1">
										<Clock size={12} />
										{formatTime(order.createdAt)}
									</span>
								</div>
								{#if order.customerName}
									<p class="text-xs text-muted-foreground">{order.customerName}</p>
								{/if}
							</a>

							<!-- Right: quick-transition button -->
							{#if next}
								<form
									method="POST"
									action="?/transition"
									use:enhance={() => {
										return ({ update }) => update({ invalidateAll: false });
									}}
								>
									<input type="hidden" name="orderId" value={order.id} />
									<input type="hidden" name="status" value={next.status} />
									<button
										type="submit"
										class="flex h-10 min-w-[80px] shrink-0 items-center justify-center gap-1.5
											rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground
											transition-colors hover:bg-primary/90 active:scale-95"
									>
										<next.icon size={14} />
										{next.label}
									</button>
								</form>
							{/if}
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{/if}
</div>
