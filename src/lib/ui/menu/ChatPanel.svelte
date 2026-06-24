<script lang="ts">
	import {
		CircleAlert,
		Loader2,
		MessageCircleQuestion,
		Send,
		UserRoundCheck
	} from '@lucide/svelte';
	import type { Restaurant } from '$lib/domain/menu/types';
	import type { DietaryPreferenceCode } from '$lib/domain/session/schema';
	import { t } from '$lib/i18n';

	let {
		restaurant,
		tableCode,
		sessionId,
		languageTag,
		dietaryPreferences
	}: {
		restaurant: Restaurant;
		tableCode: string;
		sessionId: string | null;
		languageTag: string;
		dietaryPreferences: DietaryPreferenceCode[];
	} = $props();

	type ChatMessage = { role: 'user' | 'assistant'; content: string; safety?: string };
	type UiState = 'idle' | 'loading' | 'error';

	let draft = $state('');
	let uiState = $state<UiState>('idle');
	let messages = $state<ChatMessage[]>([]);
	let lastSuggestFallback = $state(false);
	let errorMessage = $state('');

	async function sendMessage() {
		const question = draft.trim();
		if (!question || uiState === 'loading') return;

		if (!sessionId) {
			errorMessage = t('chat.error.session');
			uiState = 'error';
			return;
		}

		messages = [...messages, { role: 'user', content: question }];
		draft = '';
		uiState = 'loading';
		errorMessage = '';

		try {
			const res = await fetch('/api/public/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					restaurantSlug: restaurant.slug,
					tableCode,
					sessionId,
					content: question,
					languageTag,
					dietaryPreferences
				})
			});

			if (!res.ok) {
				throw new Error(`HTTP ${res.status}`);
			}

			const data = await res.json();

			messages = [
				...messages,
				{ role: 'assistant', content: data.answer, safety: data.safetyStatus }
			];
			lastSuggestFallback = data.suggestFallback;
			uiState = 'idle';
		} catch {
			errorMessage = t('chat.error.network');
			uiState = 'error';
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	}

	function safetyIcon(safety: string | undefined) {
		return safety === 'needs-staff' || safety === 'low-confidence' ? 'warn' : 'info';
	}
</script>

<section class="surface rounded-lg p-4">
	<div class="flex items-center justify-between gap-3">
		<div>
			<p class="font-semibold text-lingua-text">{t('chat.heading')}</p>
			<p class="text-sm text-lingua-subtle">{t('chat.subtitle')}</p>
		</div>
		<span class="rounded-lg bg-lingua-primary-soft p-2 text-lingua-primary">
			<MessageCircleQuestion size={22} />
		</span>
	</div>

	<!-- Conversation history -->
	{#if messages.length > 0}
		<div
			class="mt-4 flex flex-col gap-3"
			aria-live="polite"
			aria-label={t('chat.conversation.aria')}
		>
			{#each messages as msg (msg)}
				{#if msg.role === 'user'}
					<div class="flex justify-end">
						<p
							class="max-w-[85%] rounded-lg rounded-br-sm bg-lingua-primary px-3 py-2 text-sm text-white"
						>
							{msg.content}
						</p>
					</div>
				{:else}
					<div class="flex items-start gap-2">
						{#if safetyIcon(msg.safety) === 'warn'}
							<CircleAlert
								class="mt-0.5 shrink-0 text-lingua-warning"
								size={18}
								aria-hidden="true"
							/>
						{:else}
							<MessageCircleQuestion
								class="mt-0.5 shrink-0 text-lingua-primary"
								size={18}
								aria-hidden="true"
							/>
						{/if}
						<div
							class="max-w-[85%] rounded-lg rounded-bl-sm border border-lingua-border bg-slate-50 px-3 py-2 text-sm leading-6 text-lingua-text"
						>
							{msg.content}
							{#if msg.safety === 'needs-staff'}
								<p class="mt-1 text-xs font-semibold text-lingua-warning">
									{t('chat.safety.staff')}
								</p>
							{:else if msg.safety === 'low-confidence'}
								<p class="mt-1 text-xs text-lingua-subtle">
									{t('chat.safety.lowConfidence')}
								</p>
							{/if}
						</div>
					</div>
				{/if}
			{/each}

			{#if uiState === 'loading'}
				<div class="flex items-center gap-2 text-sm text-lingua-subtle">
					<Loader2 class="animate-spin" size={16} aria-hidden="true" />
					{t('chat.loading')}
				</div>
			{/if}
		</div>
	{:else}
		<!-- Empty state with prompt suggestions -->
		<div class="mt-4 rounded-lg border border-lingua-border bg-slate-50 p-3">
			{#if uiState === 'loading'}
				<div class="flex items-center gap-2 text-sm text-lingua-subtle">
					<Loader2 class="animate-spin" size={16} aria-hidden="true" />
					{t('chat.loading')}
				</div>
			{:else}
				<p class="text-sm text-lingua-subtle">{t('chat.empty.prompt')}</p>
				<div class="mt-2 flex flex-wrap gap-2">
					{#each [t('chat.suggestion.halal'), t('chat.suggestion.nutFree'), t('chat.suggestion.spice')] as suggestion (suggestion)}
						<button
							type="button"
							class="rounded-md border border-lingua-border bg-lingua-surface px-2 py-1 text-xs text-lingua-text hover:border-lingua-primary hover:text-lingua-primary"
							onclick={() => {
								draft = suggestion;
							}}
						>
							{suggestion}
						</button>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	{#if uiState === 'error'}
		<div
			class="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
			role="alert"
		>
			<CircleAlert class="mt-0.5 shrink-0" size={16} aria-hidden="true" />
			{errorMessage}
		</div>
	{/if}

	<!-- Input -->
	<div class="mt-4 flex gap-2">
		<input
			class="tap-target min-w-0 flex-1 rounded-lg border border-lingua-border bg-lingua-surface px-3 text-sm disabled:opacity-50"
			placeholder={t('chat.input.placeholder')}
			bind:value={draft}
			aria-label={t('chat.input.ariaLabel')}
			disabled={uiState === 'loading'}
			onkeydown={handleKeydown}
		/>
		<button
			type="button"
			class="tap-target inline-flex items-center gap-2 rounded-lg bg-lingua-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
			onclick={sendMessage}
			disabled={uiState === 'loading' || !draft.trim()}
			aria-label={t('chat.send.ariaLabel')}
		>
			{#if uiState === 'loading'}
				<Loader2 class="animate-spin" size={16} aria-hidden="true" />
			{:else}
				<Send size={16} aria-hidden="true" />
			{/if}
			{t('chat.send.label')}
		</button>
	</div>

	<!-- Staff fallback CTA -->
	{#if lastSuggestFallback || uiState === 'error'}
		<button
			type="button"
			class="tap-target mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-lingua-warning bg-amber-50 px-4 text-sm font-semibold text-amber-900"
			onclick={() => {
				/* parent handles fallback flow */
			}}
		>
			<UserRoundCheck size={17} aria-hidden="true" />
			{t('chat.fallback.cta')}
		</button>
	{:else}
		<button
			type="button"
			class="tap-target mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-lingua-border bg-lingua-surface px-4 text-sm font-semibold text-lingua-text"
			onclick={() => {
				/* parent handles fallback flow */
			}}
		>
			<UserRoundCheck size={17} aria-hidden="true" />
			{t('chat.fallback.default')}
		</button>
	{/if}
</section>
