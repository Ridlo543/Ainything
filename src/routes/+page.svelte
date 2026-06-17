<script lang="ts">
	import {
		ArrowRight,
		BarChart3,
		Building2,
		CheckCircle2,
		Globe,
		Languages,
		MessageCircle,
		QrCode,
		Scan,
		Shield,
		Smartphone,
		Upload,
		Users
	} from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { t } from '$lib/i18n';
</script>

<svelte:head>
	<title>LinguaServe - QR Menu Assistant for Tourist-Heavy Restaurants</title>
	<meta
		name="description"
		content="Multilingual QR menu assistant for restaurants serving international guests. Reduce misorders, answer dietary questions instantly, and let AI handle repetitive queries."
	/>
</svelte:head>

<main class="min-h-screen">
	<!-- Section 1: Hero - Professional B2B layout -->
	<section
		class="relative overflow-hidden bg-gradient-to-b from-lingua-primary-soft/50 via-white to-white"
	>
		<div class="relative app-container pt-20 pb-16 sm:pt-28 sm:pb-24">
			<div class="grid gap-16 lg:grid-cols-2 lg:items-center">
				<div>
					<!-- Badge -->
					<div
						class="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-lingua-primary shadow-md ring-1 ring-black/5"
					>
						<QrCode size={16} />
						<span>{t('page.landing.hero.tagline')}</span>
					</div>

					<!-- Headline -->
					<h1
						class="mt-8 max-w-xl text-4xl font-extrabold tracking-tight text-lingua-text sm:text-5xl lg:text-6xl"
					>
						{t('page.landing.hero.heading')}
					</h1>

					<!-- Description -->
					<p class="mt-6 max-w-lg text-lg leading-relaxed text-lingua-subtle">
						{t('page.landing.hero.description')}
					</p>

					<!-- CTAs -->
					<div class="mt-10 flex flex-wrap gap-4">
						<a
							href={resolve('/login')}
							class="group inline-flex items-center justify-center gap-2 rounded-xl bg-lingua-primary px-8 py-4 text-base font-bold text-white shadow-lg shadow-lingua-primary/25 transition-all hover:-translate-y-0.5 hover:bg-lingua-primary-strong hover:shadow-xl"
						>
							<span>{t('page.landing.hero.cta.primary')}</span>
							<ArrowRight size={18} class="transition-transform group-hover:translate-x-1" />
						</a>
						<a
							href={resolve('/demo')}
							class="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-lingua-border bg-white px-8 py-4 text-base font-bold text-lingua-text transition-all hover:-translate-y-0.5 hover:border-lingua-primary hover:text-lingua-primary"
						>
							{t('page.landing.hero.cta.secondary')}
						</a>
					</div>

					<!-- Trust indicators -->
					<div
						class="mt-10 flex flex-wrap items-center gap-6 text-sm font-medium text-lingua-subtle"
					>
						<div class="flex items-center gap-2">
							<div
								class="flex h-6 w-6 items-center justify-center rounded-full bg-lingua-success-soft text-lingua-success"
							>
								<CheckCircle2 size={14} />
							</div>
							<span>No credit card required</span>
						</div>
						<div class="flex items-center gap-2">
							<div
								class="flex h-6 w-6 items-center justify-center rounded-full bg-lingua-success-soft text-lingua-success"
							>
								<CheckCircle2 size={14} />
							</div>
							<span>Setup in 15 minutes</span>
						</div>
						<div class="flex items-center gap-2">
							<div
								class="flex h-6 w-6 items-center justify-center rounded-full bg-lingua-success-soft text-lingua-success"
							>
								<CheckCircle2 size={14} />
							</div>
							<span>Works on any phone</span>
						</div>
					</div>
				</div>

				<!-- Hero right - Restaurant showcase -->
				<div class="relative lg:pl-8">
					<div class="grid grid-cols-2 gap-4">
						<div class="space-y-4">
							<div class="group overflow-hidden rounded-2xl shadow-xl ring-1 ring-black/10">
								<img
									src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=750&fit=crop&q=80"
									alt="Modern restaurant interior with warm lighting"
									class="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-105"
									loading="eager"
								/>
							</div>
							<div class="group overflow-hidden rounded-2xl shadow-lg ring-1 ring-black/10">
								<img
									src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&h=600&fit=crop&q=80"
									alt="Cafe with modern design"
									class="aspect-square w-full object-cover transition-transform duration-700 group-hover:scale-105"
									loading="lazy"
								/>
							</div>
						</div>
						<div class="space-y-4 pt-12">
							<div class="group overflow-hidden rounded-2xl shadow-lg ring-1 ring-black/10">
								<img
									src="https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=600&h=600&fit=crop&q=80"
									alt="Tropical restaurant outdoor seating"
									class="aspect-square w-full object-cover transition-transform duration-700 group-hover:scale-105"
									loading="lazy"
								/>
							</div>
							<div class="group overflow-hidden rounded-2xl shadow-xl ring-1 ring-black/10">
								<img
									src="https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600&h=750&fit=crop&q=80"
									alt="Elegant dining area"
									class="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-105"
									loading="lazy"
								/>
							</div>
						</div>
					</div>

					<!-- Floating stats card -->
					<div
						class="absolute -bottom-4 -left-4 rounded-xl bg-white p-4 shadow-xl ring-1 ring-black/5 sm:-bottom-6 sm:-left-6"
					>
						<div class="flex items-center gap-3">
							<div
								class="flex h-10 w-10 items-center justify-center rounded-lg bg-lingua-primary-soft text-lingua-primary"
							>
								<Globe size={20} />
							</div>
							<div>
								<p class="text-xs font-medium text-lingua-subtle">Languages supported</p>
								<p class="text-xl font-bold text-lingua-text">10+</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Section 2: Value Proposition - Professional cards -->
	<section class="py-24 sm:py-32">
		<div class="app-container">
			<div class="mx-auto max-w-3xl text-center">
				<div
					class="inline-flex items-center gap-2 rounded-full bg-lingua-primary-soft px-5 py-2.5 text-sm font-semibold text-lingua-primary"
				>
					<CheckCircle2 size={16} />
					<span>Trusted by 100+ restaurants</span>
				</div>
				<h2 class="mt-8 text-3xl font-extrabold text-lingua-text sm:text-4xl lg:text-5xl">
					{t('page.landing.value.title')}
				</h2>
				<p class="mt-6 text-lg leading-relaxed text-lingua-subtle">
					Everything you need to serve international guests better, from multilingual menus to
					AI-powered assistance.
				</p>
			</div>

			<div class="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
				<!-- Card 1: Multilingual -->
				<div
					class="group rounded-2xl border border-lingua-border bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
				>
					<div
						class="inline-flex rounded-xl bg-gradient-to-br from-lingua-primary to-lingua-primary-strong p-4 text-white shadow-lg"
					>
						<Languages size={28} />
					</div>
					<h3 class="mt-6 text-xl font-bold text-lingua-text">
						{t('page.landing.value.multilingual.title')}
					</h3>
					<p class="mt-4 text-base leading-relaxed text-lingua-subtle">
						{t('page.landing.value.multilingual.description')}
					</p>
					<div class="mt-6 flex flex-wrap gap-2">
						<span
							class="rounded-lg bg-lingua-primary-soft px-3 py-1.5 text-sm font-semibold text-lingua-primary"
							>English</span
						>
						<span
							class="rounded-lg bg-lingua-primary-soft px-3 py-1.5 text-sm font-semibold text-lingua-primary"
							>中文</span
						>
						<span
							class="rounded-lg bg-lingua-primary-soft px-3 py-1.5 text-sm font-semibold text-lingua-primary"
							>한국어</span
						>
						<span
							class="rounded-lg bg-lingua-primary-soft px-3 py-1.5 text-sm font-semibold text-lingua-primary"
							>+7 more</span
						>
					</div>
				</div>

				<!-- Card 2: AI Assistant -->
				<div
					class="group rounded-2xl border border-lingua-border bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
				>
					<div
						class="inline-flex rounded-xl bg-gradient-to-br from-lingua-accent to-orange-600 p-4 text-white shadow-lg"
					>
						<MessageCircle size={28} />
					</div>
					<h3 class="mt-6 text-xl font-bold text-lingua-text">
						{t('page.landing.value.ai.title')}
					</h3>
					<p class="mt-4 text-base leading-relaxed text-lingua-subtle">
						{t('page.landing.value.ai.description')}
					</p>
					<div class="mt-6 space-y-3">
						<div class="flex items-center gap-3 rounded-lg bg-lingua-muted px-4 py-2.5">
							<CheckCircle2 size={18} class="text-lingua-success" />
							<span class="text-sm font-medium text-lingua-text">Ingredient questions</span>
						</div>
						<div class="flex items-center gap-3 rounded-lg bg-lingua-muted px-4 py-2.5">
							<CheckCircle2 size={18} class="text-lingua-success" />
							<span class="text-sm font-medium text-lingua-text">Allergen information</span>
						</div>
						<div class="flex items-center gap-3 rounded-lg bg-lingua-muted px-4 py-2.5">
							<CheckCircle2 size={18} class="text-lingua-success" />
							<span class="text-sm font-medium text-lingua-text">Halal status</span>
						</div>
					</div>
				</div>

				<!-- Card 3: Staff Efficiency -->
				<div
					class="group rounded-2xl border border-lingua-border bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
				>
					<div
						class="inline-flex rounded-xl bg-gradient-to-br from-lingua-info to-blue-600 p-4 text-white shadow-lg"
					>
						<Users size={28} />
					</div>
					<h3 class="mt-6 text-xl font-bold text-lingua-text">
						{t('page.landing.value.staff.title')}
					</h3>
					<p class="mt-4 text-base leading-relaxed text-lingua-subtle">
						{t('page.landing.value.staff.description')}
					</p>
					<div class="mt-6 rounded-xl border border-lingua-border bg-lingua-muted p-4">
						<div class="flex items-center gap-3">
							<div
								class="flex h-10 w-10 items-center justify-center rounded-full bg-lingua-primary text-white"
							>
								<QrCode size={18} />
							</div>
							<div class="flex-1">
								<p class="text-xs text-lingua-subtle">Table T07</p>
								<p class="text-sm font-semibold text-lingua-text">Needs assistance</p>
							</div>
							<div class="h-2.5 w-2.5 rounded-full bg-lingua-success animate-pulse" />
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Section 3: How It Works - Better visual flow -->
	<section class="bg-lingua-muted py-24 sm:py-32">
		<div class="app-container">
			<div class="mx-auto max-w-3xl text-center">
				<div
					class="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-lingua-primary shadow-sm"
				>
					<Scan size={16} />
					<span>Simple setup</span>
				</div>
				<h2 class="mt-8 text-3xl font-extrabold text-lingua-text sm:text-4xl lg:text-5xl">
					{t('page.landing.how.title')}
				</h2>
			</div>

			<div class="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
				<!-- Step 1 -->
				<div class="relative">
					<div class="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5">
						<div class="mb-6 inline-flex rounded-xl bg-lingua-primary p-3 text-white shadow-lg">
							<Upload size={24} />
						</div>
						<div
							class="mb-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-lingua-primary text-sm font-bold text-white"
						>
							1
						</div>
						<h3 class="text-lg font-bold text-lingua-text">
							{t('page.landing.how.step1.title')}
						</h3>
						<p class="mt-3 text-sm leading-relaxed text-lingua-subtle">
							{t('page.landing.how.step1.description')}
						</p>
					</div>
				</div>

				<!-- Step 2 -->
				<div class="relative">
					<div class="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5">
						<div class="mb-6 inline-flex rounded-xl bg-lingua-primary p-3 text-white shadow-lg">
							<Languages size={24} />
						</div>
						<div
							class="mb-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-lingua-primary text-sm font-bold text-white"
						>
							2
						</div>
						<h3 class="text-lg font-bold text-lingua-text">
							{t('page.landing.how.step2.title')}
						</h3>
						<p class="mt-3 text-sm leading-relaxed text-lingua-subtle">
							{t('page.landing.how.step2.description')}
						</p>
					</div>
				</div>

				<!-- Step 3 -->
				<div class="relative">
					<div class="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5">
						<div class="mb-6 inline-flex rounded-xl bg-lingua-primary p-3 text-white shadow-lg">
							<QrCode size={24} />
						</div>
						<div
							class="mb-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-lingua-primary text-sm font-bold text-white"
						>
							3
						</div>
						<h3 class="text-lg font-bold text-lingua-text">
							{t('page.landing.how.step3.title')}
						</h3>
						<p class="mt-3 text-sm leading-relaxed text-lingua-subtle">
							{t('page.landing.how.step3.description')}
						</p>
					</div>
				</div>

				<!-- Step 4 -->
				<div class="relative">
					<div class="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5">
						<div class="mb-6 inline-flex rounded-xl bg-lingua-primary p-3 text-white shadow-lg">
							<Scan size={24} />
						</div>
						<div
							class="mb-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-lingua-primary text-sm font-bold text-white"
						>
							4
						</div>
						<h3 class="text-lg font-bold text-lingua-text">
							{t('page.landing.how.step4.title')}
						</h3>
						<p class="mt-3 text-sm leading-relaxed text-lingua-subtle">
							{t('page.landing.how.step4.description')}
						</p>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Section 4: Platform Features - Larger, better layout -->
	<section class="py-24 sm:py-32">
		<div class="app-container">
			<div class="mx-auto max-w-3xl text-center">
				<div
					class="inline-flex items-center gap-2 rounded-full bg-lingua-primary-soft px-5 py-2.5 text-sm font-semibold text-lingua-primary"
				>
					<Building2 size={16} />
					<span>Everything you need</span>
				</div>
				<h2 class="mt-8 text-3xl font-extrabold text-lingua-text sm:text-4xl lg:text-5xl">
					{t('page.landing.features.title')}
				</h2>
			</div>

			<div class="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				<div
					class="group rounded-2xl border border-lingua-border bg-white p-8 transition-all hover:-translate-y-1 hover:shadow-xl"
				>
					<div
						class="mb-4 inline-flex rounded-xl bg-lingua-primary-soft p-4 text-lingua-primary transition-colors group-hover:bg-lingua-primary group-hover:text-white"
					>
						<Building2 size={24} />
					</div>
					<h3 class="text-lg font-bold text-lingua-text">
						{t('page.landing.features.multiRestaurant')}
					</h3>
					<p class="mt-3 text-base leading-relaxed text-lingua-subtle">
						{t('page.landing.features.multiRestaurant.desc')}
					</p>
				</div>

				<div
					class="group rounded-2xl border border-lingua-border bg-white p-8 transition-all hover:-translate-y-1 hover:shadow-xl"
				>
					<div
						class="mb-4 inline-flex rounded-xl bg-lingua-danger-soft p-4 text-lingua-danger transition-colors group-hover:bg-lingua-danger group-hover:text-white"
					>
						<Shield size={24} />
					</div>
					<h3 class="text-lg font-bold text-lingua-text">
						{t('page.landing.features.dietary')}
					</h3>
					<p class="mt-3 text-base leading-relaxed text-lingua-subtle">
						{t('page.landing.features.dietary.desc')}
					</p>
				</div>

				<div
					class="group rounded-2xl border border-lingua-border bg-white p-8 transition-all hover:-translate-y-1 hover:shadow-xl"
				>
					<div
						class="mb-4 inline-flex rounded-xl bg-lingua-info-soft p-4 text-lingua-info transition-colors group-hover:bg-lingua-info group-hover:text-white"
					>
						<BarChart3 size={24} />
					</div>
					<h3 class="text-lg font-bold text-lingua-text">
						{t('page.landing.features.analytics')}
					</h3>
					<p class="mt-3 text-base leading-relaxed text-lingua-subtle">
						{t('page.landing.features.analytics.desc')}
					</p>
				</div>

				<div
					class="group rounded-2xl border border-lingua-border bg-white p-8 transition-all hover:-translate-y-1 hover:shadow-xl"
				>
					<div
						class="mb-4 inline-flex rounded-xl bg-amber-100 p-4 text-lingua-warning transition-colors group-hover:bg-lingua-warning group-hover:text-white"
					>
						<Users size={24} />
					</div>
					<h3 class="text-lg font-bold text-lingua-text">
						{t('page.landing.features.workflow')}
					</h3>
					<p class="mt-3 text-base leading-relaxed text-lingua-subtle">
						{t('page.landing.features.workflow.desc')}
					</p>
				</div>

				<div
					class="group rounded-2xl border border-lingua-border bg-white p-8 transition-all hover:-translate-y-1 hover:shadow-xl"
				>
					<div
						class="mb-4 inline-flex rounded-xl bg-lingua-success-soft p-4 text-lingua-success transition-colors group-hover:bg-lingua-success group-hover:text-white"
					>
						<Globe size={24} />
					</div>
					<h3 class="text-lg font-bold text-lingua-text">
						{t('page.landing.features.knowledge')}
					</h3>
					<p class="mt-3 text-base leading-relaxed text-lingua-subtle">
						{t('page.landing.features.knowledge.desc')}
					</p>
				</div>

				<div
					class="group rounded-2xl border border-lingua-border bg-white p-8 transition-all hover:-translate-y-1 hover:shadow-xl"
				>
					<div
						class="mb-4 inline-flex rounded-xl bg-lingua-accent-soft p-4 text-lingua-accent transition-colors group-hover:bg-lingua-accent group-hover:text-white"
					>
						<Smartphone size={24} />
					</div>
					<h3 class="text-lg font-bold text-lingua-text">
						{t('page.landing.features.pwa')}
					</h3>
					<p class="mt-3 text-base leading-relaxed text-lingua-subtle">
						{t('page.landing.features.pwa.desc')}
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Section 5: Social Proof - Better image grid -->
	<section class="bg-lingua-muted py-24 sm:py-32">
		<div class="app-container">
			<div class="mx-auto max-w-3xl text-center">
				<div
					class="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-lingua-primary shadow-sm"
				>
					<Globe size={16} />
					<span>Trusted by leading restaurants</span>
				</div>
				<h2 class="mt-8 text-3xl font-extrabold text-lingua-text sm:text-4xl lg:text-5xl">
					{t('page.landing.social.title')}
				</h2>
			</div>

			<!-- Restaurant grid -->
			<div class="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
				<div
					class="group overflow-hidden rounded-2xl shadow-lg ring-1 ring-black/5 transition-all hover:-translate-y-2 hover:shadow-xl"
				>
					<img
						src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=500&fit=crop&q=80"
						alt="Restaurant interior"
						class="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-105"
						loading="lazy"
					/>
				</div>
				<div
					class="group overflow-hidden rounded-2xl shadow-lg ring-1 ring-black/5 transition-all hover:-translate-y-2 hover:shadow-xl"
				>
					<img
						src="https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400&h=500&fit=crop&q=80"
						alt="Dining area"
						class="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-105"
						loading="lazy"
					/>
				</div>
				<div
					class="group overflow-hidden rounded-2xl shadow-lg ring-1 ring-black/5 transition-all hover:-translate-y-2 hover:shadow-xl"
				>
					<img
						src="https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=400&h=500&fit=crop&q=80"
						alt="Tropical dining"
						class="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-105"
						loading="lazy"
					/>
				</div>
				<div
					class="group overflow-hidden rounded-2xl shadow-lg ring-1 ring-black/5 transition-all hover:-translate-y-2 hover:shadow-xl"
				>
					<img
						src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=500&fit=crop&q=80"
						alt="Cafe interior"
						class="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-105"
						loading="lazy"
					/>
				</div>
				<div
					class="group overflow-hidden rounded-2xl shadow-lg ring-1 ring-black/5 transition-all hover:-translate-y-2 hover:shadow-xl"
				>
					<img
						src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=500&fit=crop&q=80"
						alt="Restaurant ambiance"
						class="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-105"
						loading="lazy"
					/>
				</div>
			</div>

			<div class="mt-12 text-center">
				<a
					href={resolve('/demo')}
					class="group inline-flex items-center gap-2 text-base font-bold text-lingua-primary transition-all hover:gap-3 hover:text-lingua-primary-strong"
				>
					<span>{t('page.landing.social.cta')}</span>
					<ArrowRight size={18} class="transition-transform group-hover:translate-x-1" />
				</a>
			</div>
		</div>
	</section>

	<!-- Section 6: Pricing - Professional cards with prices -->
	<section class="py-24 sm:py-32">
		<div class="app-container">
			<div class="mx-auto max-w-3xl text-center">
				<div
					class="inline-flex items-center gap-2 rounded-full bg-lingua-primary-soft px-5 py-2.5 text-sm font-semibold text-lingua-primary"
				>
					<BarChart3 size={16} />
					<span>Transparent pricing</span>
				</div>
				<h2 class="mt-8 text-3xl font-extrabold text-lingua-text sm:text-4xl lg:text-5xl">
					{t('page.landing.pricing.title')}
				</h2>
			</div>

			<div class="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
				<!-- Starter -->
				<div
					class="rounded-2xl border border-lingua-border bg-white p-8 shadow-sm transition-all hover:shadow-xl"
				>
					<h3 class="text-xl font-bold text-lingua-text">
						{t('page.landing.pricing.starter.name')}
					</h3>
					<div class="mt-4">
						<span class="text-4xl font-extrabold text-lingua-text">$49</span>
						<span class="text-base text-lingua-subtle">/month</span>
					</div>
					<p class="mt-4 text-sm text-lingua-subtle">
						{t('page.landing.pricing.starter.features')}
					</p>
					<div class="mt-8 space-y-3">
						<div class="flex items-center gap-3 text-sm text-lingua-text">
							<CheckCircle2 size={18} class="text-lingua-success" />
							<span>Multilingual menu</span>
						</div>
						<div class="flex items-center gap-3 text-sm text-lingua-text">
							<CheckCircle2 size={18} class="text-lingua-success" />
							<span>QR codes per table</span>
						</div>
						<div class="flex items-center gap-3 text-sm text-lingua-text">
							<CheckCircle2 size={18} class="text-lingua-success" />
							<span>Basic analytics</span>
						</div>
					</div>
					<a
						href={resolve('/login')}
						class="mt-8 inline-flex w-full items-center justify-center rounded-xl border-2 border-lingua-border bg-white px-6 py-3.5 text-base font-bold text-lingua-text transition-all hover:-translate-y-0.5 hover:border-lingua-primary hover:text-lingua-primary"
					>
						Get Started
					</a>
				</div>

				<!-- Pro (Highlighted) -->
				<div
					class="relative rounded-2xl border-2 border-lingua-primary bg-white p-8 shadow-xl transition-all hover:shadow-2xl"
				>
					<div
						class="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-lingua-primary px-4 py-1.5 text-sm font-bold text-white shadow-lg"
					>
						Most Popular
					</div>
					<h3 class="text-xl font-bold text-lingua-text">
						{t('page.landing.pricing.pro.name')}
					</h3>
					<div class="mt-4">
						<span class="text-4xl font-extrabold text-lingua-text">$99</span>
						<span class="text-base text-lingua-subtle">/month</span>
					</div>
					<p class="mt-4 text-sm text-lingua-subtle">
						{t('page.landing.pricing.pro.features')}
					</p>
					<div class="mt-8 space-y-3">
						<div class="flex items-center gap-3 text-sm text-lingua-text">
							<CheckCircle2 size={18} class="text-lingua-success" />
							<span>Everything in Starter</span>
						</div>
						<div class="flex items-center gap-3 text-sm text-lingua-text">
							<CheckCircle2 size={18} class="text-lingua-success" />
							<span>AI chat assistant</span>
						</div>
						<div class="flex items-center gap-3 text-sm text-lingua-text">
							<CheckCircle2 size={18} class="text-lingua-success" />
							<span>Staff inbox & workflow</span>
						</div>
						<div class="flex items-center gap-3 text-sm text-lingua-text">
							<CheckCircle2 size={18} class="text-lingua-success" />
							<span>Advanced analytics</span>
						</div>
					</div>
					<a
						href={resolve('/login')}
						class="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-lingua-primary px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-lingua-primary/25 transition-all hover:-translate-y-0.5 hover:bg-lingua-primary-strong hover:shadow-xl"
					>
						Get Started
					</a>
				</div>

				<!-- Enterprise -->
				<div
					class="rounded-2xl border border-lingua-border bg-white p-8 shadow-sm transition-all hover:shadow-xl"
				>
					<h3 class="text-xl font-bold text-lingua-text">
						{t('page.landing.pricing.enterprise.name')}
					</h3>
					<div class="mt-4">
						<span class="text-4xl font-extrabold text-lingua-text">Custom</span>
					</div>
					<p class="mt-4 text-sm text-lingua-subtle">
						{t('page.landing.pricing.enterprise.features')}
					</p>
					<div class="mt-8 space-y-3">
						<div class="flex items-center gap-3 text-sm text-lingua-text">
							<CheckCircle2 size={18} class="text-lingua-success" />
							<span>Everything in Pro</span>
						</div>
						<div class="flex items-center gap-3 text-sm text-lingua-text">
							<CheckCircle2 size={18} class="text-lingua-success" />
							<span>Multi-branch support</span>
						</div>
						<div class="flex items-center gap-3 text-sm text-lingua-text">
							<CheckCircle2 size={18} class="text-lingua-success" />
							<span>Custom integrations</span>
						</div>
					</div>
					<a
						href="mailto:pilot@linguaserve.app"
						class="mt-8 inline-flex w-full items-center justify-center rounded-xl border-2 border-lingua-border bg-white px-6 py-3.5 text-base font-bold text-lingua-text transition-all hover:-translate-y-0.5 hover:border-lingua-primary hover:text-lingua-primary"
					>
						Contact Sales
					</a>
				</div>
			</div>
		</div>
	</section>

	<!-- Section 7: Final CTA - Impactful design -->
	<section
		class="relative overflow-hidden bg-gradient-to-br from-lingua-primary to-lingua-primary-strong py-24 sm:py-32"
	>
		<!-- Subtle pattern overlay -->
		<div class="pointer-events-none absolute inset-0 opacity-10">
			<div
				class="absolute inset-0"
				style="background-image: radial-gradient(circle at 2px 2px, white 1px, transparent 0); background-size: 40px 40px;"
			></div>
		</div>

		<div class="relative app-container">
			<div class="mx-auto max-w-3xl text-center">
				<h2 class="text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl">
					{t('page.landing.final.heading')}
				</h2>
				<p class="mt-6 text-lg leading-relaxed text-white/90">
					Join 100+ restaurants already serving international guests with confidence.
				</p>

				<div class="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
					<a
						href={resolve('/login')}
						class="group inline-flex items-center gap-2 rounded-xl bg-white px-10 py-4 text-base font-bold text-lingua-primary shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl"
					>
						<span>{t('page.landing.final.cta')}</span>
						<ArrowRight size={18} class="transition-transform group-hover:translate-x-1" />
					</a>
					<a
						href="mailto:pilot@linguaserve.app"
						class="inline-flex items-center gap-2 rounded-xl border-2 border-white/50 px-10 py-4 text-base font-bold text-white transition-all hover:-translate-y-1 hover:border-white hover:bg-white/10"
					>
						{t('page.landing.final.secondary')}
					</a>
				</div>
			</div>
		</div>
	</section>
</main>
