<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		Plus,
		Trash2,
		Pencil,
		CreditCard,
		Banknote,
		Smartphone,
		QrCode,
		Loader2,
		X,
		Check
	} from '@lucide/svelte';
	import type { PaymentMethod, PaymentMethodType } from '$lib/domain/outlet/types';
	import type { PageData } from './$types';

	type FormResult = { success: true } | { error: string } | null;

	let { data, form }: { data: PageData; form: FormResult } = $props();

	const paymentMethods = $derived(data.paymentMethods as PaymentMethod[]);

	// Modal state
	let showModal = $state(false);
	let editingId = $state<string | null>(null);
	let submitting = $state(false);

	// Form fields
	let fType = $state<PaymentMethodType>('bank_transfer');
	let fLabel = $state('');
	let fAccountNumber = $state('');
	let fAccountName = $state('');
	let fInstructions = $state('');
	let fQrImageUrl = $state('');
	let fQrImageFile = $state<File | null>(null);
	let fQrPreview = $state('');

	// Toast
	let toastMessage = $state('');
	let toastType = $state<'success' | 'error'>('success');
	let toastVisible = $state(false);

	$effect(() => {
		if (form && 'success' in form) {
			showModal = false;
			submitting = false;
			showToast('Metode pembayaran berhasil disimpan', 'success');
		} else if (form && 'error' in form) {
			submitting = false;
			showToast(form.error, 'error');
		}
	});

	function showToast(message: string, type: 'success' | 'error') {
		toastMessage = message;
		toastType = type;
		toastVisible = true;
		setTimeout(() => (toastVisible = false), 3000);
	}

	function openAdd() {
		editingId = null;
		fType = 'bank_transfer';
		fLabel = '';
		fAccountNumber = '';
		fAccountName = '';
		fInstructions = '';
		fQrImageUrl = '';
		fQrImageFile = null;
		fQrPreview = '';
		showModal = true;
	}

	function openEdit(pm: PaymentMethod) {
		editingId = pm.id;
		fType = pm.type;
		fLabel = pm.label;
		fAccountNumber = pm.accountNumber ?? '';
		fAccountName = pm.accountName ?? '';
		fInstructions = pm.instructions ?? '';
		fQrImageUrl = pm.qrImageUrl ?? '';
		fQrImageFile = null;
		fQrPreview = pm.qrImageUrl ?? '';
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		fQrPreview = '';
		fQrImageFile = null;
	}

	function handleQrImageInput(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		fQrImageFile = file;
		fQrPreview = URL.createObjectURL(file);
	}

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

	const showAccountFields = $derived(fType !== 'cash');
	const showQrField = $derived(fType === 'qris');
</script>

<svelte:head>
	<title>Metode Pembayaran</title>
</svelte:head>

