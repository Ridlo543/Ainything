<script lang="ts">
	const steps = [
		{
			num: '01',
			title: 'Daftar & pilih jenis bisnis',
			desc: 'Restoran, toko retail, atau bisnis jasa. Isi info dasar bisnis kamu dalam 2 menit — tidak perlu kartu kredit.',
			img: '/mock-images/photo-1556742049-0cfed4f6a45d.jpg',
			imgAlt: 'Layar pendaftaran bisnis'
		},
		{
			num: '02',
			title: 'Tambah produk & atur katalog',
			desc: 'Upload foto dari HP, isi nama dan harga. Buat kategori, atur ketersediaan, dan katalog langsung siap dipublikasikan.',
			img: '/mock-images/photo-1611532736597-de2d4265fba3.jpg',
			imgAlt: 'Menambahkan produk ke katalog'
		},
		{
			num: '03',
			title: 'Bagikan QR atau link',
			desc: 'Cetak QR untuk meja atau counter, tempel di etalase, atau kirim link katalog lewat WhatsApp dan Instagram.',
			img: '/mock-images/photo-1598300042247-d088f8ab3a91.jpg',
			imgAlt: 'QR code untuk katalog digital'
		},
		{
			num: '04',
			title: 'Terima & kelola pesanan',
			desc: 'Pesanan masuk ke dashboard real-time. Update status, koordinasi staff, dan lacak semua transaksi dari satu layar.',
			img: '/mock-images/photo-1551288049-bebda4e38f71.jpg',
			imgAlt: 'Dashboard manajemen pesanan'
		}
	];
</script>

<section id="cara-kerja" class="border-t border-[#e7e5e4] bg-[#fafaf9] py-20 sm:py-28">
	<div class="app-container">
		<div class="text-center">
			<p class="mb-2 text-sm font-semibold uppercase tracking-wider text-[#059669]">Cara Kerja</p>
			<h2 class="text-3xl font-extrabold text-[#1a1a2e] sm:text-4xl">Online dalam 4 langkah</h2>
			<p class="mx-auto mt-4 max-w-lg text-base text-[#78716c]">
				Dari daftar sampai menerima pesanan pertama — semua bisa selesai hari ini.
			</p>
		</div>

		<div class="mt-16 space-y-16">
			{#each steps as step, i}
				<div
					class="grid items-center gap-8 md:grid-cols-2 md:gap-14 {i % 2 === 1
						? 'md:[&>*:first-child]:order-2'
						: ''}"
				>
					<!-- Image -->
					<div class="relative overflow-hidden rounded-2xl shadow-lg">
						<img
							src={step.img}
							alt={step.imgAlt}
							class="h-56 w-full object-cover sm:h-72"
							width="480"
							height="300"
							loading="lazy"
						/>
						<!-- Step number overlay -->
						<div
							class="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#059669] text-sm font-black text-white shadow-md"
						>
							{step.num}
						</div>
					</div>

					<!-- Copy -->
					<div>
						<span class="text-5xl font-black text-[#e7e5e4]">{step.num}</span>
						<h3 class="mt-2 text-2xl font-extrabold text-[#1a1a2e]">{step.title}</h3>
						<p class="mt-3 text-base leading-relaxed text-[#78716c]">{step.desc}</p>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>
