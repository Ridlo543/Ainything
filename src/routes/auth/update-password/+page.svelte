<script lang="ts">
	import { KeyRound, Eye, EyeOff } from '@lucide/svelte';
	import type { ActionData } from './$types';

	let { form }: { form?: ActionData } = $props();

	let showPassword = $state(false);
	let showConfirm = $state(false);

	const inputClass =
		'tap-target w-full rounded-lg border border-lingua-border bg-white px-3 py-2 text-sm font-normal text-lingua-text placeholder:text-lingua-subtle/60 focus:border-lingua-primary focus:outline-none focus:ring-1 focus:ring-lingua-primary dark:bg-lingua-surface dark:text-lingua-text';
</script>

<svelte:head>
	<title>Set new password - Lingua</title>
</svelte:head>

<main class="min-h-screen py-6 sm:py-10">
	<div class="app-container grid min-h-[calc(100vh-80px)] place-items-center">
		<section class="surface w-full max-w-lg rounded-lg p-5 sm:p-7">
			<div class="flex items-start gap-3">
				<span class="rounded-lg bg-lingua-primary-soft p-3 text-lingua-primary">
					<KeyRound size={26} />
				</span>
				<div>
					<h1 class="text-2xl font-semibold text-lingua-text">Set a new password</h1>
					<p class="mt-1 text-sm leading-6 text-lingua-subtle">
						Choose a strong password for your Lingua account.
					</p>
				</div>
			</div>

			<form method="POST" action="?/update" class="mt-6 grid gap-4">
				<!-- New password -->
				<label class="grid gap-1.5 text-sm font-semibold text-lingua-text">
					New password
					<div class="relative">
						<input
							type={showPassword ? 'text' : 'password'}
							name="password"
							required
							autocomplete="new-password"
							minlength="8"
							placeholder="At least 8 characters"
							class={inputClass}
						/>
						<button
							type="button"
							class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-lingua-subtle hover:text-lingua-text"
							aria-label={showPassword ? 'Hide password' : 'Show password'}
							onclick={() => (showPassword = !showPassword)}
						>
							{#if showPassword}<EyeOff size={16} />{:else}<Eye size={16} />{/if}
						</button>
					</div>
				</label>

				<!-- Confirm password -->
				<label class="grid gap-1.5 text-sm font-semibold text-lingua-text">
					Confirm new password
					<div class="relative">
						<input
							type={showConfirm ? 'text' : 'password'}
							name="confirm"
							required
							autocomplete="new-password"
							minlength="8"
							placeholder="Repeat your password"
							class={inputClass}
						/>
						<button
							type="button"
							class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-lingua-subtle hover:text-lingua-text"
							aria-label={showConfirm ? 'Hide password' : 'Show password'}
							onclick={() => (showConfirm = !showConfirm)}
						>
							{#if showConfirm}<EyeOff size={16} />{:else}<Eye size={16} />{/if}
						</button>
					</div>
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
					Update password
				</button>
			</form>
		</section>
	</div>
</main>
