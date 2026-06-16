<script lang="ts">
	import { CheckCircle2, Clock3, Store, UserRoundCheck } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { getOrganization, restaurants, staffRequests } from '$lib/mock/restaurants';
	import StaffRequestCard from '$lib/ui/staff/StaffRequestCard.svelte';

	let selectedId = $state(staffRequests[0].id);
	const selected = $derived(
		staffRequests.find((request) => request.id === selectedId) ?? staffRequests[0]
	);
	const restaurant = $derived(
		restaurants.find((item) => item.slug === selected.restaurantSlug) ?? restaurants[0]
	);
	const organization = $derived(getOrganization(restaurant.organizationId));
</script>

<svelte:head>
	<title>Staff Inbox - LinguaServe</title>
</svelte:head>

<main class="min-h-screen py-5">
	<div class="app-container grid gap-5 lg:grid-cols-[390px_1fr]">
		<section class="grid content-start gap-4">
			<div class="surface rounded-lg p-4">
				<div class="flex items-center gap-3">
					<span class="rounded-lg bg-lingua-primary-soft p-3 text-lingua-primary">
						<UserRoundCheck size={25} />
					</span>
					<div>
						<p class="text-sm font-semibold text-lingua-primary">Staff workflow</p>
						<h1 class="text-2xl font-semibold">Help requests</h1>
					</div>
				</div>
				<p class="mt-3 text-sm leading-6 text-lingua-subtle">
					Each request is tied to one restaurant and table, so staff do not mix guests across
					tenants or locations.
				</p>
			</div>
			{#each staffRequests as request (request.id)}
				<StaffRequestCard
					{request}
					selected={selectedId === request.id}
					onclick={() => (selectedId = request.id)}
				/>
			{/each}
		</section>

		<section class="surface rounded-lg p-5">
			<div
				class="flex flex-col justify-between gap-4 border-b border-lingua-border pb-4 sm:flex-row sm:items-start"
			>
				<div>
					<p class="text-sm text-lingua-subtle">{organization.name}</p>
					<h2 class="mt-1 text-3xl font-semibold text-lingua-text">{restaurant.name}</h2>
					<p class="mt-2 text-lingua-subtle">
						Table {selected.tableCode} - {selected.guestNeed}
					</p>
				</div>
				<div class="rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
					{selected.priority} priority
				</div>
			</div>

			<div class="mt-5 grid gap-4 lg:grid-cols-3">
				<div class="rounded-lg border border-lingua-border bg-white p-4">
					<Clock3 class="text-lingua-info" size={22} />
					<p class="mt-3 text-sm text-lingua-subtle">Last message</p>
					<p class="font-semibold">{selected.lastMessageAt}</p>
				</div>
				<div class="rounded-lg border border-lingua-border bg-white p-4">
					<UserRoundCheck class="text-lingua-primary" size={22} />
					<p class="mt-3 text-sm text-lingua-subtle">Guest language</p>
					<p class="font-semibold">{selected.language}</p>
				</div>
				<div class="rounded-lg border border-lingua-border bg-white p-4">
					<CheckCircle2 class="text-lingua-success" size={22} />
					<p class="mt-3 text-sm text-lingua-subtle">Current status</p>
					<p class="font-semibold">{selected.status}</p>
				</div>
			</div>

			<div class="mt-5 rounded-lg border border-lingua-border bg-slate-50 p-4">
				<div class="flex items-center gap-2">
					<Store class="text-lingua-primary" size={20} />
					<p class="font-semibold">Guest summary for staff</p>
				</div>
				<p class="mt-2 leading-7 text-lingua-subtle">{selected.summary}</p>
			</div>

			<div class="mt-5 grid gap-3 sm:grid-cols-3">
				<button
					class="tap-target rounded-lg border border-lingua-border bg-white px-4 text-sm font-semibold"
					>Mark in progress</button
				>
				<button
					class="tap-target rounded-lg bg-lingua-primary px-4 text-sm font-semibold text-white"
					>Resolve request</button
				>
				<a
					class="tap-target inline-flex items-center justify-center rounded-lg border border-lingua-border bg-white px-4 text-sm font-semibold"
					href={resolve(`/r/${restaurant.slug}/table/${selected.tableCode}`)}
				>
					Open guest view
				</a>
			</div>
		</section>
	</div>
</main>
