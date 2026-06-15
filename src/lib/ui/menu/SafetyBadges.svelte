<script lang="ts">
	import Badge from '$lib/ui/primitives/Badge.svelte';
	import type { MenuItem } from '$lib/domain/menu/types';

	let { item }: { item: MenuItem } = $props();
</script>

<div class="flex flex-wrap gap-2">
	{#if item.dietaryFlags.includes('halal')}
		<Badge label="Halal-friendly" tone="success" />
	{/if}
	{#if item.dietaryFlags.includes('vegetarian')}
		<Badge label="Vegetarian" tone="success" />
	{/if}
	{#if item.dietaryFlags.includes('vegan')}
		<Badge label="Vegan" tone="success" />
	{/if}
	{#if item.dietaryFlags.includes('contains-alcohol')}
		<Badge label="Contains alcohol" tone="danger" />
	{/if}
	{#each item.allergens as allergen (allergen)}
		<Badge label={`Allergen: ${allergen}`} tone="warning" />
	{/each}
	{#if item.confidence !== 'verified'}
		<Badge label="Staff confirmation" tone="danger" />
	{/if}
</div>
