<script lang="ts">
	type Tone = 'neutral' | 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

	let {
		label,
		tone = 'neutral',
		shape = 'rounded'
	}: { label: string; tone?: Tone; shape?: 'rounded' | 'pill' } = $props();

	const toneClass: Record<Tone, string> = {
		neutral: 'border-ainything-border bg-ainything-muted text-ainything-text',
		primary: 'border-ainything-primary/30 bg-ainything-primary-soft text-ainything-primary-strong',
		accent: 'border-ainything-accent/30 bg-ainything-accent-soft text-ainything-accent',
		success: 'border-ainything-success/30 bg-ainything-success-soft text-ainything-success',
		warning: 'border-ainything-warning/30 bg-ainything-warning-soft text-ainything-warning',
		danger: 'border-ainything-danger/30 bg-ainything-danger-soft text-ainything-danger',
		info: 'border-ainything-info/30 bg-ainything-info-soft text-ainything-info'
	};
</script>

<span
	class={`inline-flex items-center ${shape === 'pill' ? 'rounded-full' : 'rounded-md'} border px-2.5 py-1 text-xs font-semibold ${toneClass[tone]}`}
>
	{label}
</span>
