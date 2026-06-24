<script lang="ts">
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import Badge from '$lib/ui/primitives/Badge.svelte';
	import EmptyState from '$lib/ui/EmptyState.svelte';

	let { data, form } = $props();

	const org = $derived(data.organization);

	const statusTone = (s: string): 'success' | 'warning' | 'neutral' => {
		if (s === 'active') return 'success';
		if (s === 'paused') return 'warning';
		return 'neutral';
	};

	const planTone = (p: string): 'success' | 'warning' | 'neutral' => {
		if (p === 'pro' || p === 'enterprise') return 'success';
		if (p === 'starter') return 'warning';
		return 'neutral';
	};

	// Optimistic status — update immediately on form submission, revert on error.
	let optimisticStatus = $state(org.status);
</script>

<svelte:head>
	<title>{org.name} - Organizations - Platform Admin - Lingua</title>
</svelte:head>

<div class="space-y-8">
	<!-- Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
		<div>
			<a
				href={resolve('/platform/organizations')}
				class="text-sm text-slate-500 hover:text-slate-700"
			>
				&larr; Organizations
			</a>
			<h1 class="mt-2 text-2xl font-bold text-slate-900">{org.name}</h1>
			<p class="mt-1 text-sm text-slate-500">{org.slug}</p>
		</div>
		<div class="flex items-center gap-2">
			<Badge label={optimisticStatus} tone={statusTone(optimisticStatus)} shape="pill" />
			<Badge label={org.plan} tone={planTone(org.plan)} shape="pill" />
		</div>
	</div>

	<!-- Error banner -->
	{#if form?.error}
		<div class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
			{form.error}
		</div>
	{/if}

	<!-- Stats -->
	<dl class="grid grid-cols-2 gap-4 sm:grid-cols-4">
		<div class="rounded-lg border border-slate-200 bg-white p-4">
			<dt class="text-xs font-medium uppercase tracking-wide text-slate-500">Restaurants</dt>
			<dd class="mt-1 text-2xl font-semibold text-slate-900">{org.restaurantCount}</dd>
		</div>
		<div class="rounded-lg border border-slate-200 bg-white p-4">
			<dt class="text-xs font-medium uppercase tracking-wide text-slate-500">Members</dt>
			<dd class="mt-1 text-2xl font-semibold text-slate-900">{org.userCount}</dd>
		</div>
		<div class="rounded-lg border border-slate-200 bg-white p-4">
			<dt class="text-xs font-medium uppercase tracking-wide text-slate-500">Workspace</dt>
			<dd class="mt-1 truncate text-sm font-medium text-slate-700">{org.workspaceHost || '—'}</dd>
		</div>
		<div class="rounded-lg border border-slate-200 bg-white p-4">
			<dt class="text-xs font-medium uppercase tracking-wide text-slate-500">Created</dt>
			<dd class="mt-1 text-sm font-medium text-slate-700">
				{new Date(org.createdAt).toLocaleDateString()}
			</dd>
		</div>
	</dl>

	<!-- Status actions -->
	<div class="rounded-lg border border-slate-200 bg-white p-6">
		<h2 class="text-base font-semibold text-slate-900">Status controls</h2>
		<p class="mt-1 text-sm text-slate-500">
			Suspending an organization hides it from active tenants. Archiving is permanent.
		</p>
		<div class="mt-4 flex flex-wrap gap-3">
			{#each ['active', 'paused', 'archived'] as s (s)}
				{@const isCurrent = optimisticStatus === s}
				<form
					method="POST"
					action="?/setStatus"
					use:enhance={({ formData }) => {
						optimisticStatus = formData.get('status') as string;
						return async ({ update }) => update({ reset: false });
					}}
				>
					<input type="hidden" name="organizationId" value={org.id} />
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

	<!-- Restaurants in this org -->
	<div>
		<h2 class="text-base font-semibold text-slate-900">Restaurants</h2>
		{#if data.restaurants.length === 0}
			<div class="mt-4"><EmptyState title="No restaurants in this organization." /></div>
		{:else}
			<ul class="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
				{#each data.restaurants as r (r.id)}
					<li class="flex items-center justify-between px-4 py-3">
						<div>
							<a
								href={'/platform/restaurants/' + r.slug}
								class="text-sm font-medium text-slate-900 hover:text-blue-600"
							>
								{r.name}
							</a>
							<p class="text-xs text-slate-500">{r.slug} &middot; {r.segment}</p>
						</div>
						<div class="flex items-center gap-3">
							<span class="text-xs text-slate-500">{r.tableCount} tables</span>
							<Badge
								label={r.status}
								tone={r.status === 'active'
									? 'success'
									: r.status === 'paused'
										? 'warning'
										: 'neutral'}
								shape="pill"
							/>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
