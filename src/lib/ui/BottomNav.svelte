<script lang="ts">
	import { page } from '$app/stores';
	import { Home, Package, ShoppingCart, Settings } from '@lucide/svelte';

	const currentPath = $derived($page.url.pathname);

	const items: { href: string; label: string; icon: typeof Home }[] = [
		{ href: '/dashboard', label: 'Home', icon: Home },
		{ href: '/dashboard/catalog', label: 'Catalog', icon: Package },
		{ href: '/dashboard/orders', label: 'Orders', icon: ShoppingCart },
		{ href: '/dashboard/settings', label: 'Settings', icon: Settings }
	];

	function isActive(href: string): boolean {
		if (href === '/dashboard') return currentPath === '/dashboard';
		return currentPath.startsWith(href);
	}
</script>

<!--
	@component
	Bottom navigation bar for mobile owner dashboard.
	Visible only below lg breakpoint.
-->
<nav
	class="fixed bottom-0 inset-x-0 z-30 flex bg-card safe-area-pb lg:hidden"
	aria-label="Bottom navigation"
>
	{#each items as item (item.href)}
		<a
			href={item.href}
			class="flex flex-1 flex-col items-center justify-center gap-1 py-2 min-h-[56px] text-xs font-medium transition-colors
				{isActive(item.href)
					? 'text-primary'
					: 'text-muted-foreground hover:text-foreground'}"
			aria-current={isActive(item.href) ? 'page' : undefined}
		>
			<div class="relative">
				<item.icon size={22} />
				{#if isActive(item.href)}
					<span
						class="absolute -top-1 -right-1 size-2 rounded-full bg-primary"
						aria-hidden="true"
					></span>
				{/if}
			</div>
			<span>{item.label}</span>
		</a>
	{/each}
</nav>
