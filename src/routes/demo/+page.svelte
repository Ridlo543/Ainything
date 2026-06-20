<script lang="ts">
	import {
		ArrowRight,
		Building2,
		LayoutDashboard,
		QrCode,
		Store,
		UserRoundCheck
	} from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { organizations, restaurants, staffRequests } from '$lib/mock/restaurants';

	const activeOrganization = organizations[0];
	const primaryRestaurant = restaurants[0];
	const activeRequest = staffRequests[0];
	const organizationRestaurants = restaurants.filter(
		(restaurant) => restaurant.organizationId === activeOrganization.id
	);
</script>

<svelte:head>
	<title>Demo - Lingua</title>
</svelte:head>

<main class="min-h-screen py-6 sm:py-10">
	<div class="app-container grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
		<section class="surface overflow-hidden rounded-lg">
			<div class="grid min-h-[420px] content-between gap-8 p-5 sm:p-8">
				<div class="flex items-start justify-between gap-4">
					<div>
						<p class="text-sm font-semibold text-lingua-primary">Multi-restaurant SaaS</p>
						<h1
							class="mt-3 max-w-2xl text-3xl font-semibold tracking-normal text-lingua-text sm:text-5xl"
						>
							One platform for many restaurant QR experiences.
						</h1>
						<p class="mt-4 max-w-2xl text-base leading-7 text-lingua-subtle">
							Each restaurant gets its own public QR route, tables, menu data, staff inbox, and
							dashboard scope. Operators can manage several restaurants from one workspace.
						</p>
					</div>
					<div class="hidden rounded-lg bg-lingua-primary-soft p-3 text-lingua-primary sm:block">
						<Building2 size={30} strokeWidth={2.1} />
					</div>
				</div>

				<div class="grid gap-3 text-sm text-lingua-subtle sm:grid-cols-3">
					<div class="rounded-lg border border-lingua-border bg-white p-4">
						<strong class="block text-lingua-text">Organization</strong>
						Billing, members, roles, and restaurant access belong to one tenant.
					</div>
					<div class="rounded-lg border border-lingua-border bg-white p-4">
						<strong class="block text-lingua-text">Restaurant</strong>
						Public host, menu, knowledge, tables, analytics, and staff workflow.
					</div>
					<div class="rounded-lg border border-lingua-border bg-white p-4">
						<strong class="block text-lingua-text">QR table</strong>
						Guest opens a table session without account, install, or shared login.
					</div>
				</div>
			</div>
		</section>

		<section class="grid gap-4">
			<div class="surface rounded-lg p-5">
				<div class="flex items-center justify-between gap-4">
					<div>
						<p class="text-sm font-semibold text-lingua-primary">Active workspace</p>
						<h2 class="mt-1 text-xl font-semibold text-lingua-text">
							{activeOrganization.name}
						</h2>
						<p class="mt-1 text-sm text-lingua-subtle">{activeOrganization.workspaceHost}</p>
					</div>
					<span class="rounded-lg bg-lingua-primary-soft p-3 text-lingua-primary">
						<Store size={24} />
					</span>
				</div>
				<div class="mt-4 grid gap-2">
					{#each organizationRestaurants.slice(0, 4) as restaurant (restaurant.id)}
						<div class="rounded-lg border border-lingua-border bg-white px-3 py-2">
							<p class="font-semibold text-lingua-text">{restaurant.name}</p>
							<p class="text-sm text-lingua-subtle">{restaurant.publicHost}</p>
						</div>
					{/each}
				</div>
			</div>

			<a
				class="surface group rounded-lg p-5 transition hover:-translate-y-0.5 hover:border-lingua-primary"
				href={resolve(`/r/${primaryRestaurant.slug}/table/T07`)}
			>
				<div class="flex items-center justify-between gap-4">
					<div class="flex items-center gap-3">
						<span class="rounded-lg bg-lingua-accent-soft p-3 text-lingua-accent">
							<QrCode size={24} />
						</span>
						<div>
							<p class="font-semibold text-lingua-text">Open guest QR view</p>
							<p class="text-sm text-lingua-subtle">
								{primaryRestaurant.name} - Table T07 - {primaryRestaurant.publicHost}
							</p>
						</div>
					</div>
					<ArrowRight class="text-lingua-primary transition group-hover:translate-x-1" size={22} />
				</div>
			</a>

			<a
				class="surface group rounded-lg p-5 transition hover:-translate-y-0.5 hover:border-lingua-primary"
				href={resolve('/dashboard')}
			>
				<div class="flex items-center justify-between gap-4">
					<div class="flex items-center gap-3">
						<span class="rounded-lg bg-lingua-primary-soft p-3 text-lingua-primary">
							<LayoutDashboard size={24} />
						</span>
						<div>
							<p class="font-semibold text-lingua-text">Open management dashboard</p>
							<p class="text-sm text-lingua-subtle">
								Workspace metrics, restaurant menus, QR tables, and review queues.
							</p>
						</div>
					</div>
					<ArrowRight class="text-lingua-primary transition group-hover:translate-x-1" size={22} />
				</div>
			</a>

			<a
				class="surface group rounded-lg p-5 transition hover:-translate-y-0.5 hover:border-lingua-primary"
				href={resolve('/staff/inbox')}
			>
				<div class="flex items-center justify-between gap-4">
					<div class="flex items-center gap-3">
						<span class="rounded-lg bg-amber-100 p-3 text-lingua-warning">
							<UserRoundCheck size={24} />
						</span>
						<div>
							<p class="font-semibold text-lingua-text">Open staff inbox</p>
							<p class="text-sm text-lingua-subtle">
								{activeRequest.tableCode} - {activeRequest.restaurantSlug} - {activeRequest.status}
							</p>
						</div>
					</div>
					<ArrowRight class="text-lingua-primary transition group-hover:translate-x-1" size={22} />
				</div>
			</a>
		</section>
	</div>
</main>
