<script lang="ts">
	import { Building2, ArrowRight, RefreshCw, CheckCircle, XCircle, Loader } from '@lucide/svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form?: ActionData } = $props();

	const fields = $derived(form as Record<string, string | null | undefined> | undefined);

	// Slug auto-generation from restaurant name
	// Use separate mutable state; initialise from form repopulation only once via effect
	let restaurantName = $state('');
	let restaurantSlug = $state('');
	let slugManuallyEdited = $state(false);

	// Real-time slug availability state
	type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'error';
	let slugStatus = $state<SlugStatus>('idle');
	let slugCheckTimer: ReturnType<typeof setTimeout> | null = null;

	// Repopulate from server form data on error (runs once after mount)
	$effect(() => {
		if (fields?.restaurantName) restaurantName = String(fields.restaurantName);
		if (fields?.restaurantSlug) {
			restaurantSlug = String(fields.restaurantSlug);
			slugManuallyEdited = true;
		}
	});

	function slugify(name: string): string {
		return name
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 60);
	}

	function scheduleSlugCheck(slug: string) {
		if (slugCheckTimer) clearTimeout(slugCheckTimer);
		if (slug.length < 2 || !/^[a-z0-9-]+$/.test(slug)) {
			slugStatus = 'idle';
			return;
		}
		slugStatus = 'checking';
		slugCheckTimer = setTimeout(async () => {
			try {
				const res = await fetch(
					`/api/public/slug-check?slug=${encodeURIComponent(slug)}&type=both`
				);
				if (!res.ok) {
					slugStatus = 'error';
					return;
				}
				const body = await res.json() as { available: boolean };
				slugStatus = body.available ? 'available' : 'taken';
			} catch {
				slugStatus = 'error';
			}
		}, 400);
	}

	function onNameInput(e: Event) {
		restaurantName = (e.target as HTMLInputElement).value;
		if (!slugManuallyEdited) {
			restaurantSlug = slugify(restaurantName);
			scheduleSlugCheck(restaurantSlug);
		}
	}

	function onSlugInput(e: Event) {
		restaurantSlug = (e.target as HTMLInputElement).value;
		slugManuallyEdited = true;
		scheduleSlugCheck(restaurantSlug);
	}

	function resetSlug() {
		restaurantSlug = slugify(restaurantName);
		slugManuallyEdited = false;
		scheduleSlugCheck(restaurantSlug);
	}

	const TIMEZONES = [
		{ value: 'Asia/Jakarta', label: 'WIB — Jakarta, Bali (UTC+7)' },
		{ value: 'Asia/Makassar', label: 'WITA — Makassar, Lombok (UTC+8)' },
		{ value: 'Asia/Jayapura', label: 'WIT — Jayapura (UTC+9)' },
		{ value: 'Asia/Singapore', label: 'SGT — Singapore (UTC+8)' },
		{ value: 'Asia/Bangkok', label: 'ICT — Bangkok (UTC+7)' },
		{ value: 'Asia/Tokyo', label: 'JST — Tokyo (UTC+9)' },
		{ value: 'Europe/London', label: 'GMT — London (UTC+0)' },
		{ value: 'America/New_York', label: 'ET — New York (UTC-5)' }
	];

	const SEGMENTS = [
		{ value: 'cafe', label: 'Cafe' },
		{ value: 'casual-dining', label: 'Casual Dining' },
		{ value: 'hotel-restaurant', label: 'Hotel Restaurant' },
		{ value: 'beach-club', label: 'Beach Club' },
		{ value: 'premium', label: 'Premium / Fine Dining' }
	];

	const LANGUAGES = [
		{ value: 'id', label: 'Indonesian' },
		{ value: 'en', label: 'English' },
		{ value: 'zh', label: 'Chinese (Simplified)' },
		{ value: 'ja', label: 'Japanese' },
		{ value: 'ko', label: 'Korean' },
		{ value: 'ar', label: 'Arabic' }
	];

	const inputClass =
		'tap-target w-full rounded-lg border border-lingua-border bg-white px-3 py-2 text-sm font-normal text-lingua-text placeholder:text-lingua-subtle/60 focus:border-lingua-primary focus:outline-none focus:ring-1 focus:ring-lingua-primary dark:bg-lingua-surface dark:text-lingua-text';
</script>

<svelte:head>
	<title>Set up your restaurant - Lingua</title>
</svelte:head>

