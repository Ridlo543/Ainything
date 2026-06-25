<script lang="ts">
	import type { PageData } from './$types';
	import { User, Bell, LogOut } from '@lucide/svelte';

	let { data }: { data: PageData } = $props();

	const user = $derived(data.tenant.user);
	const restaurant = $derived(data.tenant.activeRestaurant);

	let notificationsEnabled = $state(true);

	function toggleNotifications() {
		notificationsEnabled = !notificationsEnabled;
	}
</script>

<svelte:head>
	<title>Pengaturan Staff — {restaurant.name}</title>
</svelte:head>

<div class="mx-auto max-w-md space-y-6">
	<div>
		<h1 class="text-xl font-bold">Pengaturan</h1>
		<p class="text-sm text-muted-foreground">Akun staff kamu di {restaurant.name}</p>
	</div>

	<div class="rounded-2xl border border-border bg-card shadow-sm">
		<div class="border-b border-border px-5 py-3">
			<h2 class="flex items-center gap-2 text-sm font-semibold">
				<User size={15} /> Profil
			</h2>
		</div>
		<div class="space-y-4 p-5">
			<div>
				<label for="staff-name" class="mb-1 block text-xs font-medium text-muted-foreground"
					>Nama</label
				>
				<input
					id="staff-name"
					type="text"
					value={user.name}
					readonly
					class="h-11 w-full rounded-xl border border-border bg-muted/50 px-4 text-sm text-foreground"
				/>
			</div>
			<div>
				<label for="staff-email" class="mb-1 block text-xs font-medium text-muted-foreground"
					>Email</label
				>
				<input
					id="staff-email"
					type="email"
					value={user.email}
					readonly
					class="h-11 w-full rounded-xl border border-border bg-muted/50 px-4 text-sm text-foreground"
				/>
			</div>
			<div>
				<label for="staff-role" class="mb-1 block text-xs font-medium text-muted-foreground"
					>Role</label
				>
				<input
					id="staff-role"
					type="text"
					value="Staff"
					readonly
					class="h-11 w-full rounded-xl border border-border bg-muted/50 px-4 text-sm capitalize text-foreground"
				/>
			</div>
		</div>
	</div>

	<div class="rounded-2xl border border-border bg-card shadow-sm">
		<div class="border-b border-border px-5 py-3">
			<h2 class="flex items-center gap-2 text-sm font-semibold">
				<Bell size={15} /> Notifikasi
			</h2>
		</div>
		<div class="p-5">
			<label class="flex cursor-pointer items-center justify-between gap-4">
				<div>
					<p class="text-sm font-medium">Peringatan Pesanan Baru</p>
					<p class="text-xs text-muted-foreground">Dapatkan notifikasi saat ada pesanan masuk</p>
				</div>
				<button
					type="button"
					onclick={toggleNotifications}
					role="switch"
					aria-checked={notificationsEnabled}
					aria-label="Peringatan pesanan baru"
					class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors
						{notificationsEnabled ? 'bg-primary' : 'bg-muted-foreground/30'}"
				>
					<span
						class="pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm transition-transform
							{notificationsEnabled ? 'translate-x-5' : 'translate-x-0'}"
					></span>
				</button>
			</label>
		</div>
	</div>

	<form method="POST" action="/logout">
		<button
			type="submit"
			class="tap-target inline-flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 px-4 py-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
		>
			<LogOut size={16} /> Keluar
		</button>
	</form>
</div>
