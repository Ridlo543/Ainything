<script lang="ts">
	import { page } from '$app/stores';

	let {
		offset,
		limit,
		hasNext,
		hasPrevious,
		baseUrl
	}: {
		offset: number;
		limit: number;
		hasNext: boolean;
		hasPrevious: boolean;
		baseUrl?: string;
	} = $props();

	const path = $derived(baseUrl ?? $page.url.pathname);

	const prevUrl = $derived.by(() => {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('offset', String(Math.max(0, offset - limit)));
		return `${path}?${params.toString()}`;
	});

	const nextUrl = $derived.by(() => {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('offset', String(offset + limit));
		return `${path}?${params.toString()}`;
	});
</script>

<div class="mt-4 flex justify-between gap-3 text-sm">
	{#if hasPrevious}
		<a
			href={prevUrl}
			class="rounded-md border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
		>
			Previous
		</a>
	{:else}
		<span></span>
	{/if}
	{#if hasNext}
		<a
			href={nextUrl}
			class="rounded-md border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
		>
			Next
		</a>
	{/if}
</div>
