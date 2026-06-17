<script lang="ts">
	import {
		BarChart3,
		TrendingUp,
		TrendingDown,
		MessageCircle,
		Clock,
		ThumbsUp
	} from '@lucide/svelte';
	import type { PageData } from './$types';
	import type { RestaurantMetrics } from '$lib/server/repositories/metrics-repository';
	import { t, tWithVars } from '$lib/i18n/translations.svelte';

	let { data }: { data: PageData } = $props();

	const activeOrganization = $derived(data.tenant.organization);
	const scopedRestaurants = $derived(data.tenant.restaurants);
	const windowDays = $derived(data.windowDays ?? 7);
	const hasRealMetrics = $derived(data.metrics !== null);

	function getMetrics(restaurantId: string): RestaurantMetrics | null {
		if (!data.metrics) return null;
		return (data.metrics[restaurantId] as RestaurantMetrics) ?? null;
	}

	function helpfulRate(restaurantId: string): number {
		return (
			getMetrics(restaurantId)?.helpfulRate ??
			scopedRestaurants.find((r) => r.id === restaurantId)?.analytics?.helpfulRate ??
			0
		);
	}

	function fallbackRate(restaurantId: string): number {
		return (
			getMetrics(restaurantId)?.fallbackRate ??
			scopedRestaurants.find((r) => r.id === restaurantId)?.analytics?.fallbackRate ??
			0
		);
	}

	function totalChats(id: string): number {
		return getMetrics(id)?.totalChats ?? 0;
	}

	const summary = $derived({
		totalChats: scopedRestaurants.reduce((s, r) => s + totalChats(r.id), 0),
		avgHelpfulRate: scopedRestaurants.length
			? Math.round(
					scopedRestaurants.reduce((s, r) => s + helpfulRate(r.id), 0) / scopedRestaurants.length
				)
			: 0,
		avgFallbackRate: scopedRestaurants.length
			? Math.round(
					scopedRestaurants.reduce((s, r) => s + fallbackRate(r.id), 0) / scopedRestaurants.length
				)
			: 0
	});

	const windowOptions = [
		{ value: 1, label: t('analytics.window.today') },
		{ value: 7, label: t('analytics.window.7d') },
		{ value: 30, label: t('analytics.window.30d') },
		{ value: 90, label: t('analytics.window.90d') }
	];
</script>

<svelte:head>
	<title>{t('analytics.title')}</title>
</svelte:head>

