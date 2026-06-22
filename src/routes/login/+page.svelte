<script lang="ts">
	import { Building2, LogIn, Eye, EyeOff } from '@lucide/svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form?: ActionData } = $props();

	let showPassword = $state(false);
</script>

<svelte:head>
	<title>Sign in - Lingua</title>
</svelte:head>

<main class="min-h-screen py-6 sm:py-10">
	<div class="app-container grid min-h-[calc(100vh-80px)] place-items-center">
		<section class="surface w-full max-w-lg rounded-lg p-5 sm:p-7">
			<div class="flex items-start gap-3">
				<span class="rounded-lg bg-lingua-primary-soft p-3 text-lingua-primary">
					<Building2 size={26} />
				</span>
				<div>
					<p class="text-sm font-semibold text-lingua-primary">Lingua</p>
					<h1 class="mt-1 text-2xl font-semibold text-lingua-text sm:text-3xl">
						Sign in to your account
					</h1>
					<p class="mt-2 text-sm leading-6 text-lingua-subtle">
						Manage your restaurant menu, QR tables, and guest experience.
					</p>
				</div>
			</div>

			{#if data.isMock}
				<div class="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
					<p class="font-semibold">Demo mode</p>
					<p class="mt-1">Use <code>owner@bali-table.test</code> or <code>staff@jakarta-hospitality.test</code> with any password.</p>
				</div>
			{/if}

			<form method="POST" action="?/login" class="mt-6 grid gap-4">
				<input type="hidden" name="redirectTo" value={data.redirectTo} />

				<label class="grid gap-1.5 text-sm font-semibold text-lingua-text">
					Email
					<input
						type="email"
						name="email"
						autocomplete="email"
						required
						placeholder="you@restaurant.com"
						value={form?.email ?? ''}
						class="tap-target rounded-lg border border-lingua-border bg-white px-3 py-2 text-sm font-normal text-lingua-text placeholder:text-lingua-subtle/60 focus:border-lingua-primary focus:outline-none focus:ring-1 focus:ring-lingua-primary"
					/>
				</label>

				<label class="grid gap-1.5 text-sm font-semibold text-lingua-text">
					<div class="flex items-center justify-between">
						Password
						{#if !data.isMock}
							<a href="/auth/forgot-password" class="text-xs font-normal text-lingua-primary hover:underline">
								Forgot?
							</a>
						{/if}
					</div>
					<div class="relative">
						<input
							type={showPassword ? 'text' : 'password'}
							name="password"
							autocomplete="current-password"
							required
							placeholder="Enter your password"
							class="tap-target w-full rounded-lg border border-lingua-border bg-white px-3 py-2 pr-10 text-sm font-normal text-lingua-text placeholder:text-lingua-subtle/60 focus:border-lingua-primary focus:outline-none focus:ring-1 focus:ring-lingua-primary"
						/>
						<button
							type="button"
							class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-lingua-subtle hover:text-lingua-text"
							aria-label={showPassword ? 'Hide password' : 'Show password'}
							onclick={() => (showPassword = !showPassword)}
						>
							{#if showPassword}
								<EyeOff size={16} />
							{:else}
								<Eye size={16} />
							{/if}
						</button>
					</div>
				</label>

				{#if form?.message}
					<p class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800" role="alert">
						{form.message}
					</p>
				{/if}

				<button
					class="tap-target inline-flex items-center justify-center gap-2 rounded-lg bg-lingua-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:brightness-95"
					type="submit"
				>
					<LogIn size={17} /> Sign in
				</button>
			</form>

			{#if !data.isMock}
				<p class="mt-5 text-center text-sm text-lingua-subtle">
					New to Lingua?
					<a href="/register" class="font-semibold text-lingua-primary hover:underline">Create an account</a>
				</p>
			{/if}
		</section>
	</div>
</main>
