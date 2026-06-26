<script lang="ts">
	import { Building2, ArrowLeft, UserPlus } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import type { ActionData } from './$types';

	let { form }: { form?: ActionData } = $props();

	const fields = $derived(
		form as
			| { name?: string; email?: string; organizationName?: string; message?: string }
			| undefined
	);
</script>

<svelte:head>
	<title>Register your organization · Ainything</title>
</svelte:head>

<main class="min-h-screen py-6 sm:py-10">
	<div class="app-container grid min-h-[calc(100vh-80px)] place-items-center">
		<section class="surface w-full max-w-lg rounded-lg p-5 sm:p-7">
			<a
				href={resolve('/register')}
				class="tap-target mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ainything-subtle hover:text-ainything-text"
			>
				<ArrowLeft size={15} /> Back to options
			</a>

			<div class="flex items-start gap-3">
				<span class="rounded-lg bg-ainything-primary-soft p-3 text-ainything-primary">
					<Building2 size={26} />
				</span>
				<div>
					<h1 class="text-2xl font-semibold text-ainything-text">Register your organization</h1>
					<p class="mt-1 text-sm leading-6 text-ainything-subtle">
						Manage multiple restaurants under one account.
					</p>
				</div>
			</div>

			<form method="POST" action="?/register" class="mt-6 grid gap-4">
				<label class="grid gap-1.5 text-sm font-semibold text-ainything-text">
					Your name
					<input
						type="text"
						name="name"
						required
						autocomplete="name"
						placeholder="Made Surya"
						value={fields?.name ?? ''}
						class="tap-target rounded-lg border border-ainything-border bg-white px-3 py-2 text-sm font-normal text-ainything-text placeholder:text-ainything-subtle/60 focus:border-ainything-primary focus:outline-none focus:ring-1 focus:ring-ainything-primary"
					/>
				</label>

				<label class="grid gap-1.5 text-sm font-semibold text-ainything-text">
					Organization name
					<input
						type="text"
						name="organizationName"
						required
						placeholder="Bali Table Group"
						value={fields?.organizationName ?? ''}
						class="tap-target rounded-lg border border-ainything-border bg-white px-3 py-2 text-sm font-normal text-ainything-text placeholder:text-ainything-subtle/60 focus:border-ainything-primary focus:outline-none focus:ring-1 focus:ring-ainything-primary"
					/>
				</label>

				<label class="grid gap-1.5 text-sm font-semibold text-ainything-text">
					Email
					<input
						type="email"
						name="email"
						required
						autocomplete="email"
						placeholder="owner@bali-table.com"
						value={fields?.email ?? ''}
						class="tap-target rounded-lg border border-ainything-border bg-white px-3 py-2 text-sm font-normal text-ainything-text placeholder:text-ainything-subtle/60 focus:border-ainything-primary focus:outline-none focus:ring-1 focus:ring-ainything-primary"
					/>
				</label>

				<label class="grid gap-1.5 text-sm font-semibold text-ainything-text">
					Password
					<input
						type="password"
						name="password"
						required
						autocomplete="new-password"
						placeholder="At least 8 characters"
						class="tap-target rounded-lg border border-ainything-border bg-white px-3 py-2 text-sm font-normal text-ainything-text placeholder:text-ainything-subtle/60 focus:border-ainything-primary focus:outline-none focus:ring-1 focus:ring-ainything-primary"
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
					class="tap-target inline-flex items-center justify-center gap-2 rounded-lg bg-ainything-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:brightness-95"
					type="submit"
				>
					<UserPlus size={17} /> Create organization account
				</button>
			</form>

			<p class="mt-5 text-center text-sm text-ainything-subtle">
				Already have an account?
				<a href={resolve('/login')} class="font-semibold text-ainything-primary hover:underline"
					>Sign in</a
				>
			</p>
		</section>
	</div>
</main>
