<script lang="ts">
	import { Download, QrCode } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { organizations, restaurants } from '$lib/mock/restaurants';

	const tables = Array.from({ length: 12 }, (_, index) => `T${String(index + 1).padStart(2, '0')}`);
	const activeOrganization = organizations[0];
	const managedRestaurants = restaurants.filter(
		(restaurant) => restaurant.organizationId === activeOrganization.id
	);

	let selectedSlug = $state(managedRestaurants[0].slug);
	const selectedRestaurant = $derived(
		managedRestaurants.find((restaurant) => restaurant.slug === selectedSlug) ??
			managedRestaurants[0]
	);
</script>

<svelte:head>
	<title>QR Tables - LinguaServe</title>
</svelte:head>

<section class="grid gap-5">
	<div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
		<div>
			<p class="text-sm font-semibold text-lingua-primary">QR table manager</p>
			<h1 class="mt-2 text-3xl font-semibold">Print-ready QR cards</h1>
			<p class="mt-2 max-w-3xl text-lingua-subtle">
				Choose a restaurant, then generate table links for that venue only. In production the same
				table code cannot leak into another restaurant tenant.
			</p>
		</div>
		<label class="grid gap-1 text-sm font-semibold text-lingua-text">
			Restaurant
			<select
				class="tap-target min-w-64 rounded-lg border border-lingua-border bg-white px-3 text-sm font-normal"
				bind:value={selectedSlug}
			>
				{#each managedRestaurants as restaurant (restaurant.slug)}
					<option value={restaurant.slug}>{restaurant.name}</option>
				{/each}
			</select>
		</label>
	</div>

	<section class="surface rounded-lg p-4">
		<div class="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
			<div>
				<p class="font-semibold text-lingua-text">{selectedRestaurant.name}</p>
				<p class="mt-1 text-sm text-lingua-subtle">
					Public host: {selectedRestaurant.publicHost}. Path fallback: /r/{selectedRestaurant.slug}/table/T01.
				</p>
			</div>
			<p
				class="rounded-lg bg-lingua-primary-soft px-3 py-2 text-sm font-semibold text-lingua-primary"
			>
				{selectedRestaurant.tableCount} physical tables
			</p>
		</div>
	</section>

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
		{#each tables as table (table)}
			<article class="surface rounded-lg p-4">
				<div class="flex items-start justify-between gap-3">
					<div>
						<p class="text-sm text-lingua-subtle">{selectedRestaurant.name}</p>
						<h2 class="text-xl font-semibold">{table}</h2>
					</div>
					<QrCode class="text-lingua-primary" size={24} />
				</div>
				<div class="qr-pattern mx-auto mt-4 h-44 w-44 rounded-lg border border-lingua-border"></div>
				<a
					class="tap-target mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-lingua-primary px-4 text-sm font-semibold text-white"
					href={resolve(`/r/${selectedRestaurant.slug}/table/${table}`)}
				>
					<Download size={16} /> Open QR URL
				</a>
			</article>
		{/each}
	</div>
</section>
