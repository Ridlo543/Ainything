<script lang="ts">
	import { Button } from '$lib/ui/button';
	import { Input } from '$lib/ui/input';
	import { Label } from '$lib/ui/label';
	import * as Alert from '$lib/ui/alert';
	import { Eye, EyeOff, ChevronLeft, AlertCircle, ArrowRight } from '@lucide/svelte';

	let {
		name = $bindable(''),
		email = $bindable(''),
		password = $bindable(''),
		onBack,
		onNext
	}: {
		name: string;
		email: string;
		password: string;
		onBack: () => void;
		onNext: () => void;
	} = $props();

	let showPassword = $state(false);
	let error = $state('');

	const strength = $derived(
		(() => {
			if (!password) return { label: '', color: '', level: 0 };
			let score = 0;
			if (password.length >= 8) score++;
			if (password.length >= 12) score++;
			if (/[A-Z]/.test(password)) score++;
			if (/[0-9]/.test(password)) score++;
			if (score <= 1) return { label: 'Lemah', color: 'bg-red-500', level: 1 };
			if (score <= 2) return { label: 'Sedang', color: 'bg-[#f59e0b]', level: 2 };
			return { label: 'Kuat', color: 'bg-[#059669]', level: 3 };
		})()
	);

	function validate() {
		if (!name.trim()) {
			error = 'Nama lengkap wajib diisi.';
			return false;
		}
		if (!email.trim() || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
			error = 'Email tidak valid.';
			return false;
		}
		if (password.length < 8) {
			error = 'Password minimal 8 karakter.';
			return false;
		}
		error = '';
		return true;
	}

	function submit() {
		if (validate()) onNext();
	}
</script>

<div>
	<button
		type="button"
		onclick={onBack}
		class="mb-5 flex items-center gap-1.5 text-sm font-medium text-[#78716c] transition-colors hover:text-[#1a1a2e]"
	>
		<ChevronLeft size={16} /> Kembali
	</button>

	<h2 class="text-2xl font-extrabold text-[#1a1a2e]">Info akun</h2>
	<p class="mt-1.5 text-sm text-[#78716c]">Data ini digunakan untuk login ke Ainything.</p>

	{#if error}
		<Alert.Root variant="destructive" class="mt-4">
			<AlertCircle class="h-4 w-4" />
			<Alert.Description>{error}</Alert.Description>
		</Alert.Root>
	{/if}

	<div class="mt-5 flex flex-col gap-4">
		<div class="space-y-1.5">
			<Label for="name">Nama Lengkap</Label>
			<Input
				id="name"
				type="text"
				placeholder="Budi Santoso"
				autocomplete="name"
				bind:value={name}
				class="min-h-11"
			/>
		</div>

		<div class="space-y-1.5">
			<Label for="email">Email</Label>
			<Input
				id="email"
				type="email"
				placeholder="budi@bisnis.com"
				autocomplete="email"
				bind:value={email}
				class="min-h-11"
			/>
		</div>

		<div class="space-y-1.5">
			<Label for="password">Password</Label>
			<div class="relative">
				<Input
					id="password"
					type={showPassword ? 'text' : 'password'}
					placeholder="Minimal 8 karakter"
					autocomplete="new-password"
					bind:value={password}
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
			{#if password}
				<div class="mt-2 space-y-1">
					<div class="flex gap-1">
						{#each [1, 2, 3] as level (level)}
							<div
								class="h-1 flex-1 rounded-full transition-all {strength.level >= level
									? strength.color
									: 'bg-[#e7e5e4]'}"
							></div>
						{/each}
					</div>
					<p class="text-xs text-[#78716c]">
						Kekuatan:
						<span
							class="font-medium
							{strength.level === 1 ? 'text-red-500' : ''}
							{strength.level === 2 ? 'text-[#f59e0b]' : ''}
							{strength.level === 3 ? 'text-[#059669]' : ''}">{strength.label}</span
						>
					</p>
				</div>
			{/if}
		</div>
	</div>

	<Button type="button" onclick={submit} class="mt-6 w-full min-h-11">
		Lanjut <ArrowRight size={16} />
	</Button>
</div>
