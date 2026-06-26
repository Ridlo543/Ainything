<script lang="ts">
	import type { PageData } from './$types';
	import * as Card from '$lib/ui/card';
	import { Badge } from '$lib/ui/badge';
	import { QrCode, Download, ExternalLink, TableIcon } from '@lucide/svelte';

	type TableWithQr = {
		id: string;
		organizationId: string;
		outletId: string;
		code: string;
		label: string;
		isActive: boolean;
		qrPath: string;
		qrSvg: string | null;
		qrUrl: string;
	};

	let { data }: { data: PageData } = $props();

	const outlet = $derived(data.outlet);
	const tables = $derived(data.tables as TableWithQr[]);

	function downloadSvg(tableName: string, svgContent: string) {
		const blob = new Blob([svgContent], { type: 'image/svg+xml' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `qr-${tableName.toLowerCase().replace(/\s+/g, '-')}.svg`;
		a.click();
		URL.revokeObjectURL(url);
	}

	function downloadAllQr() {
		tables.forEach((table) => {
			if (table.qrSvg) {
				downloadSvg(table.label || table.code, table.qrSvg);
			}
		});
	}
</script>

<div class="space-y-6">
	<div class="flex items-start justify-between">
		<div>
			<h1 class="text-xl font-bold">QR Meja</h1>
			<p class="text-sm text-muted-foreground">
				{outlet.name} — {tables.length} meja
			</p>
		</div>
		{#if tables.length > 0}
			<button
				onclick={downloadAllQr}
				class="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
			>
				<Download size={16} />
				Unduh Semua
			</button>
		{/if}
	</div>

	{#if tables.length === 0}
		<Card.Root>
			<Card.Content class="flex flex-col items-center gap-3 py-12 text-center">
				<TableIcon size={40} class="text-muted-foreground/50" />
				<p class="text-sm text-muted-foreground">Belum ada meja yang dikonfigurasi.</p>
				<p class="text-xs text-muted-foreground">
					Tambahkan meja melalui pengaturan outlet untuk mulai menerima pesanan via QR.
				</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each tables as table (table.id)}
				<Card.Root class={table.isActive ? '' : 'opacity-60'}>
					<Card.Header class="pb-2">
						<div class="flex items-start justify-between gap-2">
							<div>
								<Card.Title class="text-base">{table.label || table.code}</Card.Title>
								<p class="font-mono text-xs text-muted-foreground">{table.code}</p>
							</div>
							<Badge variant={table.isActive ? 'default' : 'secondary'}>
								{table.isActive ? 'Aktif' : 'Nonaktif'}
							</Badge>
						</div>
					</Card.Header>

					<Card.Content class="space-y-3">
						{#if table.qrSvg}
							<!-- Render QR SVG inline — no external request, immediate display -->
							<div class="flex justify-center rounded-lg border bg-white p-3">
								<!-- eslint-disable-next-line svelte/no-at-html-tags -->
								{@html table.qrSvg}
							</div>
						{:else}
							<div
								class="flex h-32 items-center justify-center rounded-lg border bg-muted text-muted-foreground"
							>
								<QrCode size={32} />
							</div>
						{/if}

						<!-- QR target URL for reference -->
						<p class="break-all font-mono text-[10px] text-muted-foreground">
							{table.qrUrl}
						</p>

						<div class="flex gap-2">
							<a
								href={table.qrUrl}
								target="_blank"
								rel="noopener noreferrer"
								class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
							>
								<ExternalLink size={12} />
								Uji Coba
							</a>
							{#if table.qrSvg}
								<button
									onclick={() => downloadSvg(table.label || table.code, table.qrSvg!)}
									class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
								>
									<Download size={12} />
									Unduh SVG
								</button>
							{/if}
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>

		<!-- Print-friendly note -->
		<p class="text-center text-xs text-muted-foreground">
			Unduh SVG lalu cetak dengan printer label atau kertas A4. QR berlaku selama outlet aktif.
		</p>
	{/if}
</div>
