<script lang="ts">
	import { BookOpenText, Plus, RefreshCw, Check, AlertTriangle } from '@lucide/svelte';
	import { t } from '$lib/i18n/translations.svelte';
	import type { PageData } from './$types';
	import Badge from '$lib/ui/primitives/Badge.svelte';

	let { data }: { data: PageData } = $props();

	const organization = $derived(data.tenant.organization);
	const restaurants = $derived(data.tenant.restaurants);
	const activeRestaurant = $derived(data.tenant.activeRestaurant);

	// eslint-disable-next-line svelte/prefer-writable-derived
	let reindexState = $state<{
		loading: boolean;
		message: string;
		type: 'success' | 'error' | 'info';
	}>({ loading: false, message: '', type: 'info' });

	async function handleReindex() {
		reindexState = { loading: true, message: t('knowledge.reindex.loading'), type: 'info' };

		try {
			const res = await fetch('/api/admin/embeddings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ restaurantSlug: activeRestaurant.slug })
			});

			const body = await res.json();

			if (!res.ok) {
				reindexState = {
					loading: false,
					message: body.message || t('knowledge.reindex.error'),
					type: 'error'
				};
				return;
			}

			if (!body.embeddingEnabled) {
				reindexState = {
					loading: false,
					message: body.message || t('knowledge.reindex.disabled'),
					type: 'info'
				};
				return;
			}

			reindexState = { loading: false, message: body.message, type: 'success' };
		} catch {
			reindexState = {
				loading: false,
				message: t('knowledge.reindex.networkError'),
				type: 'error'
			};
		}
	}
</script>

<svelte:head>
	<title>{t('knowledge.title')}</title>
</svelte:head>

<section class="grid gap-5">
	<div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
		<div>
			<p class="text-sm font-semibold text-lingua-primary">{t('knowledge.heading')}</p>
			<h1 class="mt-2 text-3xl font-semibold">{t('knowledge.heading')}</h1>
			<p class="mt-2 text-lingua-subtle">
				{t('knowledge.description')}
			</p>
		</div>
		<div class="flex gap-2">
			<button
				class="tap-target inline-flex items-center justify-center gap-2 rounded-lg border border-lingua-border bg-white px-4 text-sm font-semibold text-lingua-text hover:bg-lingua-primary-soft disabled:opacity-50"
				onclick={handleReindex}
				disabled={reindexState.loading}
			>
				<RefreshCw size={17} class={reindexState.loading ? 'animate-spin' : ''} />
				{t('knowledge.reindex')}
			</button>
			<button
				class="tap-target inline-flex items-center justify-center gap-2 rounded-lg bg-lingua-primary px-4 text-sm font-semibold text-white"
			>
				<Plus size={17} />
				{t('knowledge.addNote')}
			</button>
		</div>
	</div>

	{#if reindexState.message}
		<div
			class="flex items-center gap-2 rounded-lg border px-4 py-3 text-sm"
			class:border-green-300={reindexState.type === 'success'}
			class:bg-green-50={reindexState.type === 'success'}
			class:text-green-800={reindexState.type === 'success'}
			class:border-amber-300={reindexState.type === 'info'}
			class:bg-amber-50={reindexState.type === 'info'}
			class:text-amber-800={reindexState.type === 'info'}
			class:border-red-300={reindexState.type === 'error'}
			class:bg-red-50={reindexState.type === 'error'}
			class:text-red-800={reindexState.type === 'error'}
		>
			{#if reindexState.type === 'success'}
				<Check size={16} />
			{:else if reindexState.type === 'error'}
				<AlertTriangle size={16} />
			{:else}
				<RefreshCw size={16} />
			{/if}
			{reindexState.message}
		</div>
	{/if}

	<div class="grid gap-4 lg:grid-cols-2">
		{#each restaurants as restaurant (restaurant.id)}
			<article class="surface rounded-lg p-4">
				<div class="flex items-start gap-3">
					<span class="rounded-lg bg-lingua-primary-soft p-2 text-lingua-primary">
						<BookOpenText size={22} />
					</span>
					<div>
						<h2 class="font-semibold text-lingua-text">{restaurant.name}</h2>
						<p class="mt-1 text-sm text-lingua-subtle">
							{organization.name} - {restaurant.location}
						</p>
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
