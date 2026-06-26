<script lang="ts">
	import { Sun, Moon, Monitor } from '@lucide/svelte';
	import { theme } from './theme.svelte';

	const label = $derived(
		theme.mode === 'light' ? 'Light mode' : theme.mode === 'dark' ? 'Dark mode' : 'System theme'
	);
</script>

<button
	type="button"
	onclick={() => theme.cycle()}
	aria-label={`Switch theme (current: ${label})`}
	title={label}
	class="flex h-9 w-9 items-center justify-center rounded-lg text-ainything-subtle transition-all hover:bg-ainything-muted hover:text-ainything-text"
>
	{#if theme.mode === 'light'}
		<Sun size={16} />
	{:else if theme.mode === 'dark'}
		<Moon size={16} />
	{:else}
		<Monitor size={16} />
	{/if}
</button>
