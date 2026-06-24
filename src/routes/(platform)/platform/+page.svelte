<script lang="ts">
	import * as Card from '$lib/ui/card';
	import { Building2, Package, Users } from '@lucide/svelte';
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold">Platform Overview</h1>
		<p class="text-sm text-muted-foreground">Manage tenants, organizations, and platform health.</p>
	</div>

	<div class="grid gap-4 sm:grid-cols-3">
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between pb-2">
				<Card.Title class="text-sm font-medium text-muted-foreground">Organizations</Card.Title>
				<Building2 size={16} class="text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<p class="text-2xl font-bold">0</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between pb-2">
				<Card.Title class="text-sm font-medium text-muted-foreground">Tenants</Card.Title>
				<Package size={16} class="text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<p class="text-2xl font-bold">0</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between pb-2">
				<Card.Title class="text-sm font-medium text-muted-foreground">Users</Card.Title>
				<Users size={16} class="text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<p class="text-2xl font-bold">0</p>
			</Card.Content>
		</Card.Root>
	</div>
</div>
