<script lang="ts">
	/**
	 * BuyerChatWindow.svelte
	 *
	 * Real-time chat widget for buyers — appears on /r/[slug]/order/[id] when
	 * the order has an associated fallback_request (roomId).
	 *
	 * Transport: SSE for incoming messages, fetch POST for outgoing.
	 * Graceful degradation: if SSE fails, messages sent are still reflected
	 * locally so the buyer sees their own message immediately.
	 */
	import { onMount, onDestroy, tick } from 'svelte';
	import { MessageCircle, X, Send, ChevronDown } from '@lucide/svelte';
	import type { StaffChatMessage } from '$lib/domain/chat/types';
	import {
		chatHistorySchema,
		chatMessageEventSchema,
		chatMessageResponseSchema
	} from '$lib/domain/chat/schema';

	type Props = {
		roomId: string;
	};

	const { roomId }: Props = $props();

	// ---------------------------------------------------------------------------
	// State
	// ---------------------------------------------------------------------------
	let isOpen = $state(false);
	let messages = $state<StaffChatMessage[]>([]);
	let inputText = $state('');
	let sending = $state(false);
	let connected = $state(false);
	let error = $state<string | null>(null);
	let unreadCount = $state(0);
	let scrollEl = $state<HTMLElement | null>(null);
	/** Whether connect() has ever been called — used for lazy-connect on first open. */
	let hasConnected = false;

	let eventSource: EventSource | null = null;
	let retryCount = 0;
	let retryTimer: ReturnType<typeof setTimeout> | null = null;
	const MAX_RETRIES = 10;

	// ---------------------------------------------------------------------------
	// SSE connection
	// ---------------------------------------------------------------------------
	function connect() {
		if (eventSource) return;

		eventSource = new EventSource(`/api/public/chat/${roomId}/stream`);

		eventSource.addEventListener('history', (e) => {
			const parsed = chatHistorySchema.safeParse(JSON.parse(e.data));
			if (!parsed.success) {
				console.error('[chat] Invalid history payload:', parsed.error);
				return;
			}
			messages = parsed.data;
			connected = true;
			retryCount = 0; // Reset back-off on successful connection
			scrollToBottom();
		});

		eventSource.addEventListener('message', (e) => {
			const parsed = chatMessageEventSchema.safeParse(JSON.parse(e.data));
			if (!parsed.success) {
				console.error('[chat] Invalid message payload:', parsed.error);
				return;
			}
			const ev = parsed.data;
			const msg: StaffChatMessage = {
				id: ev.id,
				roomId: ev.roomId,
				role: ev.role,
				content: ev.content,
				senderId: null,
				senderName: ev.senderName,
				createdAt: ev.createdAt
			};
			// Avoid duplicates (optimistic update already added buyer's own msg)
			if (!messages.find((m) => m.id === msg.id)) {
				messages = [...messages, msg];
				if (!isOpen && msg.role === 'staff') {
					unreadCount += 1;
				}
				scrollToBottom();
			}
		});

		eventSource.addEventListener('heartbeat', () => {
			connected = true;
		});

		eventSource.onerror = () => {
			connected = false;
			if (retryCount >= MAX_RETRIES) return; // Give up after 10 attempts
			if (retryTimer !== null) return; // Prevent multiple pending timers (C-13)
			retryCount += 1;
			// Exponential back-off capped at 30s
			const delay = Math.min(1000 * 2 ** retryCount, 30_000);
			retryTimer = setTimeout(() => {
				retryTimer = null;
				eventSource?.close();
				eventSource = null;
				connect();
			}, delay);
		};
	}

	function disconnect() {
		eventSource?.close();
		eventSource = null;
	}

	async function scrollToBottom() {
		await tick();
		if (scrollEl) {
			scrollEl.scrollTop = scrollEl.scrollHeight;
		}
	}

	// ---------------------------------------------------------------------------
	// Send message
	// ---------------------------------------------------------------------------
	async function sendMessage() {
		const content = inputText.trim();
		if (!content || sending) return;

		sending = true;
		error = null;
		inputText = '';

		// Optimistic local add
		const optimistic: StaffChatMessage = {
			id: `optimistic-${crypto.randomUUID()}`,
			roomId,
			role: 'customer',
			content,
			senderId: null,
			senderName: null,
			createdAt: new Date().toISOString()
		};
		messages = [...messages, optimistic];
		await scrollToBottom();

		try {
			const res = await fetch(`/api/public/chat/${roomId}/messages`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content })
			});

			if (!res.ok) {
				const { message } = await res.json().catch(() => ({ message: 'Gagal mengirim pesan' }));
				throw new Error(message);
			}

			const confirmed = chatMessageResponseSchema.parse(await res.json());
			// Replace optimistic with confirmed
			messages = messages.map((m) => (m.id === optimistic.id ? confirmed : m));
		} catch (err) {
			error = err instanceof Error ? err.message : 'Gagal mengirim pesan';
			// Remove optimistic on failure
			messages = messages.filter((m) => m.id !== optimistic.id);
			inputText = content; // Restore input
		} finally {
			sending = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	}

	function toggleOpen() {
		isOpen = !isOpen;
		if (isOpen) {
			unreadCount = 0;
			scrollToBottom();
			// Lazy-connect: only open SSE on first open (C-18)
			if (!hasConnected) {
				hasConnected = true;
				connect();
			}
		}
	}

	// ---------------------------------------------------------------------------
	// Lifecycle
	// ---------------------------------------------------------------------------
	onMount(() => {
		// Do NOT connect eagerly — wait for first open (lazy-connect)
	});

	onDestroy(() => {
		if (retryTimer !== null) clearTimeout(retryTimer);
		disconnect();
	});

	function formatTime(iso: string): string {
		return new Date(iso).toLocaleTimeString('id-ID', {
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<!-- Floating chat button -->
<div class="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-2">
	{#if isOpen}
		<!-- Chat window -->
		<div
			class="flex h-[420px] w-[320px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl"
			role="dialog"
			aria-label="Chat dengan staff"
			aria-modal="false"
		>
			<!-- Header -->
			<div class="flex items-center justify-between bg-ainything-primary px-4 py-3">
				<div class="flex items-center gap-2">
					<MessageCircle class="h-4 w-4 text-white" aria-hidden="true" />
					<span class="text-sm font-semibold text-white">Chat dengan Staff</span>
					{#if connected}
						<span class="h-2 w-2 rounded-full bg-green-300" title="Terhubung" aria-label="Terhubung"
						></span>
					{:else}
						<span
							class="h-2 w-2 rounded-full bg-yellow-300"
							title="Menghubungkan..."
							aria-label="Menghubungkan"
						></span>
					{/if}
				</div>
				<button
					onclick={toggleOpen}
					class="flex h-7 w-7 items-center justify-center rounded-full text-white hover:bg-white/20"
					aria-label="Tutup chat"
				>
					<ChevronDown class="h-4 w-4" aria-hidden="true" />
				</button>
			</div>

			<!-- Messages -->
			<div
				bind:this={scrollEl}
				class="flex-1 overflow-y-auto px-3 py-3 space-y-2"
				aria-live="polite"
				aria-label="Pesan chat"
			>
				{#if messages.length === 0}
					<p class="text-center text-xs text-gray-400 mt-8">
						Kirim pesan — staff kami akan segera membalas.
					</p>
				{/if}
				{#each messages as msg (msg.id)}
					<div class="flex {msg.role === 'customer' ? 'justify-end' : 'justify-start'}">
						<div
							class="max-w-[80%] rounded-2xl px-3 py-2 text-sm {msg.role === 'customer'
								? 'rounded-br-sm bg-ainything-primary text-white'
								: msg.role === 'system'
									? 'w-full rounded-lg bg-yellow-50 text-yellow-800 text-center text-xs italic'
									: 'rounded-bl-sm bg-gray-100 text-gray-900'}"
						>
							{#if msg.role === 'staff' && msg.senderName}
								<p class="mb-1 text-xs font-medium text-gray-500">{msg.senderName}</p>
							{:else if msg.role === 'system'}
								<p class="mb-1 text-xs font-medium text-yellow-600">Sistem</p>
							{/if}
							<p class="break-words">{msg.content}</p>
							<p
								class="mt-1 text-right text-[10px] {msg.role === 'customer'
									? 'text-white/70'
									: 'text-gray-400'}"
							>
								{formatTime(msg.createdAt)}
							</p>
						</div>
					</div>
				{/each}
			</div>

			<!-- Error banner -->
			{#if error}
				<div class="mx-3 mb-1 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600" role="alert">
					{error}
				</div>
			{/if}

			<!-- Input -->
			<div class="border-t border-gray-100 px-3 py-2">
				<div class="flex items-end gap-2">
					<textarea
						bind:value={inputText}
						onkeydown={handleKeydown}
						placeholder="Tulis pesan..."
						rows={1}
						maxlength={2000}
						disabled={sending}
						class="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-ainything-primary disabled:opacity-50"
						aria-label="Ketik pesan"
					></textarea>
					<button
						onclick={sendMessage}
						disabled={sending || !inputText.trim()}
						class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-ainything-primary text-white transition-colors hover:bg-ainything-primary-strong disabled:opacity-40"
						aria-label="Kirim pesan"
					>
						{#if sending}
							<div
								class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
								aria-hidden="true"
							></div>
						{:else}
							<Send class="h-4 w-4" aria-hidden="true" />
						{/if}
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- FAB toggle button -->
	<button
		onclick={toggleOpen}
		class="relative flex h-14 w-14 items-center justify-center rounded-full bg-ainything-primary text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
		aria-label={isOpen ? 'Tutup chat' : 'Buka chat dengan staff'}
		aria-expanded={isOpen}
	>
		{#if isOpen}
			<X class="h-6 w-6" aria-hidden="true" />
		{:else}
			<MessageCircle class="h-6 w-6" aria-hidden="true" />
			{#if unreadCount > 0}
				<span
					class="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white"
					aria-label="{unreadCount} pesan baru"
				>
					{unreadCount > 9 ? '9+' : unreadCount}
				</span>
			{/if}
		{/if}
	</button>
</div>
