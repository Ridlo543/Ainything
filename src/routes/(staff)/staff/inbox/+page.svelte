<script lang="ts">
	import { CheckCircle2, Clock3, Store, UserRoundCheck, RefreshCw } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';
	import type { StaffRequest } from '$lib/domain/menu/types';
	import StaffRequestCard from '$lib/ui/staff/StaffRequestCard.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const scopedRestaurants = $derived(data.tenant.restaurants);

	// ---------------------------------------------------------------------------
	// Requests state — starts from server load data, updated optimistically on
	// SSE events and after form actions.
	// ---------------------------------------------------------------------------

	// eslint-disable-next-line svelte/prefer-writable-derived -- requests is mutated by SSE events and optimistic form updates
	let requests = $state<StaffRequest[]>(data.requests ?? []);

	// Keep in sync when SvelteKit re-runs the load (e.g. after invalidateAll)
	$effect(() => {
		requests = data.requests ?? [];
	});

	let selectedId = $state(requests[0]?.id ?? '');

	const selected = $derived(requests.find((r) => r.id === selectedId) ?? requests[0]);

	const restaurant = $derived(
		selected
			? (scopedRestaurants.find((item) => item.id === selected.restaurantId) ??
					data.tenant.activeRestaurant)
			: data.tenant.activeRestaurant
	);

	const organization = $derived(data.tenant.organization);

	// Optimistically update a request's status in local state
	function applyLocalStatusUpdate(requestId: string, newStatus: StaffRequest['status']) {
		requests = requests.map((r) => (r.id === requestId ? { ...r, status: newStatus } : r));
	}

	// ---------------------------------------------------------------------------
	// SSE — real-time new fallback events
	// ---------------------------------------------------------------------------

	let sseConnected = $state(false);
	let sseError = $state(false);

	$effect(() => {
		const es = new EventSource('/staff/inbox/events');

		es.addEventListener('open', () => {
			sseConnected = true;
			sseError = false;
		});

		es.addEventListener('fallback', (event) => {
			try {
				const payload = JSON.parse(event.data) as {
					fallbackId: string;
					restaurantId: string;
					tableId: string;
					languageTag: string;
					guestNeed: string;
					summary: string;
					priority: 'normal' | 'high';
					status: string;
				};

				// Only prepend if it belongs to one of the scoped restaurants
				const matchingRestaurant = scopedRestaurants.find((r) => r.id === payload.restaurantId);
				if (!matchingRestaurant) return;

				// Avoid duplicates (request may already exist from load)
				if (requests.some((r) => r.id === payload.fallbackId)) return;

				const newRequest: StaffRequest = {
					id: payload.fallbackId,
					restaurantId: payload.restaurantId,
					restaurantSlug: matchingRestaurant.slug,
					restaurantName: matchingRestaurant.name,
					tableId: payload.tableId,
					tableCode: '', // full details loaded on next invalidateAll
					language: payload.languageTag as StaffRequest['language'],
					status: 'new',
					priority: payload.priority,
					guestNeed: payload.guestNeed,
					summary: payload.summary,
					lastMessageAt: new Date().toISOString()
				};

				requests = [newRequest, ...requests];

				// Fetch full details from the server (includes tableCode etc.)
				invalidateAll();
			} catch {
				// Malformed payload — ignore
			}
		});

		es.addEventListener('error', () => {
			sseConnected = false;
			sseError = true;
			// EventSource will automatically retry — we just surface the indicator.
			// If the environment doesn't support long-lived connections the browser
			// will keep retrying; the user can also manually refresh the page.
		});

		return () => {
			es.close();
			sseConnected = false;
		};
	});
</script>

<svelte:head>
	<title>Staff Inbox - LinguaServe</title>
</svelte:head>

