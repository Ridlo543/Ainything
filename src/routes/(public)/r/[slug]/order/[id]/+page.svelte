<script lang="ts">
	import { t, tWithVars } from '$lib/i18n';
	import { formatPrice } from '$lib/domain/menu/policy';
	import type { OrderStatus } from '$lib/domain/order/types';
	import type { PaymentMethod, PaymentMethodType } from '$lib/domain/outlet/types';
	import Button from '$lib/ui/button/button.svelte';
	import {
		Check,
		ChefHat,
		Package,
		ArrowLeft,
		ChevronDown,
		ChevronUp,
		CreditCard,
		Banknote,
		Smartphone,
		QrCode,
		Upload,
		CheckCircle,
		Clock
	} from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';

	const { data, form } = $props();
	const restaurant = $derived(data.restaurant);
	const order = $derived(data.order);
	const paymentMethods = $derived((data.paymentMethods ?? []) as PaymentMethod[]);
	const checkoutMode = $derived(data.checkoutMode ?? 'offline');
	const paymentConfirmationEnabled = $derived(data.paymentConfirmationEnabled ?? false);

	const typeIcons: Record<PaymentMethodType, typeof CreditCard> = {
		bank_transfer: CreditCard,
		ewallet: Smartphone,
		qris: QrCode,
		cash: Banknote,
		other: CreditCard
	};

	const typeLabels: Record<PaymentMethodType, string> = {
		bank_transfer: 'Transfer Bank',
		ewallet: 'E-Wallet',
		qris: 'QRIS',
		cash: 'Tunai',
		other: 'Lainnya'
	};

	const statusSteps: { key: OrderStatus; icon: typeof Check }[] = [
		{ key: 'new', icon: Package },
		{ key: 'processing', icon: ChefHat },
		{ key: 'ready', icon: Check }
	];

	const statusIndex = $derived(statusSteps.findIndex((s) => s.key === order.status));
	const isCancelled = $derived(order.status === 'cancelled');
	const isCompleted = $derived(order.status === 'completed');

	// Payment proof upload state
	let proofFile = $state<File | null>(null);
	let proofPreview = $state<string | null>(null);
	let uploading = $state(false);

	// Derive proof status from order
	const hasProof = $derived(!!order.paymentProofUrl);
	const isConfirmed = $derived(!!order.paymentConfirmedAt);
	const isRejected = $derived(!!order.paymentRejectedAt);
	const showUploadSection = $derived(
		checkoutMode === 'online' && paymentConfirmationEnabled && !isCompleted && !isCancelled
	);

	function handleProofInput(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		proofFile = file;
		proofPreview = URL.createObjectURL(file);
	}

	let itemsExpanded = $state(false);

	// Poll every 10s so buyer sees status updates (confirmed/rejected) without manual refresh.
	// Stop polling once order reaches a terminal state.
	let pollInterval: ReturnType<typeof setInterval> | null = null;

	onMount(() => {
		if (!isCompleted && !isCancelled) {
			pollInterval = setInterval(async () => {
				await invalidateAll();
			}, 10000);
		}
		return () => {
			if (pollInterval) clearInterval(pollInterval);
		};
	});

	// Stop polling when order reaches terminal state.
	$effect(() => {
		if ((isCompleted || isCancelled || isConfirmed || isRejected) && pollInterval) {
			clearInterval(pollInterval);
			pollInterval = null;
		}
	});
</script>

<svelte:head>
	<title
		>{tWithVars('order.title', { id: `#${String(order.orderNumber).padStart(4, '0')}` })} — {restaurant.name}</title
	>
</svelte:head>

