<script lang="ts">
	import {
		BarChart3,
		BookOpenText,
		ClipboardList,
		Home,
		Import,
		QrCode,
		Utensils
	} from '@lucide/svelte';
	import { resolve } from '$app/paths';

	let { children } = $props();

	type AdminRoute =
		| '/dashboard'
		| '/dashboard/menu'
		| '/dashboard/import'
		| '/dashboard/tables'
		| '/dashboard/knowledge'
		| '/dashboard/analytics';

	const nav: { href: AdminRoute; label: string; icon: typeof Home }[] = [
		{ href: '/dashboard', label: 'Overview', icon: Home },
		{ href: '/dashboard/menu', label: 'Menu', icon: Utensils },
		{ href: '/dashboard/import', label: 'Import review', icon: Import },
		{ href: '/dashboard/tables', label: 'QR tables', icon: QrCode },
		{ href: '/dashboard/knowledge', label: 'Knowledge', icon: BookOpenText },
		{ href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 }
	];
</script>

<main class="min-h-screen">
	<div class="app-container grid gap-5 py-5 lg:grid-cols-[250px_1fr]">
		<aside class="surface rounded-lg p-3 lg:sticky lg:top-5 lg:h-[calc(100vh-40px)]">
			<div class="rounded-lg bg-lingua-primary p-4 text-white">
				<p class="text-sm font-semibold text-white/75">LinguaServe</p>
				<p class="mt-1 text-xl font-semibold">Restaurant admin</p>
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
