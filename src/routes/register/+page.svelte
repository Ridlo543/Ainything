<script lang="ts">
	import { Building2, Store, Building } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Create account - Lingua</title>
</svelte:head>

<main class="min-h-screen py-6 sm:py-10">
	<div class="app-container grid min-h-[calc(100vh-80px)] place-items-center">
		<section class="surface w-full max-w-2xl rounded-lg p-5 sm:p-7">
			<div class="text-center">
				<span class="inline-flex rounded-lg bg-lingua-primary-soft p-3 text-lingua-primary">
					<Building2 size={26} />
				</span>
				<h1 class="mt-4 text-2xl font-semibold text-lingua-text sm:text-3xl">
					Get started with Lingua
				</h1>
				<p class="mt-2 text-sm leading-6 text-lingua-subtle">
					Create your account to start managing your restaurant's multilingual menu and guest experience.
				</p>
			</div>

			{#if data.isMock}
				<div class="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
					<p class="font-semibold">Demo mode active</p>
					<p class="mt-1">Registration is disabled in demo mode. <a href="/login" class="font-semibold underline">Sign in with a demo account</a>.</p>
				</div>
			{:else}
				<div class="mt-8 grid gap-4 sm:grid-cols-2">
					<a
						href="/register/restaurant"
						class="tap-target flex flex-col gap-3 rounded-lg border border-lingua-border p-5 transition-colors hover:border-lingua-primary hover:bg-lingua-primary-soft/30"
					>
						<Store class="text-lingua-primary" size={24} />
						<div>
							<h2 class="text-lg font-semibold text-lingua-text">I have a restaurant</h2>
							<p class="mt-1 text-sm leading-5 text-lingua-subtle">
								Create an account and set up your first restaurant with menu, QR tables, and guest experience.
							</p>
						</div>
					</a>

					<a
						href="/register/organization"
						class="tap-target flex flex-col gap-3 rounded-lg border border-lingua-border p-5 transition-colors hover:border-lingua-primary hover:bg-lingua-primary-soft/30"
					>
						<Building class="text-lingua-primary" size={24} />
						<div>
							<h2 class="text-lg font-semibold text-lingua-text">I manage multiple restaurants</h2>
							<p class="mt-1 text-sm leading-5 text-lingua-subtle">
								Create an organization account to manage multiple restaurant locations from one dashboard.
							</p>
						</div>
					</a>
				</div>
			{/if}

			<p class="mt-6 text-center text-sm text-lingua-subtle">
				Already have an account?
				<a href="/login" class="font-semibold text-lingua-primary hover:underline">Sign in</a>
			</p>
		</section>
	</div>
</main>
