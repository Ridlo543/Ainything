<script lang="ts">
	import { Check } from '@lucide/svelte';
	import type { DietaryFlag } from '$lib/domain/menu/types';
	import { t } from '$lib/i18n';

	const options: { labelKey: string; value: DietaryFlag }[] = [
		{ labelKey: 'preference.halal', value: 'halal' },
		{ labelKey: 'preference.vegetarian', value: 'vegetarian' },
		{ labelKey: 'preference.vegan', value: 'vegan' },
		{ labelKey: 'preference.glutenFree', value: 'gluten-free' },
		{ labelKey: 'preference.nutFree', value: 'nut-free' },
		{ labelKey: 'preference.noAlcohol', value: 'contains-alcohol' }
	];

	let {
		selected,
		onToggle
	}: {
		selected: DietaryFlag[];
		onToggle: (flag: DietaryFlag) => void;
	} = $props();
</script>

<div class="flex gap-2 overflow-x-auto pb-1" aria-label={t('preference.ariaLabel')}>
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
			{t(option.labelKey)}
		</button>
	{/each}
</div>
