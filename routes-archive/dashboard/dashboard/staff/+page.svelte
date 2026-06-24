<script lang="ts">
	import { Users, Mail, UserPlus, Trash2, X, Clock } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const members = $derived(data.members);
	const invites = $derived(data.invites);
	const tenant = $derived(data.tenant);
	const isOwner = $derived(tenant.membership.role === 'owner');

	let showInviteDialog = $state(false);
	let inviteEmail = $state('');
	let inviteRole = $state<'owner' | 'manager' | 'staff'>('staff');

	function openInviteDialog() {
		showInviteDialog = true;
		inviteEmail = '';
		inviteRole = 'staff';
	}

	function closeInviteDialog() {
		showInviteDialog = false;
	}
</script>

<svelte:head>
	<title>Team Members - Lingua</title>
</svelte:head>

<section class="grid gap-5">
	<div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
		<div>
			<p class="text-sm font-semibold text-lingua-primary">Team</p>
			<h1 class="mt-2 text-3xl font-semibold">Staff Management</h1>
			<p class="mt-2 max-w-3xl text-lingua-subtle">
				Manage your team members, invite new staff, and control access to your restaurant dashboard.
			</p>
		</div>
		{#if isOwner}
			<button
				type="button"
				class="tap-target inline-flex items-center justify-center gap-2 rounded-lg bg-lingua-primary px-4 text-sm font-semibold text-white hover:bg-lingua-primary/90"
				onclick={openInviteDialog}
			>
				<UserPlus size={16} />
				Invite Staff
			</button>
		{/if}
	</div>

	<!-- Current Members -->
	<section class="surface rounded-lg p-4">
		<div class="mb-4 flex items-center gap-2">
			<Users size={20} class="text-lingua-primary" />
			<h2 class="text-lg font-semibold">Current Members ({members.length})</h2>
		</div>

		{#if members.length === 0}
			<p class="py-8 text-center text-sm text-lingua-subtle">No team members found.</p>
		{:else}
			<div class="grid gap-3">
				{#each members as member (member.id)}
					<div class="flex items-center justify-between rounded-lg border border-lingua-border p-3">
						<div>
							<p class="font-semibold text-lingua-text">{member.name}</p>
							<p class="text-sm text-lingua-subtle">{member.email}</p>
						</div>
						<div class="flex items-center gap-2">
							{#if isOwner && member.userId !== tenant.user.id}
								<!-- Role change form -->
								<form method="POST" action="?/changeRole" use:enhance>
									<input type="hidden" name="membershipId" value={member.id} />
									<select
										name="role"
										value={member.role}
										onchange={(e) => e.currentTarget.form?.requestSubmit()}
										class="rounded-lg border border-lingua-border bg-lingua-bg px-2 py-1 text-xs font-semibold text-lingua-primary"
										aria-label="Change role for {member.name}"
									>
										<option value="staff">Staff</option>
										<option value="manager">Manager</option>
										<option value="owner">Owner</option>
									</select>
								</form>
								<!-- Remove form -->
								<form method="POST" action="?/remove" use:enhance>
									<input type="hidden" name="membershipId" value={member.id} />
									<button
										type="submit"
										class="tap-target rounded-lg p-2 text-red-600 hover:bg-red-50"
										title="Remove member"
									>
										<Trash2 size={16} />
									</button>
								</form>
							{:else}
								<span
									class="rounded-full bg-lingua-primary-soft px-3 py-1 text-xs font-semibold text-lingua-primary"
								>
									{member.role}
								</span>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</section>

	<!-- Pending Invites -->
	{#if isOwner && invites.length > 0}
		<section class="surface rounded-lg p-4">
			<div class="mb-4 flex items-center gap-2">
				<Mail size={20} class="text-lingua-primary" />
				<h2 class="text-lg font-semibold">Pending Invites ({invites.length})</h2>
			</div>

			<div class="grid gap-3">
				{#each invites as invite (invite.id)}
					<div class="flex items-center justify-between rounded-lg border border-lingua-border p-3">
						<div>
							<p class="font-semibold text-lingua-text">{invite.email}</p>
							<p class="text-sm text-lingua-subtle">
								Invited by {invite.inviterName} ·
								<Clock size={12} class="inline" />
								Expires {new Date(invite.expiresAt).toLocaleDateString()}
							</p>
						</div>
						<div class="flex items-center gap-3">
							<span
								class="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800"
							>
								{invite.role}
							</span>
							<form method="POST" action="?/cancelInvite" use:enhance>
								<input type="hidden" name="inviteId" value={invite.id} />
								<button
									type="submit"
									class="tap-target rounded-lg p-2 text-red-600 hover:bg-red-50"
									title="Cancel invite"
								>
									<X size={16} />
								</button>
							</form>
						</div>
					</div>
				{/each}
			</div>
		</section>
	{/if}
</section>

<!-- Invite Dialog -->
{#if showInviteDialog}
	<div
		role="dialog"
		aria-modal="true"
		aria-label="Invite staff member"
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		onclick={closeInviteDialog}
		onkeydown={(e) => e.key === 'Escape' && closeInviteDialog()}
		tabindex="-1"
	>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="surface m-4 w-full max-w-md rounded-lg p-6"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<h2 class="text-xl font-semibold">Invite Staff Member</h2>
			<form method="POST" action="?/invite" use:enhance class="mt-4 grid gap-4">
				<input type="hidden" name="organizationName" value={tenant.organization.name} />
				<label class="grid gap-1 text-sm font-semibold">
					Email
					<input
						type="email"
						name="email"
						bind:value={inviteEmail}
						class="tap-target rounded-lg border border-lingua-border px-3 font-normal"
						placeholder="colleague@example.com"
						required
					/>
				</label>
				<label class="grid gap-1 text-sm font-semibold">
					Role
					<select
						name="role"
						bind:value={inviteRole}
						class="tap-target rounded-lg border border-lingua-border px-3 font-normal"
					>
						<option value="staff">Staff</option>
						<option value="manager">Manager</option>
						<option value="owner">Owner</option>
					</select>
				</label>
				<div class="flex gap-2">
					<button
						type="button"
						class="tap-target flex-1 rounded-lg border border-lingua-border px-4 text-sm font-semibold"
						onclick={closeInviteDialog}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="tap-target flex-1 rounded-lg bg-lingua-primary px-4 text-sm font-semibold text-white hover:bg-lingua-primary/90"
					>
						Send Invite
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
