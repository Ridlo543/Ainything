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
			primary: 'bg-ainything-primary-soft text-ainything-primary-strong',
			accent: 'bg-ainything-accent-soft text-ainything-accent',
			success: 'bg-ainything-success-soft text-ainything-success',
			warning: 'bg-ainything-warning-soft text-ainything-warning',
			danger: 'bg-ainything-danger-soft text-ainything-danger',
			info: 'bg-ainything-info-soft text-ainything-info'
		}[tone]
	);
</script>

<article class="surface rounded-lg p-4">
	<div class="flex items-start justify-between gap-3">
		<div>
			<p class="text-sm text-ainything-subtle">{label}</p>
			<p class="mt-2 text-2xl font-semibold text-ainything-text">{value}</p>
		</div>
		<span class={`rounded-lg p-2.5 ${toneClass}`}>
			<Icon size={22} />
		</span>
	</div>
	<p class="mt-3 text-sm text-ainything-subtle">{detail}</p>
</article>
