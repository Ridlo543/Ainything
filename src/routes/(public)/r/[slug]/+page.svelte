<script lang="ts">
	import type { PageData } from './$types';
	import { t } from '$lib/i18n';
	import { formatPrice, spiceLabel } from '$lib/domain/menu/policy';
	import type { MenuItem } from '$lib/domain/menu/types';
	import SafetyBadges from '$lib/ui/menu/SafetyBadges.svelte';
	import { Dialog, DialogContent, DialogTitle, DialogDescription } from '$lib/ui/dialog';
	import Button from '$lib/ui/button/button.svelte';
	import { Search, Plus, Minus, ShoppingCart, X, Flame, Star, ShieldAlert } from '@lucide/svelte';
	import { createCartStore } from '$lib/client/cart.svelte';

	let { data }: { data: PageData } = $props();

	const restaurant = $derived(data.restaurant);
	const categories = $derived(['all', ...restaurant.categories]);
	const menuItems = $derived(restaurant.menuItems);

	let searchQuery = $state('');
	let activeCategory = $state('all');
	let detailItem = $state<MenuItem | null>(null);
	let detailOpen = $state(false);
	let detailQty = $state(1);

	const cart = $derived(createCartStore(data.slug));
	const cartCount = $derived(cart.count);
	const cartTotal = $derived(cart.total);

	const filteredItems = $derived(() => {
		let items = menuItems.filter((i) => i.isAvailable);
		if (activeCategory !== 'all') {
			items = items.filter((i) => i.category === activeCategory);
		}
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim();
			items = items.filter(
				(i) =>
					i.name.toLowerCase().includes(q) ||
					(i.localName ?? '').toLowerCase().includes(q) ||
					i.description.toLowerCase().includes(q) ||
					i.category.toLowerCase().includes(q)
			);
		}
		return items;
	});

	function openDetail(item: MenuItem) {
		detailItem = item;
		detailQty = 1;
		detailOpen = true;
	}

	function addToCart(item: MenuItem, qty: number) {
		cart.add(item, qty);
	}

	function quickAdd(item: MenuItem, event: MouseEvent) {
		event.stopPropagation();
		addToCart(item, 1);
	}
</script>

<svelte:head>
	<title>{restaurant.name} &middot; Menu</title>
</svelte:head>

