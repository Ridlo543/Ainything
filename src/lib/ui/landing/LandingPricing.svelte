<script lang="ts">
	import { Check, ArrowRight } from '@lucide/svelte';

	const plans = [
		{
			name: 'Starter',
			price: 'Gratis',
			period: 'selamanya',
			desc: 'Untuk warung dan toko kecil yang baru mulai digital.',
			features: [
				'1 outlet',
				'50 produk',
				'Katalog QR & link',
				'Keranjang & pesanan',
				'Dashboard dasar'
			],
			cta: 'Mulai Gratis',
			href: '/register',
			highlight: false
		},
		{
			name: 'Pro',
			price: 'Rp 299.000',
			period: '/bulan',
			desc: 'Untuk bisnis yang tumbuh dan butuh fitur lengkap.',
			features: [
				'5 outlet',
				'Produk tak terbatas',
				'Manajemen staff & peran',
				'Analitik & laporan lengkap',
				'Prioritas support',
				'Custom domain'
			],
			cta: 'Coba 14 Hari Gratis',
			href: '/register',
			highlight: true
		},
		{
			name: 'Enterprise',
			price: 'Custom',
			period: '',
			desc: 'Untuk jaringan bisnis besar dengan kebutuhan khusus.',
			features: [
				'Outlet tak terbatas',
				'Integrasi API penuh',
				'Onboarding & training',
				'SLA uptime garansi',
				'Dedicated account manager',
				'White-label tersedia'
			],
			cta: 'Hubungi Kami',
			href: 'mailto:halo@lingua.app',
			highlight: false
		}
	];
</script>

<section id="harga" class="border-t border-[#e7e5e4] bg-[#fafaf9] py-20 sm:py-28">
	<div class="app-container">
		<div class="text-center">
			<p class="mb-2 text-sm font-semibold uppercase tracking-wider text-[#059669]">Harga</p>
			<h2 class="text-3xl font-extrabold text-[#1a1a2e] sm:text-4xl">
				Mulai gratis, tumbuh bersama
			</h2>
			<p class="mx-auto mt-4 max-w-lg text-base text-[#78716c]">
				Tidak ada biaya setup, tidak ada kontrak. Upgrade kapan kamu siap.
			</p>
		</div>

		<div class="mt-14 grid gap-6 md:grid-cols-3">
			{#each plans as plan}
				<div
					class="relative flex flex-col rounded-2xl border bg-white p-8 shadow-sm transition-all hover:shadow-md
						{plan.highlight ? 'border-[#059669] ring-2 ring-[#059669]/20' : 'border-[#e7e5e4]'}"
				>
					{#if plan.highlight}
						<div
							class="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#059669] px-4 py-1 text-xs font-bold text-white shadow"
						>
							Paling Populer
						</div>
					{/if}

					<div>
						<h3 class="text-lg font-extrabold text-[#1a1a2e]">{plan.name}</h3>
						<p class="mt-1 text-sm text-[#78716c]">{plan.desc}</p>
						<div class="mt-5 flex items-baseline gap-1">
							<span class="text-3xl font-extrabold text-[#1a1a2e]">{plan.price}</span>
							{#if plan.period}
								<span class="text-sm text-[#78716c]">{plan.period}</span>
							{/if}
						</div>
					</div>

					<ul class="mt-6 flex-1 space-y-3">
						{#each plan.features as feat}
							<li class="flex items-start gap-2.5 text-sm text-[#78716c]">
								<Check size={16} class="mt-0.5 shrink-0 text-[#059669]" />
								{feat}
							</li>
						{/each}
					</ul>

					<a
						href={plan.href}
						class="mt-8 flex min-h-[48px] items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all
							{plan.highlight
							? 'bg-[#059669] text-white shadow-md hover:bg-[#047857] hover:shadow-lg'
							: 'border border-[#e7e5e4] text-[#1a1a2e] hover:bg-[#f5f5f4]'}"
					>
						{plan.cta}
						{#if plan.highlight}<ArrowRight size={16} />{/if}
					</a>
				</div>
			{/each}
		</div>

		<p class="mt-8 text-center text-sm text-[#78716c]">
			Semua paket sudah termasuk SSL, hosting, dan update platform tanpa biaya tambahan.
		</p>
	</div>
</section>
