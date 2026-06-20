<script lang="ts">
	import { enhance } from '$app/forms';
	import { Check, Pencil, Search, Send, X, AlertTriangle, Loader2 } from '@lucide/svelte';
	import type { PageData, ActionData } from './$types';
	import { formatPrice, spiceLabel } from '$lib/domain/menu/policy';
	import type { MenuItem } from '$lib/domain/menu/types';
	import Badge from '$lib/ui/primitives/Badge.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const activeOrganization = $derived(data.tenant.organization);
	const managedRestaurants = $derived(data.tenant.restaurants);
	const selectedSlug = $derived(data.tenant.activeRestaurant.slug);
	const selectedRestaurant = $derived(
		managedRestaurants.find((r) => r.slug === selectedSlug) ?? managedRestaurants[0]
	);

	// Client-side search filter
	let search = $state('');
	const filteredItems = $derived(
		selectedRestaurant.menuItems.filter((item) =>
			`${item.name} ${item.localName} ${item.description}`
				.toLowerCase()
				.includes(search.toLowerCase())
		)
	);

	// Edit drawer state
	let editingItem = $state<MenuItem | null>(null);
	let editForm = $state<{
		name: string;
		localName: string;
		description: string;
		price: number;
		spiceLevel: number;
		isAvailable: boolean;
		confidence: string;
		dietaryFlags: string[];
		allergens: string[];
	} | null>(null);
	let isSubmitting = $state(false);

	function openEditDrawer(item: MenuItem) {
		editingItem = item;
		editForm = {
			name: item.name,
			localName: item.localName ?? '',
			description: item.description,
			price: item.price,
			spiceLevel: item.spiceLevel,
			isAvailable: item.isAvailable,
			confidence: item.confidence,
			dietaryFlags: [...item.dietaryFlags],
			allergens: [...item.allergens]
		};
	}

	function closeEditDrawer() {
		editingItem = null;
		editForm = null;
		isSubmitting = false;
	}

	function toggleEditFlag(flag: string, list: 'dietaryFlags' | 'allergens') {
		if (!editForm) return;
		const arr = editForm[list];
		const idx = arr.indexOf(flag);
		if (idx === -1) {
			editForm[list] = [...arr, flag];
		} else {
			editForm[list] = arr.filter((f) => f !== flag);
		}
	}

	// Allergen / dietary options for the edit drawer
	const dietaryOptions: { label: string; value: string }[] = [
		{ label: 'Halal', value: 'halal' },
		{ label: 'Vegetarian', value: 'vegetarian' },
		{ label: 'Vegan', value: 'vegan' },
		{ label: 'Gluten-free', value: 'gluten-free' },
		{ label: 'Contains alcohol', value: 'contains-alcohol' },
		{ label: 'Spicy', value: 'spicy' },
		{ label: 'Seafood', value: 'seafood' },
		{ label: 'Nut-free', value: 'nut-free' }
	];

	const allergenOptions: { label: string; value: string }[] = [
		{ label: 'Nuts', value: 'nuts' },
		{ label: 'Dairy', value: 'dairy' },
		{ label: 'Egg', value: 'egg' },
		{ label: 'Shellfish', value: 'shellfish' },
		{ label: 'Seafood', value: 'seafood' },
		{ label: 'Soy', value: 'soy' },
		{ label: 'Gluten', value: 'gluten' },
		{ label: 'Sesame', value: 'sesame' }
	];

	// Publish confirmation
	let showPublishConfirm = $state(false);
	let isPublishing = $state(false);
</script>

