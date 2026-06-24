<script lang="ts">
	import type { PageData } from './$types';
	import { Plus, Mail, MoreHorizontal, X, Check, Users, Crown, Shield, User, Clock } from '@lucide/svelte';

	let { data }: { data: PageData } = $props();
	const org = $derived(data.tenant.organization);

	type Role = 'owner' | 'manager' | 'staff';
	type MemberStatus = 'active' | 'invited';

	const roleCfg: Record<Role, { label: string; bg: string; text: string; icon: typeof Crown }> = {
		owner:   { label: 'Owner',   bg: 'bg-[#fef3c7]', text: 'text-[#d97706]', icon: Crown },
		manager: { label: 'Manager', bg: 'bg-[#eff6ff]', text: 'text-[#2563eb]', icon: Shield },
		staff:   { label: 'Staff',   bg: 'bg-[#f5f5f4]', text: 'text-[#78716c]', icon: User }
	};

	const members = $state([
		{ id: '1', name: 'Made Restaurant Owner', email: 'owner@bali-table.test', role: 'owner' as Role, status: 'active' as MemberStatus, since: 'Juni 2025', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop&q=80' },
		{ id: '2', name: 'Wayan Kasir', email: 'kasir@bali-table.test', role: 'staff' as Role, status: 'active' as MemberStatus, since: 'Agt 2025', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=64&h=64&fit=crop&q=80' },
		{ id: '3', name: 'Nyoman Manager', email: 'manager@bali-table.test', role: 'manager' as Role, status: 'active' as MemberStatus, since: 'Sep 2025', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=64&h=64&fit=crop&q=80' },
	]);

	const invites = $state([
		{ id: 'i1', email: 'newstaff@email.com', role: 'staff' as Role, sentAt: '2 hari lalu' },
	]);

	let showModal = $state(false);
	let openMenuId = $state<string | null>(null);
	let inviteEmail = $state('');
	let inviteRole = $state<Role>('staff');
</script>

<svelte:head>
	<title>Tim — {org.name}</title>
</svelte:head>

<div class="space-y-6">

	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-extrabold text-[#1a1a2e]">Tim</h1>
			<p class="mt-0.5 text-sm text-[#78716c]">{members.length} anggota aktif</p>
		</div>
		<button
			type="button"
			onclick={() => (showModal = true)}
			class="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#059669] px-4 text-sm font-bold text-white shadow-sm hover:bg-[#047857] transition-colors"
		>
			<Plus size={16} /> Undang Staff
		</button>
	</div>

	<!-- Members list -->
	<div class="rounded-2xl border border-[#e7e5e4] bg-white shadow-sm">
		<div class="border-b border-[#f5f5f4] px-5 py-4">
			<h2 class="text-sm font-bold text-[#1a1a2e]">Anggota Aktif</h2>
		</div>
		<div class="divide-y divide-[#f5f5f4]">
			{#each members as member (member.id)}
				<div class="flex items-center gap-4 px-5 py-4">
					<img
						src={member.avatar}
						alt={member.name}
						class="h-10 w-10 shrink-0 rounded-full object-cover"
						width="40" height="40"
					/>
					<div class="min-w-0 flex-1">
						<p class="text-sm font-bold text-[#1a1a2e]">{member.name}</p>
						<p class="mt-0.5 text-xs text-[#78716c]">{member.email}</p>
					</div>
					<div class="flex shrink-0 items-center gap-2">
						<span class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold {roleCfg[member.role].bg} {roleCfg[member.role].text}">
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
								>
									<MoreHorizontal size={16} />
								</button>
								{#if openMenuId === member.id}
									<div class="absolute right-0 top-10 z-20 w-40 rounded-xl border border-[#e7e5e4] bg-white py-1 shadow-lg">
										<button type="button" class="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-[#1a1a2e] hover:bg-[#f5f5f4]"><Shield size={14} /> Ubah Peran</button>
										<div class="my-1 h-px bg-[#f5f5f4]"></div>
										<button type="button" class="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-[#dc2626] hover:bg-[#fef2f2]"><X size={14} /> Hapus dari Tim</button>
									</div>
								{/if}
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>
	<!-- Pending invites -->
	{#if invites.length > 0}
		<div class="rounded-2xl border border-[#e7e5e4] bg-white shadow-sm">
			<div class="border-b border-[#f5f5f4] px-5 py-4">
				<h2 class="text-sm font-bold text-[#1a1a2e]">Undangan Tertunda</h2>
			</div>
			<div class="divide-y divide-[#f5f5f4]">
				{#each invites as invite (invite.id)}
					<div class="flex items-center gap-4 px-5 py-4">
						<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f5f5f4]">
							<Mail size={18} class="text-[#a8a29e]" />
						</div>
						<div class="min-w-0 flex-1">
							<p class="text-sm font-bold text-[#1a1a2e]">{invite.email}</p>
							<div class="mt-0.5 flex items-center gap-1.5 text-xs text-[#78716c]">
								<Clock size={11} /> Dikirim {invite.sentAt}
							</div>
						</div>
						<div class="flex shrink-0 items-center gap-2">
							<span class="rounded-full bg-[#fef3c7] px-2.5 py-1 text-xs font-semibold text-[#d97706]">{roleCfg[invite.role].label}</span>
							<button type="button" class="flex h-8 w-8 items-center justify-center rounded-lg text-[#78716c] hover:bg-[#fef2f2] hover:text-[#dc2626] transition-colors" aria-label="Batalkan undangan">
								<X size={14} />
							</button>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Invite modal -->
	{#if showModal}
		<div
			class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
			role="dialog" aria-modal="true" tabindex="-1"
			onclick={(e) => { if (e.target === e.currentTarget) showModal = false; }}
			onkeydown={(e) => e.key === 'Escape' && (showModal = false)}
		>
			<div class="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-2xl">
				<div class="mb-5 flex items-center justify-between">
					<h2 class="text-lg font-extrabold text-[#1a1a2e]">Undang Staff Baru</h2>
					<button type="button" onclick={() => (showModal = false)} class="flex h-9 w-9 items-center justify-center rounded-xl text-[#78716c] hover:bg-[#f5f5f4]" aria-label="Tutup">
						<X size={18} />
					</button>
				</div>
				<div class="space-y-4">
					<div>
						<label for="invite-email" class="mb-1.5 block text-sm font-semibold text-[#1a1a2e]">Email <span class="text-[#dc2626]">*</span></label>
						<div class="relative">
							<Mail size={15} class="absolute left-3 top-1/2 -translate-y-1/2 text-[#78716c]" />
							<input
								id="invite-email"
								type="email"
								bind:value={inviteEmail}
								placeholder="nama@email.com"
								class="h-11 w-full rounded-xl border border-[#e7e5e4] bg-[#fafaf9] pl-9 pr-4 text-sm focus:border-[#059669] focus:outline-none focus:ring-2 focus:ring-[#059669]/20"
								required
							/>
						</div>
					</div>
					<div>
						<p class="mb-2 text-sm font-semibold text-[#1a1a2e]">Peran</p>
						<div class="grid grid-cols-2 gap-2">
							{#each (['staff', 'manager'] as Role[]) as role}
								<button
									type="button"
									onclick={() => (inviteRole = role)}
									class="flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all
										{inviteRole === role ? 'border-[#059669] bg-[#f0fdf4]' : 'border-[#e7e5e4] bg-white hover:border-[#059669]/40'}"
									aria-pressed={inviteRole === role}
								>
								<div class="flex h-8 w-8 items-center justify-center rounded-lg {roleCfg[role].bg} {roleCfg[role].text}">
									{#if role === 'manager'}<Shield size={16} />{:else}<User size={16} />{/if}
								</div>
									<div>
										<p class="text-sm font-bold text-[#1a1a2e]">{roleCfg[role].label}</p>
										<p class="text-[11px] text-[#78716c]">{role === 'staff' ? 'Proses pesanan' : 'Kelola katalog'}</p>
									</div>
								</button>
							{/each}
						</div>
					</div>
				</div>
				<div class="mt-6 flex gap-3">
					<button type="button" onclick={() => (showModal = false)} class="flex-1 min-h-[44px] rounded-xl border border-[#e7e5e4] text-sm font-semibold text-[#78716c] hover:bg-[#f5f5f4] transition-colors">Batal</button>
					<button type="button" onclick={() => (showModal = false)} class="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#059669] text-sm font-bold text-white hover:bg-[#047857] transition-colors">
						<Mail size={15} /> Kirim Undangan
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Close dropdown on outside click -->
	{#if openMenuId}
		<div class="fixed inset-0 z-10" role="presentation" onclick={() => (openMenuId = null)}></div>
	{/if}

</div>
