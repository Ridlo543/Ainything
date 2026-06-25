<script lang="ts">
	import { Star, MapPin } from '@lucide/svelte';

	const testimonials = [
		{
			quote:
				'Sekarang pelanggan bisa pesan sendiri dari meja. Antrian berkurang drastis, omzet naik 30% dalam sebulan pertama karena tidak ada pesanan yang terlewat.',
			name: 'Budi Santoso',
			role: 'Owner, Warung Nusantara',
			loc: 'Bali',
			avatar: '/mock-images/photo-1507003211169-0a1dd7228f2d.jpg'
		},
		{
			quote:
				'Setup dalam 20 menit, QR sudah dicetak dan ditempel. Tim langsung paham cara pakainya. Ini yang paling mudah yang pernah saya coba untuk digitalisasi toko saya.',
			name: 'Sari Dewi',
			role: 'Pemilik, Butik Sari Mode',
			loc: 'Jakarta',
			avatar: '/mock-images/photo-1494790108377-be9c29b29330.jpg'
		},
		{
			quote:
				'Punya 3 cabang dimsum, sekarang semua dikelola dari satu HP. Laporan harian otomatis, tidak perlu hitung manual lagi. Sangat membantu operasional kami.',
			name: 'Kevin Halim',
			role: 'Owner, Golden Lotus Dimsum',
			loc: 'Surabaya',
			avatar: '/mock-images/photo-1500648767791-00dcc994a43e.jpg'
		}
	];
</script>

<section class="border-t border-[#e7e5e4] bg-white py-20 sm:py-28">
	<div class="app-container">
		<div class="text-center">
			<p class="mb-2 text-sm font-semibold uppercase tracking-wider text-[#059669]">Testimoni</p>
			<h2 class="text-3xl font-extrabold text-[#1a1a2e] sm:text-4xl">
				Dipercaya bisnis dari seluruh Indonesia
			</h2>
			<p class="mx-auto mt-4 max-w-lg text-base text-[#78716c]">
				Dari warung pinggir jalan sampai chain restoran — semua cocok pakai Lingua.
			</p>
		</div>

		<div class="mt-14 grid gap-6 md:grid-cols-3">
			{#each testimonials as t (t.name)}
				<div class="flex flex-col rounded-2xl border border-[#e7e5e4] bg-[#fafaf9] p-7 shadow-sm">
					<!-- Stars -->
					<div class="flex gap-0.5">
						{#each { length: 5 } as _, i (i)}
							<Star size={16} class="fill-[#f59e0b] text-[#f59e0b]" />
						{/each}
					</div>

					<!-- Quote -->
					<blockquote class="mt-4 flex-1 text-sm leading-relaxed text-[#1a1a2e]">
						&ldquo;{t.quote}&rdquo;
					</blockquote>

					<!-- Author -->
					<div class="mt-6 flex items-center gap-3 border-t border-[#e7e5e4] pt-5">
						<img
							src={t.avatar}
							alt={t.name}
							class="h-11 w-11 rounded-full object-cover"
							width="44"
							height="44"
							loading="lazy"
						/>
						<div>
							<p class="text-sm font-bold text-[#1a1a2e]">{t.name}</p>
							<p class="text-xs text-[#78716c]">{t.role}</p>
							<div class="mt-0.5 flex items-center gap-1 text-[11px] text-[#059669]">
								<MapPin size={10} />{t.loc}
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Brand logos strip -->
		<div class="mt-14 rounded-2xl border border-[#e7e5e4] bg-[#fafaf9] px-6 py-5">
			<p class="mb-4 text-center text-xs font-semibold uppercase tracking-wider text-[#78716c]">
				Digunakan oleh bisnis dari
			</p>
			<div class="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
				{#each ['Jakarta', 'Bali', 'Surabaya', 'Bandung', 'Yogyakarta', 'Medan', 'Makassar'] as city (city)}
					<span class="text-sm font-bold text-[#1a1a2e]/40">{city}</span>
				{/each}
			</div>
		</div>
	</div>
</section>
