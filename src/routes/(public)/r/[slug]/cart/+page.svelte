<script lang="ts">
	import type { PageData } from './$types';
	import { t } from '$lib/i18n';
	import { formatPrice } from '$lib/domain/menu/policy';
	import { untrack } from 'svelte';
	import { createCartStore } from '$lib/client/cart.svelte';
	import Button from '$lib/ui/button/button.svelte';
	import {
		ArrowLeft,
		Minus,
		Plus,
		Trash2,
		ShoppingCart,
		Send,
		AlertCircle,
		Phone
	} from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import { browser } from '$app/environment';

	let {
		data,
		form
	}: {
		data: PageData;
		form: { error?: string; success?: boolean; orderId?: string; orderNumber?: number } | undefined;
	} = $props();

	// slug/restaurant are stable route-level values — untrack suppresses Svelte warning
	const slug = untrack(() => data.slug);
	const restaurant = untrack(() => data.restaurant);
	const cart = createCartStore(slug);
	const checkoutMode = $derived(data.checkoutMode ?? 'offline');
	const requireWhatsapp = $derived(data.requireWhatsapp ?? false);
	// Show WA field: required always shows it; online mode shows it as optional too
	const showWhatsappField = $derived(requireWhatsapp || checkoutMode === 'online');

	let customerName = $state('');
	let buyerWhatsapp = $state('');
	let submitting = $state(false);

	// Auto-fill WhatsApp from localStorage if previously saved.
	$effect(() => {
		if (browser) {
			const saved = localStorage.getItem('ain_buyer_wa');
			if (saved) buyerWhatsapp = saved;
		}
	});

	// Persist WA to localStorage when it changes.
	$effect(() => {
		if (browser && buyerWhatsapp) {
			localStorage.setItem('ain_buyer_wa', buyerWhatsapp);
		}
	});

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
		class="inline-flex items-center gap-1.5 text-sm font-medium text-ainything-subtle transition-colors hover:text-ainything-primary"
	>
		<ArrowLeft size={16} />
		{t('cart.backToCatalog')}
	</a>

	<h2 class="text-xl font-bold text-ainything-text">{t('cart.heading')}</h2>

	{#if form?.error}
		<div class="flex items-start gap-2 rounded-lg bg-ainything-danger-soft p-3">
			<AlertCircle size={16} class="mt-0.5 shrink-0 text-ainything-danger" />
			<p class="text-sm text-ainything-danger">{form.error}</p>
		</div>
	{/if}

	{#if form?.success}
		<div class="flex flex-col items-center gap-4 py-12 text-center">
			<div
				class="flex h-16 w-16 items-center justify-center rounded-full bg-ainything-success-soft"
			>
				<Send size={28} class="text-ainything-success" />
			</div>
			<div>
				<p class="text-lg font-bold text-ainything-text">{t('cart.success.title')}</p>
				{#if form?.orderNumber}
					<p class="mt-1 text-2xl font-bold text-ainything-primary">
						#{String(form.orderNumber).padStart(4, '0')}
					</p>
				{/if}
				<p class="mt-1 text-sm text-ainything-subtle">{t('cart.success.hint')}</p>
			</div>
			<a
				href="/r/{slug}/order/{form?.orderId}"
				class="mt-4 inline-flex items-center gap-2 rounded-lg bg-ainything-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ainything-primary-strong"
			>
				{t('cart.success.trackOrder')}
			</a>
			<a
				href="/r/{slug}"
				class="mt-2 inline-flex items-center gap-2 text-sm font-medium text-ainything-primary hover:underline"
			>
				{t('cart.success.backToCatalog')}
			</a>
		</div>
	{:else if cart.entries.length === 0}
		<div class="flex flex-col items-center justify-center py-16 text-center">
			<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-ainything-muted">
				<ShoppingCart size={28} class="text-ainything-subtle" />
			</div>
			<p class="text-sm font-medium text-ainything-text">{t('cart.empty.title')}</p>
			<p class="mt-1 text-sm text-ainything-subtle">{t('cart.empty.hint')}</p>
			<a
				href="/r/{slug}"
				class="mt-4 inline-flex items-center gap-2 rounded-lg bg-ainything-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ainything-primary-strong"
			>
				{t('cart.empty.browse')}
			</a>
		</div>
	{:else}
		<div class="space-y-3">
			{#each cart.entries as entry (entry.itemId)}
				<div class="flex gap-3 rounded-lg border border-ainything-border bg-ainything-surface p-3">
					<div class="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-ainything-muted">
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
								<p class="truncate text-sm font-semibold text-ainything-text">
									{entry.name}
								</p>
								{#if entry.localName}
									<p class="truncate text-xs text-ainything-subtle">
										{entry.localName}
									</p>
								{/if}
							</div>
							<button
								type="button"
								class="shrink-0 rounded-full p-1.5 text-ainything-subtle transition-colors hover:bg-ainything-danger-soft hover:text-ainything-danger"
								onclick={() => cart.remove(entry.itemId)}
								aria-label="Remove {entry.name}"
							>
								<Trash2 size={14} />
							</button>
						</div>

						<div class="flex items-center justify-between">
							<span class="text-sm font-bold text-ainything-primary">
								{formatPrice(entry.price * entry.qty)}
							</span>

							<div class="flex items-center gap-2">
								<button
									type="button"
									class="flex h-8 w-8 items-center justify-center rounded-full border border-ainything-border text-ainything-text transition-colors hover:bg-ainything-muted disabled:opacity-40"
									disabled={entry.qty <= 1}
									onclick={() => decrement(entry.itemId, entry.qty)}
									aria-label="Decrease {entry.name} quantity"
								>
									<Minus size={14} />
								</button>
								<span class="min-w-5 text-center text-sm font-semibold text-ainything-text">
									{entry.qty}
								</span>
								<button
									type="button"
									class="flex h-8 w-8 items-center justify-center rounded-full border border-ainything-border text-ainything-text transition-colors hover:bg-ainything-muted"
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
							class="w-full rounded-md border border-ainything-border bg-ainything-bg px-2.5 py-1.5 text-xs text-ainything-text placeholder:text-ainything-subtle focus:border-ainything-primary focus:outline-none focus:ring-1 focus:ring-ainything-primary/20"
						/>
					</div>
				</div>
			{/each}
		</div>

		<div class="rounded-lg border border-ainything-border bg-ainything-surface p-4 space-y-3">
			<div>
				<label for="customer-name" class="text-xs font-medium text-ainything-subtle">
					{t('cart.customerName')}
				</label>
				<input
					id="customer-name"
					type="text"
					bind:value={customerName}
					placeholder={t('cart.customerName.placeholder')}
					class="mt-1 w-full rounded-lg border border-ainything-border bg-ainything-bg px-3 py-2 text-sm text-ainything-text placeholder:text-ainything-subtle focus:border-ainything-primary focus:outline-none focus:ring-2 focus:ring-ainything-primary/20"
				/>
			</div>
			{#if showWhatsappField}
				<div>
					<label for="buyer-whatsapp" class="text-xs font-medium text-ainything-subtle">
						Nomor WhatsApp {#if requireWhatsapp}<span class="text-ainything-danger">*</span
							>{:else}<span class="text-ainything-subtle">(opsional)</span>{/if}
					</label>
					<div class="relative mt-1">
						<Phone
							size={14}
							class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ainything-subtle"
						/>
						<input
							id="buyer-whatsapp"
							type="tel"
							inputmode="tel"
							bind:value={buyerWhatsapp}
							placeholder="cth. 08123456789"
							required={requireWhatsapp}
							class="w-full rounded-lg border border-ainything-border bg-ainything-bg py-2 pr-3 pl-8 text-sm text-ainything-text placeholder:text-ainything-subtle focus:border-ainything-primary focus:outline-none focus:ring-2 focus:ring-ainything-primary/20"
						/>
					</div>
					<p class="mt-1 text-xs text-ainything-subtle">
						{requireWhatsapp
							? 'Untuk konfirmasi pesanan dari pemilik toko.'
							: 'Isi untuk dapat notifikasi status pesanan via WhatsApp.'}
					</p>
				</div>
			{/if}
		</div>

		<div class="rounded-lg border border-ainything-border bg-ainything-surface p-4 space-y-2">
			<div class="flex items-center justify-between text-sm text-ainything-subtle">
				<span>{t('cart.summary.items')}</span>
				<span>{cart.count}</span>
			</div>
			<div
				class="flex items-center justify-between border-t border-ainything-border pt-2 text-base font-bold text-ainything-text"
			>
				<span>{t('cart.summary.total')}</span>
				<span class="text-ainything-primary">{formatPrice(cart.total)}</span>
			</div>
		</div>

		<form
			method="POST"
			use:enhance={() => {
				submitting = true;
				return async ({ result, update }) => {
					submitting = false;
					// Only clear cart on success — keep items if the server returned an error
					if (result.type === 'success') {
						cart.clear();
					}
					await update({ reset: false });
				};
			}}
			class="space-y-2"
		>
			<input type="hidden" name="items" value={JSON.stringify(cart.entries)} />
			<input type="hidden" name="customerName" value={customerName} />
			<input type="hidden" name="buyerWhatsapp" value={buyerWhatsapp} />
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
