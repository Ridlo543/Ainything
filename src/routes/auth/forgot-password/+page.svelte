<script lang="ts">
	import { Mail, ArrowLeft, MailCheck } from '@lucide/svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form?: ActionData } = $props();

	const sent = $derived((form as { sent?: boolean } | undefined)?.sent === true);
	const sentEmail = $derived((form as { email?: string } | undefined)?.email ?? '');

	const inputClass =
		'tap-target w-full rounded-lg border border-lingua-border bg-white px-3 py-2 text-sm font-normal text-lingua-text placeholder:text-lingua-subtle/60 focus:border-lingua-primary focus:outline-none focus:ring-1 focus:ring-lingua-primary dark:bg-lingua-surface dark:text-lingua-text';
</script>

<svelte:head>
	<title>Reset your password - Lingua</title>
</svelte:head>

<main class="min-h-screen py-6 sm:py-10">
	<div class="app-container grid min-h-[calc(100vh-80px)] place-items-center">
		<section class="surface w-full max-w-lg rounded-lg p-5 text-center sm:p-7">

			{#if sent}
				<!-- Success state -->
				<span class="inline-flex rounded-lg bg-green-100 p-3 text-green-600">
					<MailCheck size={26} />
				</span>
				<h1 class="mt-4 text-2xl font-semibold text-lingua-text">Check your email</h1>
				<p class="mt-3 text-sm leading-6 text-lingua-subtle">
					If <strong>{sentEmail}</strong> is registered, we've sent a password reset link.
					Check your inbox and spam folder.
				</p>
				<a
					href="/login"
					class="tap-target mt-6 inline-flex items-center gap-2 rounded-lg bg-lingua-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:brightness-95"
				>
					Back to sign in
				</a>

			{:else}
				<!-- Request form -->
				<span class="inline-flex rounded-lg bg-lingua-primary-soft p-3 text-lingua-primary">
					<Mail size={26} />
				</span>
				<h1 class="mt-4 text-2xl font-semibold text-lingua-text">Forgot your password?</h1>
				<p class="mt-2 text-sm leading-6 text-lingua-subtle">
					Enter your email and we'll send you a reset link.
				</p>

				<form method="POST" action="?/reset" class="mt-6 grid gap-4 text-left">
					<label class="grid gap-1.5 text-sm font-semibold text-lingua-text">
						Email address
						<input
							type="email"
							name="email"
							required
							autocomplete="email"
							placeholder="you@restaurant.com"
							value={(form as { email?: string } | undefined)?.email ?? ''}
							class={inputClass}
						/>
					</label>

					{#if form?.message}
						<p
							class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800"
							role="alert"
						>
							{form.message}
						</p>
					{/if}

					<button
						type="submit"
						class="tap-target inline-flex items-center justify-center gap-2 rounded-lg bg-lingua-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:brightness-95"
					>
						Send reset link
					</button>
				</form>

				<a
					href="/login"
					class="tap-target mt-5 inline-flex items-center justify-center gap-1.5 text-sm text-lingua-subtle hover:text-lingua-text"
				>
					<ArrowLeft size={14} /> Back to sign in
				</a>
			{/if}

		</section>
	</div>
</main>
