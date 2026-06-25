<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { Button } from '$lib/ui/button';
	import { Input } from '$lib/ui/input';
	import { Label } from '$lib/ui/label';
	import * as Alert from '$lib/ui/alert';
	import { Eye, EyeOff, AlertCircle, QrCode, TrendingUp, ShoppingCart, Shield } from '@lucide/svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showPassword = $state(false);
	let loading = $state(false);

	const highlights = [
		{
			icon: QrCode,
			title: 'Katalog QR siap pakai',
			desc: 'Pelanggan scan, pilih, dan pesan — tanpa install app apapun.'
		},
		{
			icon: ShoppingCart,
			title: 'Pesanan masuk real-time',
			desc: 'Notifikasi setiap pesanan baru langsung ke HP kamu.'
		},
		{
			icon: TrendingUp,
			title: 'Laporan & analitik',
			desc: 'Pantau penjualan, produk terlaris, dan tren harian.'
		},
		{
			icon: Shield,
			title: 'Data aman & terisolasi',
			desc: 'Setiap bisnis memiliki ruang data yang sepenuhnya terpisah.'
		}
	];
</script>

<svelte:head>
	<title>Masuk — Lingua</title>
</svelte:head>

<div class="flex min-h-screen bg-[#fafaf9]">

	<!-- Left panel (lg+) -->
	<div
		class="relative hidden overflow-hidden lg:flex lg:w-[52%] lg:flex-col"
		style="background: linear-gradient(145deg, #065f46 0%, #059669 55%, #10b981 100%);"
	>
		<div class="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/5" aria-hidden="true"></div>
		<div class="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-white/5" aria-hidden="true"></div>

		<div class="relative z-10 p-10">
			<a href="/" class="flex items-center gap-3" aria-label="Lingua beranda">
				<span class="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-xl font-black text-white">L</span>
				<span class="text-xl font-extrabold text-white">Lingua</span>
			</a>
		</div>

		<div class="relative z-10 flex flex-1 flex-col justify-center px-10 pb-10">
			<h1 class="text-4xl font-extrabold leading-tight text-white">
				Digitalisasi bisnis<br />kamu hari ini
			</h1>
			<p class="mt-4 text-lg text-white/70">
				Dari katalog QR sampai laporan penjualan —<br />semua dari satu dashboard.
			</p>

			<div class="mt-8 overflow-hidden rounded-2xl border border-white/20 bg-white/10 shadow-2xl backdrop-blur-sm">
				<div class="flex items-center gap-2 border-b border-white/10 px-4 py-3">
					<span class="h-2.5 w-2.5 rounded-full bg-red-400/70"></span>
					<span class="h-2.5 w-2.5 rounded-full bg-yellow-400/70"></span>
					<span class="h-2.5 w-2.5 rounded-full bg-green-400/70"></span>
					<span class="ml-3 rounded bg-white/10 px-3 py-0.5 text-[11px] text-white/50">lingua.app/dashboard</span>
				</div>
				<img
					src="/mock-images/photo-1551288049-bebda4e38f71.jpg"
					alt="Dashboard Lingua"
					class="h-48 w-full object-cover object-top opacity-90"
					width="640" height="192"
					loading="eager"
				/>
			</div>

			<ul class="mt-8 grid grid-cols-2 gap-3">
				{#each highlights as h}
					<li class="flex items-start gap-3 rounded-xl bg-white/10 p-3">
						<div class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/20">
							<h.icon size={14} class="text-white" />
						</div>
						<div>
							<p class="text-xs font-bold text-white">{h.title}</p>
							<p class="mt-0.5 text-[11px] leading-relaxed text-white/60">{h.desc}</p>
						</div>
					</li>
				{/each}
			</ul>
		</div>

		<div class="relative z-10 px-10 pb-8">
			<p class="text-xs text-white/30">&copy; {new Date().getFullYear()} Lingua. Hak cipta dilindungi.</p>
		</div>
	</div>

	<!-- Right form panel -->
	<div class="flex flex-1 items-center justify-center p-6 lg:p-12">
		<div class="w-full max-w-sm">

			<!-- Mobile logo -->
			<div class="mb-8 flex items-center gap-2.5 lg:hidden">
				<span class="flex h-8 w-8 items-center justify-center rounded-lg bg-[#059669] text-sm font-black text-white">L</span>
				<span class="text-lg font-extrabold text-[#1a1a2e]">Lingua</span>
			</div>

			<div class="mb-7">
				<h2 class="text-2xl font-extrabold text-[#1a1a2e]">Selamat datang kembali</h2>
				<p class="mt-1 text-sm text-[#78716c]">Masuk untuk melanjutkan ke dashboard.</p>
			</div>

			{#if form?.message}
				<Alert.Root variant="destructive" class="mb-5">
					<AlertCircle class="h-4 w-4" />
					<Alert.Description>{form.message}</Alert.Description>
				</Alert.Root>
			{/if}

			<form
				method="POST"
				action="?/login"
				class="space-y-4"
				onsubmit={() => (loading = true)}
			>
				{#if data.redirectTo}
					<input type="hidden" name="redirectTo" value={data.redirectTo} />
				{/if}

				<div class="space-y-1.5">
					<Label for="email">Email</Label>
					<Input
						id="email"
						name="email"
						type="email"
						placeholder="nama@bisnis.com"
						autocomplete="email"
						required
						class="min-h-11"
					/>
				</div>

				<div class="space-y-1.5">
					<div class="flex items-center justify-between">
						<Label for="password">Password</Label>
						<a
							href="/auth/forgot-password"
							class="text-xs text-[#78716c] underline-offset-4 transition-colors hover:text-[#1a1a2e] hover:underline"
						>Lupa password?</a>
					</div>
					<div class="relative">
						<Input
							id="password"
							name="password"
							type={showPassword ? 'text' : 'password'}
							placeholder="Masukkan password"
							autocomplete="current-password"
							required
							class="min-h-11 pr-10"
						/>
						<button
							type="button"
							onclick={() => (showPassword = !showPassword)}
							aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
							class="absolute inset-y-0 right-0 flex items-center px-3 text-[#78716c] transition-colors hover:text-[#1a1a2e]"
						>
							{#if showPassword}<EyeOff class="h-4 w-4" />{:else}<Eye class="h-4 w-4" />{/if}
						</button>
					</div>
				</div>

				<Button type="submit" class="w-full min-h-11" disabled={loading}>
					{loading ? 'Memproses...' : 'Masuk'}
				</Button>
			</form>

			<div class="my-6 flex items-center gap-3">
				<div class="h-px flex-1 bg-[#e7e5e4]"></div>
				<span class="text-xs text-[#78716c]">atau</span>
				<div class="h-px flex-1 bg-[#e7e5e4]"></div>
			</div>

			<p class="text-center text-sm text-[#78716c]">
				Belum punya akun?
				<a
					href="/register"
					class="font-semibold text-[#059669] underline-offset-4 transition-colors hover:underline"
				>Daftar gratis</a>
			</p>
		</div>
	</div>
</div>
