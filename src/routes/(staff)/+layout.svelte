<script lang="ts">
	import { Toaster } from '$lib/ui/sonner';
	import type { LayoutData } from './$types';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();

	const tenant = $derived(data.tenant);
	const restaurant = $derived(tenant.activeRestaurant);
</script>

<div class="flex min-h-screen flex-col bg-background">
	<header class="sticky top-0 z-30 flex h-14 items-center gap-3 bg-card shadow-[0_1px_0_0_var(--color-lingua-border)] px-4">
		<div class="flex size-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
			{restaurant.name.charAt(0)}
		</div>
		<div class="min-w-0 flex-1">
			<p class="truncate text-sm font-semibold">{restaurant.name}</p>
			<p class="truncate text-xs text-muted-foreground">Staff mode</p>
		</div>
		<form method="POST" action="/logout">
			<button
				type="submit"
				class="tap-target rounded-lg px-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
			>
				Sign out
			</button>
		</form>
	</header>

	<main class="flex-1 p-4 lg:p-8">
		{@render children()}
	</main>

	<Toaster />
</div>
