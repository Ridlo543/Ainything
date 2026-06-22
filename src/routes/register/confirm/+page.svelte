<script lang="ts">
	import { MailCheck, ArrowRight } from '@lucide/svelte';
</script>

<svelte:head>
	<title>Check your email - Lingua</title>
</svelte:head>

<main class="min-h-screen py-6 sm:py-10">
	<div class="app-container grid min-h-[calc(100vh-80px)] place-items-center">
		<section class="surface w-full max-w-lg rounded-lg p-5 text-center sm:p-7">
			<span class="inline-flex rounded-lg bg-green-100 p-3 text-green-600">
				<MailCheck size={26} />
			</span>
			<h1 class="mt-4 text-2xl font-semibold text-lingua-text">Check your email</h1>
			<p class="mt-3 text-sm leading-6 text-lingua-subtle">
				We sent a verification link to your email address. Click it to confirm your account, then you can set up your restaurant.
			</p>
			<a
				href="/login"
				class="tap-target mt-6 inline-flex items-center gap-2 rounded-lg bg-lingua-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:brightness-95"
			>
				Continue to sign in <ArrowRight size={16} />
			</a>
		</section>
	</div>
</main>
