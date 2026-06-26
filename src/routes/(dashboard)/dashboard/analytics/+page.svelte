<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import {
		TrendingUp,
		TrendingDown,
		ShoppingCart,
		Eye,
		Star,
		BarChart3,
		Calendar
	} from '@lucide/svelte';

	let { data }: { data: PageData } = $props();
	const org = $derived(data.tenant.organization);

	const iconMap: Record<string, typeof ShoppingCart> = {
		ShoppingCart,
		TrendingUp,
		Eye,
		BarChart3,
		Star,
		Calendar
	};

	type Range = '7d' | '30d' | '90d';

	const ranges: { value: Range; label: string }[] = [
		{ value: '7d', label: '7 Hari' },
		{ value: '30d', label: '30 Hari' },
		{ value: '90d', label: '90 Hari' }
	];

	// Derive range from server data (which read from URL param)
	const range = $derived(data.range as Range);

	function setRange(r: Range) {
		const url = new URL(page.url);
		url.searchParams.set('range', r);
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	const summaryStats = $derived(data.summaryStats);
	const dailyOrders = $derived(data.dailyOrders);
	const topProducts = $derived(data.topProducts);

	const maxRev = $derived(Math.max(...dailyOrders.map((d) => d.rev), 1));

	function formatRev(n: number) {
		if (n >= 1_000_000) return 'Rp ' + (n / 1_000_000).toFixed(1) + ' jt';
		return 'Rp ' + (n / 1_000).toFixed(0) + 'rb';
	}

	const maxTopOrders = $derived(Math.max(...topProducts.map((p) => p.orders), 1));
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
		<div class="flex items-center gap-1 rounded-xl border border-[#f0eeec] bg-white p-1 shadow-sm">
			{#each ranges as r (r.value)}
				<button
					type="button"
					onclick={() => setRange(r.value)}
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
		{#each summaryStats as s (s.label)}
			<div class="rounded-2xl bg-white p-5 shadow-sm">
				<div class="flex items-start justify-between">
					<div class="flex h-10 w-10 items-center justify-center rounded-xl {s.bg} {s.color}">
						{#if s.icon && iconMap[s.icon]}{@const Icon = iconMap[s.icon]}<Icon size={20} />{/if}
					</div>
					{#if s.trend}
						<span
							class="flex items-center gap-0.5 text-xs font-semibold
								{s.up ? 'text-[#059669]' : 'text-[#dc2626]'}"
						>
							{#if s.up}<TrendingUp size={12} />{:else}<TrendingDown size={12} />{/if}
							{s.trend}
						</span>
					{/if}
				</div>
				<p class="mt-3 text-2xl font-extrabold text-[#1a1a2e]">{s.value}</p>
				<p class="mt-0.5 text-xs font-medium text-[#78716c]">{s.label}</p>
			</div>
		{/each}
	</div>

	<!-- Daily chart -->
	{#if dailyOrders.length > 0}
		<div class="rounded-2xl bg-white p-6 shadow-sm">
			<h2 class="mb-4 text-base font-bold text-[#1a1a2e]">Pendapatan Harian</h2>
			<div class="flex h-40 items-end gap-1.5 overflow-x-auto pb-6">
				{#each dailyOrders as d (d.day)}
					<div class="flex min-w-[32px] flex-1 flex-col items-center gap-1">
						<div class="relative w-full">
							<div
								class="w-full rounded-t-md bg-[#059669] transition-all"
								style="height: {Math.max(4, (d.rev / maxRev) * 120)}px"
								title="{d.day}: {formatRev(d.rev)}"
							></div>
						</div>
						<span class="text-[10px] font-medium text-[#a8a29e]">{d.day}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Top products -->
	{#if topProducts.length > 0}
		<div class="rounded-2xl bg-white shadow-sm">
			<div class="flex items-center justify-between border-b border-[#f5f5f4] px-6 py-4">
				<h2 class="text-base font-bold text-[#1a1a2e]">Produk Terlaris</h2>
				<Star size={16} class="text-[#d97706]" />
			</div>
			{#each topProducts as p, i (p.name)}
				<div class="flex items-center gap-4 px-6 py-4">
					<span class="w-5 shrink-0 text-center text-sm font-bold text-[#a8a29e]">{i + 1}</span>
					{#if p.img}
						<img
							src={p.img}
							alt={p.name}
							class="h-10 w-10 shrink-0 rounded-xl object-cover"
							width="40"
							height="40"
							loading="lazy"
						/>
					{:else}
						<div
							class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f5f5f4] text-sm font-bold text-[#a8a29e]"
						>
							{p.name.slice(0, 2).toUpperCase()}
						</div>
					{/if}
					<div class="min-w-0 flex-1">
						<p class="text-sm font-bold text-[#1a1a2e]">{p.name}</p>
						<div class="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#f5f5f4]">
							<div
								class="h-full rounded-full bg-[#059669] transition-all"
								style="width: {(p.orders / maxTopOrders) * 100}%"
							></div>
						</div>
					</div>
					<div class="shrink-0 text-right">
						<p class="text-sm font-bold text-[#1a1a2e]">{p.orders} terjual</p>
						<p class="mt-0.5 text-xs text-[#78716c]">{formatRev(p.rev)}</p>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="rounded-2xl bg-white p-10 text-center shadow-sm">
			<BarChart3 size={32} class="mx-auto mb-3 text-[#d1d5db]" />
			<p class="text-sm font-medium text-[#78716c]">Belum ada data pesanan dalam periode ini</p>
		</div>
	{/if}
</div>