<section class="grid gap-5">
	<div class="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<p class="text-sm font-semibold text-lingua-primary">{activeOrganization.name}</p>
			<h1 class="mt-2 text-3xl font-semibold">{t('analytics.heading')}</h1>
			<p class="mt-2 text-lingua-subtle">
				{#if hasRealMetrics}
					{tWithVars('analytics.description.live', { days: String(windowDays) })}
				{:else}
					{t('analytics.description.preview')}
				{/if}
			</p>
		</div>

		<form method="GET" class="flex items-center gap-2 text-sm">
			<label for="window-select" class="font-medium text-lingua-subtle"
				>{t('analytics.window.label')}</label
			>
			<select
				id="window-select"
				name="window"
				class="rounded-lg border border-lingua-border bg-white px-3 py-2 text-sm"
				value={windowDays}
				onchange={(e) => (e.currentTarget.form as HTMLFormElement)?.submit()}
			>
				{#each windowOptions as opt (opt.value)}
					<option value={opt.value}>{opt.label}</option>
				{/each}
			</select>
		</form>
	</div>

	<!-- Summary tiles -->
	<div class="grid gap-3 sm:grid-cols-3">
		<div class="surface rounded-lg p-4">
			<div class="flex items-center gap-2 text-lingua-subtle">
				<MessageCircle size={18} />
				<span class="text-sm font-medium">{t('analytics.stat.totalChats')}</span>
			</div>
			<p class="mt-2 text-3xl font-semibold text-lingua-text">{summary.totalChats}</p>
			<p class="mt-1 text-sm text-lingua-subtle">
				{tWithVars('analytics.stat.totalChats.detail', { n: String(scopedRestaurants.length) })}
			</p>
		</div>
		<div class="surface rounded-lg p-4">
			<div class="flex items-center gap-2 text-lingua-subtle">
				<TrendingUp size={18} />
				<span class="text-sm font-medium">{t('analytics.stat.helpfulRate')}</span>
			</div>
			<p class="mt-2 text-3xl font-semibold text-lingua-primary">{summary.avgHelpfulRate}%</p>
			<p class="mt-1 text-sm text-lingua-subtle">{t('analytics.stat.helpfulRate.detail')}</p>
		</div>
		<div class="surface rounded-lg p-4">
			<div class="flex items-center gap-2 text-lingua-subtle">
				<TrendingDown size={18} />
				<span class="text-sm font-medium">{t('analytics.stat.fallbackRate')}</span>
			</div>
			<p
				class="mt-2 text-3xl font-semibold {summary.avgFallbackRate > 40
					? 'text-lingua-warning'
					: 'text-lingua-text'}"
			>
				{summary.avgFallbackRate}%
			</p>
			<p class="mt-1 text-sm text-lingua-subtle">{t('analytics.stat.fallbackRate.detail')}</p>
		</div>
	</div>

	<!-- Per-restaurant breakdown -->
	<div class="surface rounded-lg p-4">
		<div class="flex items-center gap-3">
			<BarChart3 class="text-lingua-primary" size={24} />
			<h2 class="font-semibold">{t('analytics.breakdown.heading')}</h2>
		</div>

		<div class="mt-5 grid gap-4">
			{#each scopedRestaurants as restaurant (restaurant.id)}
				{@const m = getMetrics(restaurant.id)}
				<div class="rounded-lg border border-lingua-border bg-white p-4">
					<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
						<div>
							<p class="font-semibold text-lingua-text">{restaurant.name}</p>
							<p class="mt-0.5 text-sm text-lingua-subtle">
								{restaurant.segment} · {restaurant.location}
							</p>
						</div>
						{#if m}
							<div class="flex flex-wrap gap-3 text-sm">
								<span
									class="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 font-medium"
								>
									<MessageCircle size={13} />
									{tWithVars('analytics.breakdown.chats', {
										n: String(m.totalChats),
										plural: m.totalChats !== 1 ? 's' : ''
									})}
								</span>
								{#if m.latencyP95 !== null}
									<span
										class="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 font-medium"
									>
										<Clock size={13} />
										{tWithVars('analytics.breakdown.p95', { ms: String(m.latencyP95) })}
									</span>
								{/if}
								{#if m.totalFeedback > 0}
									<span
										class="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 font-medium"
									>
										<ThumbsUp size={13} />
										{tWithVars('analytics.breakdown.feedback', {
											helpful: String(m.helpfulFeedback),
											total: String(m.totalFeedback)
										})}
									</span>
								{/if}
							</div>
						{/if}
					</div>

					<div class="mt-4 grid grid-cols-[1fr_56px] items-center gap-3">
						<div class="h-3 overflow-hidden rounded-full bg-slate-100">
							<div
								class="h-full rounded-full bg-lingua-primary transition-all duration-300"
								style="width: {Math.min(100, helpfulRate(restaurant.id))}%"
							></div>
						</div>
						<div class="flex items-center gap-1 font-semibold text-lingua-primary">
							<TrendingUp size={14} />
							{helpfulRate(restaurant.id)}%
						</div>
					</div>
					<div class="mt-2 grid grid-cols-[1fr_56px] items-center gap-3">
						<div class="h-2 overflow-hidden rounded-full bg-slate-100">
							<div
								class="h-full rounded-full bg-amber-400 transition-all duration-300"
								style="width: {Math.min(100, fallbackRate(restaurant.id))}%"
							></div>
						</div>
						<div class="flex items-center gap-1 text-sm font-medium text-amber-600">
							{fallbackRate(restaurant.id)}% fallback
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>
