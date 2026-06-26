<script lang="ts">
	import type { PageData } from './$types';
	import {
		TrendingUp,
		TrendingDown,
		ShoppingCart,
		Package,
		Eye,
		Star,
		ArrowRight,
		Plus,
		QrCode,
		BarChart3,
		Clock,
		MapPin
	} from '@lucide/svelte';

	let { data }: { data: PageData } = $props();

	const org = $derived(data.tenant.organization);
	const restaurant = $derived(data.tenant.activeOutlet);
	const userName = $derived(data.tenant.user.name?.split(' ')[0] ?? 'Owner');

	const stats = $derived(data.stats);
	const recentOrders = $derived(data.recentOrders);
	const topProducts = $derived(data.topProducts);

	const iconMap: Record<string, typeof ShoppingCart> = {
		ShoppingCart,
		TrendingUp,
		Eye,
		Star,
		Package,
		Clock
	};

	const hour = new Date().getHours();
	const greeting = hour < 12 ? 'Selamat pagi' : hour < 17 ? 'Selamat siang' : 'Selamat malam';

	const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
		pending: { label: 'Baru', bg: 'bg-[#fef3c7]', text: 'text-[#d97706]' },
		new: { label: 'Baru', bg: 'bg-[#fef3c7]', text: 'text-[#d97706]' },
		processing: { label: 'Proses', bg: 'bg-[#eff6ff]', text: 'text-[#2563eb]' },
		done: { label: 'Selesai', bg: 'bg-[#d1fae5]', text: 'text-[#059669]' },
		completed: { label: 'Selesai', bg: 'bg-[#d1fae5]', text: 'text-[#059669]' },
		ready: { label: 'Siap', bg: 'bg-[#d1fae5]', text: 'text-[#059669]' },
		cancelled: { label: 'Batal', bg: 'bg-[#fef2f2]', text: 'text-[#dc2626]' }
	};
</script>

<svelte:head>
	<title>Overview — {org.name}</title>
</svelte:head>

