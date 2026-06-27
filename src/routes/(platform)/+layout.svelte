<script lang="ts">
	import { page } from '$app/stores';
	import {
		Home,
		Building2,
		Package,
		BarChart3,
		Settings,
		LogOut,
		Menu,
		X,
		Key
	} from '@lucide/svelte';
	import * as Separator from '$lib/ui/separator';
	import type { LayoutData } from './$types';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();

	const user = $derived(data.user);
	const currentPath = $derived($page.url.pathname);

	let drawerOpen = $state(false);

	const nav = [
		{ href: '/platform', label: 'Overview', icon: Home },
		{ href: '/platform/organizations', label: 'Organizations', icon: Building2 },
		{ href: '/platform/tenants', label: 'Tenants', icon: Package },
		{ href: '/platform/analytics', label: 'Analytics', icon: BarChart3 },
		{ href: '/platform/api', label: 'API Keys', icon: Key },
		{ href: '/platform/settings', label: 'Settings', icon: Settings }
	] as const;

	function isActive(href: string): boolean {
		if (href === '/platform') return currentPath === '/platform';
		return currentPath.startsWith(href);
	}
</script>

<!-- Skip navigation link for keyboard/screen reader users -->
<a
	href="#main-content"
	class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-lg"
>
	Skip to main content
</a>

<!-- Mobile overlay -->
{#if drawerOpen}
	<div
		class="fixed inset-0 z-40 bg-black/50 lg:hidden"
		role="presentation"
		onclick={() => (drawerOpen = false)}
	></div>
{/if}

<div class="flex min-h-screen overflow-x-hidden bg-muted">
	<!-- Mobile top bar -->
	<div
		class="fixed left-0 right-0 top-0 z-30 flex h-14 items-center gap-3 bg-card px-4 shadow-sm lg:hidden"
	>
		<button
			type="button"
			class="tap-target flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
			onclick={() => (drawerOpen = true)}
			aria-label="Open navigation menu"
			aria-expanded={drawerOpen}
			aria-controls="platform-sidebar"
		>
			<Menu size={20} aria-hidden="true" />
		</button>
		<p class="text-sm font-bold">Platform Console</p>
	</div>

	<aside
		id="platform-sidebar"
		class="flex shrink-0 flex-col bg-card shadow-sm
			fixed inset-y-0 left-0 z-50 w-[280px] transition-transform duration-200
			{drawerOpen ? 'translate-x-0' : '-translate-x-full'}
			lg:relative lg:translate-x-0 lg:transition-none"
		aria-label="Platform admin navigation"
	>
		<div class="flex items-center justify-between px-6 py-4">
			<div>
				<p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin</p>
				<p class="text-lg font-bold">Platform Console</p>
			</div>
			<!-- Close button — mobile only -->
			<button
				type="button"
				class="tap-target flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors lg:hidden"
				onclick={() => (drawerOpen = false)}
				aria-label="Close navigation menu"
			>
				<X size={18} aria-hidden="true" />
			</button>
		</div>

		<nav class="flex-1 space-y-0.5 px-3 py-4" aria-label="Admin navigation">
			{#each nav as item (item.href)}
				<a
					href={item.href}
					class="tap-target flex items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors
						{isActive(item.href) ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent'}"
					aria-current={isActive(item.href) ? 'page' : undefined}
					onclick={() => (drawerOpen = false)}
				>
					<item.icon size={18} class="shrink-0" aria-hidden="true" />
					{item.label}
				</a>
			{/each}
		</nav>

		<Separator.Root />

		<div class="shrink-0 px-3 py-3">
			<div class="flex items-center gap-3 px-2 py-2 mb-1">
				<div
					class="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold"
					aria-hidden="true"
				>
					{user.name.charAt(0).toUpperCase()}
				</div>
				<div class="min-w-0">
					<p class="truncate text-sm font-semibold">{user.name}</p>
					<p class="truncate text-xs text-muted-foreground">
						{user.platformRole.replace('_', ' ')}
					</p>
				</div>
			</div>
			<form method="POST" action="/logout">
				<button
					type="submit"
					class="tap-target w-full flex items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
				>
					<LogOut size={16} class="shrink-0" aria-hidden="true" />
					Sign out
				</button>
			</form>
		</div>
	</aside>

	<main id="main-content" class="flex-1 overflow-y-auto p-4 pt-18 lg:p-8 lg:pt-8">
		{@render children()}
	</main>
</div>
