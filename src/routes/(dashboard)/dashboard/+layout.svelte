<script lang="ts">
	import {
		BarChart3,
		BookOpenText,
		Building2,
		ClipboardList,
		Home,
		Import,
		QrCode,
		Utensils
	} from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { organizations, restaurants } from '$lib/mock/restaurants';

	let { children } = $props();

	type AdminRoute =
		| '/dashboard'
		| '/dashboard/menu'
		| '/dashboard/import'
		| '/dashboard/tables'
		| '/dashboard/knowledge'
		| '/dashboard/analytics';

	const nav: { href: AdminRoute; label: string; icon: typeof Home }[] = [
		{ href: '/dashboard', label: 'Home', icon: Home },
		{ href: '/dashboard/menu', label: 'Menu data', icon: Utensils },
		{ href: '/dashboard/import', label: 'Menu review', icon: Import },
		{ href: '/dashboard/tables', label: 'QR tables', icon: QrCode },
		{ href: '/dashboard/knowledge', label: 'Restaurant facts', icon: BookOpenText },
		{ href: '/dashboard/analytics', label: 'Reports', icon: BarChart3 }
	];

	const activeOrganization = organizations[0];
	const managedRestaurants = restaurants.filter(
		(restaurant) => restaurant.organizationId === activeOrganization.id
	);
</script>

<main class="min-h-screen">
	<div class="app-container grid gap-5 py-5 lg:grid-cols-[250px_1fr]">
		<aside class="surface rounded-lg p-3 lg:sticky lg:top-5 lg:h-[calc(100vh-40px)]">
			<div class="rounded-lg bg-lingua-primary p-4 text-white">
				<p class="text-sm font-semibold text-white/75">LinguaServe workspace</p>
				<p class="mt-1 text-xl font-semibold">{activeOrganization.name}</p>
				<p class="mt-2 text-xs font-semibold uppercase tracking-wide text-white/70">
					{managedRestaurants.length} restaurants
				</p>
			</div>
			<div class="mt-3 rounded-lg border border-lingua-border bg-white p-3">
				<div class="flex items-center gap-2">
					<Building2 class="text-lingua-primary" size={18} />
					<p class="text-sm font-semibold text-lingua-text">Current restaurant</p>
				</div>
				<select
					class="tap-target mt-3 w-full rounded-lg border border-lingua-border bg-white px-3 text-sm"
					aria-label="Current restaurant"
				>
					{#each managedRestaurants as restaurant (restaurant.id)}
						<option>{restaurant.name}</option>
					{/each}
				</select>
				<p class="mt-2 text-xs leading-5 text-lingua-subtle">
					Later this will come from membership and tenant permissions.
				</p>
			</div>
			<nav class="mt-3 grid gap-1">
				{#each nav as item (item.href)}
					<a
						class="tap-target flex items-center gap-3 rounded-lg px-3 text-sm font-semibold text-lingua-text hover:bg-lingua-primary-soft"
						href={resolve(item.href)}
					>
						<item.icon size={18} />
						{item.label}
					</a>
				{/each}
			</nav>
			<a
				class="tap-target mt-4 flex items-center gap-3 rounded-lg border border-lingua-border px-3 text-sm font-semibold"
				href={resolve('/staff/inbox')}
			>
				<ClipboardList size={18} /> Staff inbox
			</a>
		</aside>
		<div class="min-w-0">{@render children()}</div>
	</div>
</main>
