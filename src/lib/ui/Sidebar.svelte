<script lang="ts">
	import { page } from '$app/stores';
	import { SvelteSet } from 'svelte/reactivity';
	import * as Separator from '$lib/ui/separator';
	import {
		Home,
		Package,
		ShoppingCart,
		BarChart3,
		Users,
		Settings,
		ChevronDown,
		ChevronRight,
		X,
		LogOut,
		Building2,
		Tag
	} from '@lucide/svelte';

	interface NavItem {
		href: string;
		label: string;
		icon: typeof Home;
		children?: { href: string; label: string }[];
	}

	interface Props {
		open?: boolean;
		onclose?: () => void;
		tenantName?: string;
		tenantSlug?: string;
		userName?: string;
		userRole?: string;
		outlets?: { id: string; name: string; slug: string }[];
		activeOutletSlug?: string;
		onoutletchange?: (slug: string) => void;
	}

	let {
		open = false,
		onclose,
		tenantName = 'My Business',
		tenantSlug = '',
		userName = '',
		userRole = '',
		outlets = [],
		activeOutletSlug = '',
		onoutletchange
	}: Props = $props();

	const currentPath = $derived($page.url.pathname);

	const nav: NavItem[] = [
		{ href: '/dashboard', label: 'Overview', icon: Home },
		{
			href: '/dashboard/catalog',
			label: 'Catalog',
			icon: Package,
			children: [
				{ href: '/dashboard/catalog', label: 'Products' },
				{ href: '/dashboard/categories', label: 'Categories' }
			]
		},
		{
			href: '/dashboard/orders',
			label: 'Orders',
			icon: ShoppingCart,
			children: [
				{ href: '/dashboard/orders', label: 'Active' },
				{ href: '/dashboard/orders/history', label: 'History' }
			]
		},
		{ href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
		{
			href: '/dashboard/team',
			label: 'Team',
			icon: Users,
			children: [
				{ href: '/dashboard/team', label: 'Staff' },
				{ href: '/dashboard/team/invites', label: 'Invites' }
			]
		},
		{
			href: '/dashboard/settings',
			label: 'Settings',
			icon: Settings,
			children: [
				{ href: '/dashboard/settings', label: 'General' },
				{ href: '/dashboard/settings/qr', label: 'QR & Links' },
				{ href: '/dashboard/settings/billing', label: 'Billing' }
			]
		}
	];

	// Track which groups are expanded — auto-expand the active group
	// eslint-disable-next-line svelte/no-unnecessary-state-wrap
	let expandedGroups = $state(new SvelteSet<string>());

	$effect(() => {
		for (const item of nav) {
			if (item.children && isGroupActive(item)) {
				expandedGroups.add(item.href);
				expandedGroups = new SvelteSet(expandedGroups);
			}
		}
	});

	function isActive(href: string): boolean {
		if (href === '/dashboard') return currentPath === '/dashboard';
		return currentPath.startsWith(href);
	}

	function isGroupActive(item: NavItem): boolean {
		if (isActive(item.href)) return true;
		return item.children?.some((c) => isActive(c.href)) ?? false;
	}

	function toggleGroup(href: string) {
		if (expandedGroups.has(href)) {
			expandedGroups.delete(href);
		} else {
			expandedGroups.add(href);
		}
		expandedGroups = new SvelteSet(expandedGroups);
	}
</script>

<!--
	@component
	Sidebar navigation for the owner dashboard.
	Desktop: sticky 250px sidebar. Mobile: slide-out overlay with backdrop.
-->

<!-- Mobile overlay backdrop -->
{#if open}
	<div
		class="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
		role="presentation"
		onclick={onclose}
		onkeydown={(e) => e.key === 'Escape' && onclose?.()}
	></div>
{/if}

<aside
	class="flex flex-col bg-card
		min-h-screen w-[250px] shrink-0 overflow-y-auto
		{open ? 'fixed inset-y-0 left-0 z-50 shadow-xl' : 'hidden'}
		lg:sticky lg:top-0 lg:flex lg:h-screen"
	aria-label="Dashboard navigation"
>
	<!-- Logo / workspace header -->
	<div class="flex items-center justify-between px-4 py-4">
		<div class="flex items-center gap-2 min-w-0">
			<div
				class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm"
				aria-hidden="true"
			>
				{tenantName.charAt(0).toUpperCase()}
			</div>
			<div class="min-w-0">
				<p class="truncate text-sm font-semibold">{tenantName}</p>
				{#if tenantSlug}
					<p class="truncate text-xs text-muted-foreground">/{tenantSlug}</p>
				{/if}
			</div>
		</div>
		<!-- Close button mobile -->
		<button
			class="tap-target flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors lg:hidden"
			onclick={onclose}
			aria-label="Close sidebar"
		>
			<X size={18} />
		</button>
	</div>

	<!-- Outlet switcher (if multiple outlets) -->
	{#if outlets.length > 1}
		<div class="px-4 py-3">
			<div class="flex items-center gap-2 mb-1.5">
				<Building2 size={14} class="text-muted-foreground" />
				<span class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Outlet</span
				>
			</div>
			<select
				class="tap-target w-full rounded-lg border border-input bg-muted px-3 text-sm font-medium focus:border-ring focus:outline-none"
				value={activeOutletSlug}
				onchange={(e) => onoutletchange?.(e.currentTarget.value)}
				aria-label="Switch outlet"
			>
				{#each outlets as outlet (outlet.id)}
					<option value={outlet.slug}>{outlet.name}</option>
				{/each}
			</select>
		</div>
	{/if}

	<!-- Navigation -->
	<nav class="flex-1 overflow-y-auto px-3 py-3 space-y-0.5" aria-label="Main navigation">
		{#each nav as item (item.href)}
			{#if item.children}
				<!-- Group with children -->
				<div>
					<button
						class="tap-target w-full flex items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors
							{isGroupActive(item)
							? 'bg-[var(--color-lingua-primary-soft)] text-[var(--color-lingua-primary-strong)]'
							: 'text-foreground hover:bg-accent'}"
						onclick={() => toggleGroup(item.href)}
						aria-expanded={expandedGroups.has(item.href)}
					>
						<item.icon size={18} class="shrink-0" />
						<span class="flex-1 text-left">{item.label}</span>
						{#if expandedGroups.has(item.href)}
							<ChevronDown size={14} class="shrink-0 text-muted-foreground" />
						{:else}
							<ChevronRight size={14} class="shrink-0 text-muted-foreground" />
						{/if}
					</button>
					{#if expandedGroups.has(item.href)}
						<div class="ml-6 mt-0.5 space-y-0.5">
							{#each item.children as child (child.href)}
								<a
									href={child.href}
									class="tap-target flex items-center gap-2 rounded-lg px-3 text-sm transition-colors
										{isActive(child.href)
										? 'font-semibold text-[var(--color-lingua-primary-strong)] bg-[var(--color-lingua-primary-soft)]'
										: 'text-muted-foreground hover:text-foreground hover:bg-accent'}"
									aria-current={isActive(child.href) ? 'page' : undefined}
								>
									<Tag size={13} class="shrink-0 opacity-50" />
									{child.label}
								</a>
							{/each}
						</div>
					{/if}
				</div>
			{:else}
				<!-- Single nav item -->
				<a
					href={item.href}
					class="tap-target flex items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors
						{isActive(item.href)
						? 'bg-[var(--color-lingua-primary-soft)] text-[var(--color-lingua-primary-strong)]'
						: 'text-foreground hover:bg-accent'}"
					aria-current={isActive(item.href) ? 'page' : undefined}
				>
					<item.icon size={18} class="shrink-0" />
					{item.label}
				</a>
			{/if}
		{/each}
	</nav>

	<Separator.Root />

	<!-- User footer -->
	<div class="shrink-0 px-3 py-3">
		{#if userName}
			<div class="flex items-center gap-3 px-2 py-2 mb-1">
				<div
					class="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-lingua-primary-soft)] text-[var(--color-lingua-primary-strong)] text-sm font-bold"
					aria-hidden="true"
				>
					{userName.charAt(0).toUpperCase()}
				</div>
				<div class="min-w-0">
					<p class="truncate text-sm font-semibold">{userName}</p>
					{#if userRole}
						<p class="truncate text-xs capitalize text-muted-foreground">{userRole}</p>
					{/if}
				</div>
			</div>
		{/if}
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
