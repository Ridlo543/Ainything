<script lang="ts">
	import * as Card from '$lib/ui/card';
	import * as Badge from '$lib/ui/badge';
	import { Building2, Package } from '@lucide/svelte';
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold">Organizations</h1>
		<p class="text-sm text-muted-foreground">View and manage registered organizations.</p>
	</div>

	<Card.Root>
		<Card.Content class="flex flex-col items-center py-12">
			<Building2 size={48} class="text-muted-foreground" />
			<p class="mt-4 font-semibold">No organizations yet</p>
			<p class="mt-1 text-sm text-muted-foreground">
				Organizations will appear here once they register.
			</p>
		</Card.Content>
	</Card.Root>
</div>
