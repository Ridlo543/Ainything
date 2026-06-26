<script lang="ts">
	import { Button } from '$lib/ui/button';
	import { Input } from '$lib/ui/input';
	import { Label } from '$lib/ui/label';
	import { ChevronLeft } from '@lucide/svelte';

	let {
		businessName = $bindable(''),
		slug = $bindable(''),
		city = $bindable(''),
		submitting = false,
		onBack
	}: {
		businessName: string;
		slug: string;
		city: string;
		submitting?: boolean;
		onBack: () => void;
	} = $props();

	let slugManuallyEdited = $state(false);

	$effect(() => {
		if (!slugManuallyEdited) {
			slug = businessName
				.toLowerCase()
				.replace(/\s+/g, '-')
				.replace(/[^a-z0-9-]/g, '')
				.replace(/-+/g, '-')
				.replace(/^-|-$/g, '');
		}
	});

	const cities = [
		'Jakarta',
		'Surabaya',
		'Bandung',
		'Medan',
		'Semarang',
		'Makassar',
		'Yogyakarta',
		'Palembang',
		'Tangerang',
		'Depok',
		'Denpasar',
		'Malang',
		'Balikpapan',
		'Manado',
		'Pekanbaru'
	];
</script>

<div>
	<button
		type="button"
		onclick={onBack}
		class="mb-5 flex items-center gap-1.5 text-sm font-medium text-[#78716c] transition-colors hover:text-[#1a1a2e]"
	>
		<ChevronLeft size={16} /> Kembali
	</button>

	<h2 class="text-2xl font-extrabold text-[#1a1a2e]">Detail bisnis</h2>
	<p class="mt-1.5 text-sm text-[#78716c]">Ini yang akan dilihat pelanggan kamu di katalog.</p>

	<div class="mt-5 flex flex-col gap-4">
		<div class="space-y-1.5">
			<Label for="restaurantName">Nama Bisnis</Label>
			<Input
				id="restaurantName"
				name="restaurantName"
				type="text"
				placeholder="Warung Makan Sari"
				bind:value={businessName}
				class="min-h-11"
				required
			/>
		</div>

		<div class="space-y-1.5">
			<Label for="slug">
				Slug URL
				<span class="ml-1 text-xs font-normal text-[#78716c]">(otomatis)</span>
			</Label>
			<div
				class="flex overflow-hidden rounded-lg border border-[#e7e5e4] bg-[#fafaf9] focus-within:ring-2 focus-within:ring-[#059669]"
			>
				<span
					class="border-r border-[#e7e5e4] bg-[#f5f5f4] px-3 py-2.5 text-sm text-[#78716c] whitespace-nowrap"
					>ainything.online/</span
				>
				<input
					id="slug"
					name="slug"
					type="text"
					bind:value={slug}
					oninput={() => (slugManuallyEdited = true)}
					placeholder="nama-bisnis"
					class="min-h-11 flex-1 bg-transparent px-3 py-2.5 text-sm text-[#1a1a2e] focus:outline-none"
				/>
			</div>
		</div>

		<div class="space-y-1.5">
			<Label for="city">Kota</Label>
			<select
				id="city"
				name="city"
				bind:value={city}
				required
				class="w-full min-h-11 rounded-lg border border-[#e7e5e4] bg-white px-3 py-2.5 text-sm text-[#1a1a2e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#059669]"
			>
				<option value="" disabled selected>Pilih kota...</option>
				{#each cities as c (c)}
					<option value={c}>{c}</option>
				{/each}
			</select>
		</div>
	</div>

	<Button type="submit" class="mt-6 w-full min-h-11" disabled={submitting}>
		{submitting ? 'Membuat akun...' : 'Buat Akun Gratis'}
	</Button>

	<p class="mt-4 text-center text-xs text-[#78716c]">
		Dengan mendaftar, kamu menyetujui
		<a href="/terms" class="underline hover:text-[#1a1a2e]">Syarat & Ketentuan</a>
		dan
		<a href="/privacy" class="underline hover:text-[#1a1a2e]">Kebijakan Privasi</a> kami.
	</p>
</div>
