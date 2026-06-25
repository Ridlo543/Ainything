<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import {
		Save,
		QrCode,
		Copy,
		ExternalLink,
		Check,
		Globe,
		Building2,
		MapPin
	} from '@lucide/svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const org = $derived(data.tenant.organization);
	const restaurant = $derived(data.tenant.activeRestaurant);
	const settings = $derived(data.settings);

	let bizName = $state('');
	let bizSlug = $state('');
	let bizDesc = $state('');
	let bizLocation = $state('');

	$effect(() => {
		bizName = settings.name ?? '';
		bizSlug = settings.slug ?? restaurant.slug ?? '';
		bizDesc = settings.description ?? '';
		bizLocation = settings.location ?? '';
	});

	let copied = $state(false);
	let saving = $state(false);
	let saved = $state(false);

	$effect(() => {
		if (form?.success) {
			saved = true;
			saving = false;
			setTimeout(() => (saved = false), 2000);
		}
	});

	const catalogUrl = $derived(`https://lingua.app/r/${bizSlug}`);

	function copyLink() {
		navigator.clipboard.writeText(catalogUrl);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<svelte:head>
	<title>Pengaturan — {org.name}</title>
</svelte:head>

<div class="mx-auto max-w-2xl space-y-6">
	<div>
		<h1 class="text-2xl font-extrabold text-[#1a1a2e]">Pengaturan</h1>
		<p class="mt-0.5 text-sm text-[#78716c]">Kelola informasi bisnis dan katalog kamu</p>
	</div>

	<!-- General info -->
	<div class="rounded-2xl bg-white shadow-sm">
		<div class="border-b border-[#f5f5f4] px-6 py-4">
			<h2 class="flex items-center gap-2 text-sm font-bold text-[#1a1a2e]">
				<Building2 size={16} class="text-[#059669]" /> Informasi Bisnis
			</h2>
		</div>
		<form
			method="POST"
			use:enhance={() => {
				saving = true;
				return async ({ update }) => {
					await update();
				};
			}}
		>
			<div class="space-y-5 p-6">
				{#if form?.error}
					<div
						class="rounded-xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#dc2626]"
					>
						{form.error}
					</div>
				{/if}
				{#if saved}
					<div
						class="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm text-[#059669]"
					>
						Pengaturan berhasil disimpan!
					</div>
				{/if}
				<div>
					<label for="biz-name" class="mb-1.5 block text-sm font-semibold text-[#1a1a2e]"
						>Nama Bisnis</label
					>
					<input
						id="biz-name"
						name="name"
						type="text"
						bind:value={bizName}
						class="h-11 w-full rounded-xl border border-[#f0eeec] bg-[#fafaf9] px-4 text-sm text-[#1a1a2e] focus:border-[#059669] focus:outline-none focus:ring-2 focus:ring-[#059669]/20"
					/>
				</div>
				<div>
					<label for="biz-slug" class="mb-1.5 block text-sm font-semibold text-[#1a1a2e]">
						Slug URL
						<span class="ml-1 text-xs font-normal text-[#78716c]"
							>(unik, tidak bisa diubah setelah aktif)</span
						>
					</label>
					<div
						class="flex overflow-hidden rounded-xl border border-[#f0eeec] bg-[#fafaf9] focus-within:border-[#059669] focus-within:ring-2 focus-within:ring-[#059669]/20"
					>
						<span
							class="flex items-center border-r border-[#f0eeec] px-3 text-sm text-[#a8a29e] whitespace-nowrap"
							>lingua.app/r/</span
						>
						<input
							id="biz-slug"
							type="text"
							bind:value={bizSlug}
							class="h-11 flex-1 bg-transparent px-3 text-sm text-[#1a1a2e] focus:outline-none"
							disabled
						/>
					</div>
				</div>
				<div>
					<label for="biz-desc" class="mb-1.5 block text-sm font-semibold text-[#1a1a2e]"
						>Deskripsi</label
					>
					<textarea
						id="biz-desc"
						name="description"
						bind:value={bizDesc}
						rows={3}
						placeholder="Deskripsi singkat bisnis kamu..."
						class="w-full resize-none rounded-xl border border-[#f0eeec] bg-[#fafaf9] px-4 py-3 text-sm text-[#1a1a2e] placeholder-[#a8a29e] focus:border-[#059669] focus:outline-none focus:ring-2 focus:ring-[#059669]/20"
					></textarea>
				</div>
				<div>
					<label
						for="biz-location"
						class="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-[#1a1a2e]"
					>
						<MapPin size={14} /> Lokasi
					</label>
					<input
						id="biz-location"
						name="location"
						type="text"
						bind:value={bizLocation}
						placeholder="Contoh: Canggu, Bali"
						class="h-11 w-full rounded-xl border border-[#f0eeec] bg-[#fafaf9] px-4 text-sm text-[#1a1a2e] placeholder-[#a8a29e] focus:border-[#059669] focus:outline-none focus:ring-2 focus:ring-[#059669]/20"
					/>
				</div>
				<button
					type="submit"
					disabled={saving}
					class="inline-flex min-h-[44px] items-center gap-2 rounded-xl px-6 text-sm font-bold text-white transition-colors
						{saving ? 'bg-[#059669]/70' : 'bg-[#059669] hover:bg-[#047857]'}"
				>
					{#if saved}
						<Check size={16} /> Tersimpan!
					{:else if saving}
						Menyimpan...
					{:else}
						<Save size={16} /> Simpan Perubahan
					{/if}
				</button>
			</div>
		</form>
	</div>

	<!-- QR & Link -->
	<div class="rounded-2xl bg-white shadow-sm">
		<div class="border-b border-[#f5f5f4] px-6 py-4">
			<h2 class="flex items-center gap-2 text-sm font-bold text-[#1a1a2e]">
				<QrCode size={16} class="text-[#059669]" /> QR Code & Link Katalog
			</h2>
		</div>
		<div class="p-6">
			<div class="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
				<!-- QR Preview -->
				<div class="flex shrink-0 flex-col items-center gap-3">
					<div
						class="flex h-36 w-36 items-center justify-center rounded-2xl border-2 border-dashed border-[#f0eeec] bg-[#fafaf9]"
					>
						<QrCode size={64} class="text-[#1a1a2e]" />
					</div>
					<button
						type="button"
						class="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-[#f0eeec] px-4 text-xs font-semibold text-[#78716c] hover:bg-[#f5f5f4] transition-colors"
					>
						Download QR
					</button>
				</div>
				<!-- Link info -->
				<div class="flex-1 space-y-4">
					<div>
						<p class="mb-1.5 text-sm font-semibold text-[#1a1a2e]">Link Katalog Kamu</p>
						<div class="flex overflow-hidden rounded-xl border border-[#f0eeec] bg-[#fafaf9]">
							<span class="flex flex-1 items-center truncate px-3 py-2.5 text-sm text-[#78716c]"
								>{catalogUrl}</span
							>
							<button
								type="button"
								onclick={copyLink}
								class="flex shrink-0 items-center gap-1.5 border-l border-[#f0eeec] px-3 text-xs font-semibold transition-colors
									{copied ? 'text-[#059669]' : 'text-[#78716c] hover:text-[#1a1a2e]'}"
								aria-label="Salin link"
							>
								{#if copied}
									<Check size={14} /> Disalin!
								{:else}
									<Copy size={14} /> Salin
								{/if}
							</button>
						</div>
					</div>
					<a
						href="/r/{bizSlug}"
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-[#f0eeec] px-4 text-sm font-semibold text-[#1a1a2e] hover:bg-[#f5f5f4] transition-colors"
					>
						<Globe size={15} /> Buka Katalog
						<ExternalLink size={13} class="text-[#a8a29e]" />
					</a>
					<p class="text-xs text-[#78716c]">
						Bagikan link ini atau cetak QR ke pelanggan. Mereka bisa langsung melihat katalog dan
						memesan tanpa install app.
					</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Billing / plan -->
	<div class="rounded-2xl bg-white shadow-sm">
		<div class="border-b border-[#f5f5f4] px-6 py-4">
			<h2 class="text-sm font-bold text-[#1a1a2e]">Paket & Billing</h2>
		</div>
		<div class="p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-bold text-[#1a1a2e]">
						Paket {org.plan === 'pro' ? 'Pro' : org.plan === 'pilot' ? 'Pilot' : 'Starter'}
					</p>
					<p class="mt-0.5 text-xs text-[#78716c]">Aktif sejak Juni 2025</p>
				</div>
				<span class="rounded-full bg-[#d1fae5] px-3 py-1 text-xs font-bold text-[#059669]"
					>Aktif</span
				>
			</div>
			<div class="mt-4 rounded-xl bg-[#fafaf9] p-4">
				<div class="grid grid-cols-3 gap-4 text-center">
					{#each [['5', 'Outlet'], ['50', 'Produk'], ['Tak terbatas', 'Pesanan']] as [val, lbl] (lbl)}
						<div>
							<p class="text-lg font-extrabold text-[#1a1a2e]">{val}</p>
							<p class="text-xs text-[#78716c]">{lbl}</p>
						</div>
					{/each}
				</div>
			</div>
			<a
				href="/dashboard/settings/billing"
				class="mt-4 inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-[#f0eeec] px-4 text-sm font-semibold text-[#78716c] hover:bg-[#f5f5f4] transition-colors"
			>
				Kelola Paket & Tagihan
			</a>
		</div>
	</div>
</div>
