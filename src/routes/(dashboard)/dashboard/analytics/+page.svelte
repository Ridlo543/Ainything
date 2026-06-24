<script lang="ts">
	import type { PageData } from './$types';
	import { TrendingUp, TrendingDown, ShoppingCart, Eye, Star, BarChart3, Calendar } from '@lucide/svelte';

	let { data }: { data: PageData } = $props();
	const org = $derived(data.tenant.organization);

	type Range = '7d' | '30d' | '90d';
	let range = $state<Range>('7d');

	const ranges: { value: Range; label: string }[] = [
		{ value: '7d', label: '7 Hari' },
		{ value: '30d', label: '30 Hari' },
		{ value: '90d', label: '90 Hari' }
	];

	const summaryStats = [
		{ label: 'Total Pesanan', value: '168', trend: '+18%', up: true, icon: ShoppingCart, color: 'text-[#059669]', bg: 'bg-[#d1fae5]' },
		{ label: 'Pendapatan', value: 'Rp 18,4 jt', trend: '+12%', up: true, icon: TrendingUp, color: 'text-[#d97706]', bg: 'bg-[#fef3c7]' },
		{ label: 'Kunjungan Katalog', value: '1.302', trend: '+31%', up: true, icon: Eye, color: 'text-[#2563eb]', bg: 'bg-[#eff6ff]' },
		{ label: 'Rata-rata Pesanan', value: 'Rp 109rb', trend: '-3%', up: false, icon: BarChart3, color: 'text-[#db2777]', bg: 'bg-[#fce7f3]' }
	];

	// Bar chart data (daily orders, 7 days)
	const dailyOrders = [
		{ day: 'Sen', orders: 18, rev: 1980000 },
		{ day: 'Sel', orders: 22, rev: 2420000 },
		{ day: 'Rab', orders: 19, rev: 2090000 },
		{ day: 'Kam', orders: 31, rev: 3410000 },
		{ day: 'Jum', orders: 28, rev: 3080000 },
		{ day: 'Sab', orders: 35, rev: 3850000 },
		{ day: 'Min', orders: 24, rev: 2640000 }
	];

	const maxOrders = $derived(Math.max(...dailyOrders.map(d => d.orders)));

	const topProducts = [
		{ name: 'Ayam Betutu', orders: 48, rev: 4704000, img: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=40&h=40&fit=crop&auto=format&q=80' },
		{ name: 'Ikan Bakar Jimbaran', orders: 36, rev: 5220000, img: 'https://images.unsplash.com/photo-1544943910-4c1dc44aab44?w=40&h=40&fit=crop&auto=format&q=80' },
		{ name: 'Sate Ayam', orders: 29, rev: 2204000, img: 'https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=40&h=40&fit=crop&auto=format&q=80' },
		{ name: 'Es Kelapa Muda', orders: 22, rev: 924000, img: 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?w=40&h=40&fit=crop&auto=format&q=80' },
		{ name: 'Coconut Cendol', orders: 17, rev: 714000, img: 'https://images.unsplash.com/photo-1534706270553-2ac0dfa30283?w=40&h=40&fit=crop&auto=format&q=80' }
	];

	const maxTopOrders = $derived(Math.max(...topProducts.map(p => p.orders)));

	function formatRev(n: number) {
		if (n >= 1000000) return 'Rp ' + (n / 1000000).toFixed(1) + ' jt';
		return 'Rp ' + (n / 1000).toFixed(0) + 'rb';
	}
</script>

<svelte:head>
	<title>Analitik — {org.name}</title>
</svelte:head>

<div class="space-y-6">

	<!-- Header + range selector -->
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-2xl font-extrabold text-[#1a1a2e]">Analitik</h1>
			<p class="mt-0.5 text-sm text-[#78716c]">Performa bisnis kamu</p>
		</div>
		<div class="flex items-center gap-1 rounded-xl border border-[#e7e5e4] bg-white p-1 shadow-sm">
			{#each ranges as r}
				<button
					type="button"
					onclick={() => (range = r.value)}
					class="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors
						{range === r.value ? 'bg-[#059669] text-white shadow-sm' : 'text-[#78716c] hover:bg-[#f5f5f4]'}"
				>
					{r.label}
				</button>
			{/each}
		</div>
	</div>

	<!-- Summary stats -->
	<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
		{#each summaryStats as s}
			<div class="rounded-2xl border border-[#e7e5e4] bg-white p-5 shadow-sm">
				<div class="flex items-start justify-between">
					<div class="flex h-10 w-10 items-center justify-center rounded-xl {s.bg} {s.color}">
						<s.icon size={20} />
					</div>
					<span class="flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold
						{s.up ? 'bg-[#d1fae5] text-[#059669]' : 'bg-[#fef2f2] text-[#dc2626]'}">
						{#if s.up}<TrendingUp size={10} />{:else}<TrendingDown size={10} />{/if}
						{s.trend}
					</span>
				</div>
				<p class="mt-3 text-2xl font-extrabold text-[#1a1a2e]">{s.value}</p>
				<p class="mt-0.5 text-xs text-[#78716c]">{s.label}</p>
			</div>
		{/each}
	</div>

	<!-- Orders bar chart -->
	<div class="rounded-2xl border border-[#e7e5e4] bg-white p-6 shadow-sm">
		<h2 class="mb-5 text-sm font-bold text-[#1a1a2e]">Pesanan per Hari</h2>
		<div class="flex items-end gap-2 h-40">
			{#each dailyOrders as d}
				<div class="flex flex-1 flex-col items-center gap-1.5">
					<span class="text-[10px] font-semibold text-[#78716c]">{d.orders}</span>
					<div
						class="w-full rounded-t-lg bg-[#059669] transition-all"
						style="height: {Math.max(8, (d.orders / maxOrders) * 120)}px"
					></div>
					<span class="text-[10px] text-[#a8a29e]">{d.day}</span>
				</div>
			{/each}
		</div>
	</div>

	<!-- Top products -->
	<div class="rounded-2xl border border-[#e7e5e4] bg-white shadow-sm">
		<div class="border-b border-[#f5f5f4] px-6 py-4">
			<h2 class="text-sm font-bold text-[#1a1a2e]">Produk Terlaris</h2>
		</div>
		<div class="divide-y divide-[#f5f5f4]">
			{#each topProducts as p, i}
				<div class="flex items-center gap-4 px-6 py-4">
					<span class="w-5 shrink-0 text-center text-sm font-bold text-[#a8a29e]">{i + 1}</span>
					<img src={p.img} alt={p.name} class="h-10 w-10 shrink-0 rounded-xl object-cover" width="40" height="40" loading="lazy" />
					<div class="min-w-0 flex-1">
						<p class="text-sm font-bold text-[#1a1a2e]">{p.name}</p>
						<div class="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#f5f5f4]">
							<div class="h-full rounded-full bg-[#059669] transition-all" style="width: {(p.orders / maxTopOrders) * 100}%"></div>
						</div>
					</div>
					<div class="shrink-0 text-right">
						<p class="text-sm font-bold text-[#1a1a2e]">{p.orders} pesanan</p>
						<p class="mt-0.5 text-xs text-[#78716c]">{formatRev(p.rev)}</p>
					</div>
				</div>
			{/each}
		</div>
	</div>

</div>