<div class="space-y-4 pt-4">
	<!-- Search -->
	<div class="relative">
		<Search
			size={18}
			class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lingua-subtle"
		/>
		<input
			type="search"
			bind:value={searchQuery}
			placeholder={t('catalog.search.placeholder')}
			class="tap-target w-full rounded-lg border border-lingua-border bg-lingua-surface py-2.5 pl-10 pr-4 text-sm text-lingua-text placeholder:text-lingua-subtle focus:border-lingua-primary focus:outline-none focus:ring-2 focus:ring-lingua-primary/20"
		/>
		{#if searchQuery}
			<button
				type="button"
				onclick={() => (searchQuery = '')}
				class="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-lingua-subtle hover:bg-lingua-muted hover:text-lingua-text"
			>
				<X size={16} />
			</button>
		{/if}
	</div>

	<!-- Category tabs -->
	<div class="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4">
		{#each categories as cat (cat)}
			<button
				type="button"
				onclick={() => (activeCategory = cat)}
				class={`tap-target shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
					activeCategory === cat
						? 'border-lingua-primary bg-lingua-primary text-white'
						: 'border-lingua-border bg-lingua-surface text-lingua-subtle hover:border-lingua-primary/40 hover:text-lingua-text'
				}`}
			>
				{cat === 'all' ? t('catalog.category.all') : cat}
			</button>
		{/each}
	</div>

	<!-- Product grid -->
	{#if filteredItems().length === 0}
		<div class="flex flex-col items-center justify-center py-16 text-center">
			<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-lingua-muted">
				<Search size={28} class="text-lingua-subtle" />
			</div>
			<p class="text-sm font-medium text-lingua-text">{t('catalog.empty.title')}</p>
			<p class="mt-1 text-sm text-lingua-subtle">{t('catalog.empty.hint')}</p>
		</div>
	{:else}
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
			{#each filteredItems() as item (item.id)}
				<div
					role="button"
					tabindex="0"
					class="group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border border-lingua-border bg-lingua-surface transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lingua-primary/35"
					onclick={() => openDetail(item)}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							openDetail(item);
						}
					}}
				>
					<div class="aspect-square w-full overflow-hidden bg-lingua-muted">
						<img
							src={item.image}
							alt={item.name}
							class="h-full w-full object-cover transition-transform group-hover:scale-105"
							loading="lazy"
						/>
					</div>

					{#if item.isSignature}
						<span
							class="absolute left-1.5 top-1.5 inline-flex items-center gap-0.5 rounded-md bg-lingua-primary/90 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm"
						>
							<Star size={10} />
							{t('badge.signature')}
						</span>
					{/if}

					<div class="flex flex-1 flex-col gap-1 p-2.5">
						<p class="line-clamp-2 text-sm font-semibold leading-tight text-lingua-text">
							{item.name}
						</p>
						{#if item.localName}
							<p class="truncate text-xs text-lingua-subtle">{item.localName}</p>
						{/if}

						<div class="mt-auto flex items-center justify-between gap-1 pt-1.5">
							<span class="text-sm font-bold text-lingua-primary">
								{formatPrice(item.price)}
							</span>
							<button
								type="button"
								class="flex h-7 w-7 items-center justify-center rounded-full bg-lingua-primary text-white transition-colors hover:bg-lingua-primary-strong active:scale-95"
								onclick={(e) => quickAdd(item, e)}
								aria-label="Add {item.name} to cart"
							>
								<Plus size={16} />
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Floating cart button -->
{#if cartCount > 0}
	<div class="fixed bottom-6 right-6 z-40">
		<a
			href="/r/{data.slug}/cart"
			class="flex items-center gap-2.5 rounded-full bg-lingua-primary px-5 py-3.5 font-semibold text-white shadow-lg shadow-lingua-primary/25 transition-all hover:bg-lingua-primary-strong hover:shadow-xl active:scale-95"
		>
			<div class="relative">
				<ShoppingCart size={20} />
				<span
					class="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold text-lingua-primary"
				>
					{cartCount}
				</span>
			</div>
			<span>{formatPrice(cartTotal)}</span>
		</a>
	</div>
{/if}

<!-- Product detail modal -->
<Dialog bind:open={detailOpen}>
	{#if detailItem}
		<DialogContent class="max-h-[90vh] overflow-y-auto p-0 sm:max-w-md">
			<div class="relative">
				<div class="aspect-video w-full overflow-hidden bg-lingua-muted">
					<img src={detailItem.image} alt={detailItem.name} class="h-full w-full object-cover" />
				</div>

				{#if detailItem.isSignature}
					<span
						class="absolute left-3 top-3 inline-flex items-center gap-1 rounded-md bg-lingua-primary/90 px-2 py-1 text-xs font-bold text-white backdrop-blur-sm"
					>
						<Star size={12} />
						{t('badge.signature')}
					</span>
				{/if}

				{#if detailItem.spiceLevel > 0}
					<span
						class="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md bg-orange-500/90 px-2 py-1 text-xs font-bold text-white backdrop-blur-sm"
					>
						<Flame size={12} />
						{spiceLabel(detailItem.spiceLevel)}
					</span>
				{/if}
			</div>

			<div class="space-y-4 px-5 pb-5">
				<div>
					<DialogTitle class="text-lg font-bold text-lingua-text">
						{detailItem.name}
					</DialogTitle>
					{#if detailItem.localName}
						<p class="mt-0.5 text-sm text-lingua-subtle">{detailItem.localName}</p>
					{/if}
					<p class="mt-2 text-lg font-bold text-lingua-primary">
						{formatPrice(detailItem.price)}
					</p>
				</div>

				{#if detailItem.description}
					<DialogDescription class="text-sm leading-relaxed text-lingua-subtle">
						{detailItem.description}
					</DialogDescription>
				{/if}

				<SafetyBadges item={detailItem} />

				{#if detailItem.confidence !== 'verified'}
					<div class="flex items-start gap-2 rounded-lg bg-lingua-warning-soft p-3">
						<ShieldAlert size={16} class="mt-0.5 shrink-0 text-lingua-warning" />
						<p class="text-xs text-lingua-warning">
							{t('menu.detail.staffConfirm')}
						</p>
					</div>
				{/if}

				<div class="flex items-center justify-between border-t border-lingua-border pt-4">
					<div class="flex items-center gap-3">
						<button
							type="button"
							class="flex h-9 w-9 items-center justify-center rounded-full border border-lingua-border text-lingua-text transition-colors hover:bg-lingua-muted disabled:opacity-40"
							disabled={detailQty <= 1}
							onclick={() => (detailQty = Math.max(1, detailQty - 1))}
						>
							<Minus size={16} />
						</button>
						<span class="min-w-6 text-center text-base font-semibold text-lingua-text">
							{detailQty}
						</span>
						<button
							type="button"
							class="flex h-9 w-9 items-center justify-center rounded-full border border-lingua-border text-lingua-text transition-colors hover:bg-lingua-muted"
							onclick={() => detailQty++}
						>
							<Plus size={16} />
						</button>
					</div>

					<Button
						class="gap-2"
						onclick={() => {
							if (detailItem) {
								addToCart(detailItem, detailQty);
								detailOpen = false;
							}
						}}
					>
						<ShoppingCart size={16} />
						{t('catalog.addToCart')} &middot; {formatPrice(detailItem.price * detailQty)}
					</Button>
				</div>
			</div>
		</DialogContent>
	{/if}
</Dialog>
