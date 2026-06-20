<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { browser } from '$app/environment';
	import { getState, dir } from '$lib/i18n';
	import { theme } from '$lib/theme/theme.svelte';

	let { children } = $props();

	$effect(() => {
		if (browser) {
			const { language } = getState();
			document.documentElement.lang = language;
			document.documentElement.dir = dir(language);
		}
	});

	$effect(() => {
		if (browser) {
			document.documentElement.dataset.theme = theme.resolved;
			document.documentElement.style.colorScheme = theme.resolved;
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="manifest" href="/manifest.webmanifest" />
	<meta name="theme-color" content="#0f766e" media="(prefers-color-scheme: light)" />
	<meta name="theme-color" content="#0a0f1a" media="(prefers-color-scheme: dark)" />
	<meta
		name="description"
		content="Lingua is a multi-restaurant QR menu and guest support platform for tourist-heavy restaurants."
	/>
</svelte:head>
{@render children()}
