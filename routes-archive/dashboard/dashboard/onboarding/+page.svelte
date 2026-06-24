<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import {
		CheckCircle,
		Circle,
		ArrowRight,
		Table2,
		BookOpen,
		QrCode,
		Rocket
	} from '@lucide/svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const tenant = $derived(data.tenant);
	const step = $derived(data.step);
	const restaurant = $derived(tenant.activeRestaurant);

	// Steps definition
	const STEPS = [
		{ label: 'Restaurant Profile', icon: Rocket },
		{ label: 'Set Up Tables', icon: Table2 },
		{ label: 'Create Menu', icon: BookOpen },
		{ label: 'Get Your QR Codes', icon: QrCode }
	];

	let tableCount = $state('10');
	let tablePrefix = $state('T');
	let submitting = $state(false);
</script>

<svelte:head>
	<title>Onboarding · {restaurant.name}</title>
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-10">
	<!-- Header -->
	<div class="mb-8">
		<h1 class="text-2xl font-semibold text-gray-900 dark:text-white">Welcome to Lingua</h1>
		<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
			Let's get <strong>{restaurant.name}</strong> ready in a few steps.
		</p>
	</div>

	<!-- Step progress -->
	<ol class="mb-10 flex items-center gap-0">
		{#each STEPS as s, i (i)}
			{@const done = step > i + 1}
			{@const active = step === i + 1}
			<li class="flex flex-1 flex-col items-center gap-1.5">
				<div
					class="flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors
						{done ? 'border-lingua-success bg-lingua-success text-white' : ''}
						{active ? 'border-lingua-primary bg-lingua-primary text-white' : ''}
						{!done && !active ? 'border-lingua-border bg-lingua-muted text-lingua-subtle' : ''}"
				>
					{#if done}
						<CheckCircle size={16} />
					{:else if active}
						<span class="text-xs font-bold">{i + 1}</span>
					{:else}
						<Circle size={16} />
					{/if}
				</div>
				<span
					class="hidden text-center text-xs sm:block
					{active ? 'font-semibold text-lingua-primary' : 'text-lingua-subtle'}"
				>
					{s.label}
				</span>
			</li>
			{#if i < STEPS.length - 1}
				<div class="mb-4 h-px flex-1 bg-lingua-border"></div>
			{/if}
		{/each}
	</ol>

	<!-- Step panels -->

	{#if step === 1}
		<!-- Step 1: Profile already done during registration -->
		<div class="rounded-lg border border-lingua-border bg-lingua-surface p-6">
			<div class="mb-4 flex items-center gap-2 text-lingua-success">
				<CheckCircle size={20} />
				<h2 class="font-semibold">Restaurant profile is set up</h2>
			</div>
			<dl class="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
				<dt class="text-lingua-subtle">Name</dt>
				<dd class="font-medium text-lingua-text">{restaurant.name}</dd>
				<dt class="text-lingua-subtle">Slug</dt>
				<dd class="font-mono text-lingua-text">{restaurant.slug}</dd>
				<dt class="text-lingua-subtle">Location</dt>
				<dd class="text-lingua-text">{restaurant.location || '—'}</dd>
			</dl>
			<a
				href={resolve('/dashboard/onboarding?step=2')}
				class="mt-6 inline-flex items-center gap-2 rounded-md bg-lingua-primary px-4 py-2 text-sm font-semibold text-white hover:bg-lingua-primary/90"
			>
				Continue <ArrowRight size={16} />
			</a>
		</div>
	{:else if step === 2}
		<!-- Step 2: Set up tables -->
		<div class="rounded-lg border border-lingua-border bg-lingua-surface p-6">
			<h2 class="mb-1 font-semibold text-lingua-text">Set up tables</h2>
			<p class="mb-5 text-sm text-lingua-subtle">
				We'll create QR codes for each table. You can add or remove tables later.
			</p>

			{#if form?.action === 'setupTables' && form?.error}
				<p
					class="mb-4 rounded border border-lingua-danger/30 bg-lingua-danger-soft/20 px-3 py-2 text-sm text-lingua-danger"
				>
					{form.error}
				</p>
			{/if}

			<form
				method="POST"
				action="?/setupTables"
				use:enhance={() => {
					submitting = true;
					return async ({ update }) => {
						await update();
						submitting = false;
					};
				}}
			>
				<input type="hidden" name="restaurantId" value={restaurant.id} />
				<input type="hidden" name="organizationId" value={tenant.organization.id} />

				<div class="mb-4 grid grid-cols-2 gap-4">
					<div>
						<label for="count" class="mb-1 block text-sm font-medium text-lingua-text">
							Number of tables
						</label>
						<input
							type="number"
							id="count"
							name="count"
							min="1"
							max="200"
							bind:value={tableCount}
							class="w-full rounded-md border border-lingua-border bg-lingua-surface px-3 py-2 text-sm focus:border-lingua-primary focus:outline-none"
						/>
					</div>
					<div>
						<label for="prefix" class="mb-1 block text-sm font-medium text-lingua-text">
							Code prefix
						</label>
						<input
							type="text"
							id="prefix"
							name="prefix"
							maxlength="4"
							placeholder="T"
							bind:value={tablePrefix}
							class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
						/>
					</div>
				</div>

				<p class="mb-5 text-xs text-lingua-subtle">
					Preview: {tablePrefix || 'T'}01, {tablePrefix || 'T'}02 … {tablePrefix || 'T'}{String(
						Number(tableCount) || 1
					).padStart(2, '0')}
				</p>

				<button
					type="submit"
					disabled={submitting}
					class="inline-flex items-center gap-2 rounded-md bg-lingua-primary px-4 py-2 text-sm font-semibold text-white hover:bg-lingua-primary/90 disabled:opacity-50"
				>
					{submitting ? 'Creating tables…' : 'Create tables'}
					{#if !submitting}<ArrowRight size={16} />{/if}
				</button>
			</form>
		</div>
	{:else if step === 3}
		<!-- Step 3: Create draft menu -->
		<div class="rounded-lg border border-lingua-border bg-lingua-surface p-6">
			<h2 class="mb-1 font-semibold text-lingua-text">Create your first menu</h2>
			<p class="mb-5 text-sm text-lingua-subtle">
				We'll create an empty draft menu. You can import items from a photo, PDF, or spreadsheet
				next.
			</p>

			{#if form?.action === 'createDraftMenu' && form?.error}
				<p
					class="mb-4 rounded border border-lingua-danger/30 bg-lingua-danger-soft/20 px-3 py-2 text-sm text-lingua-danger"
				>
					{form.error}
				</p>
			{/if}

			<form
				method="POST"
				action="?/createDraftMenu"
				use:enhance={() => {
					submitting = true;
					return async ({ update }) => {
						await update();
						submitting = false;
					};
				}}
			>
				<input type="hidden" name="restaurantId" value={restaurant.id} />
				<input type="hidden" name="organizationId" value={tenant.organization.id} />

				<button
					type="submit"
					disabled={submitting}
					class="inline-flex items-center gap-2 rounded-md bg-lingua-primary px-4 py-2 text-sm font-semibold text-white hover:bg-lingua-primary/90 disabled:opacity-50"
				>
					{submitting ? 'Creating menu…' : 'Create draft menu'}
					{#if !submitting}<ArrowRight size={16} />{/if}
				</button>
			</form>
		</div>
	{:else if step === 4}
		<!-- Step 4: QR codes ready -->
		<div class="rounded-lg border border-lingua-border bg-lingua-surface p-6">
			<div class="mb-4 flex items-center gap-2 text-lingua-success">
				<CheckCircle size={20} />
				<h2 class="font-semibold">You're all set!</h2>
			</div>
			<p class="mb-5 text-sm text-lingua-subtle">
				Your tables and draft menu are ready. Head to the Tables page to download your QR codes, or
				go to Menu to import your first items.
			</p>
			<div class="flex flex-wrap gap-3">
				<a
					href={resolve('/dashboard/tables')}
					class="inline-flex items-center gap-2 rounded-md bg-lingua-primary px-4 py-2 text-sm font-semibold text-white hover:bg-lingua-primary/90"
				>
					<QrCode size={16} /> View QR codes
				</a>
				<a
					href={resolve('/dashboard/import')}
					class="inline-flex items-center gap-2 rounded-md border border-lingua-border bg-lingua-surface px-4 py-2 text-sm font-semibold text-lingua-text hover:bg-lingua-muted"
				>
					<BookOpen size={16} /> Import menu
				</a>
				<a
					href={resolve('/dashboard')}
					class="text-sm text-lingua-subtle underline hover:text-lingua-text self-center"
				>
					Skip to dashboard
				</a>
			</div>
		</div>
	{/if}
</div>
