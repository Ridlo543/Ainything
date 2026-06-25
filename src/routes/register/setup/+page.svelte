<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import {
		Package, QrCode, Users, Check, ArrowRight, SkipForward,
		Plus, Mail, Sparkles
	} from '@lucide/svelte';
	import QrCodeDisplay from '$lib/ui/primitives/QrCodeDisplay.svelte';

	let { data, form }: { data: PageData; form?: ActionData } = $props();

	const restaurant = $derived(data.tenant.activeRestaurant);
	const publicUrl = $derived(`${data.publicAppUrl}/${restaurant.slug}`);

	let step = $state(1);
	let productAdded = $state(false);
	let staffInvited = $state(false);
	let submitting = $state(false);

	function nextStep() {
		if (step < 3) {
			step++;
		} else {
			goto('/dashboard');
		}
	}

	function skipStep() {
		nextStep();
	}

	const steps = [
		{ num: 1, label: 'Produk', icon: Package },
		{ num: 2, label: 'QR Code', icon: QrCode },
		{ num: 3, label: 'Tim', icon: Users }
	];

	$effect(() => {
		if (form?.success && form?.step === 'product') {
			productAdded = true;
		}
		if (form?.success && form?.step === 'staff') {
			staffInvited = true;
		}
	});
</script>

