<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		description,
		icon,
		actions,
		variant = 'simple'
	}: {
		title: string;
		description?: string;
		icon?: Snippet;
		actions?: Snippet;
		variant?: 'simple' | 'card';
	} = $props();
</script>

{#if variant === 'card'}
	<div class="col-span-full rounded-lg border border-slate-200 bg-white p-6 text-center">
		{#if icon}
			<div class="mx-auto inline-flex rounded-lg bg-teal-50 p-3 text-teal-700">
				{@render icon()}
			</div>
		{/if}
		<h3 class="mt-3 font-semibold text-slate-900">{title}</h3>
		{#if description}
			<p class="mt-1 text-sm text-slate-500">{description}</p>
		{/if}
		{#if actions}
			<div class="mt-4 flex justify-center gap-2">
				{@render actions()}
			</div>
		{/if}
	</div>
{:else}
	<div class="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
		{title}
	</div>
{/if}
