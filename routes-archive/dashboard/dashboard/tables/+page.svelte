<script lang="ts">
	import { Printer, QrCode } from '@lucide/svelte';
	import { t, tWithVars } from '$lib/i18n/translations.svelte';
	import type { PageData } from './$types';
	import QrCodeDisplay from '$lib/ui/primitives/QrCodeDisplay.svelte';

	let { data }: { data: PageData } = $props();

	const managedRestaurants = $derived(data.tenant.restaurants);
	const tables = $derived(data.tables);
	const useMockData = $derived(data.useMockData);

	const selectedSlug = $derived(data.tenant.activeRestaurant.slug);
	const selectedRestaurant = $derived(
		managedRestaurants.find((restaurant) => restaurant.slug === selectedSlug) ??
			managedRestaurants[0]
	);

	// The QR code encodes the absolute URL the guest will open. In production
	// this is built from the restaurant's public_host + qr_path; in dev we fall
	// back to the path-based URL so the QR is scannable on localhost.
	function buildQrUrl(table: { qrPath: string }): string {
		if (typeof window === 'undefined') return table.qrPath;
		const base = `${window.location.origin}${table.qrPath}`;
		return base;
	}

	function printAll() {
		window.print();
	}
</script>

<svelte:head>
	<title>{t('tables.title')}</title>
</svelte:head>

<section class="grid gap-5">
	<div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
		<div>
			<p class="text-sm font-semibold text-lingua-primary">{t('tables.eyebrow')}</p>
			<h1 class="mt-2 text-3xl font-semibold">{t('tables.heading')}</h1>
			<p class="mt-2 max-w-3xl text-lingua-subtle">
				{t('tables.description')}
			</p>
		</div>
		<div class="flex flex-wrap items-end gap-2">
			<label class="grid gap-1 text-sm font-semibold text-lingua-text">
				{t('tables.restaurantLabel')}
				<select
					class="tap-target min-w-64 rounded-lg border border-lingua-border bg-lingua-surface px-3 text-sm font-normal"
					value={selectedSlug}
					onchange={(event) => {
						const url = new URL(location.href);
						url.searchParams.set('restaurant', event.currentTarget.value);
						location.href = `${url.pathname}${url.search}`;
					}}
				>
					{#each managedRestaurants as restaurant (restaurant.slug)}
						<option value={restaurant.slug}>{restaurant.name}</option>
					{/each}
				</select>
			</label>
			<button
				type="button"
				class="no-print tap-target inline-flex items-center justify-center gap-2 rounded-lg border border-lingua-border bg-lingua-surface px-4 text-sm font-semibold text-lingua-text hover:bg-lingua-primary-soft"
				onclick={printAll}
			>
				<Printer size={16} />
				{t('tables.printAll')}
			</button>
		</div>
	</div>

	<section class="surface rounded-lg p-4">
		<div class="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
			<div>
				<p class="font-semibold text-lingua-text">{selectedRestaurant.name}</p>
				<p class="mt-1 text-sm text-lingua-subtle">
					{tWithVars('tables.host', { host: selectedRestaurant.publicHost })}
					<br />
					{tWithVars('tables.pathExample', {
						path: `/r/${selectedRestaurant.slug}/table/T01`
					})}
				</p>
			</div>
			<p
				class="rounded-lg bg-lingua-primary-soft px-3 py-2 text-sm font-semibold text-lingua-primary"
			>
				{selectedRestaurant.tableCount}
				{t('tables.physicalTables')}
			</p>
		</div>
	</section>

	{#if useMockData}
		<div
			class="no-print rounded-lg border border-lingua-warning/30 bg-lingua-warning-soft px-4 py-3 text-sm text-lingua-warning"
		>
			{t('tables.mockNotice')}
		</div>
	{/if}

	<div class="print-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
		{#each tables as table (table.id)}
			<!-- Screen view -->
			<article class="no-print surface flex flex-col gap-3 rounded-lg p-4">
				<header class="flex items-start justify-between gap-3">
					<div>
						<p class="text-sm text-lingua-subtle">{selectedRestaurant.name}</p>
						<h2 class="text-xl font-semibold">{table.code}</h2>
					</div>
					<QrCode class="text-lingua-primary" size={24} />
				</header>
				<div class="flex justify-center">
					<QrCodeDisplay url={buildQrUrl(table)} label={table.code} size={176} />
				</div>
				<a
					class="no-print tap-target mt-1 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-lingua-primary px-4 text-sm font-semibold text-white"
					href={table.qrPath}
				>
					{t('tables.openUrl')}
				</a>
			</article>

			<!-- Print-only card: landscape credit-card size, QR right, text left -->
			<div class="print-card hidden" aria-hidden="true">
				<div class="print-card-text">
					<p class="print-restaurant">{selectedRestaurant.name}</p>
					<p class="print-table-code">{table.code}</p>
					<p class="print-instruction">Scan to view menu &amp; chat with our AI assistant.</p>
					<p class="print-instruction">
						Bahasa Indonesia &bull; English &bull; 日本語 &bull; 中文 &bull; عربي
					</p>
					<p class="print-url">{buildQrUrl(table)}</p>
				</div>
				<div class="print-qr">
					<QrCodeDisplay url={buildQrUrl(table)} label="" size={96} />
				</div>
			</div>
		{/each}
	</div>
</section>

<style>
	/* Page-level print rules: hide everything except the QR grid. */
	@media print {
		:global(.no-print) {
			display: none !important;
		}
		:global(nav),
		:global(aside),
		:global(header) {
			display: none !important;
		}
		:global(main) {
			padding: 0 !important;
			margin: 0 !important;
		}
		@page {
			size: A4;
			margin: 10mm;
		}
		/* Hide all section children except the print grid */
		section > :not(.print-grid) {
			display: none !important;
		}
		.print-grid {
			display: grid !important;
			grid-template-columns: repeat(3, 1fr) !important;
			gap: 4mm !important;
		}
		/* Per-card print styles — 85.6×54mm landscape card */
		.print-card {
			display: flex !important;
			flex-direction: row !important;
			align-items: center !important;
			gap: 3mm !important;
			padding: 3mm 3mm 3mm 4mm !important;
			border: 0.5pt solid #d1d5db !important;
			border-radius: 3mm !important;
			page-break-inside: avoid !important;
			break-inside: avoid !important;
			background: #fff !important;
			box-shadow: none !important;
		}
		.print-card-text {
			flex: 1;
			min-width: 0;
			display: flex !important;
			flex-direction: column !important;
			gap: 0.5mm !important;
		}
		.print-restaurant {
			font-size: 6pt !important;
			color: #6b7280 !important;
			text-transform: uppercase !important;
			letter-spacing: 0.04em !important;
			white-space: nowrap !important;
			overflow: hidden !important;
			text-overflow: ellipsis !important;
		}
		.print-table-code {
			font-size: 24pt !important;
			font-weight: 700 !important;
			line-height: 1 !important;
			color: #111827 !important;
			margin: 0.5mm 0 1mm !important;
		}
		.print-instruction {
			font-size: 6.5pt !important;
			color: #374151 !important;
			line-height: 1.3 !important;
		}
		.print-url {
			font-size: 5pt !important;
			color: #9ca3af !important;
			word-break: break-all !important;
			margin-top: 2mm !important;
		}
		.print-qr {
			flex-shrink: 0 !important;
		}
	}
</style>
