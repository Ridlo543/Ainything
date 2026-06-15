<script lang="ts">
	import { BarChart3, TrendingUp } from '@lucide/svelte';
	import { restaurants } from '$lib/mock/restaurants';
</script>

<svelte:head>
	<title>Analytics · LinguaServe</title>
</svelte:head>

<section class="grid gap-5">
	<div>
		<p class="text-sm font-semibold text-lingua-primary">Mock analytics</p>
		<h1 class="mt-2 text-3xl font-semibold">Pilot signal dashboard</h1>
		<p class="mt-2 text-lingua-subtle">
			Designed for early proof: scans, helpfulness, fallback, top questions, and top item interest.
		</p>
	</div>

	<div class="surface rounded-lg p-4">
		<div class="flex items-center gap-3">
			<BarChart3 class="text-lingua-primary" size={24} />
			<h2 class="font-semibold">Restaurant comparison</h2>
		</div>
		<div class="mt-5 grid gap-4">
			{#each restaurants as restaurant (restaurant.id)}
				<div
					class="grid gap-2 rounded-lg border border-lingua-border bg-white p-3 md:grid-cols-[210px_1fr_80px] md:items-center"
				>
					<div>
						<p class="font-semibold text-lingua-text">{restaurant.name}</p>
						<p class="text-sm text-lingua-subtle">{restaurant.analytics.topQuestion}</p>
					</div>
					<div class="h-3 overflow-hidden rounded-full bg-slate-100">
						<div
							class="h-full rounded-full bg-lingua-primary"
							style={`width: ${Math.min(100, restaurant.analytics.helpfulRate)}%`}
						></div>
					</div>
					<div class="flex items-center gap-1 font-semibold text-lingua-primary">
						<TrendingUp size={16} />
						{restaurant.analytics.helpfulRate}%
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>
