<script lang="ts">
	import { enhance } from '$app/forms';
	import { AlertTriangle, Camera, CheckCircle2, Upload, X } from '@lucide/svelte';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import type { PageData } from './$types';
	import Badge from '$lib/ui/primitives/Badge.svelte';

	let { data }: { data: PageData } = $props();

	type OcrItem = {
		name: string;
		nameConfidence: number;
		localName?: string;
		localNameConfidence?: number;
		category: string;
		categoryConfidence: number;
		description: string;
		descriptionConfidence: number;
		price: number;
		priceConfidence: number;
		currency: string;
		spiceLevel: number;
		spiceLevelConfidence: number;
		isSignature: boolean;
		dietaryFlags: string[];
		allergens: string[];
	};

	type ScanResult = {
		items: OcrItem[];
		rawText: string;
		issues: Array<{ id: string; label: string; confidence: number; issue: string }>;
		provider: string;
		model: string;
	};

	const tenant = $derived(data.tenant);
	const activeRestaurant = $derived(tenant.activeRestaurant);

	let scanResult = $state<ScanResult | null>(null);
	let importResult = $state<{
		count: number;
		items: Array<{ id: string; name: string; category: string }>;
	} | null>(null);
	let fileBase64 = $state('');
	let fileMimeType = $state('image/png');
	let isScanning = $state(false);

	function handleFileChange(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		fileMimeType = file.type || 'image/png';
		const reader = new FileReader();
		reader.onload = () => {
			const result = reader.result as string;
			fileBase64 = result.split(',')[1] ?? result;
		};
		reader.readAsDataURL(file);
	}

	function confidenceColor(score: number): string {
		if (score >= 0.9) return 'text-lingua-success';
		if (score >= 0.7) return 'text-lingua-warning';
		return 'text-red-600';
	}

	function confidenceBg(score: number): string {
		if (score >= 0.9) return 'bg-green-50 border-green-200';
		if (score >= 0.7) return 'bg-amber-50 border-amber-200';
		return 'bg-red-50 border-red-200';
	}

	function formatConfidence(score: number): string {
		return `${Math.round(score * 100)}%`;
	}

	let editedItems = new SvelteMap<number, Partial<OcrItem>>();

	function getItem(idx: number): OcrItem {
		const base = scanResult!.items[idx]!;
		const edits = editedItems.get(idx);
		if (!edits) return base;
		return { ...base, ...edits };
	}

	let rejectedIndices = new SvelteSet<number>();

	function toggleReject(idx: number) {
		const next = new SvelteSet(rejectedIndices);
		if (next.has(idx)) {
			next.delete(idx);
		} else {
			next.add(idx);
		}
		rejectedIndices = next;
	}

	let includeRawText = $state(false);
</script>

<svelte:head>
	<title>Menu Import - Lingua</title>
</svelte:head>

