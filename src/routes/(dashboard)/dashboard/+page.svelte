<script lang="ts">
	import { Activity, AlertTriangle, MessageCircle, QrCode } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { restaurants, staffRequests } from '$lib/mock/restaurants';
	import StatTile from '$lib/ui/primitives/StatTile.svelte';

	const activeRestaurants = restaurants.length;
	const scansToday = restaurants.reduce(
		(sum, restaurant) => sum + restaurant.analytics.scansToday,
		0
	);
	const fallbackRate = Math.round(
		restaurants.reduce((sum, restaurant) => sum + restaurant.analytics.fallbackRate, 0) /
			restaurants.length
	);
	const needsReview = restaurants.reduce((sum, restaurant) => {
		return sum + restaurant.importIssues.filter((issue) => issue.status !== 'approved').length;
	}, 0);
</script>

<svelte:head>
	<title>Admin Dashboard · LinguaServe</title>
</svelte:head>

<section class="grid gap-5">
	<div>
		<p class="text-sm font-semibold text-lingua-primary">Frontend Phase 5</p>
		<h1 class="mt-2 text-3xl font-semibold text-lingua-text">Operations overview</h1>
		<p class="mt-2 max-w-3xl text-lingua-subtle">
			Mock dashboard for restaurant owners: usage, menu review, fallback health, and top questions.
		</p>
	</div>

	<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
		<StatTile
			label="Pilot restaurants"
			value={activeRestaurants}
			detail="Dummy dataset loaded"
			icon={Activity}
		/>
		<StatTile
			label="Scans today"
			value={scansToday}
			detail="Across mocked QR tables"
			icon={QrCode}
			tone="accent"
		/>
		<StatTile
			label="Fallback rate"
			value={`${fallbackRate}%`}
			detail="Healthy early-pilot range"
			icon={MessageCircle}
			tone="info"
		/>
		<StatTile
			label="Import issues"
			value={needsReview}
			detail="Need owner/staff review"
			icon={AlertTriangle}
			tone="warning"
		/>
	</div>

	<div class="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
		<section class="surface rounded-lg p-4">
			<div class="flex items-center justify-between gap-3">
				<h2 class="font-semibold text-lingua-text">Restaurant health</h2>
				<a class="text-sm font-semibold text-lingua-primary" href={resolve('/dashboard/analytics')}
					>View analytics</a
				>
			</div>
			<div class="mt-4 overflow-x-auto">
				<table class="w-full min-w-[720px] text-left text-sm">
					<thead class="text-lingua-subtle">
						<tr class="border-b border-lingua-border">
							<th class="py-3 pr-4">Restaurant</th>
							<th class="py-3 pr-4">Segment</th>
							<th class="py-3 pr-4">Scans</th>
							<th class="py-3 pr-4">Helpful</th>
							<th class="py-3 pr-4">Fallback</th>
							<th class="py-3">Top item</th>
						</tr>
					</thead>
					<tbody>
						{#each restaurants.slice(0, 6) as restaurant (restaurant.id)}
							<tr class="border-b border-slate-100">
								<td class="py-3 pr-4 font-semibold text-lingua-text">{restaurant.name}</td>
								<td class="py-3 pr-4 text-lingua-subtle">{restaurant.segment}</td>
								<td class="py-3 pr-4">{restaurant.analytics.scansToday}</td>
								<td class="py-3 pr-4">{restaurant.analytics.helpfulRate}%</td>
								<td class="py-3 pr-4">{restaurant.analytics.fallbackRate}%</td>
								<td class="py-3 text-lingua-subtle">{restaurant.analytics.topItem}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>

		<section class="surface rounded-lg p-4">
			<h2 class="font-semibold text-lingua-text">Live fallback queue</h2>
			<div class="mt-4 grid gap-3">
				{#each staffRequests as request (request.id)}
					<div class="rounded-lg border border-lingua-border bg-white p-3">
						<div class="flex justify-between gap-3">
							<p class="font-semibold">{request.tableCode} · {request.guestNeed}</p>
							<span class="text-xs font-semibold text-lingua-primary">{request.status}</span>
						</div>
						<p class="mt-2 text-sm leading-6 text-lingua-subtle">{request.summary}</p>
					</div>
				{/each}
			</div>
		</section>
	</div>
</section>
