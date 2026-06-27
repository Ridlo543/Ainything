<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Key, Plus, Trash2, Copy, Check, Clock, AlertCircle, ShieldCheck } from '@lucide/svelte';
	import * as Card from '$lib/ui/card';
	import * as Dialog from '$lib/ui/dialog';
	import * as Table from '$lib/ui/table';
	import * as Badge from '$lib/ui/badge';
	import { Button } from '$lib/ui/button';
	import { Input } from '$lib/ui/input';
	import { Label } from '$lib/ui/label';
	import type { PageData, ActionData } from './$types';
	import type { ApiKey } from '$lib/domain/api-key/types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// ---------------------------------------------------------------------------
	// State
	// ---------------------------------------------------------------------------

	let generateOpen = $state(false);
	let revokeTarget = $state<ApiKey | null>(null);
	let revokeOpen = $state(false);
	let generatedKeyCopied = $state(false);
	let generatingKey = $state(false);
	let revokingKey = $state(false);
	/** bind:this ref for clipboard fallback — avoids fragile querySelector (K-08) */
	let keyCodeEl = $state<HTMLElement | null>(null);

	// When server returns a generated key, open the reveal dialog
	const generatedKey = $derived(
		form && 'action' in form && form.action === 'generate' && 'generatedKey' in form
			? (form as { generatedKey: string; keyName: string })
			: null
	);

	$effect(() => {
		if (generatedKey) {
			generateOpen = false;
			generatingKey = false;
		}
	});

	// ---------------------------------------------------------------------------
	// Helpers
	// ---------------------------------------------------------------------------

	function formatDate(iso: string | null): string {
		if (!iso) return '—';
		return new Intl.DateTimeFormat('id-ID', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		}).format(new Date(iso));
	}

	function openRevoke(key: ApiKey) {
		revokeTarget = key;
		revokeOpen = true;
	}

	async function copyKey(key: string) {
		try {
			await navigator.clipboard.writeText(key);
			generatedKeyCopied = true;
			setTimeout(() => (generatedKeyCopied = false), 2000);
		} catch {
			// Clipboard API not available (HTTP context or permission denied)
			// Fallback: select the text via bind:this ref (K-08 — avoids fragile querySelector)
			if (keyCodeEl) {
				const range = document.createRange();
				range.selectNodeContents(keyCodeEl);
				window.getSelection()?.removeAllRanges();
				window.getSelection()?.addRange(range);
			}
		}
	}

	function statusVariant(status: ApiKey['status']): 'default' | 'secondary' | 'destructive' {
		if (status === 'active') return 'default';
		if (status === 'revoked') return 'destructive';
		return 'secondary'; // expired
	}

	function statusLabel(status: ApiKey['status']): string {
		if (status === 'active') return 'Aktif';
		if (status === 'revoked') return 'Dicabut';
		return 'Kedaluwarsa';
	}
</script>

