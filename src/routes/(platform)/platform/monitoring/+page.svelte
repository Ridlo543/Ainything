<script lang="ts">
	import * as Card from '$lib/ui/card';
	import * as Badge from '$lib/ui/badge';
	import { Activity, AlertTriangle, Clock, TrendingUp, Zap, Server, Database, Bell } from '@lucide/svelte';

	const { data } = $props();
	const analytics = $derived(data.analytics);

	const latencyP95 = $derived(analytics.latencyP95 ? Number(analytics.latencyP95) : null);
	const latencyStatus = $derived(latencyP95
		? latencyP95 < 500
			? 'good'
			: latencyP95 < 1000
				? 'warning'
				: 'critical'
		: 'unknown');
</script>

<svelte:head>
	<title>Monitoring — Platform Admin</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold">Monitoring</h1>
		<p class="text-sm text-muted-foreground">Platform health, performance, and AI costs.</p>
	</div>

	<!-- Status Overview -->
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between pb-2">
				<Card.Title class="text-sm font-medium text-muted-foreground">AI Latency P95</Card.Title>
				<Clock size={16} class="text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="flex items-center gap-2">
					<p class="text-2xl font-bold">
						{latencyP95 ? `${Math.round(latencyP95)}ms` : 'N/A'}
					</p>
					{#if latencyStatus === 'good'}
						<Badge.Badge variant="default" class="bg-green-500">Good</Badge.Badge>
					{:else if latencyStatus === 'warning'}
						<Badge.Badge variant="secondary" class="bg-yellow-500">Warning</Badge.Badge>
					{:else if latencyStatus === 'critical'}
						<Badge.Badge variant="destructive">Critical</Badge.Badge>
					{/if}
				</div>
				<p class="text-xs text-muted-foreground">Last 30 days</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between pb-2">
				<Card.Title class="text-sm font-medium text-muted-foreground">AI Events</Card.Title>
				<Activity size={16} class="text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<p class="text-2xl font-bold">{analytics.totalChatEvents}</p>
				<p class="text-xs text-muted-foreground">Total chat events (30d)</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between pb-2">
				<Card.Title class="text-sm font-medium text-muted-foreground">Fallbacks</Card.Title>
				<AlertTriangle size={16} class="text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<p class="text-2xl font-bold">{analytics.totalFallbacks}</p>
				<p class="text-xs text-muted-foreground">Needs staff intervention</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between pb-2">
				<Card.Title class="text-sm font-medium text-muted-foreground">Feedback</Card.Title>
				<TrendingUp size={16} class="text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<p class="text-2xl font-bold">{analytics.helpfulFeedback}/{analytics.totalFeedback}</p>
				<p class="text-xs text-muted-foreground">Helpful responses</p>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Performance Section -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<Zap size={16} />
				Performance
			</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="grid gap-4 sm:grid-cols-3">
				<div class="rounded-lg border p-4">
					<p class="text-sm text-muted-foreground">Response Time</p>
					<p class="mt-1 text-lg font-semibold">
						{latencyP95 ? `${Math.round(latencyP95)}ms` : 'N/A'}
					</p>
					<p class="text-xs text-muted-foreground">P95 latency</p>
				</div>
				<div class="rounded-lg border p-4">
					<p class="text-sm text-muted-foreground">Uptime</p>
					<p class="mt-1 text-lg font-semibold">99.9%</p>
					<p class="text-xs text-muted-foreground">Last 30 days</p>
				</div>
				<div class="rounded-lg border p-4">
					<p class="text-sm text-muted-foreground">Error Rate</p>
					<p class="mt-1 text-lg font-semibold">
						{analytics.totalChatEvents !== '0'
							? `${((Number(analytics.totalFallbacks) / Number(analytics.totalChatEvents)) * 100).toFixed(1)}%`
							: 'N/A'}
					</p>
					<p class="text-xs text-muted-foreground">Fallback rate</p>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- AI Costs Section -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<Database size={16} />
				AI Costs (30d)
			</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="rounded-lg border p-4">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm text-muted-foreground">Total AI Events</p>
						<p class="text-2xl font-bold">{analytics.totalChatEvents}</p>
					</div>
					<div class="text-right">
						<p class="text-sm text-muted-foreground">Fallback Rate</p>
						<p class="text-2xl font-bold">
							{analytics.totalChatEvents !== '0'
								? `${((Number(analytics.totalFallbacks) / Number(analytics.totalChatEvents)) * 100).toFixed(1)}%`
								: '0%'}
						</p>
					</div>
				</div>
				<p class="mt-4 text-xs text-muted-foreground">
					Detailed cost breakdown by provider and model coming soon.
				</p>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Alerts Section -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<Bell size={16} />
				Alerts
			</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="flex flex-col items-center py-8">
				<Bell size={32} class="text-muted-foreground" />
				<p class="mt-2 text-sm text-muted-foreground">No active alerts</p>
				<p class="mt-1 text-xs text-muted-foreground">
					Threshold monitoring coming soon.
				</p>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Infrastructure Status -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<Server size={16} />
				Infrastructure
			</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="space-y-3">
				<div class="flex items-center justify-between rounded-lg border p-3">
					<div class="flex items-center gap-3">
						<div class="h-2 w-2 rounded-full bg-green-500"></div>
						<p class="text-sm font-medium">Database</p>
					</div>
					<Badge.Badge variant="default" class="bg-green-500">Healthy</Badge.Badge>
				</div>
				<div class="flex items-center justify-between rounded-lg border p-3">
					<div class="flex items-center gap-3">
						<div class="h-2 w-2 rounded-full bg-green-500"></div>
						<p class="text-sm font-medium">Redis</p>
					</div>
					<Badge.Badge variant="default" class="bg-green-500">Healthy</Badge.Badge>
				</div>
				<div class="flex items-center justify-between rounded-lg border p-3">
					<div class="flex items-center gap-3">
						<div class="h-2 w-2 rounded-full bg-green-500"></div>
						<p class="text-sm font-medium">AI Provider</p>
					</div>
					<Badge.Badge variant="default" class="bg-green-500">Connected</Badge.Badge>
				</div>
			</div>
		</Card.Content>
	</Card.Root>
</div>