<section class="grid gap-5">
	<div>
		<p class="text-sm font-semibold text-lingua-primary">Menu import</p>
		<h1 class="mt-2 text-3xl font-semibold">OCR menu extraction</h1>
		<p class="mt-2 max-w-3xl text-lingua-subtle">
			Upload a menu photo or scan. The system extracts items with confidence scores so you can
			review and correct before importing to {activeRestaurant.name}.
		</p>
	</div>

	<!-- Upload Section -->
	<form
		method="POST"
		action="?/scan"
		use:enhance={() => {
			isScanning = true;
			return async ({ result }) => {
				isScanning = false;
				if (result.type === 'success' && result.data) {
					const data = result.data as { scan?: ScanResult };
					if (data.scan) {
						scanResult = data.scan;
						importResult = null;
						editedItems = new SvelteMap();
						rejectedIndices = new SvelteSet();
					}
				}
			};
		}}
		class="surface rounded-lg p-4"
	>
		<input type="hidden" name="mimeType" value={fileMimeType} />
		<input type="hidden" name="restaurant" value={activeRestaurant.slug} />
		<input type="hidden" name="image" value={fileBase64} />

		<div class="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
			<div>
				<label class="block text-sm font-semibold text-lingua-text">
					Upload menu image
					<input
						type="file"
						accept="image/png,image/jpeg,image/webp"
						class="tap-target mt-2 block w-full rounded-lg border border-lingua-border bg-lingua-surface px-3 py-2 text-sm text-lingua-subtle file:mr-4 file:rounded-md file:border-0 file:bg-lingua-primary file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
						onchange={handleFileChange}
					/>
				</label>
				<p class="mt-1 text-xs text-lingua-subtle">PNG, JPEG, or WebP — max 10 MB</p>
			</div>
			<button
				type="submit"
				disabled={isScanning || !fileBase64}
				class="tap-target inline-flex items-center justify-center gap-2 rounded-lg bg-lingua-primary px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
			>
				{#if isScanning}
					Scanning...
				{:else}
					<Camera size={16} />
					Scan menu
				{/if}
			</button>
		</div>
	</form>

	<!-- OCR Results -->
	{#if scanResult}
		<section class="surface rounded-lg p-4">
			<div class="flex items-center justify-between gap-3">
				<div class="flex items-center gap-3">
					<Camera class="text-lingua-primary" size={23} />
					<h2 class="font-semibold">Scan results</h2>
				</div>
				<p class="text-sm text-lingua-subtle">
					{scanResult.items.length} items found via {scanResult.provider}
				</p>
			</div>

			<!-- Issues -->
			{#if scanResult.issues.length > 0}
				<div class="mt-4 grid gap-2">
					{#each scanResult.issues as issue (issue.id)}
						<div class="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
							<AlertTriangle class="mt-0.5 shrink-0 text-lingua-warning" size={18} />
							<div>
								<p class="text-sm font-semibold">
									{issue.label}
									<span class="ml-2 font-normal text-lingua-subtle">
										{Math.round(issue.confidence * 100)}% confidence
									</span>
								</p>
								<p class="mt-1 text-sm text-lingua-subtle">{issue.issue}</p>
							</div>
						</div>
					{/each}
				</div>
			{/if}

			<!-- Items Review -->
			<div class="mt-4 grid gap-3">
				<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
				{#each scanResult.items as item, idx (idx)}
					{@const isRejected = rejectedIndices.has(idx)}
					{@const display = getItem(idx)}
					<article
						class="rounded-lg border p-4 transition-opacity"
						class:border-lingua-border={!isRejected}
						class:border-red-200={isRejected}
						class:opacity-50={isRejected}
						class:bg-red-50={isRejected}
						class:bg-lingua-surface={!isRejected}
					>
						<div class="flex items-start justify-between gap-3">
							<div class="flex-1">
								<div class="flex flex-wrap items-center gap-2">
									<h3 class="text-base font-semibold text-lingua-text">{display.name}</h3>
									<Badge label={display.category} tone="neutral" />
								</div>
								{#if display.localName}
									<p class="mt-1 text-sm text-lingua-subtle">{display.localName}</p>
								{/if}
								<p class="mt-1 text-sm leading-6 text-lingua-subtle">{display.description}</p>
							</div>
							<button
								type="button"
								class="tap-target shrink-0 rounded-lg border p-2"
								class:border-red-300={!isRejected}
								class:border-green-300={isRejected}
								onclick={() => toggleReject(idx)}
							>
								<X size={16} class={isRejected ? 'text-green-600' : 'text-red-500'} />
							</button>
						</div>

						<!-- Confidence scores -->
						<div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
							{#each [{ label: 'Name', score: display.nameConfidence }, { label: 'Category', score: display.categoryConfidence }, { label: 'Price', score: display.priceConfidence }, { label: 'Spice', score: display.spiceLevelConfidence }] as field (field.label)}
								<span
									class="rounded-md border px-2 py-1 text-xs font-medium {confidenceBg(
										field.score
									)} {confidenceColor(field.score)}"
								>
									{field.label}: {formatConfidence(field.score)}
								</span>
							{/each}
						</div>

						<!-- Dietary flags and allergens from OCR -->
						<div class="mt-2 flex flex-wrap gap-1.5">
							{#each display.dietaryFlags as flag (flag)}
								<span
									class="rounded-full bg-lingua-primary-soft px-2 py-0.5 text-xs font-medium text-lingua-primary"
								>
									{flag}
								</span>
							{/each}
						</div>
						{#if display.allergens.length > 0}
							<div class="mt-1.5 flex flex-wrap gap-1.5">
								{#each display.allergens as allergen (allergen)}
									<span class="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
										{allergen}
									</span>
								{/each}
							</div>
						{/if}

						<!-- Price -->
						<p class="mt-2 text-base font-semibold text-lingua-primary">
							Rp{display.price.toLocaleString('id-ID')}
						</p>
					</article>
				{/each}
			</div>

			<!-- Raw text toggle -->
			<div class="mt-4">
				<button
					type="button"
					class="text-sm text-lingua-subtle underline underline-offset-2"
					onclick={() => (includeRawText = !includeRawText)}
				>
					{includeRawText ? 'Hide' : 'Show'} raw OCR text
				</button>
				{#if includeRawText}
					<pre
						class="mt-2 max-h-48 overflow-auto rounded-lg border border-lingua-border bg-lingua-muted p-3 text-xs leading-relaxed whitespace-pre-wrap">{scanResult.rawText}</pre>
				{/if}
			</div>

			<!-- Import action -->
			<form
				method="POST"
				action="?/import"
				use:enhance={() => {
					return async ({ result }) => {
						if (result.type === 'success' && result.data) {
							const data = result.data as {
								imported?: {
									count: number;
									items: Array<{ id: string; name: string; category: string }>;
								};
							};
							if (data.imported) {
								importResult = data.imported;
							}
						}
					};
				}}
			>
				<input type="hidden" name="restaurant" value={activeRestaurant.slug} />
				<input
					type="hidden"
					name="scan"
					value={JSON.stringify({
						items: scanResult.items
							.filter((_, idx) => !rejectedIndices.has(idx))
							.map((item) => {
								const edits = editedItems.get(scanResult!.items.indexOf(item));
								return edits ? { ...item, ...edits } : item;
							}),
						rawText: scanResult.rawText,
						issues: scanResult.issues,
						provider: scanResult.provider,
						model: scanResult.model
					})}
				/>
				<button
					type="submit"
					class="tap-target mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-lingua-primary px-6 py-3 text-sm font-semibold text-white"
				>
					<Upload size={16} />
					Import {scanResult.items.length - rejectedIndices.size} items to draft menu
				</button>
			</form>
		</section>
	{/if}

	<!-- Import success -->
	{#if importResult}
		<section class="surface rounded-lg border-2 border-green-200 p-4">
			<div class="flex items-center gap-3">
				<CheckCircle2 class="text-lingua-success" size={23} />
				<div>
					<h2 class="font-semibold text-lingua-text">Items imported</h2>
					<p class="mt-1 text-sm text-lingua-subtle">
						{importResult.count} items added to the draft menu for {activeRestaurant.name}.
					</p>
				</div>
			</div>
			<div class="mt-3 grid gap-2">
				{#each importResult.items as item (item.id)}
					<div
						class="flex items-center gap-2 rounded-lg border border-lingua-border bg-lingua-surface px-3 py-2"
					>
						<Badge label={item.category} tone="neutral" />
						<span class="text-sm font-medium text-lingua-text">{item.name}</span>
					</div>
				{/each}
			</div>
			<p class="mt-3 text-sm text-lingua-subtle">
				Go to
				<a
					href={'/dashboard/menu?restaurant=' + activeRestaurant.slug}
					class="font-semibold text-lingua-primary underline">Menu data</a
				> to review and publish.
			</p>
		</section>
	{/if}
</section>
