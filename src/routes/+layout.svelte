<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { browser } from '$app/environment';
	import { getState, dir } from '$lib/i18n';

	let { children } = $props();

	$effect(() => {
		if (browser) {
			const { language } = getState();
			document.documentElement.lang = language;
			document.documentElement.dir = dir(language);
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="manifest" href="/manifest.webmanifest" />
	<meta name="theme-color" content="#0f766e" />
	<meta
		name="description"
		content="LinguaServe is a multi-restaurant QR menu and guest support platform for tourist-heavy restaurants."
	/>
</svelte:head>
{@render children()}
