<script lang="ts">
	import { t } from '$lib/i18n';
	import { resolve } from '$app/paths';
	import Navbar from '$lib/ui/Navbar.svelte';
	import Footer from '$lib/ui/Footer.svelte';
	import {
		QrCode,
		Globe,
		Languages,
		Bot,
		Inbox,
		Building2,
		Shield,
		BarChart3,
		Kanban,
		BookOpen,
		Smartphone,
		Star,
		Check,
		ArrowRight,
		Sparkles
	} from '@lucide/svelte';
</script>

<Navbar />

<main>
	<!-- ─── Hero ─── -->
	<section
		class="relative overflow-hidden bg-gradient-to-b from-lingua-primary-soft/30 via-white to-white pb-20 pt-28 dark:from-lingua-primary-soft/20 dark:via-lingua-bg dark:to-lingua-bg sm:pt-36"
	>
		<div class="app-container relative z-10 flex flex-col items-center text-center">
			<div
				class="mb-6 inline-flex items-center gap-2 rounded-full border border-lingua-border bg-white px-4 py-1.5 text-xs font-medium text-lingua-primary shadow-sm dark:bg-lingua-surface"
			>
				<Sparkles size={14} />
				{t('page.landing.hero.tagline')}
			</div>

			<h1
				class="max-w-4xl text-4xl font-extrabold tracking-tight text-lingua-text sm:text-5xl lg:text-6xl"
			>
				{t('page.landing.hero.heading')}
			</h1>

			<p class="mt-6 max-w-2xl text-lg leading-relaxed text-lingua-subtle sm:text-xl">
				{t('page.landing.hero.description')}
			</p>

			<div class="mt-10 flex flex-col items-center gap-4 sm:flex-row">
				<a
					href={resolve('/register/restaurant')}
					class="inline-flex items-center gap-2 rounded-lg bg-lingua-primary px-7 py-3.5 text-base font-bold text-white shadow-lg transition-all hover:bg-lingua-primary-strong hover:shadow-xl"
				>
					{t('page.landing.hero.cta.primary')}
					<ArrowRight size={18} />
				</a>
				<a
					href="#how-it-works"
					class="inline-flex items-center gap-2 rounded-lg border border-lingua-border bg-white px-7 py-3.5 text-base font-semibold text-lingua-text transition-colors hover:bg-lingua-muted dark:bg-lingua-surface dark:hover:bg-lingua-muted"
				>
					{t('page.landing.hero.cta.secondary')}
				</a>
			</div>

			<p class="mt-6 text-sm text-lingua-subtle">
				{t('page.landing.hero.trust')}
			</p>
		</div>

		<div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
			<div
				class="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-lingua-primary-soft/20 blur-3xl dark:bg-lingua-primary-soft/30"
			></div>
			<div
				class="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-lingua-accent-soft/20 blur-3xl dark:bg-lingua-accent-soft/30"
			></div>
		</div>
	</section>

	<!-- ─── Value Proposition ─── -->
	<section class="border-t border-lingua-border bg-white py-20 dark:bg-lingua-bg sm:py-28">
		<div class="app-container">
			<h2 class="text-center text-2xl font-bold text-lingua-text sm:text-3xl">
				{t('page.landing.value.title')}
			</h2>

			<div class="mt-14 grid gap-8 md:grid-cols-3">
				<div
					class="rounded-xl border border-lingua-border bg-white p-8 shadow-sm dark:bg-lingua-surface"
				>
					<div
						class="flex h-12 w-12 items-center justify-center rounded-lg bg-lingua-primary-soft text-lingua-primary"
					>
						<Globe size={24} />
					</div>
					<h3 class="mt-5 text-lg font-bold text-lingua-text">
						{t('page.landing.value.multilingual.title')}
					</h3>
					<p class="mt-3 text-sm leading-relaxed text-lingua-subtle">
						{t('page.landing.value.multilingual.description')}
					</p>
				</div>

				<div
					class="rounded-xl border border-lingua-border bg-white p-8 shadow-sm dark:bg-lingua-surface"
				>
					<div
						class="flex h-12 w-12 items-center justify-center rounded-lg bg-lingua-primary-soft text-lingua-primary"
					>
						<Bot size={24} />
					</div>
					<h3 class="mt-5 text-lg font-bold text-lingua-text">
						{t('page.landing.value.ai.title')}
					</h3>
					<p class="mt-3 text-sm leading-relaxed text-lingua-subtle">
						{t('page.landing.value.ai.description')}
					</p>
				</div>

				<div
					class="rounded-xl border border-lingua-border bg-white p-8 shadow-sm dark:bg-lingua-surface"
				>
					<div
						class="flex h-12 w-12 items-center justify-center rounded-lg bg-lingua-primary-soft text-lingua-primary"
					>
						<Inbox size={24} />
					</div>
					<h3 class="mt-5 text-lg font-bold text-lingua-text">
						{t('page.landing.value.staff.title')}
					</h3>
					<p class="mt-3 text-sm leading-relaxed text-lingua-subtle">
						{t('page.landing.value.staff.description')}
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- ─── How It Works ─── -->
	<section
		id="how-it-works"
		class="border-t border-lingua-border bg-lingua-muted/50 py-20 dark:bg-lingua-muted/10 sm:py-28"
	>
		<div class="app-container">
			<h2 class="text-center text-2xl font-bold text-lingua-text sm:text-3xl">
				{t('page.landing.how.title')}
			</h2>

			<div class="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
				<div
					class="relative rounded-xl border border-lingua-border bg-white p-6 text-center shadow-sm dark:bg-lingua-surface"
				>
					<div
						class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-lingua-primary-soft text-lingua-primary"
					>
						<Globe size={22} />
					</div>
					<h3 class="mt-4 text-base font-bold text-lingua-text">
						{t('page.landing.how.step1.title')}
					</h3>
					<p class="mt-2 text-sm text-lingua-subtle">
						{t('page.landing.how.step1.description')}
					</p>
				</div>

				<div
					class="relative rounded-xl border border-lingua-border bg-white p-6 text-center shadow-sm dark:bg-lingua-surface"
				>
					<div
						class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-lingua-primary-soft text-lingua-primary"
					>
						<Languages size={22} />
					</div>
					<h3 class="mt-4 text-base font-bold text-lingua-text">
						{t('page.landing.how.step2.title')}
					</h3>
					<p class="mt-2 text-sm text-lingua-subtle">
						{t('page.landing.how.step2.description')}
					</p>
				</div>

				<div
					class="relative rounded-xl border border-lingua-border bg-white p-6 text-center shadow-sm dark:bg-lingua-surface"
				>
					<div
						class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-lingua-primary-soft text-lingua-primary"
					>
						<QrCode size={22} />
					</div>
					<h3 class="mt-4 text-base font-bold text-lingua-text">
						{t('page.landing.how.step3.title')}
					</h3>
					<p class="mt-2 text-sm text-lingua-subtle">
						{t('page.landing.how.step3.description')}
					</p>
				</div>

				<div
					class="relative rounded-xl border border-lingua-border bg-white p-6 text-center shadow-sm dark:bg-lingua-surface"
				>
					<div
						class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-lingua-primary-soft text-lingua-primary"
					>
						<Smartphone size={22} />
					</div>
					<h3 class="mt-4 text-base font-bold text-lingua-text">
						{t('page.landing.how.step4.title')}
					</h3>
					<p class="mt-2 text-sm text-lingua-subtle">
						{t('page.landing.how.step4.description')}
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- ─── Features ─── -->
	<section
		id="features"
		class="border-t border-lingua-border bg-white py-20 dark:bg-lingua-bg sm:py-28"
	>
		<div class="app-container">
			<h2 class="text-center text-2xl font-bold text-lingua-text sm:text-3xl">
				{t('page.landing.features.title')}
			</h2>

			<div class="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				<div
					class="rounded-xl border border-lingua-border bg-white p-6 shadow-sm dark:bg-lingua-surface"
				>
					<div
						class="flex h-10 w-10 items-center justify-center rounded-lg bg-lingua-primary-soft text-lingua-primary"
					>
						<Building2 size={20} />
					</div>
					<h3 class="mt-4 font-semibold text-lingua-text">
						{t('page.landing.features.multiRestaurant')}
					</h3>
					<p class="mt-2 text-sm text-lingua-subtle">
						{t('page.landing.features.multiRestaurant.desc')}
					</p>
				</div>

				<div
					class="rounded-xl border border-lingua-border bg-white p-6 shadow-sm dark:bg-lingua-surface"
				>
					<div
						class="flex h-10 w-10 items-center justify-center rounded-lg bg-lingua-primary-soft text-lingua-primary"
					>
						<Shield size={20} />
					</div>
					<h3 class="mt-4 font-semibold text-lingua-text">
						{t('page.landing.features.dietary')}
					</h3>
					<p class="mt-2 text-sm text-lingua-subtle">
						{t('page.landing.features.dietary.desc')}
					</p>
				</div>

				<div
					class="rounded-xl border border-lingua-border bg-white p-6 shadow-sm dark:bg-lingua-surface"
				>
					<div
						class="flex h-10 w-10 items-center justify-center rounded-lg bg-lingua-primary-soft text-lingua-primary"
					>
						<BarChart3 size={20} />
					</div>
					<h3 class="mt-4 font-semibold text-lingua-text">
						{t('page.landing.features.analytics')}
					</h3>
					<p class="mt-2 text-sm text-lingua-subtle">
						{t('page.landing.features.analytics.desc')}
					</p>
				</div>

				<div
					class="rounded-xl border border-lingua-border bg-white p-6 shadow-sm dark:bg-lingua-surface"
				>
					<div
						class="flex h-10 w-10 items-center justify-center rounded-lg bg-lingua-primary-soft text-lingua-primary"
					>
						<Kanban size={20} />
					</div>
					<h3 class="mt-4 font-semibold text-lingua-text">
						{t('page.landing.features.workflow')}
					</h3>
					<p class="mt-2 text-sm text-lingua-subtle">
						{t('page.landing.features.workflow.desc')}
					</p>
				</div>

				<div
					class="rounded-xl border border-lingua-border bg-white p-6 shadow-sm dark:bg-lingua-surface"
				>
					<div
						class="flex h-10 w-10 items-center justify-center rounded-lg bg-lingua-primary-soft text-lingua-primary"
					>
						<BookOpen size={20} />
					</div>
					<h3 class="mt-4 font-semibold text-lingua-text">
						{t('page.landing.features.knowledge')}
					</h3>
					<p class="mt-2 text-sm text-lingua-subtle">
						{t('page.landing.features.knowledge.desc')}
					</p>
				</div>

				<div
					class="rounded-xl border border-lingua-border bg-white p-6 shadow-sm dark:bg-lingua-surface"
				>
					<div
						class="flex h-10 w-10 items-center justify-center rounded-lg bg-lingua-primary-soft text-lingua-primary"
					>
						<Smartphone size={20} />
					</div>
					<h3 class="mt-4 font-semibold text-lingua-text">
						{t('page.landing.features.pwa')}
					</h3>
					<p class="mt-2 text-sm text-lingua-subtle">
						{t('page.landing.features.pwa.desc')}
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- ─── Social Proof ─── -->
	<section
		class="border-t border-lingua-border bg-lingua-primary-soft/20 py-16 dark:bg-lingua-primary-soft/10 sm:py-20"
	>
		<div class="app-container text-center">
			<p class="text-lg font-medium text-lingua-text sm:text-xl">
				{t('page.landing.social.title')}
			</p>
			<div class="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
				<span class="text-2xl font-bold text-lingua-primary">Bali</span>
				<span class="text-2xl font-bold text-lingua-primary">Jakarta</span>
				<span class="text-2xl font-bold text-lingua-primary">Yogyakarta</span>
				<span class="text-2xl font-bold text-lingua-primary">Bandung</span>
				<span class="text-2xl font-bold text-lingua-primary">Surabaya</span>
			</div>
			<div class="mt-8">
				<a
					href="#how-it-works"
					class="inline-flex items-center gap-1 text-sm font-semibold text-lingua-primary hover:text-lingua-primary-strong"
				>
					{t('page.landing.social.cta')}
				</a>
			</div>
		</div>
	</section>

	<!-- ─── Testimonials ─── -->
	<section class="border-t border-lingua-border bg-white py-20 dark:bg-lingua-bg sm:py-28">
		<div class="app-container">
			<h2 class="text-center text-2xl font-bold text-lingua-text sm:text-3xl">
				{t('page.landing.testimonial.title')}
			</h2>

			<div class="mt-14 grid gap-8 md:grid-cols-3">
				<div
					class="rounded-xl border border-lingua-border bg-white p-8 shadow-sm dark:bg-lingua-surface"
				>
					<div class="flex gap-0.5">
						<Star class="fill-lingua-primary text-lingua-primary" size={18} />
						<Star class="fill-lingua-primary text-lingua-primary" size={18} />
						<Star class="fill-lingua-primary text-lingua-primary" size={18} />
						<Star class="fill-lingua-primary text-lingua-primary" size={18} />
						<Star class="fill-lingua-primary text-lingua-primary" size={18} />
					</div>
					<blockquote class="mt-4 text-sm leading-relaxed text-lingua-text">
						&ldquo;{t('page.landing.testimonial.1.quote')}&rdquo;
					</blockquote>
					<div class="mt-6 border-t border-lingua-border pt-4">
						<p class="text-sm font-semibold text-lingua-text">
							{t('page.landing.testimonial.1.name')}
						</p>
						<p class="text-xs text-lingua-subtle">
							{t('page.landing.testimonial.1.role')}
						</p>
					</div>
				</div>

				<div
					class="rounded-xl border border-lingua-border bg-white p-8 shadow-sm dark:bg-lingua-surface"
				>
					<div class="flex gap-0.5">
						<Star class="fill-lingua-primary text-lingua-primary" size={18} />
						<Star class="fill-lingua-primary text-lingua-primary" size={18} />
						<Star class="fill-lingua-primary text-lingua-primary" size={18} />
						<Star class="fill-lingua-primary text-lingua-primary" size={18} />
						<Star class="fill-lingua-primary text-lingua-primary" size={18} />
					</div>
					<blockquote class="mt-4 text-sm leading-relaxed text-lingua-text">
						&ldquo;{t('page.landing.testimonial.2.quote')}&rdquo;
					</blockquote>
					<div class="mt-6 border-t border-lingua-border pt-4">
						<p class="text-sm font-semibold text-lingua-text">
							{t('page.landing.testimonial.2.name')}
						</p>
						<p class="text-xs text-lingua-subtle">
							{t('page.landing.testimonial.2.role')}
						</p>
					</div>
				</div>

				<div
					class="rounded-xl border border-lingua-border bg-white p-8 shadow-sm dark:bg-lingua-surface"
				>
					<div class="flex gap-0.5">
						<Star class="fill-lingua-primary text-lingua-primary" size={18} />
						<Star class="fill-lingua-primary text-lingua-primary" size={18} />
						<Star class="fill-lingua-primary text-lingua-primary" size={18} />
						<Star class="fill-lingua-primary text-lingua-primary" size={18} />
						<Star class="fill-lingua-primary text-lingua-primary" size={18} />
					</div>
					<blockquote class="mt-4 text-sm leading-relaxed text-lingua-text">
						&ldquo;{t('page.landing.testimonial.3.quote')}&rdquo;
					</blockquote>
					<div class="mt-6 border-t border-lingua-border pt-4">
						<p class="text-sm font-semibold text-lingua-text">
							{t('page.landing.testimonial.3.name')}
						</p>
						<p class="text-xs text-lingua-subtle">
							{t('page.landing.testimonial.3.role')}
						</p>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- ─── Pricing ─── -->
	<section
		id="pricing"
		class="border-t border-lingua-border bg-lingua-muted/50 py-20 dark:bg-lingua-muted/10 sm:py-28"
	>
		<div class="app-container">
			<h2 class="text-center text-2xl font-bold text-lingua-text sm:text-3xl">
				{t('page.landing.pricing.title')}
			</h2>

			<div class="mt-14 grid gap-8 md:grid-cols-3">
				<div
					class="rounded-xl border border-lingua-border bg-white p-8 shadow-sm dark:bg-lingua-surface"
				>
					<h3 class="text-lg font-bold text-lingua-text">
						{t('page.landing.pricing.starter.name')}
					</h3>
					<div class="mt-4 flex items-baseline gap-1">
						<span class="text-4xl font-extrabold text-lingua-text">Free</span>
					</div>
					<ul class="mt-6 space-y-3">
						{#each t('page.landing.pricing.starter.features').split(' + ') as feature (feature)}
							<li class="flex items-start gap-2 text-sm text-lingua-subtle">
								<Check size={16} class="mt-0.5 shrink-0 text-lingua-success" />
								{feature}
							</li>
						{/each}
					</ul>
					<a
						href={resolve('/register/restaurant')}
						class="mt-8 block rounded-lg border border-lingua-border px-5 py-3 text-center text-sm font-semibold text-lingua-text transition-colors hover:bg-lingua-muted"
					>
						{t('page.landing.pricing.cta')}
					</a>
				</div>

				<div
					class="relative rounded-xl border-2 border-lingua-primary bg-white p-8 shadow-lg dark:bg-lingua-surface"
				>
					<div
						class="-top-3 left-1/2 absolute -translate-x-1/2 rounded-full bg-lingua-primary px-4 py-1 text-xs font-bold text-white"
					>
						Popular
					</div>
					<h3 class="text-lg font-bold text-lingua-text">
						{t('page.landing.pricing.pro.name')}
					</h3>
					<div class="mt-4 flex items-baseline gap-1">
						<span class="text-4xl font-extrabold text-lingua-text">$49</span>
						<span class="text-sm text-lingua-subtle">/mo</span>
					</div>
					<ul class="mt-6 space-y-3">
						{#each t('page.landing.pricing.pro.features').split(' + ') as feature (feature)}
							<li class="flex items-start gap-2 text-sm text-lingua-subtle">
								<Check size={16} class="mt-0.5 shrink-0 text-lingua-success" />
								{feature}
							</li>
						{/each}
					</ul>
					<a
						href={resolve('/register/restaurant')}
						class="mt-8 block rounded-lg bg-lingua-primary px-5 py-3 text-center text-sm font-bold text-white shadow-sm transition-all hover:bg-lingua-primary-strong hover:shadow-md"
					>
						{t('page.landing.pricing.cta')}
					</a>
				</div>

				<div
					class="rounded-xl border border-lingua-border bg-white p-8 shadow-sm dark:bg-lingua-surface"
				>
					<h3 class="text-lg font-bold text-lingua-text">
						{t('page.landing.pricing.enterprise.name')}
					</h3>
					<div class="mt-4 flex items-baseline gap-1">
						<span class="text-4xl font-extrabold text-lingua-text">Custom</span>
					</div>
					<ul class="mt-6 space-y-3">
						{#each t('page.landing.pricing.enterprise.features').split(' + ') as feature (feature)}
							<li class="flex items-start gap-2 text-sm text-lingua-subtle">
								<Check size={16} class="mt-0.5 shrink-0 text-lingua-success" />
								{feature}
							</li>
						{/each}
					</ul>
					<a
						href={resolve('/register/restaurant')}
						class="mt-8 block rounded-lg border border-lingua-border px-5 py-3 text-center text-sm font-semibold text-lingua-text transition-colors hover:bg-lingua-muted"
					>
						{t('page.landing.pricing.cta')}
					</a>
				</div>
			</div>
		</div>
	</section>

	<!-- ─── Final CTA ─── -->
	<section class="border-t border-lingua-border bg-white py-20 dark:bg-lingua-bg sm:py-28">
		<div class="app-container text-center">
			<h2 class="text-2xl font-bold text-lingua-text sm:text-3xl">
				{t('page.landing.final.heading')}
			</h2>
			<div class="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
				<a
					href={resolve('/register/restaurant')}
					class="inline-flex items-center gap-2 rounded-lg bg-lingua-primary px-7 py-3.5 text-base font-bold text-white shadow-lg transition-all hover:bg-lingua-primary-strong hover:shadow-xl"
				>
					{t('page.landing.final.cta')}
					<ArrowRight size={18} />
				</a>
				<a
					href="mailto:pilot@lingua.app"
					class="inline-flex items-center gap-2 rounded-lg border border-lingua-border bg-white px-7 py-3.5 text-base font-semibold text-lingua-text transition-colors hover:bg-lingua-muted dark:bg-lingua-surface dark:hover:bg-lingua-muted"
				>
					{t('page.landing.final.secondary')}
				</a>
			</div>
		</div>
	</section>
</main>

<Footer />
