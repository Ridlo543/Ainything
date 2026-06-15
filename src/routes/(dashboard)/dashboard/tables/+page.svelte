<script lang="ts">
	import { Download, QrCode } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { restaurants } from '$lib/mock/restaurants';

	const tables = Array.from({ length: 12 }, (_, index) => `T${String(index + 1).padStart(2, '0')}`);
	const restaurant = restaurants[0];
</script>

<svelte:head>
	<title>QR Tables · LinguaServe</title>
</svelte:head>

<section class="grid gap-5">
	<div>
		<p class="text-sm font-semibold text-lingua-primary">Table QR manager</p>
		<h1 class="mt-2 text-3xl font-semibold">Print-ready QR cards</h1>
		<p class="mt-2 text-lingua-subtle">
			Prototype cards point to the public customer route and use local QR-style art.
		</p>
	</div>

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
		{#each tables as table (table)}
			<article class="surface rounded-lg p-4">
				<div class="flex items-start justify-between gap-3">
					<div>
						<p class="text-sm text-lingua-subtle">{restaurant.name}</p>
						<h2 class="text-xl font-semibold">{table}</h2>
					</div>
					<QrCode class="text-lingua-primary" size={24} />
				</div>
				<div class="qr-pattern mx-auto mt-4 h-44 w-44 rounded-lg border border-lingua-border"></div>
				<a
					class="tap-target mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-lingua-primary px-4 text-sm font-semibold text-white"
					href={resolve(`/r/${restaurant.slug}/table/${table}`)}
				>
					<Download size={16} /> Open QR URL
				</a>
			</article>
		{/each}
	</div>
</section>
