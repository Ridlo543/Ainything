<script lang="ts">
	import Sidebar from '$lib/ui/Sidebar.svelte';
	import TopBar from '$lib/ui/TopBar.svelte';
	import BottomNav from '$lib/ui/BottomNav.svelte';
	import { Toaster } from '$lib/ui/sonner';
	import type { LayoutData } from './$types';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();

	const tenant = $derived(data.tenant);
	const org = $derived(tenant.organization);
	const outlets = $derived(tenant.outlets);
	const activeOutlet = $derived(tenant.activeOutlet);

	let sidebarOpen = $state(false);
</script>

<div class="flex min-h-screen bg-background">
	<Sidebar
		open={sidebarOpen}
		onclose={() => (sidebarOpen = false)}
		tenantName={org.name}
		tenantSlug={org.slug}
		userName={tenant.user.name}
		userRole={tenant.membership.role}
		outlets={outlets.map((o) => ({ id: o.id, name: o.name, slug: o.slug }))}
		activeOutletSlug={activeOutlet.slug}
		onoutletchange={(slug) => {
			const url = new URL(location.href);
			url.searchParams.set('restaurant', slug);
			location.href = `${url.pathname}${url.search}`;
		}}
	/>

	<div class="flex min-w-0 flex-1 flex-col pb-20 lg:pb-0">
		<TopBar
			tenantName={org.name}
			userName={tenant.user.name}
			userRole={tenant.membership.role}
			showMenuButton
			onmenuclick={() => (sidebarOpen = true)}
		/>

		<main class="flex-1 overflow-y-auto p-4 lg:p-8">
			{@render children()}
		</main>
	</div>

	<BottomNav />
	<Toaster />
</div>
