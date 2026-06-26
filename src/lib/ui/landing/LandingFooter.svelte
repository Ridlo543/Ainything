<script lang="ts">
	import { ArrowRight } from '@lucide/svelte';

	const year = new Date().getFullYear();

	const links = [
		{
			title: 'Produk',
			items: [
				{ label: 'Fitur', href: '#fitur' },
				{ label: 'Cara Kerja', href: '#cara-kerja' },
				{ label: 'Harga', href: '#harga' },
				{ label: 'Demo', href: '/login' }
			]
		},
		{
			title: 'Bisnis',
			items: [
				{ label: 'Restoran & Cafe', href: '/register' },
				{ label: 'Toko & Retail', href: '/register' },
				{ label: 'Jasa & Layanan', href: '/register' },
				{ label: 'Enterprise', href: 'mailto:halo@ainything.online' }
			]
		},
		{
			title: 'Perusahaan',
			items: [
				{ label: 'Tentang Kami', href: '/about' },
				{ label: 'Blog', href: '/blog' },
				{ label: 'Kontak', href: 'mailto:halo@ainything.online' },
				{ label: 'Karir', href: '/careers' }
			]
		},
		{
			title: 'Legal',
			items: [
				{ label: 'Kebijakan Privasi', href: '/privacy' },
				{ label: 'Syarat & Ketentuan', href: '/terms' },
				{ label: 'Keamanan Data', href: '/security' }
			]
		}
	];
</script>

<!-- CTA Banner -->
<section class="border-t border-[#e7e5e4] bg-[#059669] py-16 sm:py-20">
	<div class="app-container text-center">
		<h2 class="text-3xl font-extrabold text-white sm:text-4xl">Siap digitalisasi bisnis kamu?</h2>
		<p class="mx-auto mt-4 max-w-lg text-base text-white/80">
			Daftar gratis sekarang dan terima pesanan digital pertama kamu hari ini. Tidak perlu kartu
			kredit.
		</p>
		<div class="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
			<a
				href="/register"
				class="inline-flex min-h-[52px] items-center gap-2 rounded-xl bg-white px-8 text-base font-bold text-[#059669] shadow-lg transition-all hover:bg-[#f0fdf4] hover:shadow-xl"
			>
				Mulai Gratis Sekarang <ArrowRight size={18} />
			</a>
			<a
				href="/login"
				class="inline-flex min-h-[52px] items-center gap-2 rounded-xl border border-white/30 px-8 text-base font-semibold text-white transition-colors hover:bg-white/10"
			>
				Coba Demo Dulu
			</a>
		</div>
	</div>
</section>

<!-- Footer -->
<footer class="border-t border-[#e7e5e4] bg-[#1a1a2e] py-14">
	<div class="app-container">
		<div class="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
			<!-- Brand -->
			<div class="lg:col-span-1">
				<a href="/" class="flex items-center gap-2.5" aria-label="Ainything beranda">
					<span
						class="flex h-8 w-8 items-center justify-center rounded-lg bg-[#059669] text-sm font-black text-white"
						>L</span
					>
					<span class="text-lg font-extrabold tracking-tight text-white">Ainything</span>
				</a>
				<p class="mt-4 text-sm leading-relaxed text-white/50">
					Platform digital untuk bisnis dari semua skala. Katalog, QR, pesanan — semua dari satu
					tempat.
				</p>
			</div>

			<!-- Nav links -->
			{#each links as col (col.title)}
				<div>
					<h4 class="mb-4 text-xs font-bold uppercase tracking-wider text-white/40">{col.title}</h4>
					<ul class="space-y-2.5">
						{#each col.items as item (item.label)}
							<li>
								<a href={item.href} class="text-sm text-white/50 transition-colors hover:text-white"
									>{item.label}</a
								>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>

		<div
			class="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row"
		>
			<p class="text-xs text-white/30">
				&copy; {year} Ainything. Hak cipta dilindungi undang-undang.
			</p>
			<p class="text-xs text-white/30">Dibuat dengan ❤ untuk bisnis Indonesia</p>
		</div>
	</div>
</footer>
