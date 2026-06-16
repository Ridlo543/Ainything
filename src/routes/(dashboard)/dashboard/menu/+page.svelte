<script lang="ts">
	import { CheckCircle2, Eye, Pencil, Search } from '@lucide/svelte';
	import { formatPrice } from '$lib/domain/menu/policy';
	import { organizations, restaurants } from '$lib/mock/restaurants';
	import Badge from '$lib/ui/primitives/Badge.svelte';

	const activeOrganization = organizations[0];
	const managedRestaurants = restaurants.filter(
		(restaurant) => restaurant.organizationId === activeOrganization.id
	);

	let selectedSlug = $state(managedRestaurants[0].slug);
	let search = $state('');
	const selectedRestaurant = $derived(
		managedRestaurants.find((item) => item.slug === selectedSlug) ?? managedRestaurants[0]
	);
	const filteredItems = $derived(
		selectedRestaurant.menuItems.filter((item) =>
			`${item.name} ${item.localName} ${item.description}`
				.toLowerCase()
				.includes(search.toLowerCase())
		)
	);
</script>

<svelte:head>
	<title>Menu Data - LinguaServe</title>
</svelte:head>

<section class="grid gap-5">
	<div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
		<div>
			<p class="text-sm font-semibold text-lingua-primary">{activeOrganization.name}</p>
			<h1 class="mt-2 text-3xl font-semibold">Menu data</h1>
			<p class="mt-2 text-lingua-subtle">
				Choose a restaurant, then review prices, availability, dietary flags, and translations.
			</p>
		</div>
		<select
			class="tap-target rounded-lg border border-lingua-border bg-white px-3 text-sm"
			bind:value={selectedSlug}
			aria-label="Restaurant"
		>
			{#each managedRestaurants as restaurant (restaurant.slug)}
				<option value={restaurant.slug}>{restaurant.name}</option>
			{/each}
		</select>
	</div>

	<div class="surface rounded-lg p-4">
		<div class="grid gap-3 sm:grid-cols-[1fr_260px]">
			<div>
				<h2 class="font-semibold text-lingua-text">{selectedRestaurant.name}</h2>
				<p class="mt-1 text-sm text-lingua-subtle">
					{selectedRestaurant.description} Public host: {selectedRestaurant.publicHost}.
				</p>
			</div>
			<label class="relative block">
				<Search class="absolute left-3 top-3 text-lingua-subtle" size={17} />
				<input
					class="tap-target w-full rounded-lg border border-lingua-border bg-white pl-10 pr-3 text-sm"
					placeholder="Search menu"
					bind:value={search}
				/>
			</label>
		</div>

		<div class="mt-4 overflow-x-auto">
			<table class="w-full min-w-[760px] text-left text-sm">
				<thead class="text-lingua-subtle">
					<tr class="border-b border-lingua-border">
						<th class="py-3 pr-4">Item</th>
						<th class="py-3 pr-4">Category</th>
						<th class="py-3 pr-4">Price</th>
						<th class="py-3 pr-4">Flags</th>
						<th class="py-3 pr-4">Status</th>
						<th class="py-3">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each filteredItems as item (item.id)}
						<tr class="border-b border-slate-100 align-top">
							<td class="py-3 pr-4">
								<p class="font-semibold text-lingua-text">{item.name}</p>
								<p class="text-lingua-subtle">{item.localName}</p>
							</td>
							<td class="py-3 pr-4">{item.category}</td>
							<td class="py-3 pr-4 font-semibold text-lingua-primary">{formatPrice(item.price)}</td>
							<td class="py-3 pr-4">
								<div class="flex flex-wrap gap-1.5">
									{#each item.dietaryFlags.slice(0, 3) as flag (flag)}
										<Badge label={flag} tone="primary" />
									{/each}
									{#each item.allergens.slice(0, 2) as allergen (allergen)}
										<Badge label={allergen} tone="warning" />
									{/each}
								</div>
							</td>
							<td class="py-3 pr-4">
								<Badge
									label={item.confidence}
									tone={item.confidence === 'verified' ? 'success' : 'warning'}
								/>
							</td>
							<td class="py-3">
								<div class="flex gap-2">
									<button
										class="rounded-md border border-lingua-border p-2"
										aria-label="Preview item"
									>
										<Eye size={16} />
									</button>
									<button class="rounded-md border border-lingua-border p-2" aria-label="Edit item">
										<Pencil size={16} />
									</button>
									<button
										class="rounded-md border border-green-200 bg-green-50 p-2 text-green-700"
										aria-label="Approve item"
									>
										<CheckCircle2 size={16} />
									</button>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</section>
