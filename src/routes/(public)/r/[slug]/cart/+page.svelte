<script lang="ts">
	import type { PageData } from './$types';
	import { t } from '$lib/i18n';
	import { formatPrice } from '$lib/domain/menu/policy';
	import { createCartStore } from '$lib/client/cart.svelte';
	import Button from '$lib/ui/button/button.svelte';
	import { ArrowLeft, Minus, Plus, Trash2, ShoppingCart, Send, AlertCircle } from '@lucide/svelte';
	import { enhance } from '$app/forms';

	let {
		data,
		form
	}: { data: PageData; form: { error?: string; success?: boolean; orderId?: string } | undefined } =
		$props();

	const slug = $derived(data.slug);
	const restaurant = $derived(data.restaurant);
	const cart = $derived(createCartStore(data.slug));

	let customerName = $state('');
	let submitting = $state(false);

	function increment(itemId: string, current: number) {
		cart.setQty(itemId, current + 1);
	}

	function decrement(itemId: string, current: number) {
		cart.setQty(itemId, current - 1);
	}
</script>

<svelte:head>
	<title>{t('cart.title')} &middot; {restaurant.name}</title>
</svelte:head>

<div class="space-y-4 pt-4 pb-32">
	<a
		href="/r/{slug}"
		class="inline-flex items-center gap-1.5 text-sm font-medium text-lingua-subtle transition-colors hover:text-lingua-primary"
	>
		<ArrowLeft size={16} />
		{t('cart.backToCatalog')}
	</a>

	<h2 class="text-xl font-bold text-lingua-text">{t('cart.heading')}</h2>

	{#if form?.error}
		<div class="flex items-start gap-2 rounded-lg bg-lingua-danger-soft p-3">
			<AlertCircle size={16} class="mt-0.5 shrink-0 text-lingua-danger" />
			<p class="text-sm text-lingua-danger">{form.error}</p>
		</div>
	{/if}

	{#if form?.success}
		<div class="flex flex-col items-center gap-4 py-12 text-center">
			<div class="flex h-16 w-16 items-center justify-center rounded-full bg-lingua-success-soft">
				<Send size={28} class="text-lingua-success" />
			</div>
			<div>
				<p class="text-lg font-bold text-lingua-text">{t('cart.success.title')}</p>
				<p class="mt-1 text-sm text-lingua-subtle">{t('cart.success.hint')}</p>
			</div>
			<a
				href="/r/{slug}/order/{form?.orderId}"
				class="mt-4 inline-flex items-center gap-2 rounded-lg bg-lingua-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-lingua-primary-strong"
			>
				{t('cart.success.trackOrder')}
			</a>
			<a
				href="/r/{slug}"
				class="mt-2 inline-flex items-center gap-2 text-sm font-medium text-lingua-primary hover:underline"
			>
				{t('cart.success.backToCatalog')}
			</a>
		</div>
	{:else if cart.entries.length === 0}
		<div class="flex flex-col items-center justify-center py-16 text-center">
			<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-lingua-muted">
				<ShoppingCart size={28} class="text-lingua-subtle" />
			</div>
			<p class="text-sm font-medium text-lingua-text">{t('cart.empty.title')}</p>
			<p class="mt-1 text-sm text-lingua-subtle">{t('cart.empty.hint')}</p>
			<a
				href="/r/{slug}"
				class="mt-4 inline-flex items-center gap-2 rounded-lg bg-lingua-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-lingua-primary-strong"
			>
				{t('cart.empty.browse')}
			</a>
		</div>
	{:else}
		<div class="space-y-3">
			{#each cart.entries as entry (entry.itemId)}
				<div class="flex gap-3 rounded-lg border border-lingua-border bg-lingua-surface p-3">
					<div class="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-lingua-muted">
						<img
							src={entry.image}
							alt={entry.name}
							class="h-full w-full object-cover"
							loading="lazy"
						/>
					</div>

					<div class="flex min-w-0 flex-1 flex-col gap-1.5">
						<div class="flex items-start justify-between gap-2">
							<div class="min-w-0">
								<p class="truncate text-sm font-semibold text-lingua-text">
									{entry.name}
								</p>
								{#if entry.localName}
									<p class="truncate text-xs text-lingua-subtle">
										{entry.localName}
									</p>
								{/if}
							</div>
							<button
								type="button"
								class="shrink-0 rounded-full p-1.5 text-lingua-subtle transition-colors hover:bg-lingua-danger-soft hover:text-lingua-danger"
								onclick={() => cart.remove(entry.itemId)}
								aria-label="Remove {entry.name}"
							>
								<Trash2 size={14} />
							</button>
						</div>

						<div class="flex items-center justify-between">
							<span class="text-sm font-bold text-lingua-primary">
								{formatPrice(entry.price * entry.qty)}
							</span>

							<div class="flex items-center gap-2">
								<button
									type="button"
									class="flex h-8 w-8 items-center justify-center rounded-full border border-lingua-border text-lingua-text transition-colors hover:bg-lingua-muted disabled:opacity-40"
									disabled={entry.qty <= 1}
									onclick={() => decrement(entry.itemId, entry.qty)}
									aria-label="Decrease {entry.name} quantity"
								>
									<Minus size={14} />
								</button>
								<span class="min-w-5 text-center text-sm font-semibold text-lingua-text">
									{entry.qty}
								</span>
								<button
									type="button"
									class="flex h-8 w-8 items-center justify-center rounded-full border border-lingua-border text-lingua-text transition-colors hover:bg-lingua-muted"
									onclick={() => increment(entry.itemId, entry.qty)}
									aria-label="Increase {entry.name} quantity"
								>
									<Plus size={14} />
								</button>
							</div>
						</div>

						<input
							type="text"
							value={entry.note}
							oninput={(e) => cart.setNote(entry.itemId, e.currentTarget.value)}
							placeholder={t('cart.note.placeholder')}
							class="w-full rounded-md border border-lingua-border bg-lingua-bg px-2.5 py-1.5 text-xs text-lingua-text placeholder:text-lingua-subtle focus:border-lingua-primary focus:outline-none focus:ring-1 focus:ring-lingua-primary/20"
						/>
					</div>
				</div>
			{/each}
		</div>

		<div class="rounded-lg border border-lingua-border bg-lingua-surface p-4 space-y-3">
			<div>
				<label for="customer-name" class="text-xs font-medium text-lingua-subtle">
					{t('cart.customerName')}
				</label>
				<input
					id="customer-name"
					type="text"
					bind:value={customerName}
					placeholder={t('cart.customerName.placeholder')}
					class="mt-1 w-full rounded-lg border border-lingua-border bg-lingua-bg px-3 py-2 text-sm text-lingua-text placeholder:text-lingua-subtle focus:border-lingua-primary focus:outline-none focus:ring-2 focus:ring-lingua-primary/20"
				/>
			</div>
		</div>

		<div class="rounded-lg border border-lingua-border bg-lingua-surface p-4 space-y-2">
			<div class="flex items-center justify-between text-sm text-lingua-subtle">
				<span>{t('cart.summary.items')}</span>
				<span>{cart.count}</span>
			</div>
			<div
				class="flex items-center justify-between border-t border-lingua-border pt-2 text-base font-bold text-lingua-text"
			>
				<span>{t('cart.summary.total')}</span>
				<span class="text-lingua-primary">{formatPrice(cart.total)}</span>
			</div>
		</div>

		<form
			method="POST"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					submitting = false;
					cart.clear();
					await update({ reset: false });
				};
			}}
			class="space-y-2"
		>
			<input type="hidden" name="items" value={JSON.stringify(cart.entries)} />
			<input type="hidden" name="customerName" value={customerName} />
			<input type="hidden" name="total" value={String(cart.total)} />

			<Button type="submit" class="w-full gap-2" disabled={submitting}>
				{#if submitting}
					<div
						class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
					></div>
					{t('cart.ordering')}
				{:else}
					<Send size={16} />
					{t('cart.order')} &middot; {formatPrice(cart.total)}
				{/if}
			</Button>
		</form>
	{/if}
</div>