<div class="space-y-6">
	<!-- ── Header ── -->
	<div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-2xl font-extrabold text-[#1a1a2e]">{greeting}, {userName}!</h1>
			<div class="mt-1 flex items-center gap-1.5 text-sm text-[#78716c]">
				<MapPin size={13} />
				<span>{restaurant.name}</span>
				<span class="text-[#e7e5e4]">·</span>
				<span>{restaurant.location ?? ''}</span>
			</div>
		</div>
		<!-- Quick actions -->
		<div class="flex flex-wrap items-center gap-2">
			<a
				href="/dashboard/catalog?new=1"
				class="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#059669] px-4 text-sm font-bold text-white shadow-sm hover:bg-[#047857] transition-colors"
			>
				<Plus size={16} /> Tambah Produk
			</a>
			<a
				href="/r/{restaurant.slug}"
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#f0eeec] bg-white px-4 text-sm font-semibold text-[#1a1a2e] hover:bg-[#f5f5f4] transition-colors"
			>
				<Eye size={16} /> Lihat Katalog
			</a>
		</div>
	</div>

	<!-- ── Stats grid ── -->
	<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
		{#each stats as s (s.label)}
			<div class="rounded-2xl bg-white p-5 shadow-sm">
				<div class="flex items-start justify-between">
					<div class="flex h-10 w-10 items-center justify-center rounded-xl {s.bg} {s.color}">
						{#if iconMap[s.icon]}
							{@const IconComponent = iconMap[s.icon]}
							<IconComponent size={20} />
						{/if}
					</div>
					<span
						class="flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold
						{s.up ? 'bg-[#d1fae5] text-[#059669]' : 'bg-[#fef2f2] text-[#dc2626]'}"
					>
						{#if s.up}<TrendingUp size={10} />{:else}<TrendingDown size={10} />{/if}
						{s.trend}
					</span>
				</div>
				<p class="mt-3 truncate text-xl font-extrabold text-[#1a1a2e] sm:text-2xl">{s.value}</p>
				<p class="mt-0.5 text-xs text-[#78716c]">{s.label}</p>
				<p class="mt-0.5 text-[11px] text-[#a8a29e]">{s.note}</p>
			</div>
		{/each}
	</div>

	<!-- ── Main grid: recent orders + top products ── -->
	<div class="grid gap-5 lg:grid-cols-3">
		<!-- Recent orders (2/3 width) -->
		<div class="lg:col-span-2 rounded-2xl bg-white shadow-sm">
			<div class="flex items-center justify-between border-b border-[#f5f5f4] px-5 py-4">
				<h2 class="text-sm font-bold text-[#1a1a2e]">Pesanan Terbaru</h2>
				<a
					href="/dashboard/orders"
					class="flex items-center gap-1 text-xs font-semibold text-[#059669] hover:underline"
				>
					Lihat semua <ArrowRight size={12} />
				</a>
			</div>
			<div class="divide-y divide-[#f5f5f4]">
				{#each recentOrders as order (order.id)}
					<a
						href="/dashboard/orders?order={order.fullId}"
						class="flex items-center gap-3 px-5 py-3.5 hover:bg-[#fafaf9] transition-colors"
					>
						<!-- Status dot -->
						<div
							class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl {statusConfig[
								order.status
							].bg}"
						>
							<ShoppingCart size={14} class={statusConfig[order.status].text} />
						</div>
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								<span class="text-sm font-bold text-[#1a1a2e]">{order.id}</span>
								<span class="text-xs text-[#78716c]">{order.table}</span>
							</div>
							<p class="mt-0.5 truncate text-xs text-[#78716c]">{order.items}</p>
						</div>
						<div class="shrink-0 text-right">
							<p class="text-sm font-semibold text-[#1a1a2e]">{order.total}</p>
							<div class="mt-0.5 flex items-center justify-end gap-1">
								<span
									class="rounded-full px-2 py-0.5 text-[10px] font-semibold {statusConfig[
										order.status
									].bg} {statusConfig[order.status].text}"
								>
									{statusConfig[order.status].label}
								</span>
								<span class="flex items-center gap-0.5 text-[10px] text-[#a8a29e]">
									<Clock size={9} />
									{order.time}
								</span>
							</div>
						</div>
					</a>
				{/each}
			</div>
		</div>

		<!-- Right column -->
		<div class="space-y-5">
			<!-- Top products -->
			<div class="rounded-2xl bg-white shadow-sm">
				<div class="flex items-center justify-between border-b border-[#f5f5f4] px-5 py-4">
					<h2 class="text-sm font-bold text-[#1a1a2e]">Produk Terlaris</h2>
					<a
						href="/dashboard/analytics"
						class="flex items-center gap-1 text-xs font-semibold text-[#059669] hover:underline"
					>
						Lihat <ArrowRight size={12} />
					</a>
				</div>
				<div class="space-y-3 p-4">
					{#each topProducts as p, i (p.name)}
						<div class="flex items-center gap-3">
							<span class="w-4 shrink-0 text-center text-xs font-bold text-[#a8a29e]">{i + 1}</span>
							<img
								src={p.img}
								alt={p.name}
								class="h-9 w-9 shrink-0 rounded-xl object-cover"
								width="36"
								height="36"
								loading="lazy"
							/>
							<div class="min-w-0 flex-1">
								<p class="truncate text-xs font-semibold text-[#1a1a2e]">{p.name}</p>
								<div class="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#f5f5f4]">
									<div class="h-full rounded-full bg-[#059669]" style="width: {p.pct}%"></div>
								</div>
							</div>
							<span class="shrink-0 text-xs font-bold text-[#78716c]">{p.orders}</span>
						</div>
					{/each}
				</div>
			</div>

			<!-- Quick actions card -->
			<div class="rounded-2xl bg-white shadow-sm">
				<div class="border-b border-[#f5f5f4] px-5 py-4">
					<h2 class="text-sm font-bold text-[#1a1a2e]">Aksi Cepat</h2>
				</div>
				<div class="space-y-1.5 p-3">
					{#each [{ href: '/dashboard/catalog?new=1', icon: Plus, label: 'Tambah Produk Baru', color: 'text-[#059669]', bg: 'bg-[#d1fae5]' }, { href: '/dashboard/settings/qr', icon: QrCode, label: 'Download QR Code', color: 'text-[#d97706]', bg: 'bg-[#fef3c7]' }, { href: '/dashboard/analytics', icon: BarChart3, label: 'Lihat Laporan', color: 'text-[#2563eb]', bg: 'bg-[#eff6ff]' }] as action (action.label)}
						<a
							href={action.href}
							class="flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#1a1a2e] transition-colors hover:bg-[#f5f5f4]"
						>
							<div
								class="flex h-8 w-8 items-center justify-center rounded-lg {action.bg} {action.color}"
							>
								<action.icon size={16} />
							</div>
							{action.label}
							<ArrowRight size={14} class="ml-auto text-[#a8a29e]" />
						</a>
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>
