<script lang="ts">
	import { Activity, AlertTriangle, Building2, MessageCircle, QrCode } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';
	import StatTile from '$lib/ui/primitives/StatTile.svelte';
	import { t, tWithVars } from '$lib/i18n/translations.svelte';

	let { data }: { data: PageData } = $props();

	const activeOrganization = $derived(data.tenant.organization);
	const scopedRestaurants = $derived(data.tenant.restaurants);
	const activeRestaurants = $derived(scopedRestaurants.length);

	const scansToday = $derived(
		scopedRestaurants.reduce((sum, r) => sum + (r.analytics?.scansToday ?? 0), 0)
	);
	const fallbackRate = $derived(
		scopedRestaurants.length
			? Math.round(
					scopedRestaurants.reduce((sum, r) => sum + (r.analytics?.fallbackRate ?? 0), 0) /
						scopedRestaurants.length
				)
			: 0
	);
	const needsReview = $derived(
		scopedRestaurants.reduce(
			(sum, r) => sum + r.importIssues.filter((i) => i.status !== 'approved').length,
			0
		)
	);
	const recentRequests = $derived(data.recentRequests ?? []);
</script>

<svelte:head>
	<title>{t('dashboard.title')}</title>
</svelte:head>

<section class="grid gap-5">
	<div>
		<p class="text-sm font-semibold text-lingua-primary">{activeOrganization.name}</p>
		<h1 class="mt-2 text-3xl font-semibold text-lingua-text">{t('dashboard.heading')}</h1>
		<p class="mt-2 max-w-3xl text-lingua-subtle">{t('dashboard.description')}</p>
	</div>

	<div class="surface rounded-lg p-4">
		<div class="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
			<div class="flex items-start gap-3">
				<span class="rounded-lg bg-lingua-primary-soft p-3 text-lingua-primary">
					<Building2 size={23} />
				</span>
				<div>
					<p class="font-semibold text-lingua-text">{t('dashboard.workspace.label')}</p>
					<p class="mt-1 text-sm leading-6 text-lingua-subtle">
						{tWithVars('dashboard.workspace.detail', { host: activeOrganization.workspaceHost })}
					</p>
				</div>
			</div>
			<a
				class="tap-target inline-flex items-center justify-center rounded-lg border border-lingua-border bg-white px-4 text-sm font-semibold"
				href={resolve('/dashboard/tables')}
			>
				{t('dashboard.workspace.manageQr')}
			</a>
		</div>
	</div>

	<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
		<StatTile
			label={t('dashboard.stat.restaurants')}
			value={activeRestaurants}
			detail={t('dashboard.stat.restaurants.detail')}
			icon={Activity}
		/>
		<StatTile
			label={t('dashboard.stat.scans')}
			value={scansToday}
			detail={t('dashboard.stat.scans.detail')}
			icon={QrCode}
			tone="accent"
		/>
		<StatTile
			label={t('dashboard.stat.fallback')}
			value={`${fallbackRate}%`}
			detail={t('dashboard.stat.fallback.detail')}
			icon={MessageCircle}
			tone="info"
		/>
		<StatTile
			label={t('dashboard.stat.issues')}
			value={needsReview}
			detail={t('dashboard.stat.issues.detail')}
			icon={AlertTriangle}
			tone="warning"
		/>
	</div>

	<div class="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
		<section class="surface rounded-lg p-4">
			<div class="flex items-center justify-between gap-3">
				<h2 class="font-semibold text-lingua-text">{t('dashboard.health.heading')}</h2>
				<a class="text-sm font-semibold text-lingua-primary" href={resolve('/dashboard/analytics')}>
					{t('dashboard.health.viewReports')}
				</a>
			</div>
			<div class="mt-4 overflow-x-auto">
				<table class="w-full min-w-[780px] text-left text-sm">
					<thead class="text-lingua-subtle">
						<tr class="border-b border-lingua-border">
							<th class="py-3 pr-4">{t('dashboard.health.col.restaurant')}</th>
							<th class="py-3 pr-4">{t('dashboard.health.col.segment')}</th>
							<th class="py-3 pr-4">{t('dashboard.health.col.host')}</th>
							<th class="py-3 pr-4">{t('dashboard.health.col.scans')}</th>
							<th class="py-3 pr-4">{t('dashboard.health.col.helpful')}</th>
							<th class="py-3 pr-4">{t('dashboard.health.col.fallback')}</th>
						</tr>
					</thead>
					<tbody>
						{#each scopedRestaurants as restaurant (restaurant.id)}
							<tr class="border-b border-slate-100">
								<td class="py-3 pr-4 font-semibold text-lingua-text">{restaurant.name}</td>
								<td class="py-3 pr-4 text-lingua-subtle">{restaurant.segment}</td>
								<td class="py-3 pr-4 text-lingua-subtle">{restaurant.publicHost}</td>
								<td class="py-3 pr-4">{restaurant.analytics?.scansToday ?? 0}</td>
								<td class="py-3 pr-4">{restaurant.analytics?.helpfulRate ?? 0}%</td>
								<td class="py-3 pr-4">{restaurant.analytics?.fallbackRate ?? 0}%</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>

		<section class="surface rounded-lg p-4">
			<h2 class="font-semibold text-lingua-text">{t('dashboard.queue.heading')}</h2>
			{#if recentRequests.length === 0}
				<p class="mt-4 text-sm text-lingua-subtle">{t('dashboard.queue.empty')}</p>
			{:else}
				<div class="mt-4 grid gap-3">
					{#each recentRequests as request (request.id)}
						<div class="rounded-lg border border-lingua-border bg-white p-3">
							<div class="flex justify-between gap-3">
								<p class="font-semibold">
									{request.tableCode ? `Table ${request.tableCode} — ` : ''}{request.guestNeed}
								</p>
								<span class="shrink-0 text-xs font-semibold text-lingua-primary"
									>{request.status}</span
								>
							</div>
							<p class="mt-2 text-sm leading-6 text-lingua-subtle">{request.summary}</p>
						</div>
					{/each}
				</div>
			{/if}
			<a
				class="mt-3 block text-sm font-semibold text-lingua-primary"
				href={resolve('/staff/inbox')}
			>
				{t('dashboard.queue.openInbox')}
			</a>
		</section>
	</div>
</section>
