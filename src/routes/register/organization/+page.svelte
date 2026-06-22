<script lang="ts">
	import { Building, ArrowLeft } from '@lucide/svelte';
</script>

<svelte:head>
	<title>Register your organization - Lingua</title>
</svelte:head>

<main class="min-h-screen py-6 sm:py-10">
	<div class="app-container grid min-h-[calc(100vh-80px)] place-items-center">
		<section class="surface w-full max-w-lg rounded-lg p-5 sm:p-7">
			<a
				href="/register"
				class="tap-target mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-lingua-subtle hover:text-lingua-text"
			>
				<ArrowLeft size={15} /> Back to options
			</a>

			<div class="flex items-start gap-3">
				<span class="rounded-lg bg-lingua-primary-soft p-3 text-lingua-primary">
					<Building size={26} />
				</span>
				<div>
					<h1 class="text-2xl font-semibold text-lingua-text">Organization registration</h1>
					<p class="mt-1 text-sm leading-6 text-lingua-subtle">
						Create an organization to manage multiple restaurants. We will contact you to set up your account.
					</p>
				</div>
			</div>

			<div class="mt-6 rounded-lg border border-lingua-border bg-slate-50 p-4 text-center">
				<p class="text-sm text-lingua-subtle">
					Organization-level registration is coming soon. For now, please
					<a href="/register/restaurant" class="font-semibold text-lingua-primary hover:underline">register as a restaurant</a>
					and add additional locations from your dashboard.
				</p>
			</div>
		</section>
	</div>
</main>