<svelte:head>
	<title>Menu Data - Lingua</title>
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
		<div class="flex gap-2">
			<!-- Publish button -->
			<button
				class="tap-target inline-flex items-center gap-2 rounded-lg bg-lingua-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
				onclick={() => (showPublishConfirm = true)}
				aria-label="Publish menu"
			>
				<Send size={16} />
				Publish
			</button>
			<select
				class="tap-target rounded-lg border border-lingua-border bg-white px-3 text-sm"
				value={selectedSlug}
				onchange={(event) => {
					const url = new URL(location.href);
					url.searchParams.set('restaurant', event.currentTarget.value);
					location.href = `${url.pathname}${url.search}`;
				}}
				aria-label="Restaurant"
			>
				{#each managedRestaurants as restaurant (restaurant.slug)}
					<option value={restaurant.slug}>{restaurant.name}</option>
				{/each}
			</select>
		</div>
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

		{#if filteredItems.length === 0}
			<div class="mt-8 py-12 text-center text-lingua-subtle">
				{search ? 'No items match your search.' : 'No menu items for this restaurant.'}
			</div>
		{:else}
			<div class="mt-4 overflow-x-auto">
				<table class="w-full min-w-190 text-left text-sm">
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
								<td class="py-3 pr-4 font-semibold text-lingua-primary"
									>{formatPrice(item.price)}</td
								>
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
									{#if item.isAvailable}
										<Badge
											label={item.confidence}
											tone={item.confidence === 'verified' ? 'success' : 'warning'}
										/>
									{:else}
										<Badge label="Sold out" tone="danger" />
									{/if}
								</td>
								<td class="py-3">
									<div class="flex gap-2">
										<!-- Toggle availability -->
										<form method="POST" action="?/toggleAvailability" class="contents" use:enhance>
											<input type="hidden" name="itemId" value={item.id} />
											<input type="hidden" name="restaurant" value={selectedSlug} />
											<input
												type="hidden"
												name="isAvailable"
												value={item.isAvailable ? 'false' : 'true'}
											/>
											<button
												type="submit"
												class="rounded-md border p-2 {item.isAvailable
													? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
													: 'border-green-200 bg-green-50 text-green-600 hover:bg-green-100'}"
												aria-label={item.isAvailable ? 'Mark sold out' : 'Mark available'}
												title={item.isAvailable ? 'Mark sold out' : 'Mark available'}
											>
												{#if item.isAvailable}
													<X size={16} />
												{:else}
													<Check size={16} />
												{/if}
											</button>
										</form>

										<!-- Edit -->
										<button
											class="rounded-md border border-lingua-border p-2"
											aria-label="Edit item"
											onclick={() => openEditDrawer(item)}
										>
											<Pencil size={16} />
										</button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</section>

<!-- Edit Drawer (slide-in from right) -->
{#if editingItem && editForm}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-40 bg-black/30"
		onclick={closeEditDrawer}
		onkeydown={(e) => e.key === 'Escape' && closeEditDrawer()}
		role="presentation"
	></div>

	<!-- Drawer panel -->
	<div class="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto bg-white shadow-xl">
		<div class="flex items-center justify-between border-b border-lingua-border p-4">
			<h3 class="text-lg font-semibold">Edit item</h3>
			<button
				class="rounded-md p-1 hover:bg-slate-100"
				onclick={closeEditDrawer}
				aria-label="Close"
			>
				<X size={20} />
			</button>
		</div>

		<form
			method="POST"
			action="?/edit"
			class="grid gap-4 p-4"
			use:enhance={() => {
				isSubmitting = true;
				return async ({ result, update }) => {
					if (result.type === 'success') {
						closeEditDrawer();
					}
					isSubmitting = false;
					await update();
				};
			}}
		>
			<input type="hidden" name="itemId" value={editingItem.id} />
			<input type="hidden" name="restaurant" value={selectedSlug} />

			<!-- Dietary flags (comma-separated for form transport) -->
			<input type="hidden" name="dietaryFlags" value={editForm.dietaryFlags.join(',')} />
			<!-- Allergens (comma-separated for form transport) -->
			<input type="hidden" name="allergens" value={editForm.allergens.join(',')} />

			<div>
				<label for="edit-name" class="mb-1 block text-sm font-medium text-lingua-text">Name</label>
				<input
					id="edit-name"
					name="name"
					class="tap-target w-full rounded-lg border border-lingua-border px-3 py-2 text-sm"
					required
					maxlength="200"
					bind:value={editForm.name}
				/>
			</div>

			<div>
				<label for="edit-localName" class="mb-1 block text-sm font-medium text-lingua-text"
					>Local name</label
				>
				<input
					id="edit-localName"
					name="localName"
					class="tap-target w-full rounded-lg border border-lingua-border px-3 py-2 text-sm"
					maxlength="200"
					bind:value={editForm.localName}
				/>
			</div>

			<div>
				<label for="edit-description" class="mb-1 block text-sm font-medium text-lingua-text"
					>Description</label
				>
				<textarea
					id="edit-description"
					name="description"
					class="tap-target w-full rounded-lg border border-lingua-border px-3 py-2 text-sm"
					rows="3"
					maxlength="1000"
					bind:value={editForm.description}
				></textarea>
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div>
					<label for="edit-price" class="mb-1 block text-sm font-medium text-lingua-text"
						>Price (IDR)</label
					>
					<input
						id="edit-price"
						name="price"
						type="number"
						min="0"
						max="10000000"
						class="tap-target w-full rounded-lg border border-lingua-border px-3 py-2 text-sm"
						bind:value={editForm.price}
					/>
				</div>
				<div>
					<label for="edit-spiceLevel" class="mb-1 block text-sm font-medium text-lingua-text">
						Spice: {spiceLabel(editForm.spiceLevel as MenuItem['spiceLevel'])}
					</label>
					<input
						id="edit-spiceLevel"
						name="spiceLevel"
						type="range"
						min="0"
						max="5"
						class="mt-2 w-full"
						bind:value={editForm.spiceLevel}
					/>
				</div>
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div>
					<label for="edit-confidence" class="mb-1 block text-sm font-medium text-lingua-text"
						>Confidence</label
					>
					<select
						id="edit-confidence"
						name="confidence"
						class="tap-target w-full rounded-lg border border-lingua-border px-3 py-2 text-sm"
						bind:value={editForm.confidence}
					>
						<option value="verified">Verified</option>
						<option value="needs-review">Needs review</option>
						<option value="staff-confirm">Staff confirm</option>
					</select>
				</div>
				<div class="flex items-center gap-2">
					<label class="mb-1 block text-sm font-medium text-lingua-text">Available</label>
					<button
						type="button"
						class={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${editForm.isAvailable ? 'bg-green-500' : 'bg-slate-300'}`}
						onclick={() => (editForm!.isAvailable = !editForm!.isAvailable)}
						role="switch"
						aria-checked={editForm.isAvailable}
					>
						<span
							class={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${editForm.isAvailable ? 'translate-x-6' : 'translate-x-1'}`}
						></span>
					</button>
					<input type="hidden" name="isAvailable" value={editForm.isAvailable ? 'true' : 'false'} />
				</div>
			</div>

			<!-- Dietary flags chips -->
			<fieldset>
				<legend class="mb-2 text-sm font-medium text-lingua-text">Dietary flags</legend>
				<div class="flex flex-wrap gap-2">
					{#each dietaryOptions as option (option.value)}
						<button
							type="button"
							class={`tap-target inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
								editForm.dietaryFlags.includes(option.value)
									? 'border-lingua-primary bg-lingua-primary text-white'
									: 'border-lingua-border bg-white text-lingua-text'
							}`}
							onclick={() => toggleEditFlag(option.value, 'dietaryFlags')}
							aria-pressed={editForm.dietaryFlags.includes(option.value)}
						>
							{#if editForm.dietaryFlags.includes(option.value)}
								<Check size={12} />
							{/if}
							{option.label}
						</button>
					{/each}
				</div>
			</fieldset>

			<!-- Allergen chips -->
			<fieldset>
				<legend class="mb-2 text-sm font-medium text-lingua-text">Allergens</legend>
				<div class="flex flex-wrap gap-2">
					{#each allergenOptions as option (option.value)}
						<button
							type="button"
							class={`tap-target inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
								editForm.allergens.includes(option.value)
									? 'border-orange-300 bg-orange-50 text-orange-800'
									: 'border-lingua-border bg-white text-lingua-text'
							}`}
							onclick={() => toggleEditFlag(option.value, 'allergens')}
							aria-pressed={editForm.allergens.includes(option.value)}
						>
							{#if editForm.allergens.includes(option.value)}
								<Check size={12} />
							{/if}
							{option.label}
						</button>
					{/each}
				</div>
			</fieldset>

			<div class="flex gap-3 pt-2">
				<button
					type="submit"
					class="tap-target inline-flex items-center gap-2 rounded-lg bg-lingua-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
					disabled={isSubmitting}
				>
					{#if isSubmitting}
						<Loader2 size={16} class="animate-spin" />
					{:else}
						<Check size={16} />
					{/if}
					Save changes
				</button>
				<button
					type="button"
					class="rounded-lg border border-lingua-border px-4 py-2 text-sm font-semibold text-lingua-text transition hover:bg-slate-50"
					onclick={closeEditDrawer}
				>
					Cancel
				</button>
			</div>
		</form>
	</div>
{/if}

<!-- Publish confirmation modal -->
{#if showPublishConfirm}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-40 bg-black/30"
		onclick={() => (showPublishConfirm = false)}
		role="presentation"
	></div>

	<div
		class="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl"
	>
		<h3 class="text-lg font-semibold">Publish menu?</h3>
		<p class="mt-2 text-sm text-lingua-subtle">
			This will make the current draft menu live for guests at {selectedRestaurant.name}. The
			previously published menu will be archived.
		</p>

		{#if form?.publishIssues && form.publishIssues.length > 0}
			<div class="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
				<div class="flex items-center gap-2 text-amber-800">
					<AlertTriangle size={16} />
					<span class="text-sm font-semibold">Publish blocked</span>
				</div>
				<ul class="mt-2 list-disc pl-5 text-sm text-amber-700">
					{#each form.publishIssues as issue (issue.itemId)}
						<li>
							{issue.itemName}: {issue.issues.join(', ')}
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		<form
			method="POST"
			action="?/publish"
			class="mt-4 flex justify-end gap-3"
			use:enhance={() => {
				isPublishing = true;
				return async ({ result, update }) => {
					isPublishing = false;
					if (result.type === 'success') {
						showPublishConfirm = false;
					}
					await update();
				};
			}}
		>
			<input type="hidden" name="restaurant" value={selectedSlug} />
			<button
				type="button"
				class="rounded-lg border border-lingua-border px-4 py-2 text-sm font-semibold text-lingua-text transition hover:bg-slate-50"
				onclick={() => (showPublishConfirm = false)}
			>
				Cancel
			</button>
			<button
				type="submit"
				class="tap-target inline-flex items-center gap-2 rounded-lg bg-lingua-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
				disabled={isPublishing}
			>
				{#if isPublishing}
					<Loader2 size={16} class="animate-spin" />
				{:else}
					<Send size={16} />
				{/if}
				Publish now
			</button>
		</form>
	</div>
{/if}
