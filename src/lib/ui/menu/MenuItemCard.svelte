<script lang="ts">
	import { Flame, ShieldAlert, Star } from '@lucide/svelte';
	import { formatPrice, spiceLabel } from '$lib/domain/menu/policy';
	import type { MenuItem } from '$lib/domain/menu/types';
	import SafetyBadges from './SafetyBadges.svelte';

	let {
		item,
		selected = false,
		onclick
	}: {
		item: MenuItem;
		selected?: boolean;
		onclick?: () => void;
	} = $props();
</script>

<button
	type="button"
	class={`w-full rounded-lg border bg-white p-3 text-left transition hover:border-lingua-primary hover:shadow-sm ${
		selected ? 'border-lingua-primary ring-2 ring-teal-100' : 'border-lingua-border'
	}`}
	{onclick}
>
	<div class="grid grid-cols-[76px_1fr] gap-3">
		<img src={item.image} alt="" class="h-20 w-20 rounded-md object-cover" loading="lazy" />
		<div class="min-w-0">
			<div class="flex items-start justify-between gap-3">
				<div class="min-w-0">
					<p class="truncate font-semibold text-lingua-text">{item.name}</p>
					<p class="truncate text-sm text-lingua-subtle">{item.localName}</p>
				</div>
				<p class="shrink-0 text-sm font-semibold text-lingua-primary">{formatPrice(item.price)}</p>
			</div>

			<p class="mt-2 line-clamp-2 text-sm text-lingua-subtle">{item.description}</p>
			<div class="mt-3 flex flex-wrap gap-2">
				<span
					class="inline-flex items-center gap-1 rounded-md bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-800"
				>
					<Flame size={13} />
					{spiceLabel(item.spiceLevel)}
				</span>
				{#if item.isSignature}
					<span
						class="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800"
					>
						<Star size={13} /> Signature
					</span>
				{/if}
				{#if item.confidence !== 'verified'}
					<span
						class="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-800"
					>
						<ShieldAlert size={13} /> Check
					</span>
				{/if}
			</div>
		</div>
	</div>
	<div class="mt-3">
		<SafetyBadges {item} />
	</div>
</button>
