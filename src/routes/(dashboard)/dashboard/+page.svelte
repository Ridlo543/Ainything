<script lang="ts">
	import { Activity, AlertTriangle, Building2, MessageCircle, QrCode } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { organizations, restaurants, staffRequests } from '$lib/mock/restaurants';
	import StatTile from '$lib/ui/primitives/StatTile.svelte';

	const activeOrganization = organizations[0];
	const scopedRestaurants = restaurants.filter(
		(restaurant) => restaurant.organizationId === activeOrganization.id
	);
	const activeRestaurants = scopedRestaurants.length;
	const scansToday = scopedRestaurants.reduce(
		(sum, restaurant) => sum + restaurant.analytics.scansToday,
		0
	);
	const fallbackRate = Math.round(
		scopedRestaurants.reduce((sum, restaurant) => sum + restaurant.analytics.fallbackRate, 0) /
			scopedRestaurants.length
	);
	const needsReview = scopedRestaurants.reduce((sum, restaurant) => {
		return sum + restaurant.importIssues.filter((issue) => issue.status !== 'approved').length;
	}, 0);
	const scopedRequests = staffRequests.filter((request) =>
		scopedRestaurants.some((restaurant) => restaurant.slug === request.restaurantSlug)
	);
</script>

<svelte:head>
	<title>Management Dashboard - LinguaServe</title>
</svelte:head>

<section class="grid gap-5">
	<div>
		<p class="text-sm font-semibold text-lingua-primary">{activeOrganization.name}</p>
		<h1 class="mt-2 text-3xl font-semibold text-lingua-text">Restaurant operations</h1>
		<p class="mt-2 max-w-3xl text-lingua-subtle">
			Manage many restaurant QR experiences from one workspace. Each row stays scoped to one
			restaurant so menu data, staff requests, and reports do not mix.
		</p>
	</div>

	<div class="surface rounded-lg p-4">
		<div class="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
			<div class="flex items-start gap-3">
				<span class="rounded-lg bg-lingua-primary-soft p-3 text-lingua-primary">
					<Building2 size={23} />
				</span>
				<div>
					<p class="font-semibold text-lingua-text">Workspace routing</p>
					<p class="mt-1 text-sm leading-6 text-lingua-subtle">
						Admin URL example: {activeOrganization.workspaceHost}. Public guest URLs can use
						restaurant subdomains or the path fallback shown in the QR manager.
					</p>
				</div>
			</div>
			<a
				class="tap-target inline-flex items-center justify-center rounded-lg border border-lingua-border bg-white px-4 text-sm font-semibold"
				href={resolve('/dashboard/tables')}
			>
				Manage QR links
			</a>
		</div>
	</div>

	<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
		<StatTile
			label="Managed restaurants"
			value={activeRestaurants}
			detail="Inside this workspace"
			icon={Activity}
		/>
		<StatTile
			label="Scans today"
			value={scansToday}
			detail="Across active QR tables"
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
			detail="Need staff or manager review"
			icon={AlertTriangle}
			tone="warning"
		/>
	</div>

	<div class="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
		<section class="surface rounded-lg p-4">
			<div class="flex items-center justify-between gap-3">
				<h2 class="font-semibold text-lingua-text">Restaurant health</h2>
				<a class="text-sm font-semibold text-lingua-primary" href={resolve('/dashboard/analytics')}
					>View reports</a
				>
			</div>
			<div class="mt-4 overflow-x-auto">
				<table class="w-full min-w-[780px] text-left text-sm">
					<thead class="text-lingua-subtle">
						<tr class="border-b border-lingua-border">
							<th class="py-3 pr-4">Restaurant</th>
							<th class="py-3 pr-4">Segment</th>
							<th class="py-3 pr-4">Public host</th>
							<th class="py-3 pr-4">Scans</th>
							<th class="py-3 pr-4">Helpful</th>
							<th class="py-3 pr-4">Fallback</th>
						</tr>
					</thead>
					<tbody>
						{#each scopedRestaurants as restaurant (restaurant.id)}
							<tr class="border-b border-slate-100">
								<td class="py-3 pr-4 font-semibold text-lingua-text">{restaurant.name}</td>
								<td class="py-3 pr-4 text-lingua-subtle">{restaurant.segment}</td>
								<td class="py-3 pr-4 text-lingua-subtle">{restaurant.publicHost}</td>
								<td class="py-3 pr-4">{restaurant.analytics.scansToday}</td>
								<td class="py-3 pr-4">{restaurant.analytics.helpfulRate}%</td>
								<td class="py-3 pr-4">{restaurant.analytics.fallbackRate}%</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>

		<section class="surface rounded-lg p-4">
			<h2 class="font-semibold text-lingua-text">Live staff queue</h2>
			<div class="mt-4 grid gap-3">
				{#each scopedRequests as request (request.id)}
					<div class="rounded-lg border border-lingua-border bg-white p-3">
						<div class="flex justify-between gap-3">
							<p class="font-semibold">{request.tableCode} - {request.guestNeed}</p>
							<span class="text-xs font-semibold text-lingua-primary">{request.status}</span>
						</div>
						<p class="mt-2 text-sm leading-6 text-lingua-subtle">{request.summary}</p>
					</div>
				{/each}
			</div>
		</section>
	</div>
</section>
