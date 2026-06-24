<script lang="ts">
	import { page } from '$app/stores';
	import { Home, Building2, Package, BarChart3, Settings, LogOut } from '@lucide/svelte';
	import * as Separator from '$lib/ui/separator';
	import type { LayoutData } from './$types';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();

	const user = $derived(data.user);
	const currentPath = $derived($page.url.pathname);

	const nav = [
		{ href: '/platform', label: 'Overview', icon: Home },
		{ href: '/platform/organizations', label: 'Organizations', icon: Building2 },
		{ href: '/platform/tenants', label: 'Tenants', icon: Package },
		{ href: '/platform/analytics', label: 'Analytics', icon: BarChart3 },
		{ href: '/platform/settings', label: 'Settings', icon: Settings }
	] as const;

	function isActive(href: string): boolean {
		if (href === '/platform') return currentPath === '/platform';
		return currentPath.startsWith(href);
	}
</script>

<div class="flex min-h-screen bg-muted">
	<aside class="flex w-[280px] shrink-0 flex-col border-r border-border bg-card" aria-label="Platform admin">
		<div class="border-b border-border px-6 py-4">
			<p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin</p>
			<p class="text-lg font-bold">Platform Console</p>
		</div>

		<nav class="flex-1 space-y-0.5 px-3 py-4" aria-label="Admin navigation">
			{#each nav as item (item.href)}
				<a
					href={item.href}
					class="tap-target flex items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors
						{isActive(item.href)
							? 'bg-primary text-primary-foreground'
							: 'text-foreground hover:bg-accent'}"
					aria-current={isActive(item.href) ? 'page' : undefined}
				>
					<item.icon size={18} class="shrink-0" />
					{item.label}
				</a>
			{/each}
		</nav>

		<Separator.Root />

		<div class="shrink-0 px-3 py-3">
			<div class="flex items-center gap-3 px-2 py-2 mb-1">
				<div class="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
					{user.name.charAt(0).toUpperCase()}
				</div>
				<div class="min-w-0">
					<p class="truncate text-sm font-semibold">{user.name}</p>
					<p class="truncate text-xs text-muted-foreground">{user.platformRole.replace('_', ' ')}</p>
				</div>
			</div>
			<form method="POST" action="/logout">
				<button
					type="submit"
					class="tap-target w-full flex items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
				>
					<LogOut size={16} class="shrink-0" />
					Sign out
				</button>
			</form>
		</div>
	</aside>

	<main class="flex-1 overflow-y-auto p-8">
		{@render children()}
	</main>
</div>
