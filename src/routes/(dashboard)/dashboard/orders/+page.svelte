<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import {
		ShoppingCart,
		Clock,
		Search,
		Check,
		X,
		RotateCcw,
		MapPin,
		FileText,
		Phone,
		Image
	} from '@lucide/svelte';

	let { data }: { data: PageData } = $props();
	const org = $derived(data.tenant.organization);

	const allOrders = $derived(data.orders);
	let selectedOrder = $derived(data.selectedOrder);

	type Tab = 'active' | 'done' | 'all';
	let activeTab = $state<Tab>('active');
	let search = $state('');

	const filtered = $derived(
		allOrders
			.filter((o) => {
				if (activeTab === 'active') return o.rawStatus === 'new' || o.rawStatus === 'processing';
				if (activeTab === 'done') return o.rawStatus === 'completed' || o.rawStatus === 'cancelled';
				return true;
			})
			.filter((o) => o.id.includes(search) || o.table.toLowerCase().includes(search.toLowerCase()))
	);

	const activeCnt = $derived(
		allOrders.filter((o) => o.rawStatus === 'new' || o.rawStatus === 'processing').length
	);

	function formatPrice(n: number) {
		return 'Rp ' + n.toLocaleString('id-ID');
	}

	function selectOrder(order: (typeof allOrders)[0]) {
		// Use fullId (UUID) — order.id contains '#0042' which corrupts the URL as a fragment anchor.
		goto(`?order=${order.fullId}`, { keepFocus: true, noScroll: true });
	}

	const statusCfg: Record<string, { label: string; bg: string; text: string }> = {
		pending: { label: 'Baru', bg: 'bg-[#fef3c7]', text: 'text-[#d97706]' },
		new: { label: 'Baru', bg: 'bg-[#fef3c7]', text: 'text-[#d97706]' },
		processing: { label: 'Proses', bg: 'bg-[#eff6ff]', text: 'text-[#2563eb]' },
		done: { label: 'Selesai', bg: 'bg-[#d1fae5]', text: 'text-[#059669]' },
		completed: { label: 'Selesai', bg: 'bg-[#d1fae5]', text: 'text-[#059669]' },
		cancelled: { label: 'Batal', bg: 'bg-[#fef2f2]', text: 'text-[#dc2626]' }
	};
</script>

<svelte:head>
	<title>Pesanan — {org.name}</title>
</svelte:head>

