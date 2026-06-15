<script lang="ts">
	import { Check } from '@lucide/svelte';
	import type { DietaryFlag } from '$lib/domain/menu/types';

	const options: { label: string; value: DietaryFlag }[] = [
		{ label: 'Halal', value: 'halal' },
		{ label: 'Vegetarian', value: 'vegetarian' },
		{ label: 'Vegan', value: 'vegan' },
		{ label: 'Gluten-free', value: 'gluten-free' },
		{ label: 'Nut-free', value: 'nut-free' },
		{ label: 'Low spice', value: 'spicy' }
	];

	let {
		selected,
		onToggle
	}: {
		selected: DietaryFlag[];
		onToggle: (flag: DietaryFlag) => void;
	} = $props();
</script>

<div class="flex gap-2 overflow-x-auto pb-1" aria-label="Food preferences">
	{#each options as option (option.value)}
		<button
			type="button"
			class={`tap-target inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition ${
				selected.includes(option.value)
					? 'border-lingua-primary bg-lingua-primary text-white'
					: 'border-lingua-border bg-white text-lingua-text'
			}`}
			aria-pressed={selected.includes(option.value)}
			onclick={() => onToggle(option.value)}
		>
			{#if selected.includes(option.value)}
				<Check size={15} />
			{/if}
			{option.label}
		</button>
	{/each}
</div>
