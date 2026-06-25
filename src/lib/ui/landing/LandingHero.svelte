<script lang="ts">
	import { ArrowRight, TrendingUp, QrCode, Zap } from '@lucide/svelte';

	const stats = [
		{ value: '3.200+', label: 'Produk dikelola' },
		{ value: '120+', label: 'Bisnis aktif' },
		{ value: '4.9★', label: 'Rating' },
		{ value: '<2 mnt', label: 'Setup' }
	];

	const products = [
		{ name: 'Nasi Goreng Spesial', price: 'Rp 35.000', badge: 'Terlaris', hot: true },
		{ name: 'Es Teh Manis', price: 'Rp 8.000', badge: 'Tersedia', hot: false },
		{ name: 'Ayam Bakar Madu', price: 'Rp 45.000', badge: 'Tersedia', hot: false },
		{ name: 'Gado-Gado', price: 'Rp 28.000', badge: 'Tersedia', hot: false }
	];
</script>

<section class="relative overflow-hidden bg-[#fafaf9] pb-16 pt-14 sm:pb-24 sm:pt-20">
	<!-- Background blobs -->
	<div class="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
		<div
			class="absolute right-0 top-0 h-[600px] w-[600px] -translate-y-1/4 translate-x-1/4 rounded-full bg-[#d1fae5]/50 blur-3xl"
		></div>
		<div
			class="absolute bottom-0 left-0 h-[400px] w-[400px] translate-y-1/4 -translate-x-1/4 rounded-full bg-[#fce7f3]/40 blur-3xl"
		></div>
	</div>

	<div class="app-container">
		<div class="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
			<!-- Copy side -->
			<div class="animate-fade-in-up">
				<div
					class="mb-5 inline-flex items-center gap-2 rounded-full border border-[#e7e5e4] bg-white px-4 py-1.5 text-xs font-semibold text-[#059669] shadow-sm"
				>
					<Zap size={12} class="fill-[#059669]" />
					Restoran, Toko & Jasa · Semua skala
				</div>

				<h1
					class="text-[2.6rem] font-extrabold leading-[1.1] tracking-tight text-[#1a1a2e] sm:text-5xl lg:text-[3.25rem]"
				>
					Katalog digital
					<span class="text-[#059669]">+ QR code</span><br />
					untuk bisnis kamu
				</h1>
				<p class="mt-5 text-lg leading-relaxed text-[#78716c] sm:text-xl">
					Pelanggan scan QR atau buka link → lihat katalog → pesan langsung. Semua tanpa install
					app. Kamu terima notifikasi dan proses dari HP.
				</p>

				<div class="mt-8 flex flex-col gap-3 sm:flex-row">
					<a
						href="/register"
						class="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-[#059669] px-8 text-base font-bold text-white shadow-lg transition-all hover:bg-[#047857] hover:shadow-xl"
					>
						Mulai Gratis Sekarang <ArrowRight size={18} />
					</a>
					<a
						href="#cara-kerja"
						class="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-[#e7e5e4] bg-white px-8 text-base font-semibold text-[#1a1a2e] transition-colors hover:bg-[#f5f5f4]"
					>
						Lihat Cara Kerja
					</a>
				</div>
				<p class="mt-3 text-sm text-[#78716c]">
					Gratis selamanya · Setup &lt;2 menit · Tidak perlu kartu kredit
				</p>

				<!-- Stats row -->
				<div class="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
					{#each stats as s}
						<div
							class="rounded-xl border border-[#e7e5e4] bg-white px-3 py-3 text-center shadow-sm"
						>
							<p class="text-xl font-extrabold text-[#059669]">{s.value}</p>
							<p class="mt-0.5 text-xs text-[#78716c]">{s.label}</p>
						</div>
					{/each}
				</div>
			</div>

			<!-- Visual side: App mockup -->
			<div class="relative hidden lg:flex lg:justify-center">
				<!-- Floating stat card -->
				<div
					class="absolute -left-8 top-4 z-20 w-52 rounded-2xl border border-[#e7e5e4] bg-white p-4 shadow-xl"
				>
					<p class="text-[11px] font-semibold text-[#78716c]">Pesanan hari ini</p>
					<p class="mt-1 text-3xl font-extrabold text-[#059669]">24</p>
					<div class="mt-1 flex items-center gap-1 text-xs text-[#059669]">
						<TrendingUp size={12} />
						+12% dari kemarin
					</div>
				</div>

				<!-- Notification pill -->
				<div
					class="absolute -right-4 top-1/3 z-20 flex items-center gap-2 rounded-full border border-[#e7e5e4] bg-white px-4 py-2 shadow-xl"
				>
					<span class="flex h-2 w-2 rounded-full bg-[#059669] shadow-[0_0_6px_#059669]"></span>
					<span class="text-xs font-semibold text-[#1a1a2e]">Pesanan baru masuk!</span>
				</div>

				<!-- Phone mockup -->
				<div
					class="relative z-10 w-[300px] overflow-hidden rounded-[2rem] border-[6px] border-[#1a1a2e] bg-white shadow-2xl"
				>
					<!-- Phone top bar -->
					<div class="flex items-center justify-between bg-[#059669] px-4 py-2.5">
						<span class="text-[10px] font-bold text-white">lingua.app/warung-sari</span>
						<QrCode size={14} class="text-white" />
					</div>

					<!-- Banner image -->
					<div class="relative bg-[#059669] px-4 pb-4 pt-1">
						<img
							src="/mock-images/photo-1555396273-367ea4eb4db5.jpg"
							alt="Warung Sari"
							class="h-20 w-full rounded-xl object-cover opacity-80"
							width="320"
							height="80"
						/>
						<p class="mt-2 text-sm font-bold text-white">Warung Sari</p>
						<p class="text-[10px] text-white/80">Bali · Buka 08.00–21.00</p>
					</div>

					<!-- Products -->
					<div class="p-3">
						<p class="mb-2 text-[11px] font-bold text-[#1a1a2e]">Menu Populer</p>
						<div class="grid grid-cols-2 gap-2">
							{#each products as p}
								<div class="rounded-xl border border-[#e7e5e4] bg-[#fafaf9] p-2">
									<p class="text-[10px] font-semibold leading-tight text-[#1a1a2e]">{p.name}</p>
									<p class="mt-0.5 text-[10px] text-[#78716c]">{p.price}</p>
									<span
										class="mt-1 inline-block rounded-full px-1.5 py-0.5 text-[8px] font-bold {p.hot
											? 'bg-[#fef3c7] text-[#d97706]'
											: 'bg-[#d1fae5] text-[#059669]'}"
									>
										{p.badge}
									</span>
								</div>
							{/each}
						</div>
						<button class="mt-3 w-full rounded-xl bg-[#059669] py-2.5 text-xs font-bold text-white"
							>Lihat Semua Menu</button
						>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>
