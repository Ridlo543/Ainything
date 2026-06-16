<script lang="ts">
	import { Building2, LogIn } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data, form }: { data: PageData; form?: { message?: string } } = $props();
</script>

<svelte:head>
	<title>Login - LinguaServe</title>
</svelte:head>

<main class="min-h-screen py-6 sm:py-10">
	<div class="app-container grid min-h-[calc(100vh-80px)] place-items-center">
		<section class="surface w-full max-w-lg rounded-lg p-5 sm:p-7">
			<div class="flex items-start gap-3">
				<span class="rounded-lg bg-lingua-primary-soft p-3 text-lingua-primary">
					<Building2 size={26} />
				</span>
				<div>
					<p class="text-sm font-semibold text-lingua-primary">LinguaServe management</p>
					<h1 class="mt-1 text-3xl font-semibold text-lingua-text">
						Sign in to manage restaurants
					</h1>
					<p class="mt-3 text-sm leading-6 text-lingua-subtle">
						This is a local demo login. Supabase Auth can replace it later without changing the
						tenant-scoped dashboard flow.
					</p>
				</div>
			</div>

			<form method="POST" action="?/login" class="mt-6 grid gap-4">
				<input type="hidden" name="redirectTo" value={data.redirectTo} />
				<label class="grid gap-2 text-sm font-semibold text-lingua-text">
					Demo account
					<select
						name="sessionId"
						class="tap-target rounded-lg border border-lingua-border bg-white px-3 font-normal"
						value={data.defaultSessionId}
					>
						{#each data.demoSessions as session (session.id)}
							<option value={session.id}>{session.label}</option>
						{/each}
					</select>
				</label>

				{#if form?.message}
					<p
						class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800"
					>
						{form.message}
					</p>
				{/if}

				<button
					class="tap-target inline-flex items-center justify-center gap-2 rounded-lg bg-lingua-primary px-4 text-sm font-semibold text-white"
					type="submit"
				>
					<LogIn size={17} /> Continue
				</button>
			</form>
		</section>
	</div>
</main>
