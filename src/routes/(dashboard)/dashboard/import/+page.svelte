<script lang="ts">
	import { AlertTriangle, CheckCircle2, FileSearch, Image } from '@lucide/svelte';
	import { getAllImportIssues, restaurants } from '$lib/mock/restaurants';
	import Badge from '$lib/ui/primitives/Badge.svelte';

	const issues = getAllImportIssues();
</script>

<svelte:head>
	<title>Import Review · LinguaServe</title>
</svelte:head>

<section class="grid gap-5">
	<div>
		<p class="text-sm font-semibold text-lingua-primary">Dummy messy menu imports</p>
		<h1 class="mt-2 text-3xl font-semibold">10 restaurant source menus</h1>
		<p class="mt-2 max-w-3xl text-lingua-subtle">
			Realistic dummy files cover PDFs, phone photos, bilingual menus, handwritten notes, seasonal
			pages, and spreadsheets.
		</p>
	</div>

	<div class="grid gap-4 lg:grid-cols-2">
		{#each restaurants as restaurant (restaurant.id)}
			<article class="surface rounded-lg p-4">
				<div class="grid gap-4 sm:grid-cols-[150px_1fr]">
					<img
						src={restaurant.menuScan}
						alt=""
						class="h-48 w-full rounded-lg object-cover sm:h-full"
					/>
					<div>
						<div class="flex flex-wrap items-center gap-2">
							<Badge label={restaurant.menuSourceType} tone="accent" />
							<Badge label={`${restaurant.menuItems.length} items`} tone="neutral" />
						</div>
						<h2 class="mt-3 text-lg font-semibold text-lingua-text">{restaurant.name}</h2>
						<p class="mt-2 text-sm leading-6 text-lingua-subtle">{restaurant.description}</p>
						<div class="mt-4 grid gap-2">
							{#each restaurant.importIssues as issue (issue.id)}
								<div class="rounded-lg border border-lingua-border bg-white p-3">
									<div class="flex items-start gap-2">
										{#if issue.status === 'approved'}
											<CheckCircle2 class="mt-0.5 text-lingua-success" size={18} />
										{:else}
											<AlertTriangle class="mt-0.5 text-lingua-warning" size={18} />
										{/if}
										<div>
											<p class="text-sm font-semibold">
												{issue.label} · {Math.round(issue.confidence * 100)}%
											</p>
											<p class="mt-1 text-sm text-lingua-subtle">{issue.issue}</p>
										</div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				</div>
			</article>
		{/each}
	</div>

	<section class="surface rounded-lg p-4">
		<div class="flex items-center gap-3">
			<FileSearch class="text-lingua-primary" size={23} />
			<h2 class="font-semibold">Review queue summary</h2>
		</div>
		<div class="mt-4 grid gap-3 md:grid-cols-3">
			<div class="rounded-lg border border-lingua-border bg-white p-4">
				<Image class="text-lingua-accent" size={22} />
				<p class="mt-3 text-2xl font-semibold">{restaurants.length}</p>
				<p class="text-sm text-lingua-subtle">Dummy source menus</p>
			</div>
			<div class="rounded-lg border border-lingua-border bg-white p-4">
				<AlertTriangle class="text-lingua-warning" size={22} />
				<p class="mt-3 text-2xl font-semibold">
					{issues.filter((issue) => issue.status !== 'approved').length}
				</p>
				<p class="text-sm text-lingua-subtle">Need review or blocked</p>
			</div>
			<div class="rounded-lg border border-lingua-border bg-white p-4">
				<CheckCircle2 class="text-lingua-success" size={22} />
				<p class="mt-3 text-2xl font-semibold">
					{issues.filter((issue) => issue.status === 'approved').length}
				</p>
				<p class="text-sm text-lingua-subtle">Approved extraction notes</p>
			</div>
		</div>
	</section>
</section>
