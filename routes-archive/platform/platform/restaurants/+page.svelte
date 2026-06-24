<script lang="ts">
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import Badge from '$lib/ui/primitives/Badge.svelte';

	let { data } = $props();

	const STATUS_OPTIONS = [
		{ value: 'all', label: 'All statuses' },
		{ value: 'active', label: 'Active' },
		{ value: 'paused', label: 'Paused' },
		{ value: 'archived', label: 'Archived' }
	];

	const statusTone = (status: string): 'success' | 'warning' | 'neutral' => {
		if (status === 'active') return 'success';
		if (status === 'paused') return 'warning';
		return 'neutral';
	};
</script>

<svelte:head>
	<title>Restaurants - Platform Admin - Lingua</title>
</svelte:head>

<div>
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold text-slate-900">Restaurants</h1>
			<p class="mt-1 text-sm text-slate-500">
				Restaurant records created from approved onboarding data.
			</p>
		</div>
		<!-- Status filter -->
		<div class="flex items-center gap-2">
			<label for="rest-status-filter" class="text-sm font-medium text-slate-600">Status</label>
			<select
				id="rest-status-filter"
				value={data.status}
				onchange={(e) => {
					const val = (e.currentTarget as HTMLSelectElement).value;
					const params = new SvelteURLSearchParams(window.location.search);
					if (val === 'all') params.delete('status');
					else params.set('status', val);
					params.delete('offset');
					window.location.href = `/platform/restaurants?${params.toString()}`;
				}}
				class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
			>
				{#each STATUS_OPTIONS as opt (opt.value)}
					<option value={opt.value}>{opt.label}</option>
				{/each}
			</select>
		</div>
	</div>

	<!-- Table -->
	<div class="mt-6 overflow-x-auto rounded-lg border border-slate-200">
		{#if data.restaurants.length === 0}
			<p class="px-4 py-8 text-center text-sm text-muted-foreground">No restaurants found for this page.</p>
		{:else}
			<table class="min-w-full divide-y divide-slate-200 bg-white text-sm">
				<thead class="bg-slate-50">
					<tr>
						<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Name</th>
						<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Slug</th>
						<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Segment</th>
						<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Organization</th>
						<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Status</th>
						<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Tables</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100">
					{#each data.restaurants as item (item.id)}
						<tr class="hover:bg-slate-50">
							<td class="px-4 py-3">
								<a href={'/platform/restaurants/' + item.slug} class="font-medium text-slate-900 hover:text-blue-600">{item.name}</a>
							</td>
							<td class="px-4 py-3 text-slate-600">{item.slug}</td>
							<td class="px-4 py-3 text-slate-600">{item.segment}</td>
							<td class="px-4 py-3 text-slate-600">{item.organizationName}</td>
							<td class="px-4 py-3">
								<Badge label={item.status} tone={statusTone(item.status)} shape="pill" />
							</td>
							<td class="px-4 py-3 text-slate-600">{item.tableCount}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>

	<!-- Pagination -->
	<div class="mt-4 flex items-center justify-between text-sm">
		<span class="text-slate-500">Showing {data.restaurants.length} results</span>
		<div class="flex gap-2">
			{#if data.offset > 0}
				<a
					href={`/platform/restaurants?offset=${Math.max(0, data.offset - 50)}${data.status && data.status !== 'all' ? `&status=${data.status}` : ''}`}
					class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50"
				>
					&larr; Previous
				</a>
			{/if}
			{#if data.restaurants.length === 50}
				<a
					href={`/platform/restaurants?offset=${data.offset + 50}${data.status && data.status !== 'all' ? `&status=${data.status}` : ''}`}
					class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50"
				>
					Next &rarr;
				</a>
			{/if}
		</div>
	</div>
</div>
