<script lang="ts">
	import * as Card from '$lib/ui/card';
	import { Package } from '@lucide/svelte';
</script>

<div class="p-4">
	<Card.Root>
		<Card.Content class="flex flex-col items-center py-16">
			<Package size={48} class="text-muted-foreground" />
			<p class="mt-4 font-semibold">Catalog Coming Soon</p>
			<p class="mt-1 text-center text-sm text-muted-foreground">
				The product catalog for this business will appear here.
			</p>
		</Card.Content>
	</Card.Root>
</div>
