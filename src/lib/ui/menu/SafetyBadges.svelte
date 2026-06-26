<script lang="ts">
	import Badge from '$lib/ui/primitives/Badge.svelte';
	import type { Product } from '$lib/domain/outlet/types';
	import { t, tWithVars } from '$lib/i18n';

	let { item }: { item: Pick<Product, 'dietaryFlags' | 'allergens' | 'confidence'> } = $props();
</script>

<div class="flex flex-wrap gap-2">
	{#if item.dietaryFlags.includes('halal')}
		<Badge label={t('badge.halal')} tone="success" />
	{/if}
	{#if item.dietaryFlags.includes('vegetarian')}
		<Badge label={t('badge.vegetarian')} tone="success" />
	{/if}
	{#if item.dietaryFlags.includes('vegan')}
		<Badge label={t('badge.vegan')} tone="success" />
	{/if}
	{#if item.dietaryFlags.includes('contains-alcohol')}
		<Badge label={t('badge.alcohol')} tone="danger" />
	{/if}
	{#each item.allergens as allergen (allergen)}
		<Badge label={tWithVars('badge.allergen', { allergen })} tone="warning" />
	{/each}
	{#if item.confidence !== 'verified'}
		<Badge label={t('badge.staff')} tone="danger" />
	{/if}
</div>
