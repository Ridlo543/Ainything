<script lang="ts">
	import { QrCode, Menu, X } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { t } from '$lib/i18n';
	import ThemeToggle from '$lib/theme/ThemeToggle.svelte';

	const NAV_LINKS = [
		{ href: '#features', label: 'Features' },
		{ href: '#how-it-works', label: 'How it Works' },
		{ href: '#pricing', label: 'Pricing' }
	] as const;

	let scrolled = $state(false);
	let mobileOpen = $state(false);

	function handleScroll() {
		scrolled = window.scrollY > 20;
	}

	function closeMobile() {
		mobileOpen = false;
	}
</script>

<svelte:window onscroll={handleScroll} />

<nav
	class="fixed top-0 right-0 left-0 z-50 transition-all duration-300 {scrolled
		? 'border-b border-lingua-border bg-lingua-surface/90 shadow-sm backdrop-blur-md'
		: 'bg-transparent'}"
>
	<div class="app-container flex h-16 items-center justify-between sm:h-20">
		<a href={resolve('/')} class="flex items-center gap-2.5">
			<div class="flex h-9 w-9 items-center justify-center rounded-lg bg-lingua-primary text-white">
				<QrCode size={18} />
			</div>
			<span class="text-lg font-bold tracking-tight text-lingua-text">Lingua</span>
		</a>

		<div class="hidden items-center gap-8 md:flex">
			{#each NAV_LINKS as link (link.href)}
				<a
					href={link.href}
					class="text-sm font-medium text-lingua-subtle transition-colors hover:text-lingua-primary"
				>
					{link.label}
				</a>
			{/each}
		</div>

		<div class="hidden items-center gap-2 md:flex">
			<ThemeToggle />
			<a
				href={resolve('/login')}
				class="rounded-lg px-4 py-2 text-sm font-semibold text-lingua-subtle transition-colors hover:text-lingua-primary"
			>
				Sign in
			</a>
			<a
				href={resolve('/login')}
				class="rounded-lg bg-lingua-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-lingua-primary-strong hover:shadow-md"
			>
				{t('page.landing.hero.cta.primary')}
			</a>
		</div>

		<div class="flex items-center gap-2 md:hidden">
			<ThemeToggle />
			<button
				onclick={() => (mobileOpen = !mobileOpen)}
				class="flex h-9 w-9 items-center justify-center rounded-lg text-lingua-text"
				aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
				aria-expanded={mobileOpen}
			>
				{#if mobileOpen}
					<X size={20} />
				{:else}
					<Menu size={20} />
				{/if}
			</button>
		</div>
	</div>

	{#if mobileOpen}
		<div
			class="border-t border-lingua-border bg-lingua-surface px-4 py-4 shadow-lg md:hidden"
		>
			<div class="flex flex-col gap-1">
				{#each NAV_LINKS as link (link.href)}
					<a
						href={link.href}
						onclick={closeMobile}
						class="rounded-lg px-4 py-3 text-sm font-medium text-lingua-subtle hover:bg-lingua-muted hover:text-lingua-text"
					>
						{link.label}
					</a>
				{/each}
				<div class="mt-2 flex flex-col gap-2 border-t border-lingua-border pt-3">
					<a
						href={resolve('/login')}
						onclick={closeMobile}
						class="rounded-lg py-3 text-center text-sm font-semibold text-lingua-subtle">Sign in</a
					>
					<a
						href={resolve('/login')}
						onclick={closeMobile}
						class="rounded-lg bg-lingua-primary py-3 text-center text-sm font-bold text-white"
						>{t('page.landing.hero.cta.primary')}</a
					>
				</div>
			</div>
		</div>
	{/if}
</nav>