<svelte:head>
	<title>API Keys — Platform Admin</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-start justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold">API Keys</h1>
			<p class="mt-1 text-sm text-muted-foreground">
				Kelola platform API keys untuk integrasi eksternal. Key hanya ditampilkan sekali saat
				dibuat.
			</p>
		</div>
		<Button onclick={() => (generateOpen = true)} class="shrink-0">
			<Plus size={16} aria-hidden="true" />
			Buat Key Baru
		</Button>
	</div>

	<!-- Security notice -->
	<div
		class="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950"
	>
		<ShieldCheck
			size={18}
			class="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
			aria-hidden="true"
		/>
		<p class="text-amber-800 dark:text-amber-200">
			API keys memberikan akses penuh ke platform API. Simpan dengan aman — key tidak dapat
			ditampilkan ulang setelah dibuat.
		</p>
	</div>

	<!-- Key list -->
	<Card.Root>
		{#if data.keys.length === 0}
			<Card.Content class="flex flex-col items-center py-16">
				<Key size={40} class="text-muted-foreground" aria-hidden="true" />
				<p class="mt-4 font-semibold">Belum ada API key</p>
				<p class="mt-1 text-sm text-muted-foreground">
					Buat key baru untuk mulai menggunakan platform API.
				</p>
				<Button onclick={() => (generateOpen = true)} class="mt-6">
					<Plus size={16} aria-hidden="true" />
					Buat Key Pertama
				</Button>
			</Card.Content>
		{:else}
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Nama</Table.Head>
						<Table.Head>Key Prefix</Table.Head>
						<Table.Head>Status</Table.Head>
						<Table.Head>Dibuat</Table.Head>
						<Table.Head>Terakhir Digunakan</Table.Head>
						<Table.Head>Kedaluwarsa</Table.Head>
						<Table.Head>
							<span class="sr-only">Aksi</span>
						</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.keys as key (key.id)}
						<Table.Row>
							<Table.Cell class="font-medium">{key.name}</Table.Cell>
							<Table.Cell>
								<code class="rounded bg-muted px-1.5 py-0.5 text-xs font-mono"
									>{key.keyPrefix}...</code
								>
							</Table.Cell>
							<Table.Cell>
								<Badge.Badge variant={statusVariant(key.status)}>
									{statusLabel(key.status)}
								</Badge.Badge>
							</Table.Cell>
							<Table.Cell class="text-sm text-muted-foreground">
								{formatDate(key.createdAt)}
							</Table.Cell>
							<Table.Cell class="text-sm text-muted-foreground">
								{#if key.lastUsedAt}
									{formatDate(key.lastUsedAt)}
								{:else}
									<span class="italic">Belum pernah</span>
								{/if}
							</Table.Cell>
							<Table.Cell class="text-sm text-muted-foreground">
								{#if key.expiresAt}
									<span class="flex items-center gap-1">
										<Clock size={12} aria-hidden="true" />
										{formatDate(key.expiresAt)}
									</span>
								{:else}
									<span class="italic">Tidak ada</span>
								{/if}
							</Table.Cell>
							<Table.Cell>
								{#if key.status === 'active'}
									<Button
										variant="ghost"
										size="sm"
										class="text-destructive hover:text-destructive"
										onclick={() => openRevoke(key)}
										aria-label="Cabut key {key.name}"
									>
										<Trash2 size={14} aria-hidden="true" />
										Cabut
									</Button>
								{/if}
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		{/if}
	</Card.Root>

	<!-- Usage logs placeholder -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="text-base">Log Penggunaan</Card.Title>
			<Card.Description>Riwayat akses per key (endpoint, waktu, status).</Card.Description>
		</Card.Header>
		<Card.Content class="flex items-center gap-3 py-8 text-sm text-muted-foreground">
			<AlertCircle size={16} aria-hidden="true" />
			Log penggunaan akan tersedia di sprint berikutnya.
		</Card.Content>
	</Card.Root>
</div>

<!-- -------------------------------------------------------------------------
  Generate key dialog
---------------------------------------------------------------------------- -->
<Dialog.Root bind:open={generateOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Buat API Key Baru</Dialog.Title>
			<Dialog.Description>
				Berikan nama yang deskriptif. Key hanya dapat dilihat sekali.
			</Dialog.Description>
		</Dialog.Header>

		<form
			method="POST"
			action="?/generate"
			use:enhance={() => {
				generatingKey = true;
				return async ({ update }) => {
					await update();
					generatingKey = false;
				};
			}}
			class="space-y-4"
		>
			<div class="space-y-2">
				<Label for="key-name">Nama Key</Label>
				<Input
					id="key-name"
					name="name"
					placeholder="mis. Integrasi POS Toko A"
					maxlength={100}
					required
					aria-describedby={form &&
					'action' in form &&
					form.action === 'generate' &&
					'errors' in form &&
					(form.errors as Record<string, string[] | undefined>)?.name
						? 'key-name-error'
						: undefined}
				/>
				{#if form && 'action' in form && form.action === 'generate' && 'errors' in form}
					{@const generateErrors = form.errors as { name?: string[]; expiresAt?: string[] }}
					{#if generateErrors?.name}
						<p id="key-name-error" class="text-sm text-destructive">
							{generateErrors.name[0]}
						</p>
					{/if}
				{/if}
			</div>

			<div class="space-y-2">
				<Label for="key-expires">Tanggal Kedaluwarsa (opsional)</Label>
				<Input id="key-expires" name="expiresAt" type="datetime-local" />
				<p class="text-xs text-muted-foreground">Biarkan kosong jika tidak ingin kedaluwarsa.</p>
			</div>

			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (generateOpen = false)}>
					Batal
				</Button>
				<Button type="submit" disabled={generatingKey}>
					{generatingKey ? 'Membuat...' : 'Buat Key'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- -------------------------------------------------------------------------
  Generated key reveal dialog — shown once after successful generation
---------------------------------------------------------------------------- -->
{#if generatedKey}
	<Dialog.Root
		open={true}
		onOpenChange={() => {
			void invalidateAll();
		}}
	>
		<Dialog.Content class="sm:max-w-lg">
			<Dialog.Header>
				<Dialog.Title>API Key Berhasil Dibuat</Dialog.Title>
				<Dialog.Description>
					Salin key ini sekarang. <strong>Key tidak dapat ditampilkan ulang.</strong>
				</Dialog.Description>
			</Dialog.Header>

			<div class="space-y-4">
				<div class="rounded-lg border bg-muted/50 p-3">
					<p class="mb-2 text-xs font-medium text-muted-foreground">
						Key untuk: <span class="text-foreground">{generatedKey.keyName}</span>
					</p>
					<div class="flex items-center gap-2">
						<code
							data-key
							class="flex-1 overflow-x-auto rounded bg-background px-3 py-2 text-xs font-mono break-all"
						>
							{generatedKey.generatedKey}
						</code>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onclick={() => copyKey(generatedKey!.generatedKey)}
							aria-label="Salin API key"
						>
							{#if generatedKeyCopied}
								<Check size={14} aria-hidden="true" />
								Disalin
							{:else}
								<Copy size={14} aria-hidden="true" />
								Salin
							{/if}
						</Button>
					</div>
				</div>

				<div
					class="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
				>
					<AlertCircle size={14} class="mt-0.5 shrink-0" aria-hidden="true" />
					Simpan key ini di tempat yang aman. Setelah dialog ini ditutup, key tidak dapat dilihat lagi.
				</div>
			</div>

			<Dialog.Footer>
				<Button type="button" onclick={() => invalidateAll()}>Saya sudah menyimpan key ini</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
{/if}

<!-- -------------------------------------------------------------------------
  Revoke confirmation dialog
---------------------------------------------------------------------------- -->
<Dialog.Root bind:open={revokeOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Cabut API Key?</Dialog.Title>
			<Dialog.Description>
				Key <strong>{revokeTarget?.name}</strong> akan segera tidak dapat digunakan. Tindakan ini tidak
				dapat dibatalkan.
			</Dialog.Description>
		</Dialog.Header>

		<form
			method="POST"
			action="?/revoke"
			use:enhance={() => {
				revokingKey = true;
				return async ({ update }) => {
					await update();
					revokingKey = false;
					revokeOpen = false;
					revokeTarget = null;
				};
			}}
		>
			<input type="hidden" name="id" value={revokeTarget?.id} />

			<Dialog.Footer>
				<Button
					type="button"
					variant="outline"
					onclick={() => {
						revokeOpen = false;
						revokeTarget = null;
					}}
				>
					Batal
				</Button>
				<Button type="submit" variant="destructive" disabled={revokingKey}>
					{revokingKey ? 'Mencabut...' : 'Ya, Cabut Key'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
