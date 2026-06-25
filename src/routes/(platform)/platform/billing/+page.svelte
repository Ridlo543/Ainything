<script lang="ts">
	import * as Card from '$lib/ui/card';
	import { CreditCard, Users, TrendingUp, FileText } from '@lucide/svelte';

	const { data } = $props();
	const stats = $derived(data.stats);

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(amount);
	}

	const planLabels: Record<string, string> = {
		pilot: 'Pilot',
		starter: 'Starter',
		pro: 'Pro',
		enterprise: 'Enterprise'
	};

	const planColors: Record<string, string> = {
		pilot: 'bg-gray-500',
		starter: 'bg-blue-500',
		pro: 'bg-purple-500',
		enterprise: 'bg-amber-500'
	};
</script>

<svelte:head>
	<title>Billing — Platform Admin</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold">Billing</h1>
		<p class="text-sm text-muted-foreground">Subscription plans, usage, and revenue overview.</p>
	</div>

	<!-- Stats Cards -->
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between pb-2">
				<Card.Title class="text-sm font-medium text-muted-foreground">Total Tenants</Card.Title>
				<Users size={16} class="text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<p class="text-2xl font-bold">{stats.totalOrganizations}</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between pb-2">
				<Card.Title class="text-sm font-medium text-muted-foreground">MRR</Card.Title>
				<TrendingUp size={16} class="text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<p class="text-2xl font-bold">{formatCurrency(stats.mrr)}</p>
				<p class="text-xs text-muted-foreground">Monthly Recurring Revenue</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between pb-2">
				<Card.Title class="text-sm font-medium text-muted-foreground">Plans</Card.Title>
				<CreditCard size={16} class="text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<p class="text-2xl font-bold">{stats.byPlan.length}</p>
				<p class="text-xs text-muted-foreground">Active plan types</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between pb-2">
				<Card.Title class="text-sm font-medium text-muted-foreground">Avg Revenue</Card.Title>
				<TrendingUp size={16} class="text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<p class="text-2xl font-bold">
					{stats.totalOrganizations > 0
						? formatCurrency(Math.round(stats.mrr / stats.totalOrganizations))
						: 'N/A'}
				</p>
				<p class="text-xs text-muted-foreground">Per tenant</p>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Usage Overview -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<Users size={16} />
				Usage Overview
			</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="space-y-4">
				{#each stats.byPlan as item (item.plan)}
					<div class="flex items-center justify-between rounded-lg border p-4">
						<div class="flex items-center gap-3">
							<div class="h-3 w-3 rounded-full {planColors[item.plan] ?? 'bg-gray-500'}"></div>
							<div>
								<p class="text-sm font-medium">{planLabels[item.plan] ?? item.plan}</p>
								<p class="text-xs text-muted-foreground">{item.count} tenant{item.count !== 1 ? 's' : ''}</p>
							</div>
						</div>
						<div class="text-right">
							<p class="text-sm font-semibold">{formatCurrency((stats.byPlan.find((p) => p.plan === item.plan)?.count ?? 0) * (item.plan === 'pilot' ? 0 : item.plan === 'starter' ? 99000 : item.plan === 'pro' ? 299000 : 999000))}</p>
							<p class="text-xs text-muted-foreground">MRR</p>
						</div>
					</div>
				{/each}
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Subscription List -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<CreditCard size={16} />
				Subscriptions
			</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead>
						<tr class="border-b bg-muted/50">
							<th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Plan</th>
							<th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Tenants</th>
							<th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Price</th>
							<th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">MRR</th>
						</tr>
					</thead>
					<tbody>
						{#each stats.byPlan as item (item.plan)}
							<tr class="border-b">
								<td class="px-4 py-3">
									<div class="flex items-center gap-2">
										<div class="h-2 w-2 rounded-full {planColors[item.plan] ?? 'bg-gray-500'}"></div>
										<span class="text-sm font-medium">{planLabels[item.plan] ?? item.plan}</span>
									</div>
								</td>
								<td class="px-4 py-3 text-sm">{item.count}</td>
								<td class="px-4 py-3 text-sm">
									{item.plan === 'pilot' ? 'Free' : formatCurrency(item.plan === 'starter' ? 99000 : item.plan === 'pro' ? 299000 : 999000)}
								</td>
								<td class="px-4 py-3 text-sm font-medium">
									{formatCurrency(item.count * (item.plan === 'pilot' ? 0 : item.plan === 'starter' ? 99000 : item.plan === 'pro' ? 299000 : 999000))}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Invoices -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<FileText size={16} />
				Invoices
			</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="flex flex-col items-center py-8">
				<FileText size={32} class="text-muted-foreground" />
				<p class="mt-2 text-sm text-muted-foreground">Invoice integration coming soon</p>
				<p class="mt-1 text-xs text-muted-foreground">
					Connect a payment provider to enable invoice generation.
				</p>
			</div>
		</Card.Content>
	</Card.Root>
</div>