<!-- Toast -->
{#if toastVisible}
	<div
		class="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 shadow-lg text-sm font-medium transition-all"
		class:bg-emerald-600={toastType === 'success'}
		class:text-white={toastType === 'success'}
		class:bg-red-600={toastType === 'error'}
	>
		{#if toastType === 'success'}
			<Check class="h-4 w-4" />
		{:else}
			<X class="h-4 w-4" />
		{/if}
		{toastMessage}
	</div>
{/if}

<div class="mx-auto max-w-2xl space-y-6 px-4 py-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-xl font-semibold text-gray-900">Metode Pembayaran</h1>
			<p class="mt-1 text-sm text-gray-500">
				Tampil di halaman konfirmasi pesanan untuk panduan pembeli.
			</p>
		</div>
		<button
			onclick={openAdd}
			class="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 active:bg-emerald-800"
		>
			<Plus class="h-4 w-4" />
			Tambah
		</button>
	</div>

	<!-- Empty state -->
	{#if paymentMethods.length === 0}
		<div class="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
			<CreditCard class="mx-auto mb-3 h-10 w-10 text-gray-300" />
			<p class="text-sm font-medium text-gray-600">Belum ada metode pembayaran</p>
			<p class="mt-1 text-xs text-gray-400">
				Tambahkan QRIS, transfer bank, atau e-wallet agar pembeli tahu cara bayar.
			</p>
			<button
				onclick={openAdd}
				class="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
			>
				Tambah sekarang
			</button>
		</div>
	{:else}
		<!-- Payment method list -->
		<div class="space-y-3">
			{#each paymentMethods as pm (pm.id)}
				{@const Icon = typeIcons[pm.type]}
				<div
					class="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4"
					class:opacity-50={!pm.isActive}
				>
					<!-- Icon -->
					<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
						<Icon class="h-5 w-5 text-gray-600" />
					</div>

					<!-- Info -->
					<div class="min-w-0 flex-1">
						<div class="flex items-center gap-2">
							<p class="truncate font-medium text-gray-900">{pm.label}</p>
							<span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
								{typeLabels[pm.type]}
							</span>
							{#if !pm.isActive}
								<span class="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
									Nonaktif
								</span>
							{/if}
						</div>
						{#if pm.accountNumber}
							<p class="mt-0.5 text-sm text-gray-500">{pm.accountNumber}</p>
						{/if}
						{#if pm.accountName}
							<p class="text-xs text-gray-400">a.n. {pm.accountName}</p>
						{/if}
					</div>

					<!-- QRIS thumbnail -->
					{#if pm.qrImageUrl}
						<img src={pm.qrImageUrl} alt="QR {pm.label}" class="h-10 w-10 rounded object-cover" />
					{/if}

					<!-- Actions -->
					<div class="flex items-center gap-1">
						<button
							onclick={() => openEdit(pm)}
							class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
							aria-label="Edit {pm.label}"
						>
							<Pencil class="h-4 w-4" />
						</button>
						<form
							method="POST"
							action="?/delete"
							use:enhance={({ cancel }) => {
								if (!confirm(`Hapus "${pm.label}"?`)) {
									cancel();
									return;
								}
								return ({ update }) => update();
							}}
						>
							<input type="hidden" name="paymentMethodId" value={pm.id} />
							<button
								type="submit"
								class="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
								aria-label="Hapus {pm.label}"
							>
								<Trash2 class="h-4 w-4" />
							</button>
						</form>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Modal -->
{#if showModal}
	<!-- Backdrop -->
	<div
		role="presentation"
		class="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
		onclick={closeModal}
	></div>

	<!-- Dialog -->
	<div
		role="dialog"
		aria-modal="true"
		aria-labelledby="pm-modal-title"
		class="fixed inset-x-4 top-1/2 z-50 max-h-[90dvh] w-full max-w-md -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2"
	>
		<div class="mb-4 flex items-center justify-between">
			<h2 id="pm-modal-title" class="text-base font-semibold text-gray-900">
				{editingId ? 'Edit Metode Pembayaran' : 'Tambah Metode Pembayaran'}
			</h2>
			<button
				onclick={closeModal}
				class="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
				aria-label="Tutup"
			>
				<X class="h-5 w-5" />
			</button>
		</div>

		<form
			method="POST"
			action="?/save"
			enctype="multipart/form-data"
			use:enhance={() => {
				submitting = true;
				return ({ update }) => update({ reset: false });
			}}
			class="space-y-4"
		>
			{#if editingId}
				<input type="hidden" name="id" value={editingId} />
			{/if}

			<!-- Type -->
			<div class="space-y-1">
				<label for="pm-type" class="text-sm font-medium text-gray-700">Tipe</label>
				<select
					id="pm-type"
					name="type"
					bind:value={fType}
					class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
				>
					{#each Object.entries(typeLabels) as [value, label] (value)}
						<option {value}>{label}</option>
					{/each}
				</select>
			</div>

			<!-- Label -->
			<div class="space-y-1">
				<label for="pm-label" class="text-sm font-medium text-gray-700">Label</label>
				<input
					id="pm-label"
					name="label"
					type="text"
					bind:value={fLabel}
					placeholder={fType === 'qris'
						? 'QRIS BCA'
						: fType === 'bank_transfer'
							? 'BCA'
							: fType === 'ewallet'
								? 'GoPay'
								: fType === 'cash'
									? 'Tunai'
									: 'Metode lain'}
					required
					class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
				/>
			</div>

			<!-- Account fields (hidden for cash) -->
			{#if showAccountFields && fType !== 'qris'}
				<div class="space-y-1">
					<label for="pm-account-number" class="text-sm font-medium text-gray-700">
						{fType === 'ewallet' ? 'Nomor E-Wallet' : 'Nomor Rekening'}
					</label>
					<input
						id="pm-account-number"
						name="accountNumber"
						type="text"
						bind:value={fAccountNumber}
						placeholder={fType === 'ewallet' ? '08xxxxxxxxxx' : '1234567890'}
						class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
					/>
				</div>

				<div class="space-y-1">
					<label for="pm-account-name" class="text-sm font-medium text-gray-700">
						Nama Pemilik
					</label>
					<input
						id="pm-account-name"
						name="accountName"
						type="text"
						bind:value={fAccountName}
						placeholder="Nama lengkap pemilik rekening"
						class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
					/>
				</div>
			{/if}

			<!-- QRIS image upload -->
			{#if showQrField}
				<div class="space-y-2">
					<label for="pm-qr-image" class="text-sm font-medium text-gray-700">Gambar QRIS</label>
					{#if fQrPreview}
						<div class="flex items-center gap-3">
							<img
								src={fQrPreview}
								alt="Preview QRIS"
								class="h-24 w-24 rounded-lg border border-gray-200 object-cover"
							/>
							<button
								type="button"
								onclick={() => {
									fQrPreview = '';
									fQrImageFile = null;
									fQrImageUrl = '';
								}}
								class="text-sm text-red-500 hover:text-red-700"
							>
								Hapus gambar
							</button>
						</div>
					{/if}
					<input type="hidden" name="qrImageUrl" value={fQrImageFile ? '' : fQrImageUrl} />
					<input
						id="pm-qr-image"
						type="file"
						name="qrImage"
						accept="image/png,image/jpeg,image/webp"
						onchange={handleQrImageInput}
						class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-emerald-50 file:px-3 file:py-1 file:text-sm file:font-medium file:text-emerald-700"
					/>
					<p class="text-xs text-gray-400">PNG, JPG, atau WebP. Maks 2MB.</p>
				</div>
			{/if}

			<!-- Instructions -->
			<div class="space-y-1">
				<label for="pm-instructions" class="text-sm font-medium text-gray-700">
					Catatan (opsional)
				</label>
				<textarea
					id="pm-instructions"
					name="instructions"
					bind:value={fInstructions}
					rows={2}
					placeholder="Misal: Transfer nominal tepat termasuk 3 digit unik"
					class="w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
				></textarea>
			</div>

			<!-- Actions -->
			<div class="flex gap-3 pt-2">
				<button
					type="button"
					onclick={closeModal}
					class="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
				>
					Batal
				</button>
				<button
					type="submit"
					disabled={submitting}
					class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
				>
					{#if submitting}
						<Loader2 class="h-4 w-4 animate-spin" />
					{/if}
					Simpan
				</button>
			</div>
		</form>
	</div>
{/if}
