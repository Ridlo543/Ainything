<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { Star, CheckCircle } from '@lucide/svelte';
	import { page } from '$app/stores';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const submitted = $derived($page.url.searchParams.get('submitted') === '1');
	const tenant = $derived(data.tenant);
	const alreadySubmitted = $derived(data.alreadySubmitted);

	let rating = $state(0);
	let hoveredRating = $state(0);
	let submitting = $state(false);

	const STAR_LABELS = ['', 'Very poor', 'Poor', 'Okay', 'Good', 'Excellent'];
</script>

<svelte:head>
	<title>Pilot Feedback · {tenant.activeRestaurant.name}</title>
</svelte:head>

<div class="mx-auto max-w-xl px-4 py-8">
	<h1 class="mb-1 text-xl font-semibold text-gray-900 dark:text-white">Pilot feedback</h1>
	<p class="mb-6 text-sm text-gray-500 dark:text-gray-400">
		Help us improve Lingua. This takes about 2 minutes.
	</p>

	{#if submitted || alreadySubmitted}
		<div class="flex flex-col items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-8 text-center dark:border-emerald-800 dark:bg-emerald-900/20">
			<CheckCircle class="text-emerald-600" size={36} />
			<h2 class="text-base font-semibold text-emerald-900 dark:text-emerald-300">Thank you!</h2>
			<p class="text-sm text-emerald-700 dark:text-emerald-400">
				Your feedback has been recorded. We’ll use it to improve Lingua before the beta launch.
			</p>
			<a
				href="/dashboard"
				class="mt-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
			>
				Back to dashboard
			</a>
		</div>
	{:else}
		<form
			method="POST"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					await update();
					submitting = false;
				};
			}}
			class="space-y-6"
		>
			<input type="hidden" name="organizationId" value={tenant.organization.id} />

			{#if form?.error}
				<p class="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
					{form.error}
				</p>
			{/if}

			<!-- Overall rating -->
			<fieldset>
				<legend class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
					Overall experience <span class="text-red-500">*</span>
				</legend>
				<input type="hidden" name="overallRating" value={rating} />
				<div class="flex gap-1">
					{#each [1, 2, 3, 4, 5] as star}
						<button
							type="button"
							aria-label="{star} star{star !== 1 ? 's' : ''}"
							onclick={() => (rating = star)}
							onmouseenter={() => (hoveredRating = star)}
							onmouseleave={() => (hoveredRating = 0)}
							class="transition-transform hover:scale-110"
						>
							<Star
								size={28}
								class={`${
									star <= (hoveredRating || rating)
										? 'fill-amber-400 text-amber-400'
										: 'text-gray-300 dark:text-gray-600'
								}`}
							/>
						</button>
					{/each}
				</div>
				{#if hoveredRating || rating}
					<p class="mt-1 text-xs text-gray-500">{STAR_LABELS[hoveredRating || rating]}</p>
				{/if}
			</fieldset>

			<!-- AI accuracy -->
			<div>
				<label for="aiAccuracy" class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
					How accurate were the AI answers?
				</label>
				<select
					id="aiAccuracy"
					name="aiAccuracy"
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
				>
					<option value="">Select…</option>
					<option value="excellent">Excellent — very accurate</option>
					<option value="good">Good — mostly accurate</option>
					<option value="acceptable">Acceptable — some errors</option>
					<option value="poor">Poor — many errors</option>
				</select>
			</div>

			<!-- Setup difficulty -->
			<div>
				<label for="setupDifficulty" class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
					How easy was setup?
				</label>
				<select
					id="setupDifficulty"
					name="setupDifficulty"
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
				>
					<option value="">Select…</option>
					<option value="very-easy">Very easy</option>
					<option value="easy">Easy</option>
					<option value="neutral">Neutral</option>
					<option value="hard">Hard</option>
					<option value="very-hard">Very hard</option>
				</select>
			</div>

			<!-- Would recommend -->
			<fieldset>
				<legend class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
					Would you recommend Lingua to another restaurant?
				</legend>
				<div class="flex gap-4">
					<label class="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
						<input type="radio" name="wouldRecommend" value="yes" class="accent-indigo-600" />
						Yes
					</label>
					<label class="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
						<input type="radio" name="wouldRecommend" value="no" class="accent-indigo-600" />
						No
					</label>
				</div>
			</fieldset>

			<!-- Comment -->
			<div>
				<label for="comment" class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
					Anything else? (optional)
				</label>
				<textarea
					id="comment"
					name="comment"
					rows="4"
					maxlength="2000"
					placeholder="Tell us what worked well, what didn't, and what you'd like to see next…"
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
				></textarea>
			</div>

			<button
				type="submit"
				disabled={submitting || rating === 0}
				class="w-full rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{submitting ? 'Submitting…' : 'Submit feedback'}
			</button>
		</form>
	{/if}
</div>
