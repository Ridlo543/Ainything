<script lang="ts">
	import { UtensilsCrossed, ShoppingBag, Briefcase, ArrowRight } from '@lucide/svelte';

	let { onSelect }: { onSelect: (type: 'restaurant' | 'retail' | 'service') => void } = $props();

	let hovered = $state('');

	const types = [
		{
			value: 'restaurant' as const,
			label: 'Restoran & Cafe',
			description: 'Menu digital, pemesanan meja, dan manajemen dapur dalam satu platform.',
			icon: UtensilsCrossed,
			img: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=80&h=80&fit=crop&auto=format&q=80'
		},
		{
			value: 'retail' as const,
			label: 'Toko / Retail',
			description: 'Katalog produk digital untuk toko fisik atau online dengan QR code.',
			icon: ShoppingBag,
			img: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=80&h=80&fit=crop&auto=format&q=80'
		},
		{
			value: 'service' as const,
			label: 'Jasa / Layanan',
			description: 'Tampilkan layanan kamu dan terima booking dari pelanggan dengan mudah.',
			icon: Briefcase,
			img: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=80&h=80&fit=crop&auto=format&q=80'
		}
	];
</script>

<div>
	<h1 class="text-2xl font-extrabold text-[#1a1a2e]">Jenis bisnis kamu</h1>
	<p class="mt-1.5 text-sm text-[#78716c]">Pilih kategori yang paling sesuai — bisa diubah nanti.</p>

	<div class="mt-6 flex flex-col gap-3">
		{#each types as type}
			<button
				type="button"
				onclick={() => onSelect(type.value)}
				onmouseenter={() => (hovered = type.value)}
				onmouseleave={() => (hovered = '')}
				class="group flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all duration-150
					hover:border-[#059669] hover:bg-[#f0fdf4]
					{hovered === type.value ? 'border-[#059669] bg-[#f0fdf4]' : 'border-[#e7e5e4] bg-white'}"
			>
				<img
					src={type.img}
					alt={type.label}
					class="h-14 w-14 shrink-0 rounded-xl object-cover"
					width="56" height="56"
				/>
				<div class="flex-1 text-left">
					<p class="font-bold text-[#1a1a2e]">{type.label}</p>
					<p class="mt-0.5 text-sm text-[#78716c]">{type.description}</p>
				</div>
				<ArrowRight
					size={18}
					class="shrink-0 text-[#059669] transition-all
						{hovered === type.value ? 'translate-x-0 opacity-100' : '-translate-x-1 opacity-0'}"
				/>
			</button>
		{/each}
	</div>
</div>
