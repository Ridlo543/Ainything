<script lang="ts">
	import * as Card from '$lib/ui/card';
	import { Key, Plus } from '@lucide/svelte';
</script>

<svelte:head>
	<title>API Keys — Platform Admin</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold">API Keys</h1>
			<p class="text-sm text-muted-foreground">
				Manage platform API keys for integrations and access.
			</p>
		</div>
		<button
			class="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
		>
			<Plus size={16} />
			Generate Key
		</button>
	</div>

	<Card.Root>
		<Card.Content class="flex flex-col items-center py-12">
			<Key size={48} class="text-muted-foreground" />
			<p class="mt-4 font-semibold">API Keys Coming Soon</p>
			<p class="mt-1 text-sm text-muted-foreground max-w-md text-center">
				This feature requires a database migration to create the <code class="font-mono text-xs"
					>api_keys</code
				> table. Once implemented, you'll be able to generate, view, and revoke API keys for platform
				integrations.
			</p>
			<div class="mt-6 rounded-lg border bg-muted/50 p-4 max-w-md">
				<p class="text-sm font-medium">Planned Features:</p>
				<ul class="mt-2 space-y-1 text-sm text-muted-foreground">
					<li>• Generate named API keys with expiration</li>
					<li>• View key usage and last access time</li>
					<li>• Revoke keys with confirmation</li>
					<li>• Usage logs per key (endpoint, timestamp, status)</li>
				</ul>
			</div>
		</Card.Content>
	</Card.Root>
</div>
