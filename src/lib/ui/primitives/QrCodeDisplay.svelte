<script lang="ts">
	import { Download, Printer } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import QRCode from 'qrcode';

	type Props = {
		/** The absolute URL the QR code encodes. */
		url: string;
		/** Optional accessible label (e.g. "Table T07"). */
		label?: string;
		/** SVG size in pixels. Defaults to 176 (matches the existing card layout). */
		size?: number;
	};

	let { url, label, size = 176 }: Props = $props();

	let svgMarkup = $state('');
	let error = $state<string | null>(null);
	let isGenerating = $state(true);

	$effect(() => {
		// Re-render when URL or size changes. The QR is regenerated any time the
		// encoded URL changes (e.g. when a parent swaps which table is being shown).
		void regenerate();
	});

	async function regenerate() {
		isGenerating = true;
		error = null;
		try {
			svgMarkup = await QRCode.toString(url, {
				type: 'svg',
				errorCorrectionLevel: 'M',
				margin: 1,
				width: size,
				color: { dark: '#0f172a', light: '#ffffff' }
			});
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not render QR code.';
			svgMarkup = '';
		} finally {
			isGenerating = false;
		}
	}

	async function downloadPng() {
		try {
			// Render a one-off canvas for download — SVG markup cannot be exported
			// directly to a PNG file from the browser.
			const canvas = document.createElement('canvas');
			canvas.width = size * 2; // 2x for retina print
			canvas.height = size * 2;
			await QRCode.toCanvas(canvas, url, {
				errorCorrectionLevel: 'M',
				margin: 1,
				width: size * 2,
				color: { dark: '#0f172a', light: '#ffffff' }
			});
			const dataUrl = canvas.toDataURL('image/png');
			const a = document.createElement('a');
			a.href = dataUrl;
			a.download = (label ?? 'qr-code') + '.png';
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not download QR code.';
		}
	}

	function printCard() {
		window.print();
	}
</script>

<figure
	class="qr-card flex flex-col items-center gap-2 rounded-lg border border-lingua-border bg-lingua-surface p-3"
	data-printable="qr-card"
>
	{#if isGenerating && !svgMarkup}
		<div
			class="grid place-items-center text-xs text-lingua-subtle"
			style="width: {size}px; height: {size}px;"
		>
			Generating…
		</div>
	{:else if error}
		<div
			class="grid place-items-center rounded border border-lingua-danger/30 bg-lingua-danger-soft p-2 text-center text-xs text-lingua-danger"
			style="width: {size}px; height: {size}px;"
		>
			{error}
		</div>
	{:else}
		<!-- The QR SVG is generated from `qrcode` and is a static string; safe to render via {@html}. -->
		<div
			class="overflow-hidden rounded"
			style="width: {size}px; height: {size}px;"
			aria-label={label ? `QR code for ${label}` : 'QR code'}
			role="img"
		>
			{@html svgMarkup}
		</div>
	{/if}
	{#if label}
		<figcaption class="text-xs font-semibold text-lingua-text">{label}</figcaption>
	{/if}
	<div class="no-print flex w-full gap-1">
		<button
			type="button"
			class="tap-target inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-lingua-border bg-lingua-surface px-2 py-1.5 text-xs font-semibold text-lingua-text hover:bg-lingua-primary-soft"
			onclick={downloadPng}
			aria-label="Download QR code as PNG"
			disabled={!svgMarkup}
		>
			<Download size={13} /> PNG
		</button>
		<button
			type="button"
			class="tap-target inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-lingua-border bg-lingua-surface px-2 py-1.5 text-xs font-semibold text-lingua-text hover:bg-lingua-primary-soft"
			onclick={printCard}
			aria-label="Print QR code"
		>
			<Printer size={13} /> Print
		</button>
	</div>
</figure>

<style>
	/* Hide download/print buttons when printing the page. */
	@media print {
		:global(.no-print) {
			display: none !important;
		}
		:global([data-printable='qr-card']) {
			border: none !important;
			padding: 0 !important;
		}
	}
</style>
