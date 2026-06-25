<script lang="ts">
	import { t, tWithVars } from '$lib/i18n';
	import { formatPrice } from '$lib/domain/menu/policy';
	import type { OrderStatus } from '$lib/domain/order/types';
	import Button from '$lib/ui/button/button.svelte';
	import { Check, ChefHat, Package, ArrowLeft, ChevronDown, ChevronUp } from '@lucide/svelte';

	const { data } = $props();
	const restaurant = $derived(data.restaurant);
	const order = $derived(data.order);

	const statusSteps: { key: OrderStatus; icon: typeof Check }[] = [
		{ key: 'new', icon: Package },
		{ key: 'processing', icon: ChefHat },
		{ key: 'ready', icon: Check }
	];

	const statusIndex = $derived(statusSteps.findIndex((s) => s.key === order.status));
	const isCancelled = $derived(order.status === 'cancelled');
	const isCompleted = $derived(order.status === 'completed');

	let itemsExpanded = $state(false);
</script>

<svelte:head>
	<title>{tWithVars('order.title', { id: order.id.slice(0, 8) })} — {restaurant.name}</title>
</svelte:head>

<div class="mx-auto max-w-lg px-4 py-6">
	<!-- Header -->
	<div class="mb-6 text-center">
		<h1 class="text-xl font-bold text-gray-900">{t('order.heading')}</h1>
		<p class="mt-1 text-sm text-gray-500">
			{t('order.id')}: <span class="font-mono">{order.id.slice(0, 8)}</span>
		</p>
	</div>

	<!-- Status Timeline -->
	{#if !isCancelled && !isCompleted}
		<div class="mb-8">
			<div class="flex items-center justify-between">
				{#each statusSteps as step, i (step.key)}
					{@const reached = i <= statusIndex}
					{@const current = i === statusIndex}
					<div class="flex flex-col items-center gap-2">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-full border-2 transition-colors"
							class:border-emerald-500={reached}
							class:bg-emerald-500={reached}
							class:text-white={reached}
							class:border-gray-300={!reached}
							class:bg-white={!reached}
							class:text-gray-400={!reached}
							class:ring-4={current}
							class:ring-emerald-100={current}
						>
							<step.icon class="h-6 w-6" />
						</div>
						<span
							class="text-xs font-medium"
							class:text-emerald-700={reached}
							class:text-gray-400={!reached}
						>
							{t(`order.status.${step.key}`)}
						</span>
					</div>
					{#if i < statusSteps.length - 1}
						<div
							class="mb-6 h-1 flex-1 rounded-full transition-colors"
							class:bg-emerald-500={i < statusIndex}
							class:bg-gray-200={i >= statusIndex}
						></div>
					{/if}
				{/each}
			</div>
		</div>
	{:else}
		<div class="mb-8 rounded-xl p-4 text-center" class:bg-red-50={isCancelled} class:bg-emerald-50={isCompleted}>
			<p class="text-lg font-semibold" class:text-red-700={isCancelled} class:text-emerald-700={isCompleted}>
				{isCancelled ? t('order.status.cancelled') : t('order.status.completed')}
			</p>
		</div>
	{/if}

	<!-- Items Summary (collapsible) -->
	<div class="mb-6 rounded-xl border border-gray-200 bg-white">
		<button
			onclick={() => (itemsExpanded = !itemsExpanded)}
			class="flex w-full items-center justify-between px-4 py-3 text-left"
		>
			<span class="text-sm font-medium text-gray-700">
				{tWithVars('order.items', { count: String(order.items.length) })}
			</span>
			{#if itemsExpanded}
				<ChevronUp class="h-4 w-4 text-gray-400" />
			{:else}
				<ChevronDown class="h-4 w-4 text-gray-400" />
			{/if}
		</button>
		{#if itemsExpanded}
			<div class="border-t border-gray-100 px-4 py-3">
				<ul class="space-y-2">
					{#each order.items as item (item.id)}
						<li class="flex items-start justify-between text-sm">
							<div>
								<span class="font-medium text-gray-800">{item.quantity}× {item.name}</span>
								{#if item.notes}
									<p class="mt-0.5 text-xs text-gray-400">{item.notes}</p>
								{/if}
							</div>
							<span class="font-medium text-gray-600">{formatPrice(item.price * item.quantity)}</span>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>

	<!-- Total -->
	<div class="mb-8 rounded-xl border border-gray-200 bg-white px-4 py-3">
		<div class="flex items-center justify-between">
			<span class="text-sm font-medium text-gray-700">{t('order.total')}</span>
			<span class="text-lg font-bold text-gray-900">{formatPrice(order.total)}</span>
		</div>
		{#if order.customerName}
			<div class="mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
				<span class="text-sm text-gray-500">{t('order.customerName')}</span>
				<span class="text-sm font-medium text-gray-700">{order.customerName}</span>
			</div>
		{/if}
	</div>

	<!-- Actions -->
	<div class="flex flex-col gap-3">
		<Button variant="outline" href="/r/{restaurant.slug}">
			<ArrowLeft class="mr-2 h-4 w-4" />
			{t('order.backToCatalog')}
		</Button>
	</div>
</div>