<main class="min-h-screen py-5">
	<div class="app-container grid gap-5 lg:grid-cols-[390px_1fr]">
		<!-- ------------------------------------------------------------------ -->
		<!-- Left column: request list -->
		<!-- ------------------------------------------------------------------ -->
		<section class="grid content-start gap-4">
			<div class="surface rounded-lg p-4">
				<div class="flex items-center gap-3">
					<span class="rounded-lg bg-lingua-primary-soft p-3 text-lingua-primary">
						<UserRoundCheck size={25} />
					</span>
					<div class="flex-1">
						<p class="text-sm font-semibold text-lingua-primary">Staff workflow</p>
						<h1 class="text-2xl font-semibold">Help requests</h1>
					</div>
					<!-- SSE indicator -->
					{#if sseConnected}
						<span title="Live updates connected" class="h-2 w-2 rounded-full bg-lingua-success"
						></span>
					{:else if sseError}
						<span
							title="Live updates unavailable — auto-retrying"
							class="h-2 w-2 rounded-full bg-lingua-warning"
						></span>
					{/if}
				</div>
				<p class="mt-3 text-sm leading-6 text-lingua-subtle">
					Each request is tied to one restaurant and table, so staff do not mix guests across
					tenants or locations.
				</p>
			</div>

			<!-- Form error banner -->
			{#if form && 'message' in form && form.message}
				<div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
					{form.message}
				</div>
			{/if}

			{#if requests.length === 0}
				<div
					class="rounded-lg border border-lingua-border bg-white p-6 text-center text-lingua-subtle"
				>
					<CheckCircle2 class="mx-auto mb-2 text-lingua-success" size={32} />
					<p class="font-semibold">All clear</p>
					<p class="mt-1 text-sm">No pending help requests right now.</p>
				</div>
			{:else}
				{#each requests as request (request.id)}
					<StaffRequestCard
						{request}
						restaurant={scopedRestaurants.find((item) => item.id === request.restaurantId) ??
							data.tenant.activeRestaurant}
						selected={selectedId === request.id}
						onclick={() => (selectedId = request.id)}
					/>
				{/each}
			{/if}
		</section>

		<!-- ------------------------------------------------------------------ -->
		<!-- Right column: request detail -->
		<!-- ------------------------------------------------------------------ -->
		<section class="surface rounded-lg p-5">
			{#if selected}
				<div
					class="flex flex-col justify-between gap-4 border-b border-lingua-border pb-4 sm:flex-row sm:items-start"
				>
					<div>
						<p class="text-sm text-lingua-subtle">{organization.name}</p>
						<h2 class="mt-1 text-3xl font-semibold text-lingua-text">{restaurant.name}</h2>
						<p class="mt-2 text-lingua-subtle">
							{#if selected.tableCode}Table {selected.tableCode} —{/if}
							{selected.guestNeed}
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

				<!-- Action buttons (form actions with progressive enhancement) -->
				<div class="mt-5 grid gap-3 sm:grid-cols-3">
					{#if selected.status === 'new'}
						<form
							method="POST"
							action="?/claim"
							use:enhance={() => {
								// Optimistic update
								applyLocalStatusUpdate(selected.id, 'in-progress');
								return async ({ result, update }) => {
									if (result.type === 'failure') {
										// Revert optimistic update on failure
										applyLocalStatusUpdate(selected.id, 'new');
									}
									await update();
								};
							}}
						>
							<input type="hidden" name="requestId" value={selected.id} />
							<input type="hidden" name="restaurantId" value={selected.restaurantId} />
							<button
								type="submit"
								class="tap-target w-full rounded-lg border border-lingua-border bg-white px-4 text-sm font-semibold"
							>
								Mark in progress
							</button>
						</form>
					{:else}
						<button
							type="button"
							disabled
							class="tap-target w-full rounded-lg border border-lingua-border bg-white px-4 text-sm font-semibold opacity-40"
						>
							Mark in progress
						</button>
					{/if}

					{#if selected.status === 'new' || selected.status === 'in-progress'}
						<form
							method="POST"
							action="?/resolve"
							use:enhance={() => {
								applyLocalStatusUpdate(selected.id, 'resolved');
								return async ({ result, update }) => {
									if (result.type === 'failure') {
										applyLocalStatusUpdate(selected.id, selected.status);
									}
									await update();
								};
							}}
						>
							<input type="hidden" name="requestId" value={selected.id} />
							<input type="hidden" name="restaurantId" value={selected.restaurantId} />
							<button
								type="submit"
								class="tap-target w-full rounded-lg bg-lingua-primary px-4 text-sm font-semibold text-white"
							>
								Resolve request
							</button>
						</form>
					{:else}
						<button
							type="button"
							disabled
							class="tap-target w-full rounded-lg bg-lingua-primary px-4 text-sm font-semibold text-white opacity-40"
						>
							Resolve request
						</button>
					{/if}

					<a
						class="tap-target inline-flex items-center justify-center rounded-lg border border-lingua-border bg-white px-4 text-sm font-semibold"
						href={resolve(`/r/${restaurant.slug}/table/${selected.tableCode || '01'}`)}
					>
						Open guest view
					</a>
				</div>
			{:else}
				<!-- Empty state for detail panel -->
				<div
					class="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 text-lingua-subtle"
				>
					<RefreshCw size={28} />
					<p class="text-sm">Select a request to view details.</p>
				</div>
			{/if}
		</section>
	</div>
</main>
