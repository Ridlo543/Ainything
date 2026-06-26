<script lang="ts">
	import type { LayoutData } from './$types';
	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	const restaurant = $derived(data.restaurant);
</script>

<svelte:head>
	<title>{restaurant.name} &middot; Ainything</title>
	<meta name="description" content={restaurant.description} />
	<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
</svelte:head>

<div class="min-h-screen bg-ainything-bg">
	<header
		class="sticky top-0 z-30 border-b border-ainything-border bg-ainything-surface/95 backdrop-blur-sm"
	>
		<div class="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
			<div
				class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ainything-primary-soft text-lg font-bold text-ainything-primary"
			>
				{restaurant.name.charAt(0)}
			</div>
			<div class="min-w-0">
				<h1 class="truncate text-base font-semibold text-ainything-text">{restaurant.name}</h1>
				<p class="truncate text-xs text-ainything-subtle">{restaurant.location}</p>
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-2xl px-4 pb-24">
		{@render children()}
	</main>
</div>
