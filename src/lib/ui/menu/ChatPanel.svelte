<script lang="ts">
	import { Bot, CircleAlert, Send, UserRoundCheck } from '@lucide/svelte';
	import type { Restaurant } from '$lib/domain/menu/types';

	let { restaurant, tableCode }: { restaurant: Restaurant; tableCode: string } = $props();

	let draft = $state('');
	let mode = $state<'confident' | 'low' | 'staff' | 'error'>('confident');

	const answers = $derived({
		confident: `The safest popular choice at ${restaurant.name} is ${restaurant.menuItems[0].name}. It is marked ${restaurant.menuItems[0].dietaryFlags.join(', ') || 'standard'} in the restaurant data.`,
		low: 'I do not have enough verified ingredient data for that exact request. Please ask staff before ordering.',
		staff: `Staff request prepared for ${tableCode}. Summary: guest needs confirmation before ordering.`,
		error:
			'The AI provider is unavailable in this prototype. The app keeps the fallback request available.'
	});
</script>

<section class="surface rounded-lg p-4">
	<div class="flex items-center justify-between gap-3">
		<div>
			<p class="font-semibold text-lingua-text">Ask about the menu</p>
			<p class="text-sm text-lingua-subtle">Prototype answer states are shown below.</p>
		</div>
		<span class="rounded-lg bg-lingua-primary-soft p-2 text-lingua-primary">
			<Bot size={22} />
		</span>
	</div>

	<div class="mt-4 flex flex-wrap gap-2">
		{#each ['confident', 'low', 'staff', 'error'] as state (state)}
			<button
				type="button"
				class={`rounded-md border px-3 py-2 text-xs font-semibold ${
					mode === state
						? 'border-lingua-primary bg-lingua-primary text-white'
						: 'border-lingua-border bg-white'
				}`}
				onclick={() => (mode = state as typeof mode)}
			>
				{state}
			</button>
		{/each}
	</div>

	<div class="mt-4 rounded-lg border border-lingua-border bg-slate-50 p-3">
		<div class="flex items-start gap-3">
			{#if mode === 'staff' || mode === 'low'}
				<CircleAlert class="mt-0.5 text-lingua-warning" size={20} />
			{:else if mode === 'error'}
				<CircleAlert class="mt-0.5 text-lingua-danger" size={20} />
			{:else}
				<Bot class="mt-0.5 text-lingua-primary" size={20} />
			{/if}
			<p class="text-sm leading-6 text-lingua-text">{answers[mode]}</p>
		</div>
	</div>

	<div class="mt-4 flex gap-2">
		<input
			class="tap-target min-w-0 flex-1 rounded-lg border border-lingua-border bg-white px-3 text-sm"
			placeholder="Ask: Is this spicy? Does it contain nuts?"
			bind:value={draft}
		/>
		<button
			type="button"
			class="tap-target inline-flex items-center gap-2 rounded-lg bg-lingua-primary px-4 text-sm font-semibold text-white"
			onclick={() => (mode = draft.toLowerCase().includes('allergy') ? 'staff' : 'confident')}
		>
			<Send size={16} /> Ask
		</button>
	</div>

	<button
		type="button"
		class="tap-target mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-lingua-border bg-white px-4 text-sm font-semibold text-lingua-text"
		onclick={() => (mode = 'staff')}
	>
		<UserRoundCheck size={17} /> Speak to human
	</button>
</section>
