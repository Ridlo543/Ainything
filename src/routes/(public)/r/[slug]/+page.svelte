<script lang="ts">
	import type { PageData } from './$types';
	import { t } from '$lib/i18n';
	import { formatPrice } from '$lib/domain/menu/policy';
	import type { Product } from '$lib/domain/outlet/types';
	import SafetyBadges from '$lib/ui/menu/SafetyBadges.svelte';
	import { Dialog, DialogContent, DialogTitle, DialogDescription } from '$lib/ui/dialog';
	import Button from '$lib/ui/button/button.svelte';
	import { Search, Plus, Minus, ShoppingCart, X, Star, ShieldAlert, Check } from '@lucide/svelte';
	import { untrack } from 'svelte';
	import { createCartStore } from '$lib/client/cart.svelte';

	let { data }: { data: PageData } = $props();

	const restaurant = $derived(data.restaurant);
	const products = $derived(data.products ?? []);
	const sections = $derived(['all', ...new Set(products.map((p) => p.section))]);

	let searchQuery = $state('');
	let activeCategory = $state('all');
	let detailItem = $state<Product | null>(null);
	let detailOpen = $state(false);
	let detailQty = $state(1);

	// slug is a stable route param — safe to read once at init (untrack suppresses Svelte warning)
	const cart = createCartStore(untrack(() => data.slug));
	const cartCount = $derived(cart.count);
	const cartTotal = $derived(cart.total);

	const filteredItems = $derived(() => {
		let items = products.filter((p) => p.isAvailable);
		if (activeCategory !== 'all') {
			items = items.filter((p) => p.section === activeCategory);
		}
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim();
			items = items.filter(
				(p) =>
					p.name.toLowerCase().includes(q) ||
					(p.localName ?? '').toLowerCase().includes(q) ||
					p.description.toLowerCase().includes(q) ||
					p.section.toLowerCase().includes(q)
			);
		}
		return items;
	});

	function openDetail(item: Product) {
		detailItem = item;
		detailQty = 1;
		detailOpen = true;
	}

	function addToCart(item: Product, qty: number) {
		cart.add(item, qty);
	}

	// Quick-add feedback: track last added item ID with a short flash duration
	let lastAddedId = $state<string | null>(null);
	let addedTimer: ReturnType<typeof setTimeout> | null = null;

	function quickAdd(item: Product, event: MouseEvent) {
		event.stopPropagation();
		addToCart(item, 1);
		// Visual feedback: flash the button green for 600ms
		lastAddedId = item.id;
		if (addedTimer) clearTimeout(addedTimer);
		addedTimer = setTimeout(() => {
			lastAddedId = null;
		}, 600);
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
			aria-hidden="true"
			class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ainything-subtle"
		/>
		<input
			id="catalog-search"
			type="search"
			bind:value={searchQuery}
			placeholder={t('catalog.search.placeholder')}
			aria-label={t('catalog.search.placeholder')}
			class="tap-target w-full rounded-lg border border-ainything-border bg-ainything-surface py-2.5 pl-10 pr-4 text-sm text-ainything-text placeholder:text-ainything-subtle focus:border-ainything-primary focus:outline-none focus:ring-2 focus:ring-ainything-primary/20"
		/>
		{#if searchQuery}
			<button
				type="button"
				onclick={() => (searchQuery = '')}
				aria-label="Hapus pencarian"
				class="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-ainything-subtle hover:bg-ainything-muted hover:text-ainything-text"
			>
				<X size={16} aria-hidden="true" />
			</button>
		{/if}
	</div>

	<!-- Category tabs -->
	<div class="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4">
		{#each sections as cat (cat)}
			<button
				type="button"
				onclick={() => (activeCategory = cat)}
				class={`tap-target shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
					activeCategory === cat
						? 'border-ainything-primary bg-ainything-primary text-white'
						: 'border-ainything-border bg-ainything-surface text-ainything-subtle hover:border-ainything-primary/40 hover:text-ainything-text'
				}`}
			>
				{cat === 'all' ? t('catalog.category.all') : cat}
			</button>
		{/each}
	</div>

	<!-- Product grid -->
	{#if filteredItems().length === 0}
		<div class="flex flex-col items-center justify-center py-16 text-center">
			<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-ainything-muted">
				<Search size={28} class="text-ainything-subtle" />
			</div>
			<p class="text-sm font-medium text-ainything-text">{t('catalog.empty.title')}</p>
			<p class="mt-1 text-sm text-ainything-subtle">{t('catalog.empty.hint')}</p>
		</div>
	{:else}
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
			{#each filteredItems() as item (item.id)}
				<div
					role="button"
					tabindex="0"
					class="group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border border-ainything-border bg-ainything-surface transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ainything-primary/35"
					onclick={() => openDetail(item)}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							openDetail(item);
						}
					}}
				>
					<div class="aspect-square w-full overflow-hidden bg-ainything-muted">
						<img
							src={item.imageUrl}
							alt={item.name}
							class="h-full w-full object-cover transition-transform group-hover:scale-105"
							loading="lazy"
						/>
					</div>

					{#if item.isSignature}
						<span
							class="absolute left-1.5 top-1.5 inline-flex items-center gap-0.5 rounded-md bg-ainything-primary/90 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm"
						>
							<Star size={10} />
							{t('badge.signature')}
						</span>
					{/if}

					<div class="flex flex-1 flex-col gap-1 p-2.5">
						<p class="line-clamp-2 text-sm font-semibold leading-tight text-ainything-text">
							{item.name}
						</p>
						{#if item.localName}
							<p class="truncate text-xs text-ainything-subtle">{item.localName}</p>
						{/if}

						<div class="mt-auto flex items-center justify-between gap-1 pt-1.5">
							<span class="text-sm font-bold text-ainything-primary">
								{formatPrice(item.price)}
							</span>
							<button
								type="button"
								class="flex h-7 w-7 items-center justify-center rounded-full text-white transition-all active:scale-95 {lastAddedId ===
								item.id
									? 'bg-emerald-500 scale-110'
									: 'bg-ainything-primary hover:bg-ainything-primary-strong'}"
								onclick={(e) => quickAdd(item, e)}
								aria-label="Add {item.name} to cart"
							>
								{#if lastAddedId === item.id}
									<Check size={14} />
								{:else}
									<Plus size={16} />
								{/if}
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
			class="flex items-center gap-2.5 rounded-full bg-ainything-primary px-5 py-3.5 font-semibold text-white shadow-lg shadow-ainything-primary/25 transition-all hover:bg-ainything-primary-strong hover:shadow-xl active:scale-95"
		>
			<div class="relative">
				<ShoppingCart size={20} />
				<span
					class="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold text-ainything-primary"
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
				<div class="aspect-video w-full overflow-hidden bg-ainything-muted">
					<img src={detailItem.imageUrl} alt={detailItem.name} class="h-full w-full object-cover" />
				</div>

				{#if detailItem.isSignature}
					<span
						class="absolute left-3 top-3 inline-flex items-center gap-1 rounded-md bg-ainything-primary/90 px-2 py-1 text-xs font-bold text-white backdrop-blur-sm"
					>
						<Star size={12} />
						{t('badge.signature')}
					</span>
				{/if}
			</div>

			<div class="space-y-4 px-5 pb-5">
				<div>
					<DialogTitle class="text-lg font-bold text-ainything-text">
						{detailItem.name}
					</DialogTitle>
					{#if detailItem.localName}
						<p class="mt-0.5 text-sm text-ainything-subtle">{detailItem.localName}</p>
					{/if}
					<p class="mt-2 text-lg font-bold text-ainything-primary">
						{formatPrice(detailItem.price)}
					</p>
				</div>

				{#if detailItem.description}
					<DialogDescription class="text-sm leading-relaxed text-ainything-subtle">
						{detailItem.description}
					</DialogDescription>
				{/if}

				<SafetyBadges item={detailItem} />

				{#if detailItem.confidence !== 'verified'}
					<div class="flex items-start gap-2 rounded-lg bg-ainything-warning-soft p-3">
						<ShieldAlert size={16} class="mt-0.5 shrink-0 text-ainything-warning" />
						<p class="text-xs text-ainything-warning">
							{t('menu.detail.staffConfirm')}
						</p>
					</div>
				{/if}

				<div class="flex items-center justify-between border-t border-ainything-border pt-4">
					<div class="flex items-center gap-3">
						<button
							type="button"
							class="flex h-9 w-9 items-center justify-center rounded-full border border-ainything-border text-ainything-text transition-colors hover:bg-ainything-muted disabled:opacity-40"
							disabled={detailQty <= 1}
							onclick={() => (detailQty = Math.max(1, detailQty - 1))}
						>
							<Minus size={16} />
						</button>
						<span class="min-w-6 text-center text-base font-semibold text-ainything-text">
							{detailQty}
						</span>
						<button
							type="button"
							class="flex h-9 w-9 items-center justify-center rounded-full border border-ainything-border text-ainything-text transition-colors hover:bg-ainything-muted"
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
