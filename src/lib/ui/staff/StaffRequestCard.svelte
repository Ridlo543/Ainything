<script lang="ts">
	import { AlertTriangle, CheckCircle2, Clock3 } from '@lucide/svelte';
	import type { Restaurant } from '$lib/domain/menu/types';
	import type { StaffRequest } from '$lib/domain/fallback/types';
	import Badge from '$lib/ui/primitives/Badge.svelte';

	let {
		request,
		restaurant,
		selected = false,
		onclick
	}: {
		request: StaffRequest;
		restaurant: Restaurant;
		selected?: boolean;
		onclick?: () => void;
	} = $props();

	const statusTone = $derived(
		request.status === 'resolved' ? 'success' : request.status === 'new' ? 'warning' : 'info'
	);
</script>

<button
	type="button"
	class={`w-full rounded-lg border bg-ainything-surface p-4 text-left transition hover:border-ainything-primary ${
		selected
			? 'border-ainything-primary ring-2 ring-ainything-primary-soft'
			: 'border-ainything-border'
	}`}
	{onclick}
>
	<div class="flex items-start justify-between gap-3">
		<div>
			<p class="font-semibold text-ainything-text">{restaurant.name}</p>
			<p class="mt-1 text-sm font-semibold text-ainything-text">
				{request.tableCode} - {request.guestNeed}
			</p>
			<p class="mt-1 text-sm text-ainything-subtle">{request.summary}</p>
		</div>
		{#if request.priority === 'high'}
			<AlertTriangle class="shrink-0 text-ainything-warning" size={20} />
		{:else if request.status === 'resolved'}
			<CheckCircle2 class="shrink-0 text-ainything-success" size={20} />
		{:else}
			<Clock3 class="shrink-0 text-ainything-info" size={20} />
		{/if}
	</div>
	<div class="mt-3 flex flex-wrap gap-2">
		<Badge label={request.status} tone={statusTone} />
		<Badge label={request.language} tone="neutral" />
		<Badge label={request.lastMessageAt} tone="neutral" />
	</div>
</button>
