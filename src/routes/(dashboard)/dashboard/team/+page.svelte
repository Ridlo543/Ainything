<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import {
		Plus,
		Mail,
		MoreHorizontal,
		X,
		Crown,
		Shield,
		User,
		Pencil,
		Trash2
	} from '@lucide/svelte';

	// ActionData collapses to {} due to @ts-nocheck proxy — declare shape explicitly
	type FormResult = {
		success?: boolean;
		message?: string;
		error?: string;
		errors?: Record<string, string[]>;
		values?: Record<string, unknown>;
	} | null;

	let { data, form: rawForm }: { data: PageData; form: unknown } = $props();
	const form = $derived(rawForm as FormResult);
	const org = $derived(data.tenant.organization);

	type Role = 'owner' | 'manager' | 'staff';

	const roleCfg: Record<Role, { label: string; bg: string; text: string; icon: typeof Crown }> = {
		owner: { label: 'Owner', bg: 'bg-[#fef3c7]', text: 'text-[#d97706]', icon: Crown },
		manager: { label: 'Manager', bg: 'bg-[#eff6ff]', text: 'text-[#2563eb]', icon: Shield },
		staff: { label: 'Staff', bg: 'bg-[#f5f5f4]', text: 'text-[#78716c]', icon: User }
	};

	const members = $derived(data.members);
	const invites = $derived(data.invites);

	// Modal states
	type ModalMode = 'create' | 'edit' | 'changeRole' | 'remove' | null;
	let modalMode = $state<ModalMode>(null);
	let openMenuId = $state<string | null>(null);
	let submitting = $state(false);

	// Selected member for edit/role/remove
	let selectedId = $state('');
	let selectedName = $state('');
	let selectedEmail = $state('');
	let selectedRole = $state<Role>('staff');

	// Create form fields
	let createName = $state('');
	let createEmail = $state('');
	let createPassword = $state('');
	let createRole = $state<Role>('staff');

	// Edit form fields
	let editName = $state('');
	let editPassword = $state('');

	function openCreate() {
		createName = '';
		createEmail = '';
		createPassword = '';
		createRole = 'staff';
		modalMode = 'create';
	}

	function openEdit(id: string, name: string, email: string) {
		selectedId = id;
		editName = name;
		selectedEmail = email;
		editPassword = '';
		modalMode = 'edit';
		openMenuId = null;
	}

	function openChangeRole(id: string, name: string, role: Role) {
		selectedId = id;
		selectedName = name;
		selectedRole = role;
		modalMode = 'changeRole';
		openMenuId = null;
	}

	function openRemove(id: string, name: string) {
		selectedId = id;
		selectedName = name;
		modalMode = 'remove';
		openMenuId = null;
	}

	function closeModal() {
		modalMode = null;
	}
</script>

<svelte:head>
	<title>Tim — {org.name}</title>
</svelte:head>

