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
			primary: 'bg-lingua-primary-soft text-lingua-primary-strong',
			accent: 'bg-lingua-accent-soft text-lingua-accent',
			success: 'bg-lingua-success-soft text-lingua-success',
			warning: 'bg-lingua-warning-soft text-lingua-warning',
			danger: 'bg-lingua-danger-soft text-lingua-danger',
			info: 'bg-lingua-info-soft text-lingua-info'
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
