<script lang="ts">
	import { Globe, QrCode, MessageCircle } from '@lucide/svelte';
</script>

<main class="min-h-screen bg-white">
	<header class="border-b border-slate-200 bg-white">
		<div class="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
			<h1 class="text-xl font-bold text-slate-900">Lingua</h1>
			<div class="flex gap-4">
				<a href="/login" class="text-sm font-medium text-slate-700 hover:text-slate-900">Log in</a>
				<a href="/register/restaurant" class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">Get started</a>
			</div>
		</div>
	</header>

	<section class="mx-auto max-w-5xl px-6 py-20 text-center">
		<h2 class="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
			Speak every tourist's language.
		</h2>
		<p class="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
			Lingua gives your restaurant a QR-powered digital menu and AI guest assistant that instantly translates your offerings, ingredients, and cultural context for international visitors.
		</p>
		<div class="mt-10 flex justify-center gap-4">
			<a href="/register/restaurant" class="rounded-lg bg-indigo-600 px-6 py-3 text-base font-semibold text-white hover:bg-indigo-500">
				Create your restaurant
			</a>
			<a href="#how-it-works" class="rounded-lg border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 hover:bg-slate-50">
				How it works
			</a>
		</div>
	</section>

	<section id="how-it-works" class="border-t border-slate-200 bg-slate-50 py-20">
		<div class="mx-auto max-w-5xl px-6">
			<h3 class="text-center text-2xl font-bold text-slate-900">Simple for you. Magical for them.</h3>
			<div class="mt-12 grid gap-8 sm:grid-cols-3">
				<div class="rounded-lg bg-white p-6 shadow-sm">
					<QrCode class="h-8 w-8 text-indigo-600" />
					<h4 class="mt-4 text-lg font-semibold text-slate-900">1. Print your QR codes</h4>
					<p class="mt-2 text-sm text-slate-600">Generate table-specific QR codes from your dashboard and place them in your restaurant.</p>
				</div>
				<div class="rounded-lg bg-white p-6 shadow-sm">
					<Globe class="h-8 w-8 text-indigo-600" />
					<h4 class="mt-4 text-lg font-semibold text-slate-900">2. Tourists scan & browse</h4>
					<p class="mt-2 text-sm text-slate-600">Guests scan to see your menu in their language, with automatic translation of ingredients and cultural notes.</p>
				</div>
				<div class="rounded-lg bg-white p-6 shadow-sm">
					<MessageCircle class="h-8 w-8 text-indigo-600" />
					<h4 class="mt-4 text-lg font-semibold text-slate-900">3. AI answers, staff steps in</h4>
					<p class="mt-2 text-sm text-slate-600">Our AI safely answers questions about allergies and spice levels. If it's unsure, it alerts your staff instantly.</p>
				</div>
			</div>
		</div>
	</section>
</main>
