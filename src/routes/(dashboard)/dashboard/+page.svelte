<script lang="ts">
	import { BarChart3, Package, ShoppingCart, Users } from '@lucide/svelte';
	import * as Card from '$lib/ui/card';
	import * as Skeleton from '$lib/ui/skeleton';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const tenant = $derived(data.tenant);
	const org = $derived(tenant.organization);
	const restaurant = $derived(tenant.activeRestaurant);

	const stats = $derived([
		{ label: 'Products', icon: Package, value: restaurant.menuItems.length, color: 'bg-[var(--color-lingua-primary)] text-white' },
		{ label: 'Categories', icon: BarChart3, value: restaurant.categories.length, color: 'bg-[var(--color-lingua-secondary)] text-white' },
		{ label: 'Orders today', icon: ShoppingCart, value: 0, color: 'bg-[var(--color-lingua-accent)] text-white' },
		{ label: 'Team', icon: Users, value: 1, color: 'bg-muted text-muted-foreground' }
	]);
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold">{restaurant.name}</h1>
		<p class="text-sm text-muted-foreground">{org.name} workspace</p>
	</div>

	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		{#each stats as stat (stat.label)}
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between pb-2">
					<Card.Title class="text-sm font-medium text-muted-foreground">{stat.label}</Card.Title>
					<div class="flex size-8 items-center justify-center rounded-lg {stat.color}">
						<stat.icon size={16} />
					</div>
				</Card.Header>
				<Card.Content>
					<p class="text-2xl font-bold">{stat.value}</p>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Welcome to your dashboard</Card.Title>
			<Card.Description>
				Manage your catalog, monitor orders, and configure your business settings.
			</Card.Description>
		</Card.Header>
	</Card.Root>
</div>