<div class="mx-auto max-w-lg px-4 py-6">
	<!-- Header -->
	<div class="mb-6 text-center">
		<h1 class="text-xl font-bold text-gray-900">{t('order.heading')}</h1>
		<p class="mt-1 text-sm text-gray-500">
			{t('order.id')}: <span class="font-mono">#{String(order.orderNumber).padStart(4, '0')}</span>
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
							class="mx-1 mb-6 h-1 min-w-0 flex-1 self-start rounded-full transition-colors mt-6"
							class:bg-emerald-500={i < statusIndex}
							class:bg-gray-200={i >= statusIndex}
						></div>
					{/if}
				{/each}
			</div>
		</div>
	{:else}
		<div
			class="mb-8 rounded-xl p-4 text-center"
			class:bg-red-50={isCancelled}
			class:bg-emerald-50={isCompleted}
		>
			<p
				class="text-lg font-semibold"
				class:text-red-700={isCancelled}
				class:text-emerald-700={isCompleted}
			>
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
							<span class="font-medium text-gray-600"
								>{formatPrice(item.price * item.quantity)}</span
							>
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

	<!-- Payment Methods -->
	{#if paymentMethods.length > 0}
		<div class="mb-8">
			<h2 class="mb-3 text-sm font-semibold text-gray-700">Cara Pembayaran</h2>
			<div class="space-y-3">
				{#each paymentMethods as pm (pm.id)}
					{@const Icon = typeIcons[pm.type]}
					<div class="rounded-xl border border-gray-200 bg-white p-4">
						<div class="flex items-start gap-3">
							<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100">
								<Icon class="h-4 w-4 text-gray-600" />
							</div>
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2">
									<p class="font-medium text-gray-900">{pm.label}</p>
									<span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
										{typeLabels[pm.type]}
									</span>
								</div>
								{#if pm.accountNumber}
									<p class="mt-1 font-mono text-sm text-gray-700">{pm.accountNumber}</p>
								{/if}
								{#if pm.accountName}
									<p class="text-xs text-gray-400">a.n. {pm.accountName}</p>
								{/if}
								{#if pm.instructions}
									<p class="mt-1.5 text-xs text-gray-500">{pm.instructions}</p>
								{/if}
							</div>
							{#if pm.qrImageUrl}
								<img
									src={pm.qrImageUrl}
									alt="QR {pm.label}"
									class="h-16 w-16 shrink-0 rounded-lg object-cover"
								/>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Payment section: online mode with manual confirmation enabled = upload proof.
	     Online mode without confirmation = show payment methods only (no upload needed).
	     Offline mode = pay at cashier banner. -->
	{#if checkoutMode === 'online' && !paymentConfirmationEnabled && !isCompleted && !isCancelled}
		<div class="mb-8 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
			<p class="text-sm font-medium text-blue-800">
				{#if paymentMethods.length > 0}
					Silakan transfer ke salah satu rekening di atas, lalu tunjukkan buktinya ke staf.
				{:else}
					Silakan lakukan pembayaran sesuai instruksi staf.
				{/if}
			</p>
		</div>
	{/if}

	<!-- Payment Proof Upload (online mode + confirmation enabled) -->
	{#if showUploadSection}
		<div class="mb-8 rounded-xl border border-gray-200 bg-white p-4">
			<h2 class="mb-3 text-sm font-semibold text-gray-700">Konfirmasi Pembayaran</h2>
			{#if isConfirmed}
				<div class="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2">
					<CheckCircle class="h-4 w-4 shrink-0 text-emerald-600" />
					<p class="text-sm text-emerald-700">Pembayaran dikonfirmasi oleh outlet.</p>
				</div>
			{:else if isRejected}
				<div class="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2">
					<p class="text-sm text-red-700">Pembayaran ditolak. Silakan hubungi staf outlet.</p>
				</div>
			{:else if hasProof}
				<div class="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2">
					<Clock class="h-4 w-4 shrink-0 text-amber-600" />
					<p class="text-sm text-amber-700">Bukti pembayaran dikirim, menunggu konfirmasi staf.</p>
				</div>
				{#if order.paymentProofUrl}
					<img
						src={order.paymentProofUrl}
						alt="Bukti pembayaran"
						class="mt-3 h-32 w-auto rounded-lg object-cover"
					/>
				{/if}
			{:else}
				{#if form?.error}
					<p class="mb-2 text-sm text-red-600">{form.error}</p>
				{/if}
				<form
					method="POST"
					action="?/submitProof"
					enctype="multipart/form-data"
					use:enhance={() => {
						uploading = true;
						return async ({ update }) => {
							uploading = false;
							await update();
						};
					}}
					class="space-y-3"
				>
					<label
						class="block cursor-pointer rounded-xl border-2 border-dashed border-gray-200 p-4 text-center hover:border-ainything-primary"
					>
						<input
							type="file"
							name="proofFile"
							accept="image/jpeg,image/png,image/webp"
							required
							class="sr-only"
							onchange={handleProofInput}
						/>
						{#if proofPreview}
							<img src={proofPreview} alt="Preview" class="mx-auto h-32 rounded-lg object-cover" />
							<p class="mt-2 text-xs text-gray-400">Klik untuk ganti gambar</p>
						{:else}
							<Upload class="mx-auto h-8 w-8 text-gray-300" />
							<p class="mt-1 text-sm text-gray-500">Upload bukti pembayaran</p>
							<p class="text-xs text-gray-400">JPG, PNG, WebP · maks. 5 MB</p>
						{/if}
					</label>
					<button
						type="submit"
						disabled={uploading || !proofFile}
						class="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl bg-ainything-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-ainything-primary-strong disabled:opacity-50"
					>
						{#if uploading}
							<div
								class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
							></div>
							Mengunggah...
						{:else}
							Kirim Bukti Pembayaran
						{/if}
					</button>
				</form>
			{/if}
		</div>
	{:else if checkoutMode === 'offline' && !isCompleted && !isCancelled}
		<div class="mb-8 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
			<p class="text-sm font-medium text-amber-800">Silakan lakukan pembayaran ke kasir.</p>
		</div>
	{/if}

	<!-- Actions -->
	<div class="flex flex-col gap-3">
		<Button variant="outline" href="/r/{restaurant.slug}">
			<ArrowLeft class="mr-2 h-4 w-4" />
			{t('order.backToCatalog')}
		</Button>
	</div>
</div>
