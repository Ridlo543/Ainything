<script lang="ts">
	import { Menu, X, ChevronRight } from '@lucide/svelte';

	let mobileOpen = $state(false);

	const nav = [
		{ href: '#fitur', label: 'Fitur' },
		{ href: '#cara-kerja', label: 'Cara Kerja' },
		{ href: '#harga', label: 'Harga' }
	];
</script>

<header class="sticky top-0 z-50 border-b border-[#e7e5e4] bg-white/95 backdrop-blur-md">
	<div class="app-container flex h-16 items-center">
		<!-- Logo -->
		<a href="/" class="flex shrink-0 items-center gap-2" aria-label="Ainything beranda">
			<img
				src="/images/ainything-logo-nobackground.png"
				alt="Ainything"
				class="h-8 w-8"
				width="32"
				height="32"
			/>
			<span class="text-lg font-extrabold tracking-tight text-[#1a1a2e]">Ainything</span>
		</a>

		<!-- Desktop nav -->
		<nav class="ml-6 hidden items-center gap-0.5 md:flex" aria-label="Navigasi utama">
			{#each nav as link (link.href)}
				<a
					href={link.href}
					class="rounded-lg px-4 py-2 text-sm font-medium text-[#78716c] transition-colors hover:bg-[#f5f5f4] hover:text-[#1a1a2e]"
					>{link.label}</a
				>
			{/each}
		</nav>

		<!-- Desktop CTA -->
		<div class="ml-auto hidden items-center gap-3 md:flex">
			<a
				href="/login"
				class="px-4 py-2 text-sm font-semibold text-[#78716c] transition-colors hover:text-[#1a1a2e]"
				>Masuk</a
			>
			<a
				href="/register"
				class="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[#059669] px-5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#047857] hover:shadow-md"
			>
				Mulai Gratis <ChevronRight size={14} />
			</a>
		</div>

		<!-- Mobile hamburger -->
		<button
			type="button"
			class="ml-auto flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[#78716c] transition-colors hover:bg-[#f5f5f4] md:hidden"
			aria-label={mobileOpen ? 'Tutup menu' : 'Buka menu'}
			aria-expanded={mobileOpen}
			aria-controls="mobile-nav"
			onclick={() => (mobileOpen = !mobileOpen)}
		>
			{#if mobileOpen}<X size={22} />{:else}<Menu size={22} />{/if}
		</button>
	</div>

	<!-- Mobile menu -->
	{#if mobileOpen}
		<div id="mobile-nav" class="border-t border-[#e7e5e4] bg-white px-4 pb-4 pt-2 md:hidden">
			<nav class="flex flex-col gap-1" aria-label="Navigasi mobile">
				{#each nav as link (link.href)}
					<a
						href={link.href}
						class="rounded-lg px-4 py-3 text-sm font-medium text-[#1a1a2e] hover:bg-[#f5f5f4]"
						onclick={() => (mobileOpen = false)}>{link.label}</a
					>
				{/each}
			</nav>
			<div class="mt-3 flex flex-col gap-2 border-t border-[#e7e5e4] pt-3">
				<a
					href="/login"
					class="rounded-lg border border-[#e7e5e4] px-4 py-3 text-center text-sm font-semibold text-[#1a1a2e] hover:bg-[#f5f5f4]"
					>Masuk</a
				>
				<a
					href="/register"
					class="rounded-lg bg-[#059669] px-4 py-3 text-center text-sm font-bold text-white hover:bg-[#047857]"
					>Mulai Gratis</a
				>
			</div>
		</div>
	{/if}
</header>
