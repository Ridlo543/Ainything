<script lang="ts">
	import {
		ArrowLeft,
		Languages,
		MessageCircle,
		QrCode,
		ShieldCheck,
		ThumbsUp
	} from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';
	import type { Allergen, DietaryFlag, MenuItem } from '$lib/domain/menu/types';
	import type { DietaryPreferenceCode } from '$lib/domain/session/schema';
	import { formatPrice, needsStaffConfirmation, spiceLabel } from '$lib/domain/menu/policy';
	import ChatPanel from '$lib/ui/menu/ChatPanel.svelte';
	import MenuItemCard from '$lib/ui/menu/MenuItemCard.svelte';
	import PreferenceChips from '$lib/ui/menu/PreferenceChips.svelte';
	import SafetyBadges from '$lib/ui/menu/SafetyBadges.svelte';

	let { data }: { data: PageData } = $props();

	// ── Session state ──────────────────────────────────────────────────────────
	let sessionId = $state<string | null>(null);
	let selectedLanguage = $state('en');
	let selectedPreferences = $state<DietaryPreferenceCode[]>([]);

	// Create a session on mount
	$effect(() => {
		selectedLanguage = data.restaurant.languages[0] ?? 'en';
		createSession();
	});

	async function createSession() {
		try {
			const res = await fetch('/api/public/sessions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					restaurantSlug: data.restaurant.slug,
					tableCode: data.tableCode,
					languageTag: selectedLanguage,
					preferences: { dietary: selectedPreferences }
				})
			});
			if (res.ok) {
				const json = await res.json();
				sessionId = json.sessionId;
			}
		} catch {
			// fail silently — chat will show error if sessionId is null
		}
	}

	// ── Menu browse state ──────────────────────────────────────────────────────
	const categories = $derived(data.restaurant.categories ?? []);
	let selectedCategory = $state('');
	let selectedItem = $state<MenuItem | null>(null);

	$effect(() => {
		if (categories.length > 0 && !categories.includes(selectedCategory)) {
			selectedCategory = categories[0];
		}
		if (!selectedItem && data.restaurant.menuItems.length > 0) {
			selectedItem = data.restaurant.menuItems[0];
		}
	});

	const filteredItems = $derived(
		data.restaurant.menuItems.filter((item) => item.category === selectedCategory)
	);

	// ── Allergen inference from dietary preferences ────────────────────────────
	// Map DietaryPreferenceCode → Allergen[] so needsStaffConfirmation is accurate.
	const PREF_TO_ALLERGENS: Partial<Record<DietaryPreferenceCode, Allergen[]>> = {
		'nut-free': ['nuts'],
		'gluten-free': ['gluten']
	};

	const inferredAllergens = $derived<Allergen[]>(
		selectedPreferences.flatMap((p) => PREF_TO_ALLERGENS[p] ?? [])
	);

	// Subset of DietaryPreferenceCodes that map 1:1 to DietaryFlag for policy checks
	const DIETARY_FLAG_CODES = new Set<string>([
		'halal',
		'vegetarian',
		'vegan',
		'gluten-free',
		'nut-free',
		'contains-alcohol'
	]);

	const prefAsDietaryFlags = $derived<DietaryFlag[]>(
		selectedPreferences.filter((p) => DIETARY_FLAG_CODES.has(p)) as DietaryFlag[]
	);

	function togglePreference(flag: DietaryFlag) {
		const code = flag as DietaryPreferenceCode;
		selectedPreferences = selectedPreferences.includes(code)
			? selectedPreferences.filter((p) => p !== code)
			: [...selectedPreferences, code];
	}

	// ── Feedback ───────────────────────────────────────────────────────────────
	let feedback = $state<'helpful' | 'unclear' | null>(null);
	let feedbackSent = $state(false);

	async function sendFeedback(value: 'helpful' | 'unclear') {
		feedback = value;
		if (!sessionId) return;

		try {
			await fetch('/api/public/feedback', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					restaurantSlug: data.restaurant.slug,
					tableCode: data.tableCode,
					sessionId,
					helpful: value === 'helpful',
					issueType: value === 'unclear' ? 'missing-info' : undefined
				})
			});
			feedbackSent = true;
		} catch {
			// feedback failing is non-critical — still show local confirmation
			feedbackSent = true;
		}
	}