<svelte:head>
	<title>Setup — {restaurant.name}</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-[#fafaf9]">

	<!-- Header -->
	<header class="border-b border-[#f0eeec] bg-white px-4 py-4">
		<div class="mx-auto flex max-w-lg items-center justify-between">
			<div class="flex items-center gap-2">
				<span class="flex h-8 w-8 items-center justify-center rounded-lg bg-[#059669] text-sm font-black text-white">L</span>
				<span class="text-lg font-extrabold text-[#1a1a2e]">Lingua</span>
			</div>
			<form method="POST" action="?/skip" use:enhance>
				<button
					type="submit"
					class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-[#78716c] hover:bg-[#f5f5f4] transition-colors"
				>
					<SkipForward size={14} />
					Lewati semua
				</button>
			</form>
		</div>
	</header>

	<!-- Main content -->
	<main class="flex flex-1 flex-col items-center px-4 py-8">
		<div class="w-full max-w-lg">

			<!-- Step indicator -->
			<div class="mb-8 flex items-center justify-center gap-3">
				{#each steps as s, i}
					<div class="flex items-center gap-2">
						<div
							class="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-colors
								{step === s.num
									? 'bg-[#059669] text-white'
									: step > s.num
										? 'bg-[#d1fae5] text-[#059669]'
										: 'bg-[#f5f5f4] text-[#a8a29e]'}"
						>
							{#if step > s.num}
								<Check size={16} />
							{:else}
								<s.icon size={16} />
							{/if}
						</div>
						<span class="text-xs font-semibold {step === s.num ? 'text-[#1a1a2e]' : 'text-[#a8a29e]'}">
							{s.label}
						</span>
					</div>
					{#if i < steps.length - 1}
						<div class="h-px w-8 bg-[#f0eeec]"></div>
					{/if}
				{/each}
			</div>

			<!-- Step 1: Add Product -->
			{#if step === 1}
				<div class="rounded-2xl bg-white p-6 shadow-sm">
					<div class="mb-6 text-center">
						<div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f0fdf4]">
							<Package size={24} class="text-[#059669]" />
						</div>
						<h1 class="text-xl font-extrabold text-[#1a1a2e]">Tambah Produk Pertama</h1>
						<p class="mt-1 text-sm text-[#78716c]">
							Mulai dengan satu produk andalan kamu
						</p>
					</div>

					{#if productAdded}
						<div class="flex flex-col items-center py-6">
							<div class="flex h-14 w-14 items-center justify-center rounded-full bg-[#d1fae5]">
								<Check size={28} class="text-[#059669]" />
							</div>
							<p class="mt-4 text-sm font-semibold text-[#1a1a2e]">Produk berhasil ditambahkan!</p>
							<button
								type="button"
								onclick={nextStep}
								class="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#059669] px-6 text-sm font-bold text-white hover:bg-[#047857] transition-colors"
							>
								Lanjut <ArrowRight size={16} />
							</button>
						</div>
					{:else}
						<form method="POST" action="?/addProduct" use:enhance>
							<div class="space-y-4">
								<div>
									<label for="product-name" class="mb-1.5 block text-sm font-semibold text-[#1a1a2e]">
										Nama Produk <span class="text-[#dc2626]">*</span>
									</label>
									<input
										id="product-name"
										name="name"
										type="text"
										placeholder="Contoh: Nasi Goreng Spesial"
										required
										class="h-11 w-full rounded-xl border border-[#f0eeec] bg-[#fafaf9] px-4 text-sm text-[#1a1a2e] placeholder-[#a8a29e] focus:border-[#059669] focus:outline-none focus:ring-2 focus:ring-[#059669]/20"
									/>
								</div>

								<div class="grid grid-cols-2 gap-3">
									<div>
										<label for="product-price" class="mb-1.5 block text-sm font-semibold text-[#1a1a2e]">
											Harga <span class="text-[#dc2626]">*</span>
										</label>
										<div class="relative">
											<span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#78716c]">Rp</span>
											<input
												id="product-price"
												name="price"
												type="number"
												placeholder="25000"
												min="0"
												required
												class="h-11 w-full rounded-xl border border-[#f0eeec] bg-[#fafaf9] pl-10 pr-4 text-sm text-[#1a1a2e] placeholder-[#a8a29e] focus:border-[#059669] focus:outline-none focus:ring-2 focus:ring-[#059669]/20"
											/>
										</div>
									</div>
									<div>
										<label for="product-category" class="mb-1.5 block text-sm font-semibold text-[#1a1a2e]">
											Kategori <span class="text-[#dc2626]">*</span>
										</label>
										<input
											id="product-category"
											name="category"
											type="text"
											placeholder="Contoh: Makanan"
											required
											class="h-11 w-full rounded-xl border border-[#f0eeec] bg-[#fafaf9] px-4 text-sm text-[#1a1a2e] placeholder-[#a8a29e] focus:border-[#059669] focus:outline-none focus:ring-2 focus:ring-[#059669]/20"
										/>
									</div>
								</div>

								<div>
									<label for="product-desc" class="mb-1.5 block text-sm font-semibold text-[#1a1a2e]">
										Deskripsi <span class="text-xs font-normal text-[#a8a29e]">(opsional)</span>
									</label>
									<textarea
										id="product-desc"
										name="description"
										rows={2}
										placeholder="Deskripsi singkat produk"
										class="w-full resize-none rounded-xl border border-[#f0eeec] bg-[#fafaf9] px-4 py-3 text-sm text-[#1a1a2e] placeholder-[#a8a29e] focus:border-[#059669] focus:outline-none focus:ring-2 focus:ring-[#059669]/20"
									></textarea>
								</div>
							</div>

							{#if form?.step === 'product' && form?.message}
								<p class="mt-3 text-xs font-medium text-[#dc2626]">{form.message}</p>
							{/if}

							<div class="mt-6 flex gap-3">
								<button
									type="button"
									onclick={skipStep}
									class="flex-1 min-h-[44px] rounded-xl border border-[#f0eeec] text-sm font-semibold text-[#78716c] hover:bg-[#f5f5f4] transition-colors"
								>
									Lewati
								</button>
								<button
									type="submit"
									class="flex-1 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#059669] text-sm font-bold text-white hover:bg-[#047857] transition-colors"
								>
									<Plus size={16} /> Tambah Produk
								</button>
							</div>
						</form>
					{/if}
				</div>

			<!-- Step 2: QR Code -->
			{:else if step === 2}
				<div class="rounded-2xl bg-white p-6 shadow-sm">
					<div class="mb-6 text-center">
						<div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f0fdf4]">
							<QrCode size={24} class="text-[#059669]" />
						</div>
						<h1 class="text-xl font-extrabold text-[#1a1a2e]">QR Code Katalog</h1>
						<p class="mt-1 text-sm text-[#78716c]">
							Cetak dan pasang di meja atau pintu masuk
						</p>
					</div>

					<div class="flex flex-col items-center rounded-xl border border-[#f0eeec] bg-[#fafaf9] p-6">
						<QrCodeDisplay url={publicUrl} label="Katalog {restaurant.name}" size={192} />
						<p class="mt-4 text-sm font-semibold text-[#1a1a2e]">{restaurant.name}</p>
						<p class="mt-0.5 text-xs text-[#78716c]">{publicUrl}</p>
					</div>

					<div class="mt-6 flex gap-3">
						<button
							type="button"
							onclick={skipStep}
							class="flex-1 min-h-[44px] rounded-xl border border-[#f0eeec] text-sm font-semibold text-[#78716c] hover:bg-[#f5f5f4] transition-colors"
						>
							Lewati
						</button>
						<button
							type="button"
							onclick={nextStep}
							class="flex-1 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#059669] text-sm font-bold text-white hover:bg-[#047857] transition-colors"
						>
							Lanjut <ArrowRight size={16} />
						</button>
					</div>
				</div>

			<!-- Step 3: Invite Staff -->
			{:else if step === 3}
				<div class="rounded-2xl bg-white p-6 shadow-sm">
					<div class="mb-6 text-center">
						<div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f0fdf4]">
							<Users size={24} class="text-[#059669]" />
						</div>
						<h1 class="text-xl font-extrabold text-[#1a1a2e]">Undang Tim</h1>
						<p class="mt-1 text-sm text-[#78716c]">
							Tambahkan manajer atau staf untuk membantu mengelola katalog
						</p>
					</div>

					{#if staffInvited}
						<div class="flex flex-col items-center py-6">
							<div class="flex h-14 w-14 items-center justify-center rounded-full bg-[#d1fae5]">
								<Check size={28} class="text-[#059669]" />
							</div>
							<p class="mt-4 text-sm font-semibold text-[#1a1a2e]">Undangan berhasil dikirim!</p>
							<button
								type="button"
								onclick={() => goto('/dashboard')}
								class="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#059669] px-6 text-sm font-bold text-white hover:bg-[#047857] transition-colors"
							>
								<Sparkles size={16} /> Buka Dashboard
							</button>
						</div>
					{:else}
						<form method="POST" action="?/inviteStaff" use:enhance>
							<div class="space-y-4">
								<div>
									<label for="staff-email" class="mb-1.5 block text-sm font-semibold text-[#1a1a2e]">
										Email <span class="text-[#dc2626]">*</span>
									</label>
									<div class="relative">
										<Mail size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-[#a8a29e]" />
										<input
											id="staff-email"
											name="email"
											type="email"
											placeholder="email@contoh.com"
											required
											class="h-11 w-full rounded-xl border border-[#f0eeec] bg-[#fafaf9] pl-10 pr-4 text-sm text-[#1a1a2e] placeholder-[#a8a29e] focus:border-[#059669] focus:outline-none focus:ring-2 focus:ring-[#059669]/20"
										/>
									</div>
								</div>

								<div>
									<label for="staff-role" class="mb-1.5 block text-sm font-semibold text-[#1a1a2e]">
										Role <span class="text-[#dc2626]">*</span>
									</label>
									<select
										id="staff-role"
										name="role"
										required
										class="h-11 w-full rounded-xl border border-[#f0eeec] bg-[#fafaf9] px-3 text-sm text-[#1a1a2e] focus:border-[#059669] focus:outline-none"
									>
										<option value="staff">Staff — bisa edit produk</option>
										<option value="manager">Manager — bisa edit + lihat laporan</option>
									</select>
								</div>
							</div>

							{#if form?.step === 'staff' && form?.message}
								<p class="mt-3 text-xs font-medium text-[#dc2626]">{form.message}</p>
							{/if}

							<div class="mt-6 flex gap-3">
								<button
									type="button"
									onclick={skipStep}
									class="flex-1 min-h-[44px] rounded-xl border border-[#f0eeec] text-sm font-semibold text-[#78716c] hover:bg-[#f5f5f4] transition-colors"
								>
									Lewati
								</button>
								<button
									type="submit"
									class="flex-1 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#059669] text-sm font-bold text-white hover:bg-[#047857] transition-colors"
								>
									<Mail size={16} /> Kirim Undangan
								</button>
							</div>
						</form>
					{/if}
				</div>
			{/if}

			<!-- Progress text -->
			<p class="mt-4 text-center text-xs text-[#a8a29e]">
				Step {step} dari 3 — semua langkah opsional
			</p>
		</div>
	</main>
</div>
