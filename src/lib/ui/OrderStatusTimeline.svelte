<script lang="ts">
	import type { OrderStatus } from '$lib/domain/order/types';
	import { Clock, ChefHat, Package, CheckCircle, XCircle } from '@lucide/svelte';

	let { status }: { status: OrderStatus } = $props();

	const steps: { key: OrderStatus; label: string; icon: typeof Clock }[] = [
		{ key: 'new', label: 'Diterima', icon: Clock },
		{ key: 'processing', label: 'Diproses', icon: ChefHat },
		{ key: 'ready', label: 'Siap', icon: Package },
		{ key: 'completed', label: 'Selesai', icon: CheckCircle }
	];

	const statusIndex = $derived(steps.findIndex((s) => s.key === status));
	const isCancelled = $derived(status === 'cancelled');
</script>

{#if isCancelled}
	<div
		class="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2"
	>
		<XCircle size={16} class="text-destructive" />
		<span class="text-sm font-medium text-destructive">Pesanan dibatalkan</span>
	</div>
{:else}
	<div class="flex items-center justify-between">
		{#each steps as step, i (step.key)}
			{@const reached = i <= statusIndex}
			<div class="flex flex-1 flex-col items-center gap-1.5">
				<div
					class="flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors"
					class:border-primary={reached}
					class:bg-primary={reached}
					class:text-primary-foreground={reached}
					class:border-muted={!reached}
					class:bg-background={!reached}
					class:text-muted-foreground={!reached}
				>
					<step.icon size={16} />
				</div>
				<span
					class="text-[11px] font-medium leading-tight"
					class:text-primary={reached}
					class:text-muted-foreground={!reached}
				>
					{step.label}
				</span>
			</div>
			{#if i < steps.length - 1}
				<div
					class="mb-5 h-0.5 flex-1 rounded-full transition-colors"
					class:bg-primary={i < statusIndex}
					class:bg-muted={i >= statusIndex}
				></div>
			{/if}
		{/each}
	</div>
{/if}
