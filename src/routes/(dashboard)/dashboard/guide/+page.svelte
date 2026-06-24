<script lang="ts">
	import type { PageData } from './$types';
	import {
		CheckCircle,
		QrCode,
		MessageSquare,
		Users,
		BookOpen,
		Smartphone,
		AlertTriangle,
		ChevronRight
	} from '@lucide/svelte';

	let { data }: { data: PageData } = $props();
	const restaurant = $derived(data.tenant.activeRestaurant);
</script>

<svelte:head>
	<title>Staff Quick Guide · Lingua</title>
</svelte:head>

<section class="mx-auto max-w-3xl grid gap-8 pb-12">

	<!-- Header -->
	<div>
		<p class="text-sm font-semibold text-lingua-primary uppercase tracking-wide">Quick Guide</p>
		<h1 class="mt-2 text-3xl font-semibold">Staff Guide — {restaurant.name}</h1>
		<p class="mt-2 text-lingua-subtle">
			Everything your front-of-house team needs to know about Lingua in one page.
			Print this or bookmark it on a staff device.
		</p>
		<button
			type="button"
			onclick={() => window.print()}
			class="no-print mt-4 inline-flex items-center gap-2 rounded-lg border border-lingua-border px-4 py-2 text-sm font-semibold hover:bg-lingua-primary-soft"
		>
			Print this guide
		</button>
	</div>

	<!-- Section 1: What is Lingua? -->
	<div class="surface rounded-lg p-6">
		<div class="flex items-center gap-2 mb-4">
			<Smartphone size={20} class="text-lingua-primary" />
			<h2 class="text-lg font-semibold">What is Lingua?</h2>
		</div>
		<p class="text-lingua-subtle mb-3">
			Lingua is a QR-based AI menu assistant. Guests scan the QR code on their table to:
		</p>
		<ul class="grid gap-2 text-sm">
			{#each [
				'Browse the full menu in their preferred language',
				'Ask questions about dishes, allergens, and dietary needs',
				'Request help from staff when they need a real person'
			] as item}
				<li class="flex items-start gap-2">
					<CheckCircle size={16} class="mt-0.5 shrink-0 text-emerald-500" />
					<span>{item}</span>
				</li>
			{/each}
		</ul>
		<p class="mt-3 text-sm text-lingua-subtle">
			<strong>No app download or login required</strong> for guests.
			The QR code opens directly in their browser.
		</p>
	</div>

	<!-- Section 2: QR Codes -->
	<div class="surface rounded-lg p-6">
		<div class="flex items-center gap-2 mb-4">
			<QrCode size={20} class="text-lingua-primary" />
			<h2 class="text-lg font-semibold">QR Codes &amp; Tables</h2>
		</div>
		<ul class="grid gap-3 text-sm">
			<li class="flex items-start gap-2">
				<ChevronRight size={16} class="mt-0.5 shrink-0 text-lingua-primary" />
				<span>Each table has its own unique QR code. The code identifies the table to staff when a guest asks for help.</span>
			</li>
			<li class="flex items-start gap-2">
				<ChevronRight size={16} class="mt-0.5 shrink-0 text-lingua-primary" />
				<span>Print QR cards from <a href="/dashboard/tables" class="text-lingua-primary underline">QR Tables</a>. Use the <em>Print all</em> button for a print-ready layout.</span>
			</li>
			<li class="flex items-start gap-2">
				<ChevronRight size={16} class="mt-0.5 shrink-0 text-lingua-primary" />
				<span>If a QR code is damaged or lost, reprint from the same page — the URL is permanent.</span>
			</li>
		</ul>
	</div>

	<!-- Section 3: Staff Inbox -->
	<div class="surface rounded-lg p-6">
		<div class="flex items-center gap-2 mb-4">
			<MessageSquare size={20} class="text-lingua-primary" />
			<h2 class="text-lg font-semibold">Staff Inbox</h2>
		</div>
		<p class="text-sm text-lingua-subtle mb-3">
			When a guest taps <strong>“Speak to staff”</strong> or the AI can’t answer confidently, a help request appears in the <a href="/staff/inbox" class="text-lingua-primary underline">Staff Inbox</a>.
		</p>
		<div class="grid gap-3">
			{#each [
				{ step: '1', title: 'Claim the request', desc: 'Tap “Mark in progress” so other staff know you are handling it.' },
				{ step: '2', title: 'Read the summary', desc: 'The AI provides a summary of what the guest asked and their language + preferences.' },
				{ step: '3', title: 'Approach the table', desc: 'Note the table code in the request. Walk over and help the guest.' },
				{ step: '4', title: 'Resolve', desc: 'Tap “Resolve request” when done. The request disappears from the live queue.' }
			] as item}
				<div class="flex items-start gap-3 rounded-lg border border-lingua-border bg-lingua-surface p-3">
					<span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lingua-primary text-xs font-bold text-white">{item.step}</span>
					<div>
						<p class="text-sm font-semibold">{item.title}</p>
						<p class="text-sm text-lingua-subtle">{item.desc}</p>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Section 4: Menu Management -->
	<div class="surface rounded-lg p-6">
		<div class="flex items-center gap-2 mb-4">
			<BookOpen size={20} class="text-lingua-primary" />
			<h2 class="text-lg font-semibold">Keeping the Menu Accurate</h2>
		</div>
		<ul class="grid gap-3 text-sm">
			<li class="flex items-start gap-2">
				<ChevronRight size={16} class="mt-0.5 shrink-0 text-lingua-primary" />
				<span>The AI only uses menu data approved by your admin. It will not guess or invent dishes.</span>
			</li>
			<li class="flex items-start gap-2">
				<ChevronRight size={16} class="mt-0.5 shrink-0 text-lingua-primary" />
				<span>If a dish is no longer available, mark it <em>unavailable</em> in <a href="/dashboard/menu" class="text-lingua-primary underline">Menu data</a> so guests aren’t told it’s on the menu.</span>
			</li>
			<li class="flex items-start gap-2">
				<ChevronRight size={16} class="mt-0.5 shrink-0 text-lingua-primary" />
				<span>Items marked <em>staff-confirm</em> will prompt the AI to recommend guests ask staff directly, e.g. for daily specials or custom pricing.</span>
			</li>
			<li class="flex items-start gap-2">
				<ChevronRight size={16} class="mt-0.5 shrink-0 text-lingua-primary" />
				<span>After editing, admin must re-publish the menu for changes to be visible to guests.</span>
			</li>
		</ul>
	</div>

	<!-- Section 5: Common Questions -->
	<div class="surface rounded-lg p-6">
		<div class="flex items-center gap-2 mb-4">
			<Users size={20} class="text-lingua-primary" />
			<h2 class="text-lg font-semibold">Common Guest Questions</h2>
		</div>
		<div class="grid gap-3 text-sm">
			{#each [
				{ q: 'The QR code doesn’t work', a: 'Ask the guest to try a different browser or scan again. If the issue persists, share the URL directly: ask an admin to copy the link from the QR Tables page.' },
				{ q: 'The menu is in the wrong language', a: 'Guests can change language on the first screen. The AI will respond in the guest’s chosen language.' },
				{ q: 'The AI gave wrong information', a: 'Log this via the feedback button in the guest view or tell admin so the menu data can be corrected and republished.' },
				{ q: 'A guest wants to pay / order via the app', a: 'Lingua is a menu assistant only — payments and orders are not supported. Guide the guest to staff as usual.' }
			] as faq}
				<div class="rounded-lg border border-lingua-border bg-lingua-surface p-3">
					<p class="font-semibold text-lingua-text">{faq.q}</p>
					<p class="mt-1 text-lingua-subtle">{faq.a}</p>
				</div>
			{/each}
		</div>
	</div>

	<!-- Section 6: What the AI will NOT do -->
	<div class="rounded-lg border border-lingua-warning/30 bg-lingua-warning-soft/20 p-6">
		<div class="flex items-center gap-2 mb-3">
			<AlertTriangle size={20} class="text-lingua-warning" />
			<h2 class="text-lg font-semibold text-lingua-warning">What the AI will NOT do</h2>
		</div>
		<ul class="grid gap-2 text-sm text-lingua-warning">
			{#each [
				'Take orders or accept payment',
				'Make reservations',
				'Discuss topics unrelated to your restaurant menu',
				'Invent dishes or prices not in the approved menu',
				'Share personal guest data with other guests'
			] as item}
				<li class="flex items-start gap-2">
					<span class="mt-0.5 shrink-0 text-lingua-warning">✕</span>
					<span>{item}</span>
				</li>
			{/each}
		</ul>
	</div>

	<!-- Footer contact -->
	<p class="text-center text-sm text-lingua-subtle">
		Questions about Lingua? Contact your admin or email
		<a href="mailto:support@lingua.ai" class="text-lingua-primary underline">support@lingua.ai</a>.
	</p>

</section>

<style>
	@media print {
		:global(.no-print) { display: none !important; }
		:global(nav), :global(aside) { display: none !important; }
		:global(main) { padding: 0 !important; }
		@page { size: A4; margin: 15mm; }
		section { font-size: 11pt; }
		h1 { font-size: 18pt; }
		h2 { font-size: 13pt; }
	}
</style>
