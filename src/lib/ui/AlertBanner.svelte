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
		success: 'border-lingua-success/30 bg-lingua-success-soft text-lingua-success',
		error: 'border-lingua-danger/30 bg-lingua-danger-soft text-lingua-danger',
		warning: 'border-lingua-warning/30 bg-lingua-warning-soft text-lingua-warning',
		info: 'border-lingua-info/30 bg-lingua-info-soft text-lingua-info'
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
