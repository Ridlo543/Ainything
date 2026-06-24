<script lang="ts">
	import { page } from '$app/stores';
	import { resolveRoute } from '$app/paths';

	let { children } = $props();
</script>

<div class="flex min-h-screen bg-slate-50">
	<aside class="flex w-64 flex-col border-r border-slate-200 bg-white p-6">
		<h2 class="text-lg font-semibold text-slate-900">Platform Admin</h2>
		<nav class="mt-6 flex flex-col gap-2">
			<a href={resolveRoute('/platform')} class="rounded px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900" class:bg-slate-200={$page.url.pathname === '/platform'}>Overview</a>
			<a href={resolveRoute('/platform/organizations')} class="rounded px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900" class:bg-slate-200={$page.url.pathname.startsWith('/platform/organizations')}>Organizations</a>
			<a href={resolveRoute('/platform/restaurants')} class="rounded px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900" class:bg-slate-200={$page.url.pathname.startsWith('/platform/restaurants')}>Restaurants</a>
			<a href="/platform/analytics" class="rounded px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900" class:bg-slate-200={$page.url.pathname.startsWith('/platform/analytics')}>Analytics</a>
			<a href="/platform/guide" class="rounded px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900" class:bg-slate-200={$page.url.pathname.startsWith('/platform/guide')}>Admin Guide</a>
		</nav>
		<form method="POST" action="/logout" class="mt-auto pt-8">
			<button type="submit" class="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Sign out</button>
		</form>
	</aside>
	<main class="flex-1 p-8">
		{@render children()}
	</main>
</div>
