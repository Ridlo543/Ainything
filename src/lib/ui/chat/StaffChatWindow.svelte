<script lang="ts">
	/**
	 * StaffChatWindow.svelte
	 *
	 * Real-time chat panel for staff — embedded in /staff/orders/[id] when
	 * the order has an associated fallback_request (roomId).
	 *
	 * Transport: SSE for incoming messages, fetch POST for outgoing.
	 */
	import { onMount, onDestroy, tick } from 'svelte';
	import { Send, MessageCircle } from '@lucide/svelte';
	import type { StaffChatMessage } from '$lib/domain/chat/types';
	import { chatHistorySchema, chatMessageEventSchema } from '$lib/domain/chat/schema';

	type Props = {
		roomId: string;
		/** Display name for the current staff user — shown on optimistic messages. */
		senderName?: string;
	};

	const { roomId, senderName = 'Saya' }: Props = $props();

	// ---------------------------------------------------------------------------
	// State
	// ---------------------------------------------------------------------------
	let messages = $state<StaffChatMessage[]>([]);
	let inputText = $state('');
	let sending = $state(false);
	let connected = $state(false);
	let error = $state<string | null>(null);
	let scrollEl = $state<HTMLElement | null>(null);

	let eventSource: EventSource | null = null;
	let retryCount = 0;
	let retryTimer: ReturnType<typeof setTimeout> | null = null;
	const MAX_RETRIES = 10;

	// ---------------------------------------------------------------------------
	// SSE connection
	// ---------------------------------------------------------------------------
	function connect() {
		if (eventSource) return;

		eventSource = new EventSource(`/api/chat/${roomId}/stream`);

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
			if (!messages.find((m) => m.id === msg.id)) {
				messages = [...messages, msg];
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
		if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
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

		const optimistic: StaffChatMessage = {
			id: `optimistic-${crypto.randomUUID()}`,
			roomId,
			role: 'staff',
			content,
			senderId: null,
			senderName,
			createdAt: new Date().toISOString()
		};
		messages = [...messages, optimistic];
		await scrollToBottom();

		try {
			const res = await fetch(`/api/chat/${roomId}/messages`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content })
			});

			if (!res.ok) {
				const { message } = await res.json().catch(() => ({ message: 'Gagal mengirim pesan' }));
				throw new Error(message);
			}

			const confirmed = (await res.json()) as StaffChatMessage;
			messages = messages.map((m) => (m.id === optimistic.id ? confirmed : m));
		} catch (err) {
			error = err instanceof Error ? err.message : 'Gagal mengirim pesan';
			messages = messages.filter((m) => m.id !== optimistic.id);
			inputText = content;
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

	onMount(() => {
		connect();
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

<div class="flex h-full flex-col rounded-xl border border-gray-200 bg-white overflow-hidden">
	<!-- Header -->
	<div class="flex items-center justify-between border-b border-gray-100 px-4 py-3">
		<div class="flex items-center gap-2">
			<MessageCircle class="h-4 w-4 text-ainything-primary" aria-hidden="true" />
			<span class="text-sm font-semibold text-gray-900">Chat dengan Pembeli</span>
		</div>
		<div class="flex items-center gap-1.5">
			{#if connected}
				<span class="h-2 w-2 rounded-full bg-green-500" aria-label="Terhubung"></span>
				<span class="text-xs text-gray-400">Live</span>
			{:else}
				<span class="h-2 w-2 rounded-full bg-yellow-400" aria-label="Menghubungkan"></span>
				<span class="text-xs text-gray-400">Menghubungkan...</span>
			{/if}
		</div>
	</div>

	<!-- Messages -->
	<div
		bind:this={scrollEl}
		class="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0"
		aria-live="polite"
		aria-label="Pesan chat"
	>
		{#if messages.length === 0}
			<p class="text-center text-sm text-gray-400 mt-8">
				Belum ada pesan. Balas chat pembeli di sini.
			</p>
		{/if}
		{#each messages as msg (msg.id)}
			<div class="flex {msg.role === 'staff' ? 'justify-end' : 'justify-start'}">
				<div
					class="max-w-[80%] rounded-2xl px-3 py-2 text-sm {msg.role === 'staff'
						? 'rounded-br-sm bg-ainything-primary text-white'
						: 'rounded-bl-sm bg-gray-100 text-gray-900'}"
				>
					{#if msg.role === 'customer'}
						<p class="mb-1 text-xs font-medium text-gray-500">Pembeli</p>
					{:else if msg.role === 'system'}
						<p class="mb-1 text-xs font-medium text-yellow-600">Sistem</p>
					{:else if msg.senderName}
						<p class="mb-1 text-xs font-medium text-white/70">{msg.senderName}</p>
					{/if}
					<p class="break-words">{msg.content}</p>
					<p
						class="mt-1 text-right text-[10px] {msg.role === 'staff'
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
		<div class="mx-4 mb-1 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600" role="alert">
			{error}
		</div>
	{/if}

	<!-- Input -->
	<div class="border-t border-gray-100 px-4 py-3">
		<div class="flex items-end gap-2">
			<textarea
				bind:value={inputText}
				onkeydown={handleKeydown}
				placeholder="Balas pembeli..."
				rows={1}
				maxlength={2000}
				disabled={sending}
				class="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-ainything-primary disabled:opacity-50"
				aria-label="Ketik balasan"
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
		<p class="mt-1 text-right text-[10px] text-gray-400">
			Enter untuk kirim · Shift+Enter baris baru
		</p>
	</div>
</div>
