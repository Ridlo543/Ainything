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
			class="rounded-md border border-lingua-border bg-lingua-surface px-4 py-2 text-lingua-text hover:bg-lingua-muted"
		>
			Previous
		</a>
	{:else}
		<span></span>
	{/if}
	{#if hasNext}
		<a
			href={nextUrl}
			class="rounded-md border border-lingua-border bg-lingua-surface px-4 py-2 text-lingua-text hover:bg-lingua-muted"
		>
			Next
		</a>
	{/if}
</div>
