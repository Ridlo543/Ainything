<script lang="ts">
	import {
		BarChart3,
		BookOpenText,
		Building2,
		ClipboardList,
		HelpCircle,
		Home,
		Import,
		Menu,
		QrCode,
		Settings,
		Users,
		Utensils,
		X
	} from '@lucide/svelte';
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
	import type { LayoutData } from './$types';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();

	type AdminRoute =
		| '/dashboard'
		| '/dashboard/menu'
		| '/dashboard/import'
		| '/dashboard/tables'
		| '/dashboard/knowledge'
		| '/dashboard/analytics'
		| '/dashboard/staff'
		| '/dashboard/settings'
		| '/dashboard/onboarding'
		| '/dashboard/guide'
		| '/dashboard/feedback';

	const nav: { href: AdminRoute; label: string; icon: typeof Home }[] = [
		{ href: '/dashboard', label: 'Home', icon: Home },
		{ href: '/dashboard/menu', label: 'Menu data', icon: Utensils },
		{ href: '/dashboard/import', label: 'Menu review', icon: Import },
		{ href: '/dashboard/tables', label: 'QR tables', icon: QrCode },
		{ href: '/dashboard/knowledge', label: 'Restaurant facts', icon: BookOpenText },
		{ href: '/dashboard/analytics', label: 'Reports', icon: BarChart3 },
		{ href: '/dashboard/staff', label: 'Team', icon: Users },
		{ href: '/dashboard/settings', label: 'Settings', icon: Settings },
		{ href: '/dashboard/guide', label: 'Staff guide', icon: HelpCircle },
		{ href: '/dashboard/feedback', label: 'Pilot feedback', icon: ClipboardList }
	];

	const tenant = $derived(data.tenant);
	const activeOrganization = $derived(tenant.organization);
	const managedRestaurants = $derived(tenant.restaurants);
	const activeRestaurant = $derived(tenant.activeRestaurant);

	const currentPath = $derived($page.url.pathname);

	let sidebarOpen = $state(false);

	function isActive(href: string): boolean {
		if (href === '/dashboard') return currentPath === '/dashboard';
		return currentPath.startsWith(href);
	}
</script>

<main class="min-h-screen">
	{#if sidebarOpen}
		<div
			class="fixed inset-0 z-40 bg-black/30 lg:hidden"
			role="presentation"
			onclick={() => (sidebarOpen = false)}
		></div>
	{/if}

	<div class="app-container flex min-h-screen flex-col gap-5 py-5 lg:grid lg:grid-cols-[250px_1fr]">
		<header class="flex items-center gap-3 lg:hidden">
			<button
				class="tap-target flex items-center justify-center rounded-lg border border-lingua-border bg-lingua-surface px-3"
				onclick={() => (sidebarOpen = !sidebarOpen)}
				aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
			>
				{#if sidebarOpen}
					<X size={20} />
				{:else}
					<Menu size={20} />
				{/if}
			</button>
			<p class="truncate text-sm font-semibold text-lingua-text">{activeOrganization.name}</p>
		</header>

		<aside
			class="surface flex flex-col rounded-lg p-3 {sidebarOpen
				? 'fixed inset-y-0 left-0 z-50 w-72'
				: 'hidden'} lg:sticky lg:top-5 lg:flex lg:h-[calc(100vh-40px)]"
		>
			<button
				class="tap-target mb-2 flex items-center justify-end self-end lg:hidden"
				onclick={() => (sidebarOpen = false)}
				aria-label="Close sidebar"
			>
				<X size={20} />
			</button>

			<div class="shrink-0 rounded-lg bg-lingua-primary p-4 text-white">
				<p class="text-sm font-semibold text-white/75">Lingua workspace</p>
				<p class="mt-1 text-xl font-semibold">{activeOrganization.name}</p>
				<p class="mt-2 text-xs font-semibold uppercase tracking-wide text-white/70">
					{managedRestaurants.length} restaurants
				</p>
			</div>

			<div class="shrink-0 mt-3 rounded-lg border border-lingua-border bg-lingua-surface p-3">
				<div class="flex items-center gap-2">
					<Building2 class="text-lingua-primary" size={18} />
					<p class="text-sm font-semibold text-lingua-text">Current restaurant</p>
				</div>
				<select
					class="tap-target mt-3 w-full rounded-lg border border-lingua-border bg-lingua-surface px-3 text-sm"
					aria-label="Current restaurant"
					value={activeRestaurant.slug}
					onchange={(event) => {
						const url = new URL(location.href);
						url.searchParams.set('restaurant', event.currentTarget.value);
						location.href = `${url.pathname}${url.search}`;
					}}
				>
					{#each managedRestaurants as restaurant (restaurant.id)}
						<option value={restaurant.slug}>{restaurant.name}</option>
					{/each}
				</select>
				<p class="mt-2 text-xs leading-5 text-lingua-subtle">
					Signed in as {tenant.user.name} ({tenant.membership.role}).
				</p>
			</div>

			<nav class="mt-3 flex-1 space-y-1 overflow-y-auto">
				{#each nav as item (item.href)}
					<a
						class="tap-target flex items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors {isActive(item.href)
							? 'bg-lingua-primary-soft text-lingua-primary-strong'
							: 'text-lingua-text hover:bg-lingua-primary-soft'}"
						href={item.href}
						aria-current={isActive(item.href) ? 'page' : undefined}
					>
						<item.icon size={18} />
						{item.label}
					</a>
				{/each}
			</nav>

			<div class="shrink-0 mt-3 border-t border-lingua-border pt-3">
				<a
					class="tap-target flex items-center gap-3 rounded-lg border border-lingua-border px-3 text-sm font-semibold transition-colors hover:bg-lingua-primary-soft"
					href={resolve('/staff/inbox')}
				>
					<ClipboardList size={18} /> Staff inbox
				</a>
				<form method="POST" action={resolve('/logout')}>
					<button
						class="tap-target mt-2 w-full rounded-lg border border-lingua-border px-3 text-left text-sm font-semibold text-lingua-subtle transition-colors hover:bg-lingua-muted"
						type="submit"
					>
						Sign out
					</button>
				</form>
			</div>
		</aside>

		<div class="min-w-0 flex-1">{@render children()}</div>
	</div>
</main>
