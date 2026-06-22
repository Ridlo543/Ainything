<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>Platform Overview - Lingua</title>
</svelte:head>

<div>
	<h1 class="text-2xl font-bold text-slate-900">Platform Overview</h1>
	<p class="mt-2 text-sm text-slate-500">Live platform totals from approved tenant data.</p>

	<div class="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
		<div class="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
			<h3 class="text-sm font-medium text-slate-500">Total Organizations</h3>
			<p class="mt-2 text-3xl font-semibold text-slate-900">{data.stats.totalOrganizations}</p>
		</div>
		<div class="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
			<h3 class="text-sm font-medium text-slate-500">Total Restaurants</h3>
			<p class="mt-2 text-3xl font-semibold text-slate-900">{data.stats.totalRestaurants}</p>
		</div>
		<div class="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
			<h3 class="text-sm font-medium text-slate-500">Platform Users</h3>
			<p class="mt-2 text-3xl font-semibold text-slate-900">{data.stats.platformUsers}</p>
		</div>
	</div>
</div>
