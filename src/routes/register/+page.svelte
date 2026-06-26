<script lang="ts">
	import RegisterStepIndicator from '$lib/ui/register/RegisterStepIndicator.svelte';
	import RegisterStep1 from '$lib/ui/register/RegisterStep1.svelte';
	import RegisterStep2 from '$lib/ui/register/RegisterStep2.svelte';
	import RegisterStep3 from '$lib/ui/register/RegisterStep3.svelte';

	let step = $state(1);
	let tenantType = $state<'restaurant' | 'retail' | 'service' | ''>('');
	let name = $state('');
	let email = $state('');
	let password = $state('');
	let businessName = $state('');
	let slug = $state('');
	let city = $state('');
	let submitting = $state(false);

	const proofItems = [
		{
			avatar: '/mock-images/photo-1507003211169-0a1dd7228f2d.jpg',
			name: 'Budi S.',
			text: 'Omzet naik 30% dalam sebulan!'
		},
		{
			avatar: '/mock-images/photo-1494790108377-be9c29b29330.jpg',
			name: 'Sari D.',
			text: 'Setup 20 menit, langsung jalan.'
		},
		{
			avatar: '/mock-images/photo-1500648767791-00dcc994a43e.jpg',
			name: 'Kevin H.',
			text: '3 cabang, 1 dashboard. Mudah!'
		}
	];
</script>

<svelte:head>
	<title>Daftar — Ainything</title>
</svelte:head>

<div class="flex min-h-screen bg-[#fafaf9]">
	<!-- Left decorative panel (lg+) -->
	<div
		class="relative hidden overflow-hidden lg:flex lg:w-[46%] lg:flex-col"
		style="background: linear-gradient(145deg, #065f46 0%, #059669 55%, #10b981 100%);"
	>
		<div
			class="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/5"
			aria-hidden="true"
		></div>
		<div
			class="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-white/5"
			aria-hidden="true"
		></div>

		<!-- Logo -->
		<div class="relative z-10 p-10">
			<a href="/" class="flex items-center gap-2.5" aria-label="Ainything beranda">
				<span
					class="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-xl font-black text-white"
					>L</span
				>
				<span class="text-xl font-extrabold text-white">Ainything</span>
			</a>
		</div>

		<!-- Center content -->
		<div class="relative z-10 flex flex-1 flex-col justify-center px-10 pb-10">
			<h2 class="text-3xl font-extrabold leading-tight text-white">
				Bergabung dengan<br />ribuan bisnis digital
			</h2>
			<p class="mt-3 text-base text-white/70">
				Daftar gratis dalam 2 menit dan terima pesanan digital pertama kamu hari ini.
			</p>

			<!-- Product image -->
			<div class="mt-8 overflow-hidden rounded-2xl border border-white/20 shadow-2xl">
				<img
					src="/mock-images/photo-1600891964599-f61ba0e24092.jpg"
					alt="Contoh katalog digital Ainything"
					class="h-44 w-full object-cover"
					width="560"
					height="176"
				/>
				<div class="bg-white/10 px-4 py-3 backdrop-blur-sm">
					<p class="text-xs font-semibold text-white">Warung Sari — Bali</p>
					<p class="text-[11px] text-white/60">4.9 ★ · 120+ pesanan bulan ini</p>
				</div>
			</div>

			<!-- Social proof -->
			<div class="mt-6 flex flex-col gap-3">
				{#each proofItems as t (t.name)}
					<div class="flex items-center gap-3 rounded-xl bg-white/10 p-3">
						<img
							src={t.avatar}
							alt={t.name}
							class="h-9 w-9 shrink-0 rounded-full object-cover"
							width="36"
							height="36"
						/>
						<div>
							<p class="text-xs font-bold text-white">{t.name}</p>
							<p class="text-[11px] text-white/60">{t.text}</p>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Footer -->
		<div class="relative z-10 px-10 pb-8">
			<p class="text-xs text-white/30">
				&copy; {new Date().getFullYear()} Ainything. Hak cipta dilindungi.
			</p>
		</div>
	</div>

	<!-- Right form panel -->
	<div class="flex flex-1 items-start justify-center overflow-y-auto p-6 pt-8 lg:p-12">
		<div class="w-full max-w-md">
			<!-- Mobile logo -->
			<div class="mb-8 flex items-center gap-2.5 lg:hidden">
				<span
					class="flex h-8 w-8 items-center justify-center rounded-lg bg-[#059669] text-sm font-black text-white"
					>L</span
				>
				<span class="text-lg font-extrabold text-[#1a1a2e]">Ainything</span>
			</div>

			<!-- Step indicator -->
			<div class="mb-8">
				<RegisterStepIndicator {step} />
			</div>

			{#if step === 1}
				<RegisterStep1
					onSelect={(type) => {
						tenantType = type;
						step = 2;
					}}
				/>
			{:else if step === 2}
				<RegisterStep2
					bind:name
					bind:email
					bind:password
					onBack={() => (step = 1)}
					onNext={() => (step = 3)}
				/>
			{:else if step === 3}
				<form
					method="POST"
					action="/register/restaurant?/register"
					onsubmit={() => (submitting = true)}
				>
					<input type="hidden" name="name" value={name} />
					<input type="hidden" name="email" value={email} />
					<input type="hidden" name="password" value={password} />
					<input type="hidden" name="tenantType" value={tenantType} />

					<RegisterStep3
						bind:businessName
						bind:slug
						bind:city
						{submitting}
						onBack={() => (step = 2)}
					/>
				</form>
			{/if}

			<!-- Sign in link -->
			<p class="mt-8 text-center text-sm text-[#78716c]">
				Sudah punya akun?
				<a
					href="/login"
					class="font-semibold text-[#059669] underline-offset-4 transition-colors hover:underline"
					>Masuk</a
				>
			</p>
		</div>
	</div>
</div>