<main class="min-h-screen py-6 sm:py-10">
	<div class="app-container grid min-h-[calc(100vh-80px)] place-items-center">
		<section class="surface w-full max-w-lg rounded-lg p-5 sm:p-7">
			<!-- Header -->
			<div class="flex items-start gap-3">
				<span class="rounded-lg bg-lingua-primary-soft p-3 text-lingua-primary">
					<Building2 size={26} />
				</span>
				<div>
					<h1 class="text-2xl font-semibold text-lingua-text">Set up your restaurant</h1>
					<p class="mt-1 text-sm leading-6 text-lingua-subtle">
						Almost there, {data.user.name.split(' ')[0]}. Tell us about your restaurant.
					</p>
				</div>
			</div>

			<!-- Step indicator -->
			<div class="mt-5 flex items-center gap-2 text-xs text-lingua-subtle">
				<span class="flex h-5 w-5 items-center justify-center rounded-full bg-lingua-primary/20 text-lingua-primary font-semibold">✓</span>
				<span class="text-lingua-subtle/60">Account created</span>
				<span class="mx-1 text-lingua-border">→</span>
				<span class="flex h-5 w-5 items-center justify-center rounded-full bg-lingua-primary text-white font-semibold">2</span>
				<span class="font-semibold text-lingua-text">Restaurant details</span>
			</div>

			<form method="POST" action="?/setup" class="mt-6 grid gap-4">
				<!-- Restaurant name -->
				<label class="grid gap-1.5 text-sm font-semibold text-lingua-text">
					Restaurant name
					<input
						type="text"
						name="restaurantName"
						required
						autocomplete="organization"
						placeholder="Uma Karang"
						value={restaurantName}
						oninput={onNameInput}
						class={inputClass}
					/>
				</label>

				<!-- URL slug -->
				<label class="grid gap-1.5 text-sm font-semibold text-lingua-text">
					Restaurant URL
					<div class="flex items-center gap-1">
						<span class="rounded-l-lg border border-r-0 border-lingua-border bg-lingua-surface px-3 py-2 text-sm text-lingua-subtle whitespace-nowrap">
							lingua.app/r/
						</span>
						<input
							type="text"
							name="restaurantSlug"
							required
							placeholder="uma-karang"
							value={restaurantSlug}
							oninput={onSlugInput}
							pattern="[a-z0-9-]+"
							minlength="2"
							maxlength="60"
							class="tap-target min-w-0 flex-1 rounded-r-lg border border-lingua-border bg-white px-3 py-2 text-sm font-normal text-lingua-text placeholder:text-lingua-subtle/60 focus:border-lingua-primary focus:outline-none focus:ring-1 focus:ring-lingua-primary dark:bg-lingua-surface dark:text-lingua-text"
						/>
					{#if slugManuallyEdited}
						<button
							type="button"
							onclick={resetSlug}
							title="Reset to auto-generated slug"
							class="tap-target ml-1 rounded-lg border border-lingua-border p-2 text-lingua-subtle hover:text-lingua-text"
						>
							<RefreshCw size={14} />
						</button>
					{/if}
				</div>
				<!-- Real-time availability feedback -->
				{#if slugStatus === 'checking'}
					<span class="flex items-center gap-1 text-xs font-normal text-lingua-subtle">
						<Loader size={12} class="animate-spin" /> Checking availability...
					</span>
				{:else if slugStatus === 'available'}
					<span class="flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400">
						<CheckCircle size={12} /> Available
					</span>
				{:else if slugStatus === 'taken'}
					<span class="flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400">
						<XCircle size={12} /> Already taken — choose a different slug.
					</span>
				{:else if slugStatus === 'error'}
					<span class="text-xs font-normal text-lingua-subtle">Could not check availability.</span>
				{:else}
					<span class="text-xs font-normal text-lingua-subtle">
						Lowercase letters, numbers, and hyphens only. This is permanent.
					</span>
				{/if}
				</label>

				<!-- Segment -->
				<label class="grid gap-1.5 text-sm font-semibold text-lingua-text">
					Restaurant type
					<select
						name="segment"
						required
						class={inputClass}
					>
						<option value="" disabled selected={!fields?.segment}>Select type...</option>
						{#each SEGMENTS as s}
							<option value={s.value} selected={fields?.segment === s.value}>{s.label}</option>
						{/each}
					</select>
				</label>

				<!-- Location -->
				<label class="grid gap-1.5 text-sm font-semibold text-lingua-text">
					City / Location
					<input
						type="text"
						name="location"
						placeholder="Seminyak, Bali"
						value={fields?.location ?? ''}
						maxlength="100"
						class={inputClass}
					/>
					<span class="text-xs font-normal text-lingua-subtle">Optional — helps tourists find you.</span>
				</label>

				<!-- Default language -->
				<label class="grid gap-1.5 text-sm font-semibold text-lingua-text">
					Menu default language
					<select name="defaultLanguageTag" required class={inputClass}>
						{#each LANGUAGES as lang}
							<option
								value={lang.value}
								selected={fields?.defaultLanguageTag === lang.value || (!fields?.defaultLanguageTag && lang.value === 'id')}
							>
								{lang.label}
							</option>
						{/each}
					</select>
					<span class="text-xs font-normal text-lingua-subtle">
						The language your menu is written in. Guests can switch languages anytime.
					</span>
				</label>

				<!-- Timezone -->
				<label class="grid gap-1.5 text-sm font-semibold text-lingua-text">
					Timezone
					<select name="timezone" required class={inputClass}>
						{#each TIMEZONES as tz}
							<option
								value={tz.value}
								selected={fields?.timezone === tz.value || (!fields?.timezone && tz.value === 'Asia/Jakarta')}
							>
								{tz.label}
							</option>
						{/each}
					</select>
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
					class="tap-target mt-1 inline-flex items-center justify-center gap-2 rounded-lg bg-lingua-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:brightness-95"
				>
					Finish setup <ArrowRight size={16} />
				</button>
			</form>
		</section>
	</div>
</main>
