<script lang="ts">
	import { CheckCircle2, Clock3, Store, UserRoundCheck, RefreshCw } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';
	import type { StaffRequest } from '$lib/domain/fallback/types';
	import StaffRequestCard from '$lib/ui/staff/StaffRequestCard.svelte';
	import { t, tWithVars } from '$lib/i18n/translations.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const scopedRestaurants = $derived(data.tenant.restaurants);

	// eslint-disable-next-line svelte/prefer-writable-derived -- requests is mutated by SSE events and optimistic form updates
	// svelte-ignore state_referenced_locally -- intentional: initial value only, $effect below handles reactivity
	let requests = $state<StaffRequest[]>(data.requests ?? []);
	$effect(() => {
		requests = data.requests ?? [];
	});

	// selectedId tracks which request is selected. It starts empty and falls back
	// to the first request automatically via the `selected` derived below.
	let selectedId = $state('');
	const selected = $derived(
		requests.find((r) => r.id === selectedId) ?? requests[0]
	);
	const restaurant = $derived(
		selected
			? (scopedRestaurants.find((item) => item.id === selected.restaurantId) ??
					data.tenant.activeRestaurant)
			: data.tenant.activeRestaurant
	);
	const organization = $derived(data.tenant.organization);

	function applyLocalStatusUpdate(requestId: string, newStatus: StaffRequest['status']) {
		requests = requests.map((r) => (r.id === requestId ? { ...r, status: newStatus } : r));
	}

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
				const matchingRestaurant = scopedRestaurants.find((r) => r.id === payload.restaurantId);
				if (!matchingRestaurant) return;
				if (requests.some((r) => r.id === payload.fallbackId)) return;
				const newRequest: StaffRequest = {
					id: payload.fallbackId,
					restaurantId: payload.restaurantId,
					restaurantSlug: matchingRestaurant.slug,
					restaurantName: matchingRestaurant.name,
					tableId: payload.tableId,
					tableCode: '',
					language: payload.languageTag as StaffRequest['language'],
					status: 'new',
					priority: payload.priority,
					guestNeed: payload.guestNeed,
					summary: payload.summary,
					lastMessageAt: new Date().toISOString()
				};
				requests = [newRequest, ...requests];
				invalidateAll();
			} catch {
				/* malformed payload */
			}
		});
		es.addEventListener('error', () => {
			sseConnected = false;
			sseError = true;
		});
		return () => {
			es.close();
			sseConnected = false;
		};
	});
</script>

<svelte:head>
	<title>{t('staff.inbox.title')}</title>
</svelte:head>

