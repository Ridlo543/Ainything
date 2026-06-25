<script lang="ts">
	import { Check } from '@lucide/svelte';

	let { step }: { step: number } = $props();

	const stepLabels = ['Jenis Bisnis', 'Info Akun', 'Detail Bisnis'];
</script>

<div class="flex items-center gap-2">
	{#each stepLabels as label, i}
		<div class="flex items-center gap-2">
			<div
				class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all
				{i + 1 < step ? 'bg-[#059669] text-white' : ''}
				{i + 1 === step ? 'bg-[#059669] text-white ring-4 ring-[#059669]/20' : ''}
				{i + 1 > step ? 'border-2 border-[#e7e5e4] text-[#78716c]' : ''}"
			>
				{#if i + 1 < step}
					<Check size={14} />
				{:else}
					{i + 1}
				{/if}
			</div>
			<span
				class="hidden text-xs font-medium sm:block
				{i + 1 === step ? 'text-[#1a1a2e]' : 'text-[#78716c]'}">{label}</span
			>
		</div>
		{#if i < stepLabels.length - 1}
			<div
				class="h-px flex-1 rounded-full transition-all
				{i + 1 < step ? 'bg-[#059669]' : 'bg-[#e7e5e4]'}"
			></div>
		{/if}
	{/each}
</div>
