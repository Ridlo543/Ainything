<script lang="ts">
	import * as Card from '$lib/ui/card';
	import * as Badge from '$lib/ui/badge';
	import { Building2, Package, Users, Activity, TrendingUp, ArrowRight } from '@lucide/svelte';

	const { data } = $props();
	const stats = $derived(data.stats);
	const analytics = $derived(data.analytics);
	const recentOrgs = $derived(data.recentOrgs);

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('id-ID', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Platform Overview</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold">Platform Overview</h1>
		<p class="text-sm text-muted-foreground">Manage tenants, organizations, and platform health.</p>
	</div>

	<!-- Stats Cards -->
	<div class="grid gap-4 sm:grid-cols-3">
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between pb-2">
				<Card.Title class="text-sm font-medium text-muted-foreground">Organizations</Card.Title>
				<Building2 size={16} class="text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<p class="text-2xl font-bold">{stats.totalOrganizations}</p>
				<p class="text-xs text-muted-foreground">+{analytics.newOrganizations7d} this week</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between pb-2">
				<Card.Title class="text-sm font-medium text-muted-foreground">Restaurants</Card.Title>
				<Package size={16} class="text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<p class="text-2xl font-bold">{stats.totalRestaurants}</p>
				<p class="text-xs text-muted-foreground">+{analytics.newRestaurants7d} this week</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between pb-2">
				<Card.Title class="text-sm font-medium text-muted-foreground">Users</Card.Title>
				<Users size={16} class="text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<p class="text-2xl font-bold">{stats.platformUsers}</p>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- AI Stats -->
	<div class="grid gap-4 sm:grid-cols-2">
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between pb-2">
				<Card.Title class="text-sm font-medium text-muted-foreground">AI Events (30d)</Card.Title>
				<Activity size={16} class="text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<p class="text-2xl font-bold">{analytics.totalChatEvents}</p>
				<p class="text-xs text-muted-foreground">{analytics.totalFallbacks} fallbacks</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between pb-2">
				<Card.Title class="text-sm font-medium text-muted-foreground">Feedback</Card.Title>
				<TrendingUp size={16} class="text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<p class="text-2xl font-bold">{analytics.helpfulFeedback}/{analytics.totalFeedback}</p>
				<p class="text-xs text-muted-foreground">helpful responses</p>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Recent Activity -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Recent Organizations</Card.Title>
		</Card.Header>
		<Card.Content>
			{#if recentOrgs.length === 0}
				<p class="text-sm text-muted-foreground">No organizations yet.</p>
			{:else}
				<div class="space-y-3">
					{#each recentOrgs as org (org.id)}
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium">{org.name}</p>
								<p class="text-xs text-muted-foreground">
									{org.restaurantCount} restaurants · {org.userCount} users
								</p>
							</div>
							<div class="flex items-center gap-2">
								<Badge.Badge variant={org.status === 'active' ? 'default' : 'secondary'}>
									{org.status}
								</Badge.Badge>
								<span class="text-xs text-muted-foreground">{formatDate(org.createdAt)}</span>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Quick Links -->
	<div class="grid gap-4 sm:grid-cols-3">
		<a
			href="/platform/tenants"
			class="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted"
		>
			<div>
				<p class="text-sm font-medium">Tenants</p>
				<p class="text-xs text-muted-foreground">Manage organizations</p>
			</div>
			<ArrowRight size={16} class="text-muted-foreground" />
		</a>
		<a
			href="/platform/organizations"
			class="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted"
		>
			<div>
				<p class="text-sm font-medium">Organizations</p>
				<p class="text-xs text-muted-foreground">View all organizations</p>
			</div>
			<ArrowRight size={16} class="text-muted-foreground" />
		</a>
		<a
			href="/platform/analytics"
			class="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted"
		>
			<div>
				<p class="text-sm font-medium">Analytics</p>
				<p class="text-xs text-muted-foreground">Platform metrics</p>
			</div>
			<ArrowRight size={16} class="text-muted-foreground" />
		</a>
	</div>
</div>