<main class="min-h-screen py-5">
	<div class="app-container grid gap-5 lg:grid-cols-[390px_1fr]">
		<!-- Left column: request list -->
		<section class="grid content-start gap-4">
			<div class="surface rounded-lg p-4">
				<div class="flex items-center gap-3">
					<span class="rounded-lg bg-lingua-primary-soft p-3 text-lingua-primary">
						<UserRoundCheck size={25} />
					</span>
					<div class="flex-1">
						<p class="text-sm font-semibold text-lingua-primary">{t('staff.inbox.workflow')}</p>
						<h1 class="text-2xl font-semibold">{t('staff.inbox.heading')}</h1>
					</div>
					{#if sseConnected}
						<span
							title={t('staff.inbox.liveConnected')}
							class="h-2 w-2 rounded-full bg-lingua-success"
						></span>
					{:else if sseError}
						<span
							title={t('staff.inbox.liveRetrying')}
							class="h-2 w-2 rounded-full bg-lingua-warning"
						></span>
					{/if}
				</div>
				<p class="mt-3 text-sm leading-6 text-lingua-subtle">{t('staff.inbox.description')}</p>
			</div>

			{#if form && 'message' in form && form.message}
				<div class="rounded-lg border border-lingua-danger/30 bg-lingua-danger-soft px-4 py-3 text-sm text-lingua-danger">
					{form.message}
				</div>
			{/if}

			{#if requests.length === 0}
				<div
					class="rounded-lg border border-lingua-border bg-lingua-surface p-6 text-center text-lingua-subtle"
				>
					<CheckCircle2 class="mx-auto mb-2 text-lingua-success" size={32} />
					<p class="font-semibold">{t('staff.inbox.allClear')}</p>
					<p class="mt-1 text-sm">{t('staff.inbox.allClear.detail')}</p>
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

		<!-- Right column: request detail -->
		<section class="surface rounded-lg p-5">
			{#if selected}
				<div
					class="flex flex-col justify-between gap-4 border-b border-lingua-border pb-4 sm:flex-row sm:items-start"
				>
					<div>
						<p class="text-sm text-lingua-subtle">{organization.name}</p>
						<h2 class="mt-1 text-3xl font-semibold text-lingua-text">{restaurant.name}</h2>
						<p class="mt-2 text-lingua-subtle">
							{#if selected.tableCode}{tWithVars('staff.inbox.table', {
									code: selected.tableCode
								})}{/if}
							{selected.guestNeed}
						</p>
					</div>
				<div class="rounded-lg bg-lingua-warning-soft px-3 py-2 text-sm font-semibold text-lingua-warning">
					{tWithVars('staff.inbox.detail.priority', { priority: selected.priority })}
				</div>
				</div>

				<div class="mt-5 grid gap-4 lg:grid-cols-3">
					<div class="rounded-lg border border-lingua-border bg-lingua-surface p-4">
						<Clock3 class="text-lingua-info" size={22} />
						<p class="mt-3 text-sm text-lingua-subtle">{t('staff.inbox.detail.lastMessage')}</p>
						<p class="font-semibold">{selected.lastMessageAt}</p>
					</div>
					<div class="rounded-lg border border-lingua-border bg-lingua-surface p-4">
						<UserRoundCheck class="text-lingua-primary" size={22} />
						<p class="mt-3 text-sm text-lingua-subtle">{t('staff.inbox.detail.language')}</p>
						<p class="font-semibold">{selected.language}</p>
					</div>
					<div class="rounded-lg border border-lingua-border bg-lingua-surface p-4">
						<CheckCircle2 class="text-lingua-success" size={22} />
						<p class="mt-3 text-sm text-lingua-subtle">{t('staff.inbox.detail.status')}</p>
						<p class="font-semibold">{selected.status}</p>
					</div>
				</div>

				<div class="mt-5 rounded-lg border border-lingua-border bg-lingua-muted p-4">
					<div class="flex items-center gap-2">
						<Store class="text-lingua-primary" size={20} />
						<p class="font-semibold">{t('staff.inbox.detail.summary')}</p>
					</div>
					<p class="mt-2 leading-7 text-lingua-subtle">{selected.summary}</p>
				</div>

				<div class="mt-5 grid gap-3 sm:grid-cols-3">
					{#if selected.status === 'new'}
						<form
							method="POST"
							action="?/claim"
							use:enhance={() => {
								applyLocalStatusUpdate(selected.id, 'in-progress');
								return async ({ result, update }) => {
									if (result.type === 'failure') applyLocalStatusUpdate(selected.id, 'new');
									await update();
								};
							}}
						>
							<input type="hidden" name="requestId" value={selected.id} />
							<input type="hidden" name="restaurantId" value={selected.restaurantId} />
							<button
								type="submit"
								class="tap-target w-full rounded-lg border border-lingua-border bg-lingua-surface px-4 text-sm font-semibold"
							>
								{t('staff.inbox.action.claim')}
							</button>
						</form>
					{:else}
						<button
							type="button"
							disabled
							class="tap-target w-full rounded-lg border border-lingua-border bg-lingua-surface px-4 text-sm font-semibold opacity-40"
						>
							{t('staff.inbox.action.claim')}
						</button>
					{/if}

					{#if selected.status === 'new' || selected.status === 'in-progress'}
						<form
							method="POST"
							action="?/resolve"
							use:enhance={() => {
								applyLocalStatusUpdate(selected.id, 'resolved');
								return async ({ result, update }) => {
									if (result.type === 'failure')
										applyLocalStatusUpdate(selected.id, selected.status);
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
								{t('staff.inbox.action.resolve')}
							</button>
						</form>
					{:else}
						<button
							type="button"
							disabled
							class="tap-target w-full rounded-lg bg-lingua-primary px-4 text-sm font-semibold text-white opacity-40"
						>
							{t('staff.inbox.action.resolve')}
						</button>
					{/if}

					<a
						class="tap-target inline-flex items-center justify-center rounded-lg border border-lingua-border bg-lingua-surface px-4 text-sm font-semibold"
						href={resolve(`/r/${restaurant.slug}/table/${selected.tableCode || '01'}`)}
					>
						{t('staff.inbox.action.guestView')}
					</a>
				</div>
			{:else}
				<div
					class="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 text-lingua-subtle"
				>
					<RefreshCw size={28} />
					<p class="text-sm">{t('staff.inbox.empty.detail')}</p>
				</div>
			{/if}
		</section>
	</div>
</main>
