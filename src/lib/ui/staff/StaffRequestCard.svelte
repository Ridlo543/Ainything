<script lang="ts">
	import { AlertTriangle, CheckCircle2, Clock3 } from '@lucide/svelte';
	import type { StaffRequest } from '$lib/domain/menu/types';
	import { getRestaurant } from '$lib/mock/restaurants';
	import Badge from '$lib/ui/primitives/Badge.svelte';

	let {
		request,
		selected = false,
		onclick
	}: { request: StaffRequest; selected?: boolean; onclick?: () => void } = $props();

	const statusTone = $derived(
		request.status === 'resolved' ? 'success' : request.status === 'new' ? 'warning' : 'info'
	);
	const restaurant = $derived(getRestaurant(request.restaurantSlug));
</script>

<button
	type="button"
	class={`w-full rounded-lg border bg-white p-4 text-left transition hover:border-lingua-primary ${
		selected ? 'border-lingua-primary ring-2 ring-teal-100' : 'border-lingua-border'
	}`}
	{onclick}
>
	<div class="flex items-start justify-between gap-3">
		<div>
			<p class="font-semibold text-lingua-text">{restaurant.name}</p>
			<p class="mt-1 text-sm font-semibold text-lingua-text">
				{request.tableCode} - {request.guestNeed}
			</p>
			<p class="mt-1 text-sm text-lingua-subtle">{request.summary}</p>
		</div>
		{#if request.priority === 'high'}
			<AlertTriangle class="shrink-0 text-lingua-warning" size={20} />
		{:else if request.status === 'resolved'}
			<CheckCircle2 class="shrink-0 text-lingua-success" size={20} />
		{:else}
			<Clock3 class="shrink-0 text-lingua-info" size={20} />
		{/if}
	</div>
	<div class="mt-3 flex flex-wrap gap-2">
		<Badge label={request.status} tone={statusTone} />
		<Badge label={request.language} tone="neutral" />
		<Badge label={request.lastMessageAt} tone="neutral" />
	</div>
</button>
