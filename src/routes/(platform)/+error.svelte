<script lang="ts">
	import { page } from '$app/stores';
	import { resolveRoute } from '$app/paths';
</script>

<svelte:head>
	<title>Platform Error - Lingua</title>
</svelte:head>

<div class="flex min-h-[60vh] items-center justify-center">
	<div class="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
		<p class="text-sm font-medium text-slate-500">{$page.status}</p>
		<h1 class="mt-2 text-xl font-semibold text-slate-900">Platform admin unavailable</h1>
		<p class="mt-2 text-sm text-slate-600">{$page.error?.message ?? 'Something went wrong.'}</p>
		<a
			href={resolveRoute('/platform')}
			class="mt-6 inline-block rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
		>
			Return to overview
		</a>
	</div>
</div>