</script>

<svelte:head>
	<title>{data.restaurant.name} - LinguaServe</title>
</svelte:head>

<main class="min-h-screen pb-24">
	<section class="relative overflow-hidden bg-lingua-primary text-white">
		<img
			src={data.restaurant.heroImage}
			alt=""
			class="absolute inset-0 h-full w-full object-cover opacity-35"
		/>
		<div class="relative app-container py-5 sm:py-8">
			<a
				class="inline-flex items-center gap-2 text-sm font-semibold text-white/90"
				href={resolve('/')}
			>
				<ArrowLeft size={16} /> LinguaServe
			</a>
			<div class="mt-8 grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
				<div>
					<p
						class="inline-flex items-center gap-2 rounded-md bg-white/14 px-3 py-1.5 text-sm font-semibold"
					>
						<QrCode size={15} /> Table {data.tableCode}
					</p>
					<h1 class="mt-4 text-3xl font-semibold sm:text-5xl">{data.restaurant.name}</h1>
					<p class="mt-3 max-w-2xl text-base leading-7 text-white/88">
						{data.restaurant.description}
					</p>
				</div>
			</div>
		</div>
	</section>

	<div class="app-container grid gap-5 py-5 lg:grid-cols-[minmax(0,1fr)_390px]">
		<section class="grid gap-5">
			<!-- Language & preferences -->
			<div class="surface rounded-lg p-4">
				<div class="flex items-center justify-between gap-3">
					<div>
						<p class="font-semibold text-lingua-text">Language and food preferences</p>
						<p class="text-sm text-lingua-subtle">
							No login required. Preferences stay in this session.
						</p>
					</div>
					<Languages class="text-lingua-primary" size={24} />
				</div>
				<div class="mt-4 grid gap-3 sm:grid-cols-[220px_1fr]">
					<select
						class="tap-target rounded-lg border border-lingua-border bg-white px-3 text-sm"
						bind:value={selectedLanguage}
						aria-label="Language"
					>
						{#each data.restaurant.languages as lang (lang)}
							<option value={lang}>{lang}</option>
						{/each}
					</select>
					<PreferenceChips selected={prefAsDietaryFlags} onToggle={togglePreference} />
				</div>
			</div>

			<!-- Menu browse -->
			<div class="surface rounded-lg p-4">
				<div class="flex items-center justify-between gap-3">
					<div>
						<p class="font-semibold text-lingua-text">Browse menu</p>
						<p class="text-sm text-lingua-subtle">
							Menu details are based on restaurant-approved data.
						</p>
					</div>
					<span
						class="rounded-md bg-lingua-accent-soft px-3 py-1.5 text-sm font-semibold text-orange-800"
					>
						{data.restaurant.menuSourceType}
					</span>
				</div>

				{#if categories.length === 0}
					<p class="mt-4 text-sm text-lingua-subtle">No menu categories available yet.</p>
				{:else}
					<div class="mt-4 flex gap-2 overflow-x-auto pb-1">
						{#each categories as category (category)}
							<button
								type="button"
								class={`tap-target shrink-0 rounded-lg border px-4 text-sm font-semibold ${
									selectedCategory === category
										? 'border-lingua-primary bg-lingua-primary text-white'
										: 'border-lingua-border bg-white text-lingua-text'
								}`}
								onclick={() => (selectedCategory = category)}
							>
								{category}
							</button>
						{/each}
					</div>

					<div class="mt-4 grid gap-3">
						{#if filteredItems.length === 0}
							<p class="py-4 text-center text-sm text-lingua-subtle">
								No items in this category right now.
							</p>
						{:else}
							{#each filteredItems as item (item.id)}
								<MenuItemCard
									{item}
									selected={selectedItem?.id === item.id}
									onclick={() => (selectedItem = item)}
								/>
							{/each}
						{/if}
					</div>
				{/if}
			</div>
		</section>

		<aside class="grid content-start gap-5">
			<!-- Item detail -->
			{#if selectedItem}
				<section class="surface rounded-lg p-4">
					<img
						src={selectedItem.image}
						alt={selectedItem.name}
						class="h-36 w-full rounded-lg object-cover"
						loading="lazy"
					/>
					<div class="mt-4 flex items-start justify-between gap-3">
						<div>
							{#if selectedItem.localName}
								<p class="text-sm text-lingua-subtle">{selectedItem.localName}</p>
							{/if}
							<h2 class="text-xl font-semibold text-lingua-text">{selectedItem.name}</h2>
						</div>
						<p class="font-semibold text-lingua-primary">{formatPrice(selectedItem.price)}</p>
					</div>
					<p class="mt-3 text-sm leading-6 text-lingua-subtle">{selectedItem.description}</p>
					<div class="mt-4">
						<SafetyBadges item={selectedItem} />
					</div>
					<div class="mt-4 rounded-lg bg-slate-50 p-3">
						<p class="text-sm font-semibold text-lingua-text">Recommendation reason</p>
						<p class="mt-1 text-sm leading-6 text-lingua-subtle">
							{#if selectedItem.goodFor.length > 0}
								Good for {selectedItem.goodFor.join(', ')}.
							{/if}
							Spice level: {spiceLabel(selectedItem.spiceLevel)}.
						</p>
					</div>
					{#if needsStaffConfirmation(selectedItem, prefAsDietaryFlags, inferredAllergens)}
						<div
							class="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900"
						>
							Staff confirmation recommended for your preferences or dietary requirements.
						</div>
					{:else}
						<div
							class="mt-4 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm leading-6 text-green-900"
						>
							<ShieldCheck class="mt-0.5 shrink-0" size={18} /> Verified menu data available for this
							item.
						</div>
					{/if}
				</section>
			{:else}
				<section class="surface rounded-lg p-4">
					<p class="text-sm text-lingua-subtle">Select a menu item to see details.</p>
				</section>
			{/if}

			<!-- Chat panel — wired to API -->
			<ChatPanel
				restaurant={data.restaurant}
				tableCode={data.tableCode}
				{sessionId}
				languageTag={selectedLanguage}
				dietaryPreferences={selectedPreferences}
			/>

			<!-- Quick feedback -->
			<section class="surface rounded-lg p-4">
				<div class="flex items-center gap-3">
					<MessageCircle class="text-lingua-primary" size={22} />
					<div>
						<p class="font-semibold text-lingua-text">Quick feedback</p>
						<p class="text-sm text-lingua-subtle">Tell the restaurant if this helped.</p>
					</div>
				</div>
				<div class="mt-4 grid grid-cols-2 gap-2">
					<button
						type="button"
						class={`tap-target rounded-lg border text-sm font-semibold ${
							feedback === 'helpful'
								? 'border-lingua-primary bg-lingua-primary text-white'
								: 'border-lingua-border bg-white'
						}`}
						onclick={() => sendFeedback('helpful')}
						disabled={feedbackSent}
					>
						Helpful
					</button>
					<button
						type="button"
						class={`tap-target rounded-lg border text-sm font-semibold ${
							feedback === 'unclear'
								? 'border-lingua-warning bg-amber-50 text-amber-900'
								: 'border-lingua-border bg-white'
						}`}
						onclick={() => sendFeedback('unclear')}
						disabled={feedbackSent}
					>
						Unclear
					</button>
				</div>
				{#if feedbackSent}
					<p class="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-lingua-primary">
						<ThumbsUp size={16} /> Thank you for your feedback.
					</p>
				{/if}
			</section>
		</aside>
	</div>
</main>
