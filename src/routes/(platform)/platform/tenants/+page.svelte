<script lang="ts">
	import * as Card from '$lib/ui/card';
	import * as Badge from '$lib/ui/badge';
	import { Package, Search, ChevronLeft, ChevronRight } from '@lucide/svelte';
	import { goto } from '$app/navigation';

	const { data } = $props();
	const tenants = $derived(data.tenants);
	const filters = $derived(data.filters);

	let searchQuery = $state('');

	const filteredTenants = $derived(
		searchQuery
			? tenants.filter(
					(t) =>
						t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
						t.slug.toLowerCase().includes(searchQuery.toLowerCase())
				)
			: tenants
	);

	const statusOptions = ['all', 'active', 'suspended', 'trial'];

	function handleStatusChange(status: string) {
		const url = new URL(window.location.href);
		if (status === 'all') {
			url.searchParams.delete('status');
		} else {
			url.searchParams.set('status', status);
		}
		url.searchParams.set('page', '1');
		goto(url.toString());
	}

	function handlePageChange(newPage: number) {
		const url = new URL(window.location.href);
		url.searchParams.set('page', String(newPage));
		goto(url.toString());
	}

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('id-ID', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Tenants — Platform Admin</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold">Tenants</h1>
		<p class="text-sm text-muted-foreground">Browse all registered tenants across the platform.</p>
	</div>

	<!-- Filters -->
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
		<div class="relative flex-1">
			<Search size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
			<input
				type="text"
				placeholder="Search by name or slug..."
				bind:value={searchQuery}
				class="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
			/>
		</div>
		<div class="flex gap-2">
			{#each statusOptions as status (status)}
				<button
					class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors {filters.status ===
					status
						? 'bg-primary text-primary-foreground'
						: 'bg-muted text-muted-foreground hover:bg-muted/80'}"
					onclick={() => handleStatusChange(status)}
				>
					{status.charAt(0).toUpperCase() + status.slice(1)}
				</button>
			{/each}
		</div>
	</div>

	<!-- Tenant Table -->
	<Card.Root>
		<Card.Content class="p-0">
			{#if filteredTenants.length === 0}
				<div class="flex flex-col items-center py-12">
					<Package size={48} class="text-muted-foreground" />
					<p class="mt-4 font-semibold">No tenants found</p>
					<p class="mt-1 text-sm text-muted-foreground">
						{searchQuery
							? 'Try a different search term.'
							: 'Tenant businesses will appear here once activated.'}
					</p>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full">
						<thead>
							<tr class="border-b bg-muted/50">
								<th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Name</th>
								<th
									class="hidden px-4 py-3 text-left text-sm font-medium text-muted-foreground sm:table-cell"
									>Plan</th
								>
								<th
									class="hidden px-4 py-3 text-left text-sm font-medium text-muted-foreground md:table-cell"
									>Restaurants</th
								>
								<th
									class="hidden px-4 py-3 text-left text-sm font-medium text-muted-foreground md:table-cell"
									>Users</th
								>
								<th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th
								>
								<th
									class="hidden px-4 py-3 text-left text-sm font-medium text-muted-foreground lg:table-cell"
									>Created</th
								>
							</tr>
						</thead>
						<tbody>
							{#each filteredTenants as tenant (tenant.id)}
								<tr class="border-b transition-colors hover:bg-muted/50">
									<td class="px-4 py-3">
										<a href="/platform/tenants/{tenant.id}" class="block">
											<p class="text-sm font-medium">{tenant.name}</p>
											<p class="text-xs text-muted-foreground">{tenant.slug}</p>
										</a>
									</td>
									<td class="hidden px-4 py-3 sm:table-cell">
										<Badge.Badge variant="outline">{tenant.plan}</Badge.Badge>
									</td>
									<td class="hidden px-4 py-3 text-sm md:table-cell">{tenant.restaurantCount}</td>
									<td class="hidden px-4 py-3 text-sm md:table-cell">{tenant.userCount}</td>
									<td class="px-4 py-3">
										<Badge.Badge
											variant={tenant.status === 'active'
												? 'default'
												: tenant.status === 'suspended'
													? 'destructive'
													: 'secondary'}
										>
											{tenant.status}
										</Badge.Badge>
									</td>
									<td class="hidden px-4 py-3 text-sm text-muted-foreground lg:table-cell">
										{formatDate(tenant.createdAt)}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Pagination -->
	{#if tenants.length === 20 || filters.page > 1}
		<div class="flex items-center justify-between">
			<p class="text-sm text-muted-foreground">
				Page {filters.page}
			</p>
			<div class="flex gap-2">
				<button
					class="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
					disabled={filters.page <= 1}
					onclick={() => handlePageChange(filters.page - 1)}
				>
					<ChevronLeft size={14} />
					Previous
				</button>
				<button
					class="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
					disabled={tenants.length < 20}
					onclick={() => handlePageChange(filters.page + 1)}
				>
					Next
					<ChevronRight size={14} />
				</button>
			</div>
		</div>
	{/if}
</div>
