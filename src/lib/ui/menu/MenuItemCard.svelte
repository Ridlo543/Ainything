<script lang="ts">
	import { Flame, ShieldAlert, Star } from '@lucide/svelte';
	import { formatPrice, spiceLabel } from '$lib/domain/menu/policy';
	import type { MenuItem } from '$lib/domain/menu/types';
	import SafetyBadges from './SafetyBadges.svelte';
	import { t } from '$lib/i18n';

	let {
		item,
		selected = false,
		onclick,
		skeleton = false
	}: {
		item: MenuItem;
		selected?: boolean;
		onclick?: () => void;
		skeleton?: boolean;
	} = $props();
</script>

{#if skeleton}
	<div
		class="w-full animate-pulse rounded-lg border border-ainything-border bg-ainything-surface p-3"
	>
		<div class="grid grid-cols-[76px_1fr] gap-3">
			<div class="h-20 w-20 rounded-md bg-slate-200"></div>
			<div class="min-w-0 space-y-2">
				<div class="h-4 w-3/4 rounded bg-slate-200"></div>
				<div class="h-3 w-1/2 rounded bg-slate-100"></div>
				<div class="h-3 w-full rounded bg-slate-100"></div>
				<div class="h-3 w-2/3 rounded bg-slate-100"></div>
			</div>
		</div>
	</div>
{:else}
	<button
		type="button"
		class={`w-full rounded-lg border bg-ainything-surface p-3 text-left transition hover:border-ainything-primary hover:shadow-sm ${
			selected ? 'border-ainything-primary ring-2 ring-teal-100' : 'border-ainything-border'
		}`}
		{onclick}
	>
		<div class="grid grid-cols-[76px_1fr] gap-3">
			<img src={item.image} alt="" class="h-20 w-20 rounded-md object-cover" loading="lazy" />
			<div class="min-w-0">
				<div class="flex items-start justify-between gap-3">
					<div class="min-w-0">
						<p class="truncate font-semibold text-ainything-text">{item.name}</p>
						<p class="truncate text-sm text-ainything-subtle">{item.localName}</p>
					</div>
					<p class="shrink-0 text-sm font-semibold text-ainything-primary">
						{formatPrice(item.price)}
					</p>
				</div>

				<p class="mt-2 line-clamp-2 text-sm text-ainything-subtle">{item.description}</p>
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
							<Star size={13} />
							{t('badge.signature')}
						</span>
					{/if}
					{#if item.confidence !== 'verified'}
						<span
							class="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-800"
						>
							<ShieldAlert size={13} />
							{t('badge.check')}
						</span>
					{/if}
				</div>
			</div>
		</div>
		<div class="mt-3">
			<SafetyBadges {item} />
		</div>
	</button>
{/if}
