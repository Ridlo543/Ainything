<script lang="ts">
	import {
		BookOpenText,
		Plus,
		Pencil,
		Trash2,
		X,
		Save,
		RefreshCw,
		Check,
		AlertTriangle
	} from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import { t } from '$lib/i18n/translations.svelte';
	import type { PageData } from './$types';
	import type { KnowledgeDoc } from '$lib/domain/knowledge/types';
	import Badge from '$lib/ui/primitives/Badge.svelte';

	let {
		data,
		form
	}: {
		data: PageData;
		form?: {
			success?: boolean;
			action?: string;
			message?: string;
			validation?: Record<string, string[]>;
		};
	} = $props();

	const organization = $derived(data.tenant.organization);
	const restaurants = $derived(data.tenant.restaurants);
	const activeRestaurant = $derived(data.tenant.activeRestaurant);
	const docs = $derived<KnowledgeDoc[]>(data.docs);
	const useMockData = $derived(data.useMockData);

	// Edit drawer state — null = closed, otherwise the doc being edited.
	let editing = $state<KnowledgeDoc | null>(null);
	let creating = $state(false);

	// Re-index button state (already implemented in earlier session).
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

	function openCreate() {
		creating = true;
		editing = null;
	}

	function openEdit(doc: KnowledgeDoc) {
		editing = doc;
		creating = false;
	}

	function closeForms() {
		editing = null;
		creating = false;
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
				onclick={openCreate}
				disabled={creating || editing !== null}
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

	{#if form?.message}
		<div
			class="rounded-lg border px-4 py-3 text-sm"
			class:border-green-300={form.success}
			class:bg-green-50={form.success}
			class:text-green-800={form.success}
			class:border-red-300={!form.success && form.message}
			class:bg-red-50={!form.success && form.message}
			class:text-red-800={!form.success && form.message}
		>
			{form.message}
		</div>
	{/if}

	{#if creating}
		<article class="surface rounded-lg p-4">
			<header class="mb-3 flex items-center justify-between gap-2">
				<h2 class="font-semibold text-lingua-text">{t('knowledge.form.createTitle')}</h2>
				<button
					class="text-lingua-subtle hover:text-lingua-text"
					onclick={closeForms}
					aria-label={t('knowledge.form.cancel')}
				>
					<X size={18} />
				</button>
			</header>
			<form
				method="POST"
				action="?/addNote"
				use:enhance={() => {
					return ({ update }) => {
						update({ reset: true }).then(() => {
							creating = false;
						});
					};
				}}
				class="grid gap-3"
			>
				<input type="hidden" name="restaurant" value={activeRestaurant.slug} />
				<label class="grid gap-1 text-sm">
					<span class="font-medium text-lingua-text">{t('knowledge.form.title')}</span>
					<input
						type="text"
						name="title"
						required
						maxlength="200"
						class="rounded-lg border border-lingua-border bg-white px-3 py-2"
						placeholder={t('knowledge.form.titlePlaceholder')}
					/>
					{#if form?.validation?.title}
						<span class="text-xs text-red-600">{form.validation.title[0]}</span>
					{/if}
				</label>
				<label class="grid gap-1 text-sm">
					<span class="font-medium text-lingua-text">{t('knowledge.form.content')}</span>
					<textarea
						name="content"
						required
						maxlength="4000"
						rows="4"
						class="rounded-lg border border-lingua-border bg-white px-3 py-2"
						placeholder={t('knowledge.form.contentPlaceholder')}
					></textarea>
					{#if form?.validation?.content}
						<span class="text-xs text-red-600">{form.validation.content[0]}</span>
					{/if}
				</label>
				<div class="flex justify-end gap-2">
					<button
						type="button"
						class="rounded-lg border border-lingua-border bg-white px-3 py-2 text-sm font-semibold text-lingua-text"
						onclick={closeForms}
					>
						{t('knowledge.form.cancel')}
					</button>
					<button
						type="submit"
						class="inline-flex items-center gap-2 rounded-lg bg-lingua-primary px-4 py-2 text-sm font-semibold text-white"
					>
						<Save size={16} />
						{t('knowledge.form.save')}
					</button>
				</div>
			</form>
		</article>
	{/if}

	<div class="grid gap-4 lg:grid-cols-2">
		{#each docs as doc (doc.id)}
			<article class="surface flex flex-col gap-2 rounded-lg p-4">
				<header class="flex items-start justify-between gap-2">
					<div>
						<h2 class="font-semibold text-lingua-text">{doc.title}</h2>
						<p class="mt-0.5 text-[11px] text-lingua-subtle">
							{doc.visibility === 'published'
								? t('knowledge.visibility.published')
								: doc.visibility === 'internal'
									? t('knowledge.visibility.internal')
									: t('knowledge.visibility.draft')}
						</p>
					</div>
					<div class="flex gap-1">
						<button
							class="tap-target inline-flex items-center justify-center rounded-lg p-1.5 text-lingua-subtle hover:bg-lingua-primary-soft hover:text-lingua-primary"
							onclick={() => openEdit(doc)}
							aria-label={t('knowledge.editNote')}
						>
							<Pencil size={15} />
						</button>
						<form method="POST" action="?/deleteNote" use:enhance class="inline">
							<input type="hidden" name="restaurant" value={activeRestaurant.slug} />
							<input type="hidden" name="docId" value={doc.id} />
							<button
								type="submit"
								class="tap-target inline-flex items-center justify-center rounded-lg p-1.5 text-lingua-subtle hover:bg-red-50 hover:text-red-600"
								aria-label={t('knowledge.deleteNote')}
								onclick={(e) => {
									if (!confirm(t('knowledge.confirmDelete'))) {
										e.preventDefault();
									}
								}}
							>
								<Trash2 size={15} />
							</button>
						</form>
					</div>
				</header>
				<p class="whitespace-pre-line text-sm text-lingua-text">{doc.content}</p>
			</article>
		{/each}

		{#if editing}
			<article class="surface rounded-lg p-4">
				<header class="mb-3 flex items-center justify-between gap-2">
					<h2 class="font-semibold text-lingua-text">{t('knowledge.form.editTitle')}</h2>
					<button
						class="text-lingua-subtle hover:text-lingua-text"
						onclick={closeForms}
						aria-label={t('knowledge.form.cancel')}
					>
						<X size={18} />
					</button>
				</header>
				<form
					method="POST"
					action="?/updateNote"
					use:enhance={() => {
						return ({ update }) => {
							update().then(() => {
								editing = null;
							});
						};
					}}
					class="grid gap-3"
				>
					<input type="hidden" name="restaurant" value={activeRestaurant.slug} />
					<input type="hidden" name="docId" value={editing.id} />
					<label class="grid gap-1 text-sm">
						<span class="font-medium text-lingua-text">{t('knowledge.form.title')}</span>
						<input
							type="text"
							name="title"
							required
							maxlength="200"
							value={editing.title}
							class="rounded-lg border border-lingua-border bg-white px-3 py-2"
						/>
					</label>
					<label class="grid gap-1 text-sm">
						<span class="font-medium text-lingua-text">{t('knowledge.form.content')}</span>
						<textarea
							name="content"
							required
							maxlength="4000"
							rows="4"
							class="rounded-lg border border-lingua-border bg-white px-3 py-2"
							>{editing.content}</textarea
						>
					</label>
					<label class="grid gap-1 text-sm">
						<span class="font-medium text-lingua-text">{t('knowledge.form.visibility')}</span>
						<select
							name="visibility"
							class="rounded-lg border border-lingua-border bg-white px-3 py-2"
							value={editing.visibility}
						>
							<option value="published">{t('knowledge.visibility.published')}</option>
							<option value="draft">{t('knowledge.visibility.draft')}</option>
							<option value="internal">{t('knowledge.visibility.internal')}</option>
						</select>
					</label>
					<div class="flex justify-end gap-2">
						<button
							type="button"
							class="rounded-lg border border-lingua-border bg-white px-3 py-2 text-sm font-semibold text-lingua-text"
							onclick={closeForms}
						>
							{t('knowledge.form.cancel')}
						</button>
						<button
							type="submit"
							class="inline-flex items-center gap-2 rounded-lg bg-lingua-primary px-4 py-2 text-sm font-semibold text-white"
						>
							<Save size={16} />
							{t('knowledge.form.update')}
						</button>
					</div>
				</form>
			</article>
		{/if}

		{#each restaurants as restaurant (restaurant.id)}
			{#if restaurant.id === activeRestaurant.id && docs.length === 0 && !creating && !editing}
				<article class="surface col-span-full rounded-lg p-6 text-center">
					<span
						class="mx-auto inline-flex rounded-lg bg-lingua-primary-soft p-3 text-lingua-primary"
					>
						<BookOpenText size={22} />
					</span>
					<h2 class="mt-3 font-semibold text-lingua-text">
						{t('knowledge.empty.title')}
					</h2>
					<p class="mt-1 text-sm text-lingua-subtle">
						{useMockData ? t('knowledge.empty.mock') : t('knowledge.empty.db')}
					</p>
					<button
						class="mt-4 inline-flex items-center gap-2 rounded-lg bg-lingua-primary px-4 py-2 text-sm font-semibold text-white"
						onclick={openCreate}
					>
						<Plus size={16} />
						{t('knowledge.addNote')}
					</button>
				</article>
			{/if}
		{/each}
	</div>

	<aside
		class="surface flex flex-wrap items-center gap-2 rounded-lg p-3 text-xs text-lingua-subtle"
	>
		<span class="font-semibold text-lingua-text">{t('knowledge.tenantsLabel')}</span>
		{#each restaurants as restaurant (restaurant.id)}
			{#if restaurant.id === activeRestaurant.id}
				<Badge label={`${activeRestaurant.name} (active)`} tone="primary" />
			{:else}
				<Badge label={restaurant.name} tone="neutral" />
			{/if}
		{/each}
		<span class="ml-auto text-[11px]">{organization.name}</span>
	</aside>
</section>
