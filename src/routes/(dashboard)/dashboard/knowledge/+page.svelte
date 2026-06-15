<script lang="ts">
	import { BookOpenText, Plus } from '@lucide/svelte';
	import { restaurants } from '$lib/mock/restaurants';
	import Badge from '$lib/ui/primitives/Badge.svelte';
</script>

<svelte:head>
	<title>Knowledge Base · LinguaServe</title>
</svelte:head>

<section class="grid gap-5">
	<div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
		<div>
			<p class="text-sm font-semibold text-lingua-primary">Restaurant knowledge</p>
			<h1 class="mt-2 text-3xl font-semibold">Facts AI can safely use</h1>
			<p class="mt-2 text-lingua-subtle">
				Keep verified operational facts separate from generated explanations.
			</p>
		</div>
		<button
			class="tap-target inline-flex items-center justify-center gap-2 rounded-lg bg-lingua-primary px-4 text-sm font-semibold text-white"
		>
			<Plus size={17} /> Add note
		</button>
	</div>

	<div class="grid gap-4 lg:grid-cols-2">
		{#each restaurants as restaurant (restaurant.id)}
			<article class="surface rounded-lg p-4">
				<div class="flex items-start gap-3">
					<span class="rounded-lg bg-lingua-primary-soft p-2 text-lingua-primary">
						<BookOpenText size={22} />
					</span>
					<div>
						<h2 class="font-semibold text-lingua-text">{restaurant.name}</h2>
						<p class="mt-1 text-sm text-lingua-subtle">{restaurant.location}</p>
					</div>
				</div>
				<div class="mt-4 grid gap-2">
					{#each restaurant.knowledgeHighlights as note (note)}
						<div
							class="rounded-lg border border-lingua-border bg-white p-3 text-sm text-lingua-text"
						>
							{note}
						</div>
					{/each}
				</div>
				<div class="mt-4 flex flex-wrap gap-2">
					{#each restaurant.languages as language (language)}
						<Badge label={language} tone="neutral" />
					{/each}
				</div>
			</article>
		{/each}
	</div>
</section>
