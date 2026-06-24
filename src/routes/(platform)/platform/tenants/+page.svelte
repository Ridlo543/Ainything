<script lang="ts">
	import * as Card from '$lib/ui/card';
	import { Package } from '@lucide/svelte';
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold">Tenants</h1>
		<p class="text-sm text-muted-foreground">Browse all registered tenants across the platform.</p>
	</div>

	<Card.Root>
		<Card.Content class="flex flex-col items-center py-12">
			<Package size={48} class="text-muted-foreground" />
			<p class="mt-4 font-semibold">No tenants yet</p>
			<p class="mt-1 text-sm text-muted-foreground">
				Tenant businesses will appear here once activated.
			</p>
		</Card.Content>
	</Card.Root>
</div>
