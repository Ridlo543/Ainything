<script lang="ts">
	import { enhance } from '$app/forms';
	import Badge from '$lib/ui/primitives/Badge.svelte';

	let { data, form } = $props();

	const r = $derived(data.restaurant);

	const statusTone = (s: string): 'success' | 'warning' | 'neutral' => {
		if (s === 'active') return 'success';
		if (s === 'paused') return 'warning';
		return 'neutral';
	};

	let optimisticStatus = $state('');
	$effect(() => { optimisticStatus = r.status; });

	const segmentLabel: Record<string, string> = {
		'casual-dining': 'Casual Dining',
		'fine-dining': 'Fine Dining',
		'cafe': 'Cafe',
		'fast-food': 'Fast Food',
		'premium': 'Premium'
	};
</script>

<svelte:head>
	<title>{r.name} - Restaurants - Platform Admin - Lingua</title>
</svelte:head>

<div class="space-y-8">
	<!-- Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
		<div>
			<a href="/platform/restaurants" class="text-sm text-slate-500 hover:text-slate-700">
				&larr; Restaurants
			</a>
			<h1 class="mt-2 text-2xl font-bold text-slate-900">{r.name}</h1>
			<p class="mt-1 text-sm text-slate-500">
				{r.slug} &middot;
				<a
					href="/platform/organizations/{r.organizationSlug}"
					class="hover:text-blue-600"
				>
					{r.organizationName}
				</a>
			</p>
		</div>
		<Badge label={optimisticStatus} tone={statusTone(optimisticStatus)} shape="pill" />
	</div>

	<!-- Error banner -->
	{#if form?.error}
		<div class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
			{form.error}
		</div>
	{/if}

	<!-- Detail grid -->
	<dl class="grid grid-cols-2 gap-4 sm:grid-cols-3">
		<div class="rounded-lg border border-slate-200 bg-white p-4">
			<dt class="text-xs font-medium uppercase tracking-wide text-slate-500">Segment</dt>
			<dd class="mt-1 text-sm font-medium text-slate-900">{segmentLabel[r.segment] ?? r.segment}</dd>
		</div>
		<div class="rounded-lg border border-slate-200 bg-white p-4">
			<dt class="text-xs font-medium uppercase tracking-wide text-slate-500">Tables</dt>
			<dd class="mt-1 text-2xl font-semibold text-slate-900">{r.tableCount}</dd>
		</div>
		<div class="rounded-lg border border-slate-200 bg-white p-4">
			<dt class="text-xs font-medium uppercase tracking-wide text-slate-500">Location</dt>
			<dd class="mt-1 text-sm font-medium text-slate-700">{r.location || '—'}</dd>
		</div>
		<div class="rounded-lg border border-slate-200 bg-white p-4">
			<dt class="text-xs font-medium uppercase tracking-wide text-slate-500">Language</dt>
			<dd class="mt-1 text-sm font-medium text-slate-700">{r.defaultLanguageTag}</dd>
		</div>
		<div class="rounded-lg border border-slate-200 bg-white p-4">
			<dt class="text-xs font-medium uppercase tracking-wide text-slate-500">Timezone</dt>
			<dd class="mt-1 text-sm font-medium text-slate-700">{r.timezone}</dd>
		</div>
		<div class="rounded-lg border border-slate-200 bg-white p-4">
			<dt class="text-xs font-medium uppercase tracking-wide text-slate-500">Created</dt>
			<dd class="mt-1 text-sm font-medium text-slate-700">
				{new Date(r.createdAt).toLocaleDateString()}
			</dd>
		</div>
	</dl>

	<!-- Status actions -->
	<div class="rounded-lg border border-slate-200 bg-white p-6">
		<h2 class="text-base font-semibold text-slate-900">Status controls</h2>
		<p class="mt-1 text-sm text-slate-500">
			Suspending a restaurant removes it from the guest-facing QR experience.
		</p>
		<div class="mt-4 flex flex-wrap gap-3">
			{#each ['active', 'paused', 'archived'] as s}
				{@const isCurrent = optimisticStatus === s}
				<form
					method="POST"
					action="?/setStatus"
					use:enhance={({ formData }) => {
						optimisticStatus = formData.get('status') as string;
						return async ({ update }) => update({ reset: false });
					}}
				>
					<input type="hidden" name="restaurantId" value={r.id} />
					<input type="hidden" name="status" value={s} />
					<button
						type="submit"
						disabled={isCurrent}
						class="rounded-md border px-4 py-2 text-sm font-medium transition-colors
							{isCurrent
								? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
								: 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}
							{s === 'archived' && !isCurrent ? 'hover:border-red-300 hover:text-red-700' : ''}"
					>
						{#if s === 'active'}Activate{:else if s === 'paused'}Suspend{:else}Archive{/if}
					</button>
				</form>
			{/each}
		</div>
	</div>
</div>
