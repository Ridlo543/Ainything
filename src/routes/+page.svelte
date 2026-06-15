<script lang="ts">
	import { ArrowRight, LayoutDashboard, QrCode, Soup, UserRoundCheck } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { restaurants, staffRequests } from '$lib/mock/restaurants';

	const primaryRestaurant = restaurants[0];
	const activeRequest = staffRequests[0];
</script>

<svelte:head>
	<title>LinguaServe Prototype</title>
</svelte:head>

<main class="min-h-screen py-6 sm:py-10">
	<div class="app-container grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
		<section class="surface overflow-hidden rounded-lg">
			<div class="grid min-h-[420px] content-between gap-8 p-5 sm:p-8">
				<div class="flex items-start justify-between gap-4">
					<div>
						<p class="text-sm font-semibold text-lingua-primary">LinguaServe frontend prototype</p>
						<h1
							class="mt-3 max-w-2xl text-3xl font-semibold tracking-normal text-lingua-text sm:text-5xl"
						>
							AI menu companion built around the real restaurant flow.
						</h1>
					</div>
					<div class="hidden rounded-lg bg-lingua-primary-soft p-3 text-lingua-primary sm:block">
						<Soup size={30} strokeWidth={2.1} />
					</div>
				</div>

				<div class="grid gap-3 text-sm text-lingua-subtle sm:grid-cols-3">
					<div class="rounded-lg border border-lingua-border bg-white p-4">
						<strong class="block text-lingua-text">Customer PWA</strong>
						QR scan, preferences, menu, chat, fallback, feedback.
					</div>
					<div class="rounded-lg border border-lingua-border bg-white p-4">
						<strong class="block text-lingua-text">Admin dashboard</strong>
						Menu editor, import review, QR tables, knowledge, analytics.
					</div>
					<div class="rounded-lg border border-lingua-border bg-white p-4">
						<strong class="block text-lingua-text">Staff inbox</strong>
						Requests with table, language, summary, and status.
					</div>
				</div>
			</div>
		</section>

		<section class="grid gap-4">
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
							<p class="font-semibold text-lingua-text">Open customer QR flow</p>
							<p class="text-sm text-lingua-subtle">{primaryRestaurant.name} - Table T07</p>
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
							<p class="font-semibold text-lingua-text">Open admin dashboard</p>
							<p class="text-sm text-lingua-subtle">
								Mocked metrics, menus, imports, tables, knowledge.
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
								{activeRequest.tableCode} - {activeRequest.language} - {activeRequest.status}
							</p>
						</div>
					</div>
					<ArrowRight class="text-lingua-primary transition group-hover:translate-x-1" size={22} />
				</div>
			</a>
		</section>
	</div>
</main>
