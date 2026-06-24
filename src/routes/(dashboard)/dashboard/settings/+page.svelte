<script lang="ts">
	import { enhance } from '$app/forms';
	import { Settings } from '@lucide/svelte';
	import AlertBanner from '$lib/ui/AlertBanner.svelte';
	import type { PageData, ActionData } from './$types';
	import { SEGMENTS, LANGUAGE_TAGS, TIMEZONES } from '$lib/domain/restaurant/schema';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const tenant = $derived(data.tenant);
	const settings = $derived(data.settings);

	// Editable fields — populated from server data on mount
	let name = $state('');
	let location = $state('');
	let segment = $state('');
	let timezone = $state('');
	let defaultLanguageTag = $state('');
	let description = $state('');

	$effect(() => {
		if (settings) {
			name = settings.name;
			location = settings.location;
			segment = settings.segment;
			timezone = settings.timezone;
			defaultLanguageTag = settings.default_language_tag;
			description = settings.description;
		}
	});

	// Repopulate on server validation error
	$effect(() => {
		if (form?.fields) {
			name = form.fields.name ?? name;
			location = form.fields.location ?? location;
			segment = form.fields.segment ?? segment;
			timezone = form.fields.timezone ?? timezone;
			defaultLanguageTag = form.fields.defaultLanguageTag ?? defaultLanguageTag;
			description = form.fields.description ?? description;
		}
	});

	const isOwner = $derived(
		tenant.membership.role === 'owner' || tenant.membership.role === 'manager'
	);

	const segmentLabels: Record<string, string> = {
		cafe: 'Cafe',
		'casual-dining': 'Casual Dining',
		'hotel-restaurant': 'Hotel Restaurant',
		'beach-club': 'Beach Club',
		premium: 'Premium Dining'
	};

	const languageLabels: Record<string, string> = {
		id: 'Indonesian',
		en: 'English',
		zh: 'Chinese',
		ja: 'Japanese',
		ko: 'Korean',
		ar: 'Arabic'
	};
</script>

<svelte:head>
	<title>Restaurant Settings - Lingua</title>
</svelte:head>

<section class="grid gap-5">
	<div class="flex items-start gap-3">
		<div>
			<p class="text-sm font-semibold text-lingua-primary">Settings</p>
			<h1 class="mt-2 text-3xl font-semibold">Restaurant Settings</h1>
			<p class="mt-2 max-w-3xl text-lingua-subtle">
				Manage the details for <strong>{tenant.activeRestaurant.name}</strong>. Changes apply
				immediately to your guest-facing menu.
			</p>
		</div>
	</div>

	{#if form?.success}
		<AlertBanner type="success" message="Settings saved successfully." />
	{/if}

	{#if form?.error}
		<AlertBanner type="error" message={form.error} />
	{/if}

	<form method="POST" use:enhance class="surface rounded-lg p-5">
		<div class="mb-5 flex items-center gap-2">
			<Settings size={18} class="text-lingua-primary" />
			<h2 class="text-lg font-semibold">Basic Information</h2>
		</div>

		<!-- Hidden fields -->
		<input type="hidden" name="restaurantId" value={tenant.activeRestaurant.id} />

		<div class="grid gap-4">
			<!-- Name -->
			<label class="grid gap-1 text-sm font-semibold">
				Restaurant Name
				<input
					type="text"
					name="name"
					bind:value={name}
					class="tap-target rounded-lg border border-lingua-border px-3 font-normal"
					placeholder="e.g. Warung Bali"
					maxlength={100}
					required
					disabled={!isOwner}
				/>
			</label>

			<!-- Slug (read-only) -->
			<label class="grid gap-1 text-sm font-semibold">
				URL Slug
				<input
					type="text"
					value={settings?.slug ?? ''}
					class="tap-target rounded-lg border border-lingua-border bg-lingua-bg/60 px-3 font-normal opacity-60"
					disabled
					readonly
					title="Slug cannot be changed after creation"
				/>
				<span class="text-xs font-normal text-lingua-subtle"
					>Slug cannot be changed after creation.</span
				>
			</label>

			<!-- Workspace host (read-only) -->
			<div class="grid gap-1 text-sm font-semibold">
				Workspace Host
				<div class="flex items-center gap-2">
					<input
						type="text"
						value={tenant.organization.workspaceHost ?? '(not configured)'}
						class="tap-target flex-1 rounded-lg border border-lingua-border bg-lingua-bg/60 px-3 font-normal font-mono opacity-60"
						disabled
						readonly
						title="Workspace host is assigned by Lingua admin"
					/>
				</div>
				<span class="text-xs font-normal text-lingua-subtle">
					Your custom subdomain. Contact support to change it.
				</span>
			</div>

			<!-- Segment -->
			<label class="grid gap-1 text-sm font-semibold">
				Type
				<select
					name="segment"
					bind:value={segment}
					class="tap-target rounded-lg border border-lingua-border px-3 font-normal"
					disabled={!isOwner}
				>
					{#each SEGMENTS as seg (seg)}
						<option value={seg}>{segmentLabels[seg] ?? seg}</option>
					{/each}
				</select>
			</label>

			<!-- Location -->
			<label class="grid gap-1 text-sm font-semibold">
				Location
				<input
					type="text"
					name="location"
					bind:value={location}
					class="tap-target rounded-lg border border-lingua-border px-3 font-normal"
					placeholder="e.g. Seminyak, Bali"
					maxlength={200}
					disabled={!isOwner}
				/>
			</label>

			<!-- Default Language -->
			<label class="grid gap-1 text-sm font-semibold">
				Default Language
				<select
					name="defaultLanguageTag"
					bind:value={defaultLanguageTag}
					class="tap-target rounded-lg border border-lingua-border px-3 font-normal"
					disabled={!isOwner}
				>
					{#each LANGUAGE_TAGS as tag (tag)}
						<option value={tag}>{languageLabels[tag] ?? tag}</option>
					{/each}
				</select>
			</label>

			<!-- Timezone -->
			<label class="grid gap-1 text-sm font-semibold">
				Timezone
				<select
					name="timezone"
					bind:value={timezone}
					class="tap-target rounded-lg border border-lingua-border px-3 font-normal"
					disabled={!isOwner}
				>
					{#each TIMEZONES as tz (tz)}
						<option value={tz}>{tz}</option>
					{/each}
				</select>
			</label>

			<!-- Description -->
			<label class="grid gap-1 text-sm font-semibold">
				Description
				<textarea
					name="description"
					bind:value={description}
					class="min-h-[100px] rounded-lg border border-lingua-border px-3 py-2 font-normal"
					placeholder="Brief description of your restaurant for guests..."
					maxlength={1000}
					disabled={!isOwner}
				></textarea>
			</label>
		</div>

		{#if isOwner}
			<div class="mt-5 flex justify-end">
				<button
					type="submit"
					class="tap-target rounded-lg bg-lingua-primary px-6 text-sm font-semibold text-white hover:bg-lingua-primary/90"
				>
					Save Settings
				</button>
			</div>
		{/if}
	</form>
</section>
