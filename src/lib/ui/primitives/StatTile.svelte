<script lang="ts">
	import type { Component } from 'svelte';

	let {
		label,
		value,
		detail,
		icon: Icon,
		tone = 'primary'
	}: {
		label: string;
		value: string | number;
		detail: string;
		icon: Component;
		tone?: 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
	} = $props();

	const toneClass = $derived(
		{
			primary: 'bg-teal-50 text-teal-700',
			accent: 'bg-orange-50 text-orange-700',
			success: 'bg-green-50 text-green-700',
			warning: 'bg-amber-50 text-amber-700',
			danger: 'bg-red-50 text-red-700',
			info: 'bg-blue-50 text-blue-700'
		}[tone]
	);
</script>

<article class="surface rounded-lg p-4">
	<div class="flex items-start justify-between gap-3">
		<div>
			<p class="text-sm text-lingua-subtle">{label}</p>
			<p class="mt-2 text-2xl font-semibold text-lingua-text">{value}</p>
		</div>
		<span class={`rounded-lg p-2.5 ${toneClass}`}>
			<Icon size={22} />
		</span>
	</div>
	<p class="mt-3 text-sm text-lingua-subtle">{detail}</p>
</article>
