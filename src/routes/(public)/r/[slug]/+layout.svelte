<script lang="ts">
	import { page } from '$app/stores';
	import type { LayoutData } from './$types';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();

	const tenant = $derived(data.tenant);
</script>

<div class="flex min-h-screen flex-col bg-background">
	<header class="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
		{#if tenant.name}
			<p class="text-lg font-bold">{tenant.name}</p>
		{/if}
	</header>

	<main class="flex-1 pb-20">
		{@render children()}
	</main>
</div>
