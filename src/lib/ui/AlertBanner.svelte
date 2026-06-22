<script lang="ts">
	import type { Snippet } from 'svelte';
	import { CheckCircle, AlertTriangle, Info, XCircle, X } from '@lucide/svelte';

	let {
		type,
		message,
		children,
		dismissible = false,
		onDismiss
	}: {
		type: 'success' | 'error' | 'warning' | 'info';
		message?: string;
		children?: Snippet;
		dismissible?: boolean;
		onDismiss?: () => void;
	} = $props();

	const classes = {
		success: 'border-green-300 bg-green-50 text-green-800',
		error: 'border-red-300 bg-red-50 text-red-800',
		warning: 'border-amber-300 bg-amber-50 text-amber-800',
		info: 'border-blue-300 bg-blue-50 text-blue-800'
	};
</script>

<div class="flex items-center gap-2 rounded-lg border px-4 py-3 text-sm {classes[type]}">
	{#if type === 'success'}
		<CheckCircle class="h-4 w-4" />
	{:else if type === 'error'}
		<XCircle class="h-4 w-4" />
	{:else if type === 'warning'}
		<AlertTriangle class="h-4 w-4" />
	{:else if type === 'info'}
		<Info class="h-4 w-4" />
	{/if}

	<div class="flex-1">
		{#if message}
			{message}
		{/if}
		{#if children}
			{@render children()}
		{/if}
	</div>

	{#if dismissible}
		<button type="button" class="ml-auto opacity-70 hover:opacity-100" onclick={onDismiss}>
			<X class="h-4 w-4" />
		</button>
	{/if}
</div>