<!-- Global toast feedback -->
{#if form?.success}
	<div
		class="mb-4 rounded-xl bg-[#d1fae5] px-4 py-3 text-sm font-semibold text-[#065f46]"
		role="status"
	>
		{form.message ?? 'Berhasil.'}
	</div>
{/if}
{#if form?.error}
	<div
		class="mb-4 rounded-xl bg-[#fee2e2] px-4 py-3 text-sm font-semibold text-[#991b1b]"
		role="alert"
	>
		{form.error}
	</div>
{/if}

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-extrabold text-[#1a1a2e]">Tim</h1>
			<p class="mt-0.5 text-sm text-[#78716c]">{members.length} anggota aktif</p>
		</div>
		<button
			type="button"
			onclick={openCreate}
			class="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#059669] px-4 text-sm font-bold text-white shadow-sm hover:bg-[#047857] transition-colors"
		>
			<Plus size={16} /> Tambah Staff
		</button>
	</div>

	<!-- Members list -->
	<div class="rounded-2xl bg-white shadow-sm">
		<div class="border-b border-[#f5f5f4] px-5 py-4">
			<h2 class="text-sm font-bold text-[#1a1a2e]">Anggota Aktif</h2>
		</div>
		<div class="divide-y divide-[#f5f5f4]">
			{#each members as member (member.id)}
				<div class="flex items-center gap-4 px-5 py-4">
					{#if member.avatar}
						<img
							src={member.avatar}
							alt={member.name}
							class="h-10 w-10 shrink-0 rounded-full object-cover"
							width="40"
							height="40"
						/>
					{:else}
						<div
							class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e7e5e4] text-sm font-bold text-[#78716c]"
							aria-label={member.name}
						>
							{member.name.slice(0, 2).toUpperCase()}
						</div>
					{/if}
					<div class="min-w-0 flex-1">
						<p class="text-sm font-bold text-[#1a1a2e]">{member.name}</p>
						<p class="mt-0.5 text-xs text-[#78716c]">{member.email}</p>
					</div>
					<div class="flex shrink-0 items-center gap-2">
						<span
							class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold {roleCfg[
								member.role
							].bg} {roleCfg[member.role].text}"
						>
							{#if member.role === 'owner'}<Crown size={11} />
							{:else if member.role === 'manager'}<Shield size={11} />
							{:else}<User size={11} />{/if}
							{roleCfg[member.role].label}
						</span>
						{#if member.role !== 'owner'}
							<div class="relative">
								<button
									type="button"
									onclick={() => (openMenuId = openMenuId === member.id ? null : member.id)}
									class="flex h-8 w-8 items-center justify-center rounded-lg text-[#78716c] hover:bg-[#f5f5f4] transition-colors"
									aria-label="Opsi anggota"
									aria-expanded={openMenuId === member.id}
									aria-haspopup="menu"
								>
									<MoreHorizontal size={16} />
								</button>
								{#if openMenuId === member.id}
									<div
										class="absolute right-0 top-10 z-20 w-44 rounded-xl border border-[#f0eeec] bg-white py-1 shadow-lg"
										role="menu"
									>
										<button
											type="button"
											role="menuitem"
											onclick={() => openEdit(member.id, member.name, member.email)}
											class="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-[#1a1a2e] hover:bg-[#f5f5f4]"
										>
											<Pencil size={14} /> Edit Profil
										</button>
										<button
											type="button"
											role="menuitem"
											onclick={() => openChangeRole(member.id, member.name, member.role)}
											class="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-[#1a1a2e] hover:bg-[#f5f5f4]"
										>
											<Shield size={14} /> Ubah Peran
										</button>
										<div class="my-1 h-px bg-[#f5f5f4]"></div>
										<button
											type="button"
											role="menuitem"
											onclick={() => openRemove(member.id, member.name)}
											class="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-[#dc2626] hover:bg-[#fef2f2]"
										>
											<Trash2 size={14} /> Hapus dari Tim
										</button>
									</div>
								{/if}
							</div>
						{/if}
					</div>
				</div>
			{/each}
			{#if members.length === 0}
				<div class="px-5 py-10 text-center text-sm text-[#a8a29e]">Belum ada anggota.</div>
			{/if}
		</div>
	</div>

	<!-- Pending invites -->
	{#if invites.length > 0}
		<div class="rounded-2xl bg-white shadow-sm">
			<div class="border-b border-[#f5f5f4] px-5 py-4">
				<h2 class="text-sm font-bold text-[#1a1a2e]">Undangan Tertunda</h2>
			</div>
			<div class="divide-y divide-[#f5f5f4]">
				{#each invites as invite (invite.id)}
					<div class="flex items-center gap-4 px-5 py-4">
						<div
							class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f5f5f4]"
						>
							<Mail size={18} class="text-[#a8a29e]" />
						</div>
						<div class="min-w-0 flex-1">
							<p class="text-sm font-bold text-[#1a1a2e]">{invite.email}</p>
							<p class="mt-0.5 text-xs text-[#78716c]">
								<span
									class="inline-flex items-center gap-1 rounded-full bg-[#f5f5f4] px-2 py-0.5 text-xs"
								>
									{roleCfg[invite.role].label}
								</span>
								· dikirim {invite.sentAt}
							</p>
						</div>
						<!-- Cancel invite form -->
						<form
							method="POST"
							action="?/cancelInvite"
							use:enhance={() => {
								submitting = true;
								return async ({ update }) => {
									submitting = false;
									await update();
								};
							}}
						>
							<input type="hidden" name="inviteId" value={invite.id} />
							<button
								type="submit"
								disabled={submitting}
								class="flex h-8 w-8 items-center justify-center rounded-lg text-[#78716c] hover:bg-[#fee2e2] hover:text-[#dc2626] transition-colors disabled:opacity-50"
								aria-label="Batalkan undangan"
							>
								<X size={16} />
							</button>
						</form>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<!-- Close dropdown on outside click -->
{#if openMenuId}
	<div class="fixed inset-0 z-10" role="presentation" onclick={() => (openMenuId = null)}></div>
{/if}

<!-- ===== MODAL OVERLAY ===== -->
{#if modalMode !== null}
	<div
		class="fixed inset-0 z-30 flex items-end justify-center bg-black/40 sm:items-center"
		role="presentation"
		onclick={(e) => {
			if (e.target === e.currentTarget) closeModal();
		}}
	>
		<div
			class="w-full max-w-sm rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
			role="dialog"
			aria-modal="true"
		>
			<!-- CREATE STAFF -->
			{#if modalMode === 'create'}
				<div class="mb-5 flex items-center justify-between">
					<h2 class="text-base font-extrabold text-[#1a1a2e]">Tambah Anggota Tim</h2>
					<button
						type="button"
						onclick={closeModal}
						class="flex h-8 w-8 items-center justify-center rounded-lg text-[#78716c] hover:bg-[#f5f5f4]"
						aria-label="Tutup"><X size={18} /></button
					>
				</div>
				<form
					method="POST"
					action="?/createStaff"
					use:enhance={() => {
						submitting = true;
						return async ({ update }) => {
							submitting = false;
							await update();
							if (!form?.errors) closeModal();
						};
					}}
					class="space-y-4"
				>
					<div>
						<label for="create-name" class="mb-1.5 block text-xs font-semibold text-[#44403c]">
							Nama Lengkap
						</label>
						<input
							id="create-name"
							name="name"
							type="text"
							required
							bind:value={createName}
							placeholder="Contoh: Budi Santoso"
							class="w-full rounded-xl border border-[#e7e5e4] px-3 py-2.5 text-sm text-[#1a1a2e] placeholder:text-[#a8a29e] focus:border-[#059669] focus:outline-none focus:ring-2 focus:ring-[#059669]/20"
						/>
						{#if form?.errors?.name}
							<p class="mt-1 text-xs text-[#dc2626]">{form.errors.name[0]}</p>
						{/if}
					</div>
					<div>
						<label for="create-email" class="mb-1.5 block text-xs font-semibold text-[#44403c]">
							Email
						</label>
						<input
							id="create-email"
							name="email"
							type="email"
							required
							bind:value={createEmail}
							placeholder="staff@contoh.com"
							class="w-full rounded-xl border border-[#e7e5e4] px-3 py-2.5 text-sm text-[#1a1a2e] placeholder:text-[#a8a29e] focus:border-[#059669] focus:outline-none focus:ring-2 focus:ring-[#059669]/20"
						/>
						{#if form?.errors?.email}
							<p class="mt-1 text-xs text-[#dc2626]">{form.errors.email[0]}</p>
						{/if}
					</div>
					<div>
						<label for="create-password" class="mb-1.5 block text-xs font-semibold text-[#44403c]">
							Password
						</label>
						<input
							id="create-password"
							name="password"
							type="password"
							required
							minlength={8}
							bind:value={createPassword}
							placeholder="Minimal 8 karakter"
							autocomplete="new-password"
							class="w-full rounded-xl border border-[#e7e5e4] px-3 py-2.5 text-sm text-[#1a1a2e] placeholder:text-[#a8a29e] focus:border-[#059669] focus:outline-none focus:ring-2 focus:ring-[#059669]/20"
						/>
						{#if form?.errors?.password}
							<p class="mt-1 text-xs text-[#dc2626]">{form.errors.password[0]}</p>
						{/if}
					</div>
					<div>
						<label for="create-role" class="mb-1.5 block text-xs font-semibold text-[#44403c]">
							Peran
						</label>
						<select
							id="create-role"
							name="role"
							bind:value={createRole}
							class="w-full rounded-xl border border-[#e7e5e4] px-3 py-2.5 text-sm text-[#1a1a2e] focus:border-[#059669] focus:outline-none focus:ring-2 focus:ring-[#059669]/20"
						>
							<option value="staff">Staff</option>
							<option value="manager">Manager</option>
						</select>
					</div>
					<div class="flex gap-3 pt-1">
						<button
							type="button"
							onclick={closeModal}
							class="flex-1 min-h-[44px] rounded-xl border border-[#e7e5e4] text-sm font-semibold text-[#78716c] hover:bg-[#f5f5f4] transition-colors"
							>Batal</button
						>
						<button
							type="submit"
							disabled={submitting}
							class="flex-1 min-h-[44px] rounded-xl bg-[#059669] text-sm font-bold text-white hover:bg-[#047857] transition-colors disabled:opacity-60"
						>
							{submitting ? 'Menyimpan...' : 'Buat Akun'}
						</button>
					</div>
				</form>

				<!-- EDIT STAFF -->
			{:else if modalMode === 'edit'}
				<div class="mb-5 flex items-center justify-between">
					<h2 class="text-base font-extrabold text-[#1a1a2e]">Edit Anggota</h2>
					<button
						type="button"
						onclick={closeModal}
						class="flex h-8 w-8 items-center justify-center rounded-lg text-[#78716c] hover:bg-[#f5f5f4]"
						aria-label="Tutup"><X size={18} /></button
					>
				</div>
				<p class="mb-4 text-xs text-[#78716c]">{selectedEmail}</p>
				<form
					method="POST"
					action="?/editStaff"
					use:enhance={() => {
						submitting = true;
						return async ({ update }) => {
							submitting = false;
							await update();
							if (!form?.errors) closeModal();
						};
					}}
					class="space-y-4"
				>
					<input type="hidden" name="membershipId" value={selectedId} />
					<div>
						<label for="edit-name" class="mb-1.5 block text-xs font-semibold text-[#44403c]">
							Nama Lengkap
						</label>
						<input
							id="edit-name"
							name="name"
							type="text"
							required
							bind:value={editName}
							class="w-full rounded-xl border border-[#e7e5e4] px-3 py-2.5 text-sm text-[#1a1a2e] focus:border-[#059669] focus:outline-none focus:ring-2 focus:ring-[#059669]/20"
						/>
						{#if form?.errors?.name}
							<p class="mt-1 text-xs text-[#dc2626]">{form.errors.name[0]}</p>
						{/if}
					</div>
					<div>
						<label for="edit-password" class="mb-1.5 block text-xs font-semibold text-[#44403c]">
							Password Baru <span class="font-normal text-[#a8a29e]"
								>(kosongkan jika tidak diubah)</span
							>
						</label>
						<input
							id="edit-password"
							name="password"
							type="password"
							minlength={8}
							bind:value={editPassword}
							placeholder="Minimal 8 karakter"
							autocomplete="new-password"
							class="w-full rounded-xl border border-[#e7e5e4] px-3 py-2.5 text-sm text-[#1a1a2e] placeholder:text-[#a8a29e] focus:border-[#059669] focus:outline-none focus:ring-2 focus:ring-[#059669]/20"
						/>
						{#if form?.errors?.password}
							<p class="mt-1 text-xs text-[#dc2626]">{form.errors.password[0]}</p>
						{/if}
					</div>
					<div class="flex gap-3 pt-1">
						<button
							type="button"
							onclick={closeModal}
							class="flex-1 min-h-[44px] rounded-xl border border-[#e7e5e4] text-sm font-semibold text-[#78716c] hover:bg-[#f5f5f4] transition-colors"
							>Batal</button
						>
						<button
							type="submit"
							disabled={submitting}
							class="flex-1 min-h-[44px] rounded-xl bg-[#059669] text-sm font-bold text-white hover:bg-[#047857] transition-colors disabled:opacity-60"
						>
							{submitting ? 'Menyimpan...' : 'Simpan'}
						</button>
					</div>
				</form>

				<!-- CHANGE ROLE -->
			{:else if modalMode === 'changeRole'}
				<div class="mb-5 flex items-center justify-between">
					<h2 class="text-base font-extrabold text-[#1a1a2e]">Ubah Peran</h2>
					<button
						type="button"
						onclick={closeModal}
						class="flex h-8 w-8 items-center justify-center rounded-lg text-[#78716c] hover:bg-[#f5f5f4]"
						aria-label="Tutup"><X size={18} /></button
					>
				</div>
				<p class="mb-4 text-sm text-[#78716c]">
					Mengubah peran <span class="font-bold text-[#1a1a2e]">{selectedName}</span>
				</p>
				<form
					method="POST"
					action="?/changeRole"
					use:enhance={() => {
						submitting = true;
						return async ({ update }) => {
							submitting = false;
							await update();
							if (!form?.error) closeModal();
						};
					}}
					class="space-y-4"
				>
					<input type="hidden" name="membershipId" value={selectedId} />
					<div class="flex gap-3">
						{#each ['staff', 'manager'] as roleOption (roleOption)}
							{@const cfg = roleCfg[roleOption as Role]}
							<label
								class="flex flex-1 cursor-pointer items-center gap-2 rounded-xl border-2 px-3 py-3 text-sm font-semibold transition-colors {selectedRole ===
								roleOption
									? 'border-[#059669] bg-[#d1fae5] text-[#065f46]'
									: 'border-[#e7e5e4] text-[#44403c] hover:border-[#d1d5db]'}"
							>
								<input
									type="radio"
									name="role"
									value={roleOption}
									bind:group={selectedRole}
									class="sr-only"
								/>
								{cfg.label}
							</label>
						{/each}
					</div>
					<div class="flex gap-3 pt-1">
						<button
							type="button"
							onclick={closeModal}
							class="flex-1 min-h-[44px] rounded-xl border border-[#e7e5e4] text-sm font-semibold text-[#78716c] hover:bg-[#f5f5f4] transition-colors"
							>Batal</button
						>
						<button
							type="submit"
							disabled={submitting}
							class="flex-1 min-h-[44px] rounded-xl bg-[#059669] text-sm font-bold text-white hover:bg-[#047857] transition-colors disabled:opacity-60"
						>
							{submitting ? 'Menyimpan...' : 'Simpan'}
						</button>
					</div>
				</form>

				<!-- REMOVE MEMBER -->
			{:else if modalMode === 'remove'}
				<div class="mb-5 flex items-center justify-between">
					<h2 class="text-base font-extrabold text-[#1a1a2e]">Hapus Anggota</h2>
					<button
						type="button"
						onclick={closeModal}
						class="flex h-8 w-8 items-center justify-center rounded-lg text-[#78716c] hover:bg-[#f5f5f4]"
						aria-label="Tutup"><X size={18} /></button
					>
				</div>
				<p class="mb-6 text-sm text-[#44403c]">
					Hapus <span class="font-bold text-[#1a1a2e]">{selectedName}</span> dari tim? Mereka tidak akan
					bisa login ke dashboard lagi.
				</p>
				<form
					method="POST"
					action="?/removeMember"
					use:enhance={() => {
						submitting = true;
						return async ({ update }) => {
							submitting = false;
							await update();
							closeModal();
						};
					}}
				>
					<input type="hidden" name="membershipId" value={selectedId} />
					<div class="flex gap-3">
						<button
							type="button"
							onclick={closeModal}
							class="flex-1 min-h-[44px] rounded-xl border border-[#e7e5e4] text-sm font-semibold text-[#78716c] hover:bg-[#f5f5f4] transition-colors"
							>Batal</button
						>
						<button
							type="submit"
							disabled={submitting}
							class="flex-1 min-h-[44px] rounded-xl bg-[#dc2626] text-sm font-bold text-white hover:bg-[#b91c1c] transition-colors disabled:opacity-60"
						>
							{submitting ? 'Menghapus...' : 'Ya, Hapus'}
						</button>
					</div>
				</form>
			{/if}
		</div>
	</div>
{/if}
