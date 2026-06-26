<script lang="ts">
	import {
		ArrowRight,
		Building2,
		Database,
		LayoutDashboard,
		QrCode,
		Store,
		UserRoundCheck
	} from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const organization = $derived(data.organization);
	const outlets = $derived(data.outlets);
	const primaryOutlet = $derived(data.primaryOutlet);
</script>

<svelte:head>
	<title>Demo - Ainything</title>
</svelte:head>

<main class="min-h-screen py-6 sm:py-10">
	<div class="app-container grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
		<section class="surface overflow-hidden rounded-lg">
			<div class="grid min-h-[420px] content-between gap-8 p-5 sm:p-8">
				<div class="flex items-start justify-between gap-4">
					<div>
						<p class="text-sm font-semibold text-ainything-primary">Multi-outlet UMKM SaaS</p>
						<h1
							class="mt-3 max-w-2xl text-3xl font-semibold tracking-normal text-ainything-text sm:text-5xl"
						>
							One platform for many outlet QR experiences.
						</h1>
						<p class="mt-4 max-w-2xl text-base leading-7 text-ainything-subtle">
							Each outlet gets its own public QR route, tables, catalog data, staff inbox, and
							dashboard scope. Operators can manage several outlets from one workspace.
						</p>
					</div>
					<div
						class="hidden rounded-lg bg-ainything-primary-soft p-3 text-ainything-primary sm:block"
					>
						<Building2 size={30} strokeWidth={2.1} />
					</div>
				</div>

				<div class="grid gap-3 text-sm text-ainything-subtle sm:grid-cols-3">
					<div class="rounded-lg border border-ainything-border bg-ainything-surface p-4">
						<strong class="block text-ainything-text">Organization</strong>
						Billing, members, roles, and outlet access belong to one tenant.
					</div>
					<div class="rounded-lg border border-ainything-border bg-ainything-surface p-4">
						<strong class="block text-ainything-text">Outlet</strong>
						Public host, catalog, knowledge, tables, analytics, and staff workflow.
					</div>
					<div class="rounded-lg border border-ainything-border bg-ainything-surface p-4">
						<strong class="block text-ainything-text">QR table</strong>
						Guest opens a table session without account, install, or shared login.
					</div>
				</div>
			</div>
		</section>

		<section class="grid gap-4">
			{#if !organization}
				<!-- DB not seeded yet — guide the developer -->
				<div class="surface rounded-lg p-5">
					<div class="flex items-start gap-3">
						<span class="rounded-lg bg-amber-100 p-3 text-ainything-warning">
							<Database size={24} />
						</span>
						<div>
							<p class="font-semibold text-ainything-text">Demo data not seeded</p>
							<p class="mt-1 text-sm leading-6 text-ainything-subtle">
								Run the seed script to load demo organizations, outlets, products, and accounts.
							</p>
							<pre
								class="mt-3 rounded-lg bg-ainything-muted px-3 py-2 text-xs text-ainything-text">pnpm db:seed</pre>
						</div>
					</div>
				</div>
			{:else}
				<div class="surface rounded-lg p-5">
					<div class="flex items-center justify-between gap-4">
						<div>
							<p class="text-sm font-semibold text-ainything-primary">Active workspace</p>
							<h2 class="mt-1 text-xl font-semibold text-ainything-text">
								{organization.name}
							</h2>
							<p class="mt-1 text-sm text-ainything-subtle">{organization.workspaceHost}</p>
						</div>
						<span class="rounded-lg bg-ainything-primary-soft p-3 text-ainything-primary">
							<Store size={24} />
						</span>
					</div>
					<div class="mt-4 grid gap-2">
						{#each outlets as outlet (outlet.id)}
							<div class="rounded-lg border border-ainything-border bg-ainything-surface px-3 py-2">
								<p class="font-semibold text-ainything-text">{outlet.name}</p>
								<p class="text-sm text-ainything-subtle">
									{outlet.publicHost || outlet.slug}{outlet.location ? ` · ${outlet.location}` : ''}
								</p>
							</div>
						{/each}
						{#if outlets.length === 0}
							<p class="text-sm text-ainything-subtle">No outlets found for this organization.</p>
						{/if}
					</div>
				</div>

				{#if primaryOutlet}
					<a
						class="surface group rounded-lg p-5 transition hover:-translate-y-0.5 hover:border-ainything-primary"
						href={resolve(`/r/${primaryOutlet.slug}/table/T07`)}
					>
						<div class="flex items-center justify-between gap-4">
							<div class="flex items-center gap-3">
								<span class="rounded-lg bg-ainything-accent-soft p-3 text-ainything-accent">
									<QrCode size={24} />
								</span>
								<div>
									<p class="font-semibold text-ainything-text">Open guest QR view</p>
									<p class="text-sm text-ainything-subtle">
										{primaryOutlet.name} · Table T07 · {primaryOutlet.publicHost ||
											primaryOutlet.slug}
									</p>
								</div>
							</div>
							<ArrowRight
								class="text-ainything-primary transition group-hover:translate-x-1"
								size={22}
							/>
						</div>
					</a>
				{/if}

				<a
					class="surface group rounded-lg p-5 transition hover:-translate-y-0.5 hover:border-ainything-primary"
					href={resolve('/dashboard')}
				>
					<div class="flex items-center justify-between gap-4">
						<div class="flex items-center gap-3">
							<span class="rounded-lg bg-ainything-primary-soft p-3 text-ainything-primary">
								<LayoutDashboard size={24} />
							</span>
							<div>
								<p class="font-semibold text-ainything-text">Open management dashboard</p>
								<p class="text-sm text-ainything-subtle">
									Owner view — catalog, orders, settings, analytics
								</p>
							</div>
						</div>
						<ArrowRight
							class="text-ainything-primary transition group-hover:translate-x-1"
							size={22}
						/>
					</div>
				</a>

				<a
					class="surface group rounded-lg p-5 transition hover:-translate-y-0.5 hover:border-ainything-primary"
					href={resolve('/staff/inbox')}
				>
					<div class="flex items-center justify-between gap-4">
						<div class="flex items-center gap-3">
							<span class="rounded-lg bg-amber-100 p-3 text-ainything-warning">
								<UserRoundCheck size={24} />
							</span>
							<div>
								<p class="font-semibold text-ainything-text">Open staff inbox</p>
								<p class="text-sm text-ainything-subtle">
									{primaryOutlet
										? `${primaryOutlet.name} · incoming orders and requests`
										: 'Incoming orders and requests'}
								</p>
							</div>
						</div>
						<ArrowRight
							class="text-ainything-primary transition group-hover:translate-x-1"
							size={22}
						/>
					</div>
				</a>
			{/if}
		</section>
	</div>
</main>
