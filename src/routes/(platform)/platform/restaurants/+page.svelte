<script lang="ts">
	import DataTable from '$lib/ui/DataTable.svelte';
	import Pagination from '$lib/ui/Pagination.svelte';
	import EmptyState from '$lib/ui/EmptyState.svelte';
	import Badge from '$lib/ui/primitives/Badge.svelte';

	let { data } = $props();

	const columns = [
		{ key: 'name', label: 'Name' },
		{ key: 'slug', label: 'Slug' },
		{ key: 'segment', label: 'Segment' },
		{ key: 'organizationName', label: 'Organization' },
		{ key: 'status', label: 'Status' },
		{ key: 'tableCount', label: 'Tables' }
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
	<h1 class="text-2xl font-bold text-slate-900">Restaurants</h1>
	<p class="mt-2 text-sm text-slate-500">Restaurant records created from approved onboarding data.</p>

	<DataTable
		items={data.restaurants}
		{columns}
		wrapperClass="mt-6"
	>
		{#snippet cell(item, columnKey)}
			{#if columnKey === 'name'}
				<span class="font-medium text-slate-900">{item.name}</span>
			{:else if columnKey === 'status'}
				<Badge label={item.status} tone={statusTone(item.status)} shape="pill" />
			{:else}
				{item[columnKey as keyof typeof item]}
			{/if}
		{/snippet}

		{#snippet emptyState()}
			<EmptyState title="No restaurants found for this page." />
		{/snippet}
	</DataTable>

	<Pagination
		offset={data.offset}
		limit={50}
		hasPrevious={data.offset > 0}
		hasNext={data.restaurants.length === 50}
		baseUrl="/platform/restaurants"
	/>
</div>
