<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import * as Card from '$lib/ui/card';
	import * as Badge from '$lib/ui/badge';
	import * as Tabs from '$lib/ui/tabs';
	import { Clock, ShoppingBag, Inbox } from '@lucide/svelte';
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

	function formatTime(iso: string): string {
		const d = new Date(iso);
		return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			minimumFractionDigits: 0
		}).format(amount);
	}

	function statusVariant(status: OrderStatus): {
		variant: 'default' | 'secondary' | 'destructive' | 'outline';
		label: string;
	} {
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

	<Tabs.Root value={statusFilter}>
		<Tabs.List>
			<Tabs.Trigger value="active" onclick={() => setFilter('active')}>Aktif</Tabs.Trigger>
			<Tabs.Trigger value="completed" onclick={() => setFilter('completed')}>Selesai</Tabs.Trigger>
			<Tabs.Trigger value="all" onclick={() => setFilter('all')}>Semua</Tabs.Trigger>
		</Tabs.List>
	</Tabs.Root>

	{#if filteredOrders.length === 0}
		<Card.Root>
			<Card.Content class="flex flex-col items-center py-12">
				<Inbox size={48} class="text-muted-foreground" />
				<p class="mt-4 font-semibold">Belum ada pesanan</p>
				<p class="mt-1 text-sm text-muted-foreground">
					Pesanan baru akan muncul di sini secara real-time.
				</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="space-y-3">
			{#each filteredOrders as order (order.id)}
				<a href="/staff/orders/{order.id}" class="block">
					<Card.Root class="transition-colors hover:bg-accent/50">
						<Card.Header class="pb-2">
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2">
									<span class="font-semibold">#{order.id.slice(0, 8)}</span>
									{#if order.tableCode}
										<Badge.Badge variant="outline">{order.tableCode}</Badge.Badge>
									{/if}
								</div>
								<Badge.Badge variant={statusVariant(order.status).variant}>
									{statusVariant(order.status).label}
								</Badge.Badge>
							</div>
						</Card.Header>
						<Card.Content>
							<div class="flex items-center justify-between text-sm">
								<div class="flex items-center gap-2 text-muted-foreground">
									<ShoppingBag size={14} />
									<span>{order.itemCount} item</span>
								</div>
								<div class="flex items-center gap-3">
									<span class="font-medium">{formatCurrency(order.total)}</span>
									<span class="flex items-center gap-1 text-xs text-muted-foreground">
										<Clock size={12} />
										{formatTime(order.createdAt)}
									</span>
								</div>
							</div>
							{#if order.customerName}
								<p class="mt-1 text-xs text-muted-foreground">{order.customerName}</p>
							{/if}
							{#if order.notes}
								<p class="mt-1 text-xs italic text-muted-foreground">"{order.notes}"</p>
							{/if}
						</Card.Content>
					</Card.Root>
				</a>
			{/each}
		</div>
	{/if}
</div>
