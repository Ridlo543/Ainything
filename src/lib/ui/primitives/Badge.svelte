<script lang="ts">
	type Tone = 'neutral' | 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

	let { label, tone = 'neutral', shape = 'rounded' }: { label: string; tone?: Tone; shape?: 'rounded' | 'pill' } = $props();

	const toneClass: Record<Tone, string> = {
		neutral: 'border-lingua-border bg-lingua-muted text-lingua-text',
		primary: 'border-lingua-primary/30 bg-lingua-primary-soft text-lingua-primary-strong',
		accent: 'border-lingua-accent/30 bg-lingua-accent-soft text-lingua-accent',
		success: 'border-lingua-success/30 bg-lingua-success-soft text-lingua-success',
		warning: 'border-lingua-warning/30 bg-lingua-warning-soft text-lingua-warning',
		danger: 'border-lingua-danger/30 bg-lingua-danger-soft text-lingua-danger',
		info: 'border-lingua-info/30 bg-lingua-info-soft text-lingua-info'
	};
</script>

<span
	class={`inline-flex items-center ${shape === 'pill' ? 'rounded-full' : 'rounded-md'} border px-2.5 py-1 text-xs font-semibold ${toneClass[tone]}`}
>
	{label}
</span>
