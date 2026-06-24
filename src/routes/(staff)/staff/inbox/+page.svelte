<script lang="ts">
	import * as Card from '$lib/ui/card';
	import * as Skeleton from '$lib/ui/skeleton';
	import * as Badge from '$lib/ui/badge';
	import { Inbox } from '@lucide/svelte';
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-xl font-bold">Inbox</h1>
		<p class="text-sm text-muted-foreground">Real-time order queue</p>
	</div>

	<Card.Root>
		<Card.Content class="flex flex-col items-center py-12">
			<Inbox size={48} class="text-muted-foreground" />
			<p class="mt-4 font-semibold">No active orders</p>
			<p class="mt-1 text-sm text-muted-foreground">
				New orders will appear here in real-time.
			</p>
		</Card.Content>
	</Card.Root>
</div>
