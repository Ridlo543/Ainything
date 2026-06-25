<script lang="ts">
	import {
		QrCode,
		ShoppingCart,
		Package,
		Bell,
		Users,
		TrendingUp,
		Store,
		Smartphone,
		Shield
	} from '@lucide/svelte';

	const features = [
		{
			icon: QrCode,
			title: 'Katalog QR & Link',
			desc: 'Pelanggan scan QR di meja atau buka link dari WhatsApp — langsung lihat katalog tanpa install app apapun.',
			color: 'text-[#059669]',
			bg: 'bg-[#d1fae5]'
		},
		{
			icon: ShoppingCart,
			title: 'Keranjang & Pesanan',
			desc: 'Pelanggan pilih produk, tambah catatan khusus, kirim pesanan — tanpa login, tanpa unduh, langsung jalan.',
			color: 'text-[#d97706]',
			bg: 'bg-[#fef3c7]'
		},
		{
			icon: Package,
			title: 'Kelola Katalog Mudah',
			desc: 'Tambah produk lewat foto HP, atur harga dan kategori, nonaktifkan stok habis — semua dalam hitungan detik.',
			color: 'text-[#059669]',
			bg: 'bg-[#d1fae5]'
		},
		{
			icon: Bell,
			title: 'Notifikasi Real-time',
			desc: 'Setiap pesanan masuk langsung notifikasi ke HP. Staff proses, update status, dan konfirmasi dari dashboard.',
			color: 'text-[#db2777]',
			bg: 'bg-[#fce7f3]'
		},
		{
			icon: Users,
			title: 'Manajemen Staff & Peran',
			desc: 'Undang kasir, pelayan, atau manajer. Atur akses per peran — owner tetap pegang kontrol penuh bisnis.',
			color: 'text-[#2563eb]',
			bg: 'bg-[#eff6ff]'
		},
		{
			icon: TrendingUp,
			title: 'Laporan & Analitik',
			desc: 'Pantau produk terlaris, total pendapatan, dan tren pesanan harian dalam satu grafik yang mudah dibaca.',
			color: 'text-[#059669]',
			bg: 'bg-[#d1fae5]'
		},
		{
			icon: Store,
			title: 'Multi-Outlet Satu Akun',
			desc: 'Punya 2 cabang? 5 outlet? Kelola semua dari satu dashboard. Data setiap outlet terisolasi dan aman.',
			color: 'text-[#d97706]',
			bg: 'bg-[#fef3c7]'
		},
		{
			icon: Smartphone,
			title: 'PWA — Tanpa Install',
			desc: 'Bekerja seperti aplikasi native di Android dan iOS. Pelanggan tidak perlu download apapun dari App Store.',
			color: 'text-[#db2777]',
			bg: 'bg-[#fce7f3]'
		},
		{
			icon: Shield,
			title: 'Aman & Multi-Tenant',
			desc: 'Data setiap bisnis sepenuhnya terisolasi. Tidak ada satu tenant yang bisa melihat data tenant lain.',
			color: 'text-[#2563eb]',
			bg: 'bg-[#eff6ff]'
		}
	];
</script>

<section id="fitur" class="border-t border-[#e7e5e4] bg-white py-20 sm:py-28">
	<div class="app-container">
		<div class="text-center">
			<p class="mb-2 text-sm font-semibold uppercase tracking-wider text-[#059669]">
				Fitur Platform
			</p>
			<h2 class="text-3xl font-extrabold text-[#1a1a2e] sm:text-4xl">Semua yang kamu butuhkan</h2>
			<p class="mx-auto mt-4 max-w-xl text-base text-[#78716c]">
				Dari katalog hingga laporan — satu platform untuk kelola bisnis dari mana saja.
			</p>
		</div>

		<div class="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
			{#each features as f (f.title)}
				<div
					class="group rounded-2xl border border-[#e7e5e4] bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
				>
					<div class="flex h-11 w-11 items-center justify-center rounded-xl {f.bg} {f.color}">
						<f.icon size={22} />
					</div>
					<h3 class="mt-4 text-base font-bold text-[#1a1a2e]">{f.title}</h3>
					<p class="mt-2 text-sm leading-relaxed text-[#78716c]">{f.desc}</p>
				</div>
			{/each}
		</div>
	</div>
</section>
