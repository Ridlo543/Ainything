<script lang="ts">
	import { Eye, EyeOff, CheckCircle2, Mail } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const invite = $derived(data.invite);
	const loadError = $derived(data.error);

	// Toggle between register (new user) and login (existing account)
	let mode = $state<'register' | 'login'>('register');
	let showPassword = $state(false);
	let showConfirm = $state(false);
	let sent = $state(false);
</script>

<svelte:head>
	<title>Accept Invitation - Lingua</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-lingua-bg px-4">
	<div class="w-full max-w-sm">
		<a href="/" class="mb-8 block text-center text-2xl font-bold text-lingua-primary">Lingua</a>

		{#if loadError}
			<div class="surface rounded-lg p-6 text-center">
				<p class="font-semibold text-lingua-text">Invalid Invite</p>
				<p class="mt-2 text-sm text-lingua-subtle">{loadError}</p>
				<a
					href="/login"
					class="mt-4 block text-sm font-semibold text-lingua-primary hover:underline"
				>Back to login</a
				>
			</div>
		{:else if sent}
			<div class="surface rounded-lg p-6 text-center">
				<CheckCircle2 class="mx-auto text-green-500" size={40} />
				<h1 class="mt-4 text-xl font-semibold">Check your email</h1>
				<p class="mt-2 text-sm text-lingua-subtle">
					We sent a confirmation link to <strong>{invite?.email}</strong>. Click it to activate your
					account and join the team.
				</p>
			</div>
		{:else if invite}
			<div class="surface rounded-lg p-6">
				<div class="mb-5 flex items-center gap-3 rounded-lg bg-lingua-primary-soft p-3">
					<Mail size={20} class="shrink-0 text-lingua-primary" />
					<div>
						<p class="text-sm font-semibold text-lingua-text">You've been invited</p>
						<p class="text-xs text-lingua-subtle">
							Join as <strong>{invite.role}</strong> · {invite.email}
						</p>
					</div>
				</div>

				<h1 class="text-xl font-semibold text-lingua-text">Accept Invitation</h1>

				<!-- Mode toggle -->
				<div class="mt-4 flex rounded-lg border border-lingua-border">
					<button
						type="button"
						class="flex-1 rounded-l-lg py-2 text-sm font-semibold transition-colors {mode === 'register'
							? 'bg-lingua-primary text-white'
							: 'text-lingua-subtle hover:bg-lingua-primary-soft'}"
						onclick={() => (mode = 'register')}
					>
						New account
					</button>
					<button
						type="button"
						class="flex-1 rounded-r-lg py-2 text-sm font-semibold transition-colors {mode === 'login'
							? 'bg-lingua-primary text-white'
							: 'text-lingua-subtle hover:bg-lingua-primary-soft'}"
						onclick={() => (mode = 'login')}
					>
						Existing account
					</button>
				</div>

				<form
					method="POST"
					action="?/accept"
					use:enhance={({ formData, cancel }) => {
						formData.set('mode', mode);
						return async ({ result, update }) => {
							if (result.type === 'success' && result.data?.sent) {
								sent = true;
							} else {
								await update();
							}
						};
					}}
					class="mt-5 grid gap-4"
				>
					<div class="grid gap-1 text-sm font-semibold">
						<span>Email</span>
						<input
							type="email"
							value={invite.email}
							disabled
							class="tap-target rounded-lg border border-lingua-border bg-lingua-bg px-3 font-normal text-lingua-subtle"
						/>
					</div>

					<label class="grid gap-1 text-sm font-semibold">
						Password
						<div class="relative">
							<input
								type={showPassword ? 'text' : 'password'}
								name="password"
								class="tap-target w-full rounded-lg border border-lingua-border px-3 pr-10 font-normal"
								placeholder="Min. 8 characters"
								required
								minlength={8}
							/>
							<button
								type="button"
								class="absolute right-3 top-1/2 -translate-y-1/2 text-lingua-subtle"
								onclick={() => (showPassword = !showPassword)}
								aria-label={showPassword ? 'Hide password' : 'Show password'}
							>
								{#if showPassword}
									<EyeOff size={16} />
								{:else}
									<Eye size={16} />
								{/if}
							</button>
						</div>
					</label>

					{#if mode === 'register'}
						<label class="grid gap-1 text-sm font-semibold">
							Confirm password
							<div class="relative">
								<input
									type={showConfirm ? 'text' : 'password'}
									name="confirm"
									class="tap-target w-full rounded-lg border border-lingua-border px-3 pr-10 font-normal"
									placeholder="Repeat password"
									required
								/>
								<button
									type="button"
									class="absolute right-3 top-1/2 -translate-y-1/2 text-lingua-subtle"
									onclick={() => (showConfirm = !showConfirm)}
									aria-label={showConfirm ? 'Hide password' : 'Show password'}
								>
									{#if showConfirm}
										<EyeOff size={16} />
									{:else}
										<Eye size={16} />
									{/if}
								</button>
							</div>
						</label>
					{/if}

					<button
						type="submit"
						class="tap-target w-full rounded-lg bg-lingua-primary px-4 text-sm font-semibold text-white hover:bg-lingua-primary/90"
					>
						{mode === 'register' ? 'Create account & join' : 'Sign in & join'}
					</button>
				</form>
			</div>
		{/if}
	</div>
</div>
