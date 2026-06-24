<script lang="ts">
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import DataTable from '$lib/ui/DataTable.svelte';
	import Pagination from '$lib/ui/Pagination.svelte';
	import EmptyState from '$lib/ui/EmptyState.svelte';
	import Badge from '$lib/ui/primitives/Badge.svelte';

	let { data } = $props();

	const STATUS_OPTIONS = [
		{ value: 'all', label: 'All statuses' },
		{ value: 'active', label: 'Active' },
		{ value: 'paused', label: 'Paused' },
		{ value: 'archived', label: 'Archived' }
	];

	const columns = [
		{ key: 'name', label: 'Name' },
		{ key: 'slug', label: 'Slug' },
		{ key: 'plan', label: 'Plan' },
		{ key: 'status', label: 'Status' },
		{ key: 'restaurantCount', label: 'Restaurants' },
		{ key: 'userCount', label: 'Users' },
		{ key: 'createdAt', label: 'Created' }
	];

	const statusTone = (status: string): 'success' | 'warning' | 'neutral' => {
		if (status === 'active') return 'success';
		if (status === 'paused') return 'warning';
		return 'neutral';
	};

	const formatDate = (value: string) =>
		new Date(value).toLocaleDateString('en-ID', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
</script>

<svelte:head>
	<title>Organizations - Platform Admin - Lingua</title>
</svelte:head>

<div>
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold text-slate-900">Organizations</h1>
			<p class="mt-1 text-sm text-slate-500">
				Tenant organizations created from approved onboarding data.
			</p>
		</div>
		<!-- Status filter -->
		<div class="flex items-center gap-2">
			<label for="org-status-filter" class="text-sm font-medium text-slate-600">Status</label>
			<select
				id="org-status-filter"
				value={data.status}
				onchange={(e) => {
					const val = (e.currentTarget as HTMLSelectElement).value;
					const params = new SvelteURLSearchParams(window.location.search);
					if (val === 'all') params.delete('status');
					else params.set('status', val);
					params.delete('offset');
					window.location.href = `/platform/organizations?${params.toString()}`;
				}}
				class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
			>
				{#each STATUS_OPTIONS as opt (opt.value)}
					<option value={opt.value}>{opt.label}</option>
				{/each}
			</select>
		</div>
	</div>

	<DataTable items={data.organizations} {columns} wrapperClass="mt-6">
		{#snippet cell(item, columnKey)}
			{#if columnKey === 'name'}
				<a
					href={'/platform/organizations/' + item.slug}
					class="font-medium text-slate-900 hover:text-blue-600">{item.name}</a
				>
			{:else if columnKey === 'status'}
				<Badge label={item.status} tone={statusTone(item.status)} shape="pill" />
			{:else if columnKey === 'createdAt'}
				{formatDate(item.createdAt)}
			{:else}
				{item[columnKey as keyof typeof item]}
			{/if}
		{/snippet}

		{#snippet emptyState()}
			<EmptyState title="No organizations found for this page." />
		{/snippet}
	</DataTable>

	<Pagination
		offset={data.offset}
		limit={50}
		hasPrevious={data.offset > 0}
		hasNext={data.organizations.length === 50}
		baseUrl="/platform/organizations"
	/>
</div>