<div class="space-y-5">
	<!-- Header -->
	<div>
		<h1 class="text-2xl font-extrabold text-[#1a1a2e]">Pesanan</h1>
		<p class="mt-0.5 text-sm text-[#78716c]">{allOrders.length} pesanan hari ini</p>
	</div>

	<div class="grid gap-5 lg:grid-cols-[1fr_380px]">
		<!-- Left: list -->
		<div class="space-y-4">
			<!-- Tabs + search -->
			<div class="rounded-2xl bg-white p-4 shadow-sm space-y-3">
				<div class="flex gap-1">
					{#each [['active', 'Aktif', activeCnt], ['done', 'Selesai', null], ['all', 'Semua', allOrders.length]] as const as [tab, label, count] (tab)}
						<button
							type="button"
							onclick={() => (activeTab = tab)}
							class="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors
								{activeTab === tab ? 'bg-[#059669] text-white' : 'text-[#78716c] hover:bg-[#f5f5f4]'}"
						>
							{label}
							{#if count !== null && count > 0}
								<span
									class="rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none
									{activeTab === tab ? 'bg-white/30 text-white' : 'bg-[#f5f5f4] text-[#78716c]'}">{count}</span
								>
							{/if}
						</button>
					{/each}
				</div>
				<div class="relative">
					<Search size={15} class="absolute left-3 top-1/2 -translate-y-1/2 text-[#78716c]" />
					<input
						type="text"
						bind:value={search}
						placeholder="Cari ID atau meja..."
						class="h-10 w-full rounded-xl border border-[#f0eeec] bg-[#fafaf9] pl-9 pr-4 text-sm placeholder-[#a8a29e] focus:border-[#059669] focus:outline-none focus:ring-2 focus:ring-[#059669]/20"
					/>
				</div>
			</div>

			<!-- Order list -->
			{#if filtered.length === 0}
				<div
					class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#f0eeec] bg-white py-14 text-center"
				>
					<ShoppingCart size={28} class="text-[#a8a29e]" />
					<p class="mt-3 text-sm font-semibold text-[#1a1a2e]">Tidak ada pesanan</p>
					<p class="mt-1 text-xs text-[#78716c]">
						Pesanan baru akan muncul di sini secara real-time
					</p>
				</div>
			{:else}
				<div class="space-y-2">
					{#each filtered as order (order.id)}
						<button
							type="button"
							onclick={() => selectOrder(order)}
							class="w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition-all hover:shadow-md
								{selectedOrder?.id === order.id ? 'border-[#059669] ring-2 ring-[#059669]/20' : 'border-[#f0eeec]'}"
						>
							<div class="flex items-start gap-3">
								<div
									class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl {statusCfg[
										order.status
									].bg}"
								>
									{#if order.status === 'pending'}<Clock size={18} class={statusCfg.pending.text} />
									{:else if order.status === 'processing'}<RotateCcw
											size={18}
											class={statusCfg.processing.text}
										/>
									{:else if order.status === 'done'}<Check size={18} class={statusCfg.done.text} />
									{:else}<X size={18} class={statusCfg.cancelled.text} />{/if}
								</div>
								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2">
										<span class="font-bold text-[#1a1a2e]">{order.id}</span>
										<span
											class="rounded-full px-2 py-0.5 text-[10px] font-bold {statusCfg[order.status]
												.bg} {statusCfg[order.status].text}">{statusCfg[order.status].label}</span
										>
									</div>
									<div class="mt-0.5 flex items-center gap-1.5 text-xs text-[#78716c]">
										<MapPin size={11} />
										{order.table}{order.location ? ` · ${order.location}` : ''}
									</div>
									<p class="mt-1.5 text-xs text-[#78716c]">
										{order.items.map((i) => `${i.name} x${i.qty}`).join(', ')}
									</p>
								</div>
								<div class="shrink-0 text-right">
									<p class="font-bold text-[#1a1a2e]">{formatPrice(order.total)}</p>
									<p
										class="mt-0.5 flex items-center justify-end gap-0.5 text-[11px] text-[#a8a29e]"
									>
										<Clock size={9} />
										{order.time}
									</p>
								</div>
							</div>
						</button>
					{/each}
				</div>
			{/if}
		</div>
		<!-- Right: order detail panel -->
		<div class="rounded-2xl bg-white shadow-sm">
			{#if selectedOrder}
				<div class="flex items-center justify-between border-b border-[#f5f5f4] px-5 py-4">
					<h2 class="text-sm font-bold text-[#1a1a2e]">Detail Pesanan {selectedOrder.id}</h2>
					<button
						type="button"
						onclick={() => goto('?', { keepFocus: true, noScroll: true })}
						class="flex h-8 w-8 items-center justify-center rounded-lg text-[#78716c] hover:bg-[#f5f5f4] transition-colors"
						aria-label="Tutup detail"
					>
						<X size={16} />
					</button>
				</div>

				<div class="p-5 space-y-5">
					<!-- Order meta -->
					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<span class="text-xs text-[#78716c]">Status</span>
							<span
								class="rounded-full px-3 py-1 text-xs font-bold {statusCfg[selectedOrder.status]
									.bg} {statusCfg[selectedOrder.status].text}"
							>
								{statusCfg[selectedOrder.status].label}
							</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-xs text-[#78716c]">Lokasi</span>
							<span class="text-xs font-semibold text-[#1a1a2e]">{selectedOrder.table}</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-xs text-[#78716c]">Waktu</span>
							<span class="text-xs font-semibold text-[#1a1a2e]">{selectedOrder.time}</span>
						</div>
					</div>

					<!-- Items -->
					<div>
						<p class="mb-2 text-xs font-bold uppercase tracking-wide text-[#78716c]">
							Item Pesanan
						</p>
						<div class="space-y-2">
							{#each selectedOrder.items as item (item.name)}
								<div class="flex items-start gap-2 rounded-xl bg-[#fafaf9] p-3">
									<span
										class="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#d1fae5] text-xs font-bold text-[#059669]"
										>{item.qty}</span
									>
									<div class="min-w-0">
										<p class="text-sm font-semibold text-[#1a1a2e]">{item.name}</p>
										{#if item.note}
											<p class="mt-0.5 text-xs text-[#78716c]">Catatan: {item.note}</p>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					</div>

					<!-- Total -->
					<div class="rounded-xl border border-[#f0eeec] px-4 py-3">
						<div class="flex items-center justify-between">
							<span class="text-sm font-bold text-[#1a1a2e]">Total</span>
							<span class="text-lg font-extrabold text-[#059669]"
								>{formatPrice(selectedOrder.total)}</span
							>
						</div>
					</div>

					<!-- Buyer info + payment proof (online mode) -->
					{#if selectedOrder.buyerWhatsapp || selectedOrder.paymentProofUrl}
						<div class="space-y-3">
							<p class="text-xs font-bold uppercase tracking-wide text-[#78716c]">Pembayaran</p>

							{#if selectedOrder.buyerWhatsapp}
								<div class="flex items-center justify-between rounded-xl bg-[#fafaf9] px-4 py-3">
									<div class="flex items-center gap-2">
										<Phone size={14} class="text-[#059669]" />
										<span class="text-xs text-[#78716c]">WhatsApp Pembeli</span>
									</div>
									<a
										href="https://wa.me/{selectedOrder.buyerWhatsapp.replace(/\D/g, '')}"
										target="_blank"
										rel="noopener noreferrer"
										class="text-xs font-semibold text-[#059669] hover:underline"
									>
										{selectedOrder.buyerWhatsapp}
									</a>
								</div>
							{/if}

							{#if selectedOrder.paymentProofUrl}
								<div class="space-y-2">
									<div class="flex items-center gap-2">
										<Image size={14} class="text-[#78716c]" />
										<span class="text-xs text-[#78716c]">Bukti Transfer</span>
									</div>
									<a
										href={selectedOrder.paymentProofUrl}
										target="_blank"
										rel="noopener noreferrer"
										class="block overflow-hidden rounded-xl border border-[#f0eeec]"
									>
										<img
											src={selectedOrder.paymentProofUrl}
											alt="Bukti transfer"
											class="w-full object-cover"
											style="max-height: 200px"
										/>
									</a>

									{#if selectedOrder.paymentConfirmedAt}
										<div class="flex items-center gap-2 rounded-xl bg-[#d1fae5] px-4 py-2.5">
											<Check size={14} class="text-[#059669]" />
											<span class="text-xs font-semibold text-[#059669]"
												>Pembayaran dikonfirmasi</span
											>
										</div>
									{:else if selectedOrder.paymentRejectedAt}
										<div class="flex items-center gap-2 rounded-xl bg-[#fef2f2] px-4 py-2.5">
											<X size={14} class="text-[#dc2626]" />
											<span class="text-xs font-semibold text-[#dc2626]">Bukti ditolak</span>
										</div>
									{:else if data.paymentConfirmationEnabled}
										<div class="grid grid-cols-2 gap-2">
											<form method="POST" action="?/confirmPayment" use:enhance>
												<input type="hidden" name="orderId" value={selectedOrder.fullId} />
												<button
													type="submit"
													class="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl bg-[#059669] text-xs font-bold text-white hover:bg-[#047857] transition-colors"
												>
													<Check size={14} /> Konfirmasi
												</button>
											</form>
											<form method="POST" action="?/rejectPayment" use:enhance>
												<input type="hidden" name="orderId" value={selectedOrder.fullId} />
												<button
													type="submit"
													class="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-[#f0eeec] text-xs font-semibold text-[#dc2626] hover:bg-[#fef2f2] transition-colors"
												>
													<X size={14} /> Tolak
												</button>
											</form>
										</div>
									{/if}
								</div>
							{/if}
						</div>
					{/if}

					<!-- Actions -->
					{#if selectedOrder.status === 'pending'}
						<div class="space-y-2">
							<form method="POST" action="?/updateStatus" use:enhance>
								<input type="hidden" name="orderId" value={selectedOrder.fullId} />
								<input type="hidden" name="status" value="processing" />
								<button
									type="submit"
									class="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#059669] text-sm font-bold text-white hover:bg-[#047857] transition-colors"
								>
									<Check size={16} /> Terima & Proses
								</button>
							</form>
							<form method="POST" action="?/updateStatus" use:enhance>
								<input type="hidden" name="orderId" value={selectedOrder.fullId} />
								<input type="hidden" name="status" value="cancelled" />
								<button
									type="submit"
									class="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[#f0eeec] text-sm font-semibold text-[#dc2626] hover:bg-[#fef2f2] transition-colors"
								>
									<X size={16} /> Tolak Pesanan
								</button>
							</form>
						</div>
					{:else if selectedOrder.status === 'processing'}
						<form method="POST" action="?/updateStatus" use:enhance>
							<input type="hidden" name="orderId" value={selectedOrder.fullId} />
							<input type="hidden" name="status" value="completed" />
							<button
								type="submit"
								class="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#059669] text-sm font-bold text-white hover:bg-[#047857] transition-colors"
							>
								<Check size={16} /> Tandai Selesai
							</button>
						</form>
					{:else if selectedOrder.status === 'done'}
						<div
							class="flex items-center justify-center gap-2 rounded-xl bg-[#d1fae5] py-3 text-sm font-semibold text-[#059669]"
						>
							<Check size={16} /> Pesanan selesai
						</div>
					{:else}
						<div
							class="flex items-center justify-center gap-2 rounded-xl bg-[#fef2f2] py-3 text-sm font-semibold text-[#dc2626]"
						>
							<X size={16} /> Pesanan dibatalkan
						</div>
					{/if}
				</div>
			{:else}
				<!-- Empty detail state -->
				<div class="flex flex-col items-center justify-center py-16 text-center">
					<div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f5f5f4]">
						<FileText size={24} class="text-[#a8a29e]" />
					</div>
					<p class="mt-4 text-sm font-semibold text-[#1a1a2e]">Pilih pesanan</p>
					<p class="mt-1 text-xs text-[#78716c]">Klik pesanan di kiri untuk melihat detail</p>
				</div>
			{/if}
		</div>
	</div>
</div>
