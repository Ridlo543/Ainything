<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="manifest" href="/manifest.webmanifest" />
	<meta name="theme-color" content="#0f766e" />
	<meta
		name="description"
		content="LinguaServe is a QR-based multilingual menu assistant prototype for restaurants."
	/>
</svelte:head>
{@render children()}
