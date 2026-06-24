<script lang="ts">
	import type { PageData } from './$types';
	import {
		MessageSquare,
		AlertTriangle,
		ThumbsUp,
		Timer,
		Building2,
		Utensils,
		TrendingUp,
		Activity
	} from '@lucide/svelte';

	let { data }: { data: PageData } = $props();
	const analytics = $derived(data.analytics);
	const windowDays = $derived(data.windowDays);

	const WINDOWS = [7, 14, 30, 60, 90] as const;

	type Tone = 'success' | 'warning' | 'danger' | 'neutral';

	function fallbackTone(rate: number): Tone {
		if (rate <= 10) return 'success';
		if (rate <= 25) return 'warning';
		return 'danger';
	}

	function helpfulTone(rate: number): Tone {
		if (rate >= 80) return 'success';
		if (rate >= 60) return 'warning';
		return 'danger';
	}

	const tileClasses: Record<Tone, string> = {
		success: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800',
		warning: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800',
		danger: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
		neutral: 'bg-white border-gray-200 dark:bg-gray-900 dark:border-gray-700'
	};

	const valueTone: Record<Tone, string> = {
		success: 'text-emerald-700 dark:text-emerald-400',
		warning: 'text-amber-700 dark:text-amber-400',
		danger: 'text-red-700 dark:text-red-400',
		neutral: 'text-gray-900 dark:text-white'
	};

	// Precomputed tones (cannot use {@const} outside {#each}/{#if children)
	const ft = $derived(analytics ? fallbackTone(analytics.fallbackRate) : 'neutral');
	const ht = $derived(analytics ? helpfulTone(analytics.helpfulRate) : 'neutral');
</script>

<svelte:head>
	<title>Platform Analytics</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8">
	<!-- Header -->
	<div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-xl font-semibold text-gray-900 dark:text-white">Platform Analytics</h1>
			<p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
				Aggregate metrics across all restaurants · last {windowDays} days
			</p>
		</div>
		<!-- Window selector -->
		<div class="flex gap-1">
			{#each WINDOWS as w (w)}
				<a
					href={'/platform/analytics?days=' + w}
					class="rounded px-2.5 py-1 text-xs font-medium transition-colors
						{windowDays === w
						? 'bg-indigo-600 text-white'
						: 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'}"
				>
					{w}d
				</a>
			{/each}
		</div>
	</div>

	{#if !analytics}
		<!-- No DB / mock mode -->
		<div
			class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-6 text-center text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400"
		>
			Analytics unavailable — no database connection configured.
		</div>
	{:else}
		<!-- AI metrics -->
		<h2 class="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
			AI Conversations · {windowDays}d
		</h2>
		<div class="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
			<!-- Total chats -->
			<div class="rounded-lg border p-4 {tileClasses.neutral}">
				<div class="mb-1 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
					<MessageSquare size={13} />
					Total chats
				</div>
				<div class="text-2xl font-bold {valueTone.neutral}">
					{analytics.totalChatEvents.toLocaleString()}
				</div>
			</div>

			<!-- Fallback rate -->
			<div class="rounded-lg border p-4 {tileClasses[ft]}">
				<div class="mb-1 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
					<AlertTriangle size={13} />
					Fallback rate
				</div>
				<div class="text-2xl font-bold {valueTone[ft]}">{analytics.fallbackRate}%</div>
				<div class="mt-0.5 text-xs text-gray-400">
					{analytics.totalFallbacks.toLocaleString()} escalated
				</div>
			</div>

			<!-- Helpful rate -->
			<div class="rounded-lg border p-4 {tileClasses[ht]}">
				<div class="mb-1 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
					<ThumbsUp size={13} />
					Helpful rate
				</div>
				<div class="text-2xl font-bold {valueTone[ht]}">{analytics.helpfulRate}%</div>
				<div class="mt-0.5 text-xs text-gray-400">
					{analytics.totalFeedback.toLocaleString()} rated
				</div>
			</div>

			<!-- P95 latency -->
			<div class="rounded-lg border p-4 {tileClasses.neutral}">
				<div class="mb-1 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
					<Timer size={13} />
					P95 latency
				</div>
				<div class="text-2xl font-bold {valueTone.neutral}">
					{#if analytics.latencyP95 != null}
						{analytics.latencyP95.toLocaleString()} ms
					{:else}
						<span class="text-base text-gray-400">—</span>
					{/if}
				</div>
			</div>
		</div>

		<!-- Growth (7d) -->
		<h2 class="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
			Growth · last 7 days
		</h2>
		<div class="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
			<div class="rounded-lg border p-4 {tileClasses.neutral}">
				<div class="mb-1 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
					<Building2 size={13} />
					New organizations
				</div>
				<div class="text-2xl font-bold {valueTone.neutral}">
					{analytics.newOrganizations7d}
				</div>
			</div>
			<div class="rounded-lg border p-4 {tileClasses.neutral}">
				<div class="mb-1 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
					<Utensils size={13} />
					New restaurants
				</div>
				<div class="text-2xl font-bold {valueTone.neutral}">
					{analytics.newRestaurants7d}
				</div>
			</div>
		</div>

		<!-- Quick links -->
		<h2 class="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
			Quick links
		</h2>
		<div class="grid gap-2 sm:grid-cols-3">
			{#each [{ href: '/platform/organizations', label: 'All organizations', icon: Building2 }, { href: '/platform/restaurants', label: 'All restaurants', icon: Utensils }, { href: '/platform', label: 'Platform overview', icon: Activity }] as link (link.href)}
				{@const Icon = link.icon}
				<a
					href={link.href}
					class="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
				>
					<Icon size={16} class="shrink-0 text-gray-400" />
					{link.label}
					<TrendingUp size={14} class="ml-auto text-gray-300 dark:text-gray-600" />
				</a>
			{/each}
		</div>
	{/if}
</div>
