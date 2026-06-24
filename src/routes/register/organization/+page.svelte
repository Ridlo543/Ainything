<script lang="ts">
	import { Building2, ArrowLeft, UserPlus } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form?: ActionData } = $props();

	const fields = $derived(
		form as
			| { name?: string; email?: string; organizationName?: string; message?: string }
			| undefined
	);
</script>

<svelte:head>
	<title>Register your organization · Lingua</title>
</svelte:head>

<main class="min-h-screen py-6 sm:py-10">
	<div class="app-container grid min-h-[calc(100vh-80px)] place-items-center">
		<section class="surface w-full max-w-lg rounded-lg p-5 sm:p-7">
			<a
				href={resolve('/register')}
				class="tap-target mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-lingua-subtle hover:text-lingua-text"
			>
				<ArrowLeft size={15} /> Back to options
			</a>

			<div class="flex items-start gap-3">
				<span class="rounded-lg bg-lingua-primary-soft p-3 text-lingua-primary">
					<Building2 size={26} />
				</span>
				<div>
					<h1 class="text-2xl font-semibold text-lingua-text">Register your organization</h1>
					<p class="mt-1 text-sm leading-6 text-lingua-subtle">
						Manage multiple restaurants under one account.
					</p>
				</div>
			</div>

			{#if data.isMock}
				<div class="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
					Registration is disabled in demo mode. <a href={resolve('/login')} class="underline"
						>Sign in</a
					> instead.
				</div>
			{:else}
				<form method="POST" action="?/register" class="mt-6 grid gap-4">
					<label class="grid gap-1.5 text-sm font-semibold text-lingua-text">
						Your name
						<input
							type="text"
							name="name"
							required
							autocomplete="name"
							placeholder="Made Surya"
							value={fields?.name ?? ''}
							class="tap-target rounded-lg border border-lingua-border bg-white px-3 py-2 text-sm font-normal text-lingua-text placeholder:text-lingua-subtle/60 focus:border-lingua-primary focus:outline-none focus:ring-1 focus:ring-lingua-primary"
						/>
					</label>

					<label class="grid gap-1.5 text-sm font-semibold text-lingua-text">
						Organization name
						<input
							type="text"
							name="organizationName"
							required
							placeholder="Bali Table Group"
							value={fields?.organizationName ?? ''}
							class="tap-target rounded-lg border border-lingua-border bg-white px-3 py-2 text-sm font-normal text-lingua-text placeholder:text-lingua-subtle/60 focus:border-lingua-primary focus:outline-none focus:ring-1 focus:ring-lingua-primary"
						/>
						<span class="text-xs font-normal text-lingua-subtle">
							This becomes your workspace. You can add restaurants after setup.
						</span>
					</label>

					<label class="grid gap-1.5 text-sm font-semibold text-lingua-text">
						Email
						<input
							type="email"
							name="email"
							required
							autocomplete="email"
							placeholder="you@company.com"
							value={fields?.email ?? ''}
							class="tap-target rounded-lg border border-lingua-border bg-white px-3 py-2 text-sm font-normal text-lingua-text placeholder:text-lingua-subtle/60 focus:border-lingua-primary focus:outline-none focus:ring-1 focus:ring-lingua-primary"
						/>
					</label>

					<label class="grid gap-1.5 text-sm font-semibold text-lingua-text">
						Password
						<input
							type="password"
							name="password"
							required
							autocomplete="new-password"
							minlength="8"
							placeholder="At least 8 characters"
							class="tap-target rounded-lg border border-lingua-border bg-white px-3 py-2 text-sm font-normal text-lingua-text placeholder:text-lingua-subtle/60 focus:border-lingua-primary focus:outline-none focus:ring-1 focus:ring-lingua-primary"
						/>
					</label>

					{#if fields?.message}
						<p
							class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800"
							role="alert"
						>
							{fields.message}
						</p>
					{/if}

					<button
						class="tap-target inline-flex items-center justify-center gap-2 rounded-lg bg-lingua-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:brightness-95"
						type="submit"
					>
						<UserPlus size={17} /> Create organization account
					</button>
				</form>

				<p class="mt-5 text-center text-sm text-lingua-subtle">
					Already have an account?
					<a href={resolve('/login')} class="font-semibold text-lingua-primary hover:underline"
						>Sign in</a
					>
				</p>
			{/if}
		</section>
	</div>
</main>
