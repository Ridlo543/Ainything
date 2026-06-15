<script lang="ts">
	type Tone = 'neutral' | 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

	let { label, tone = 'neutral' }: { label: string; tone?: Tone } = $props();

	const toneClass: Record<Tone, string> = {
		neutral: 'border-slate-200 bg-slate-50 text-slate-700',
		primary: 'border-teal-200 bg-teal-50 text-teal-800',
		accent: 'border-orange-200 bg-orange-50 text-orange-800',
		success: 'border-green-200 bg-green-50 text-green-800',
		warning: 'border-amber-200 bg-amber-50 text-amber-800',
		danger: 'border-red-200 bg-red-50 text-red-800',
		info: 'border-blue-200 bg-blue-50 text-blue-800'
	};
</script>

<span
	class={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${toneClass[tone]}`}
>
	{label}
</span>
