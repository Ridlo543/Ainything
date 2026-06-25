<script lang="ts">
	import * as Card from '$lib/ui/card';
	import * as Badge from '$lib/ui/badge';
	import { Building2, Package, Users, Globe, Clock, ArrowLeft } from '@lucide/svelte';

	const { data } = $props();
	const org = $derived(data.org);
	const restaurants = $derived(data.restaurants);

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('id-ID', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>{org.name} — Tenant Detail</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center gap-3">
		<a href="/platform/tenants" class="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
			<ArrowLeft size={14} />
			Back
		</a>
		<div class="flex-1">
			<div class="flex items-center gap-3">
				<h1 class="text-2xl font-bold">{org.name}</h1>
				<Badge.Badge
					variant={org.status === 'active'
						? 'default'
						: org.status === 'suspended'
							? 'destructive'
							: 'secondary'}
				>
					{org.status}
				</Badge.Badge>
			</div>
			<p class="text-sm text-muted-foreground">{org.slug}</p>
		</div>
	</div>

	<!-- Stats Cards -->
	<div class="grid gap-4 sm:grid-cols-3">
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between pb-2">
				<Card.Title class="text-sm font-medium text-muted-foreground">Plan</Card.Title>
				<Building2 size={16} class="text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<p class="text-2xl font-bold capitalize">{org.plan}</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between pb-2">
				<Card.Title class="text-sm font-medium text-muted-foreground">Restaurants</Card.Title>
				<Package size={16} class="text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<p class="text-2xl font-bold">{org.restaurantCount}</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between pb-2">
				<Card.Title class="text-sm font-medium text-muted-foreground">Users</Card.Title>
				<Users size={16} class="text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<p class="text-2xl font-bold">{org.userCount}</p>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Organization Info -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Organization Info</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="grid gap-4 sm:grid-cols-2">
				<div class="flex items-center gap-3">
					<Globe size={16} class="text-muted-foreground" />
					<div>
						<p class="text-sm text-muted-foreground">Workspace Host</p>
						<p class="text-sm font-medium">{org.workspaceHost || 'Not set'}</p>
					</div>
				</div>
				<div class="flex items-center gap-3">
					<Clock size={16} class="text-muted-foreground" />
					<div>
						<p class="text-sm text-muted-foreground">Created</p>
						<p class="text-sm font-medium">{formatDate(org.createdAt)}</p>
					</div>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Restaurants -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Restaurants</Card.Title>
		</Card.Header>
		<Card.Content>
			{#if restaurants.length === 0}
				<div class="flex flex-col items-center py-8">
					<Package size={32} class="text-muted-foreground" />
					<p class="mt-2 text-sm text-muted-foreground">No restaurants yet.</p>
				</div>
			{:else}
				<div class="space-y-3">
					{#each restaurants as restaurant (restaurant.id)}
						<div class="flex items-center justify-between rounded-lg border p-3">
							<div>
								<p class="text-sm font-medium">{restaurant.name}</p>
								<p class="text-xs text-muted-foreground">{restaurant.slug} · {restaurant.segment}</p>
							</div>
							<div class="flex items-center gap-2">
								<Badge.Badge variant="outline">{restaurant.tableCount} tables</Badge.Badge>
								<Badge.Badge
									variant={restaurant.status === 'active'
										? 'default'
										: restaurant.status === 'suspended'
											? 'destructive'
											: 'secondary'}
								>
									{restaurant.status}
								</Badge.Badge>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Actions -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Actions</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="flex gap-3">
				{#if org.status === 'active'}
					<button class="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90">
						Suspend
					</button>
				{:else if org.status === 'suspended'}
					<button class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
						Activate
					</button>
				{/if}
				<button class="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted">
					Delete
				</button>
			</div>
		</Card.Content>
	</Card.Root>
</div>
