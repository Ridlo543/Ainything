<script lang="ts">
	import { BookOpen, QrCode, MessageSquare, Users, ShieldCheck, AlertTriangle, Printer } from '@lucide/svelte';
</script>

<svelte:head>
	<title>Platform Guide · Lingua Admin</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-8 print:px-0 print:py-0">
	<div class="mb-8 flex items-start justify-between">
		<div>
			<h1 class="text-2xl font-semibold text-gray-900 dark:text-white">Lingua Platform Guide</h1>
			<p class="mt-1 text-sm text-gray-500">Reference for super admins and pilot support staff.</p>
		</div>
		<button
			type="button"
			onclick={() => window.print()}
			class="hidden items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:flex print:hidden"
		>
			<Printer size={16} /> Print
		</button>
	</div>

	<!-- Section 1: Platform Overview -->
	<section class="mb-8">
		<div class="mb-3 flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
			<BookOpen size={18} />
			<h2 class="text-base font-semibold">1. Platform Overview</h2>
		</div>
		<div class="rounded-lg border border-gray-200 bg-white p-4 text-sm leading-6 text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
			<p>Lingua is a multi-tenant SaaS platform. Each <strong>organization</strong> owns one or more <strong>restaurants</strong>. Restaurant staff access the dashboard via <code class="rounded bg-gray-100 px-1 dark:bg-gray-800">/dashboard</code>; guests access the PWA via QR code at <code class="rounded bg-gray-100 px-1 dark:bg-gray-800">/r/[slug]/table/[code]</code>.</p>
			<ul class="mt-3 list-disc space-y-1 pl-5">
				<li><strong>Organizations</strong> — billing and auth boundary. Plan: <code>free</code>, <code>pro</code>, <code>pilot</code>.</li>
				<li><strong>Restaurants</strong> — each has a slug, timezone, menu, and QR tables.</li>
				<li><strong>Memberships</strong> — <code>org_owner</code>, <code>restaurant_admin</code>, <code>staff</code>.</li>
				<li><strong>Staff inbox</strong> — receives guest fallback requests when AI cannot answer.</li>
			</ul>
		</div>
	</section>

	<!-- Section 2: Onboarding a New Restaurant -->
	<section class="mb-8">
		<div class="mb-3 flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
			<Users size={18} />
			<h2 class="text-base font-semibold">2. Onboarding a New Restaurant</h2>
		</div>
		<ol class="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
			{#each [
				{ step: 'Owner registers at /register/restaurant and verifies email.' },
				{ step: 'After email verification, owner is redirected to /dashboard/onboarding.' },
				{ step: 'Onboarding wizard: Step 1 (profile already set), Step 2 (create tables), Step 3 (create draft menu), Step 4 (QR codes ready).' },
				{ step: 'Owner goes to /dashboard/import to upload a menu photo, PDF, or spreadsheet.' },
				{ step: 'After AI extraction, owner reviews and publishes the menu from /dashboard/menu.' },
				{ step: 'Owner prints QR codes from /dashboard/tables and places them on tables.' },
				{ step: 'Staff are invited from /dashboard/staff. Each invite has a role (staff, manager, owner).' }
			] as { step }, i}
				<li class="flex gap-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 {i > 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''}">
					<span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">{i + 1}</span>
					<span class="leading-6">{step}</span>
				</li>
			{/each}
		</ol>
	</section>

	<!-- Section 3: Managing Organizations -->
	<section class="mb-8">
		<div class="mb-3 flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
			<ShieldCheck size={18} />
			<h2 class="text-base font-semibold">3. Managing Organizations</h2>
		</div>
		<div class="rounded-lg border border-gray-200 bg-white p-4 text-sm leading-6 text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
			<p class="mb-3">From <strong>/platform/organizations</strong>, super admins can:</p>
			<ul class="list-disc space-y-1 pl-5">
				<li>View all organizations, filter by status (active / paused / archived).</li>
				<li>Click an org name to open the detail page.</li>
				<li><strong>Activate</strong> — re-enables guest access and dashboard for all restaurants in the org.</li>
				<li><strong>Suspend</strong> — blocks guest PWA access. Dashboard remains accessible so the owner can fix issues.</li>
				<li><strong>Archive</strong> — marks the org as permanently inactive. Use when a pilot restaurant churns.</li>
			</ul>
			<p class="mt-3 rounded border-l-4 border-amber-400 bg-amber-50 py-2 pl-3 text-amber-900 dark:bg-amber-900/20 dark:text-amber-300">
				<strong>Note:</strong> Status changes take effect immediately and affect all RLS queries. Coordinate with the restaurant owner before suspending.
			</p>
		</div>
	</section>

	<!-- Section 4: Analytics -->
	<section class="mb-8">
		<div class="mb-3 flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
			<MessageSquare size={18} />
			<h2 class="text-base font-semibold">4. Platform Analytics</h2>
		</div>
		<div class="rounded-lg border border-gray-200 bg-white p-4 text-sm leading-6 text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
			<p>Available at <strong>/platform/analytics</strong>. Metrics are aggregated across all restaurants.</p>
			<ul class="mt-3 list-disc space-y-1 pl-5">
				<li><strong>Fallback rate</strong> — % of AI responses that were flagged as low-confidence. Target: &lt;15%.</li>
				<li><strong>Helpful rate</strong> — % of guest feedback marked Helpful. Target: &gt;70%.</li>
				<li><strong>P95 latency</strong> — AI response time. Target: &lt;3000ms.</li>
				<li><strong>New orgs/restaurants (7d)</strong> — growth indicator for pilot traction.</li>
			</ul>
		</div>
	</section>

	<!-- Section 5: QR Codes -->
	<section class="mb-8">
		<div class="mb-3 flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
			<QrCode size={18} />
			<h2 class="text-base font-semibold">5. QR Codes</h2>
		</div>
		<div class="rounded-lg border border-gray-200 bg-white p-4 text-sm leading-6 text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
			<p>Each table has a unique QR code pointing to <code class="rounded bg-gray-100 px-1 dark:bg-gray-800">/r/[slug]/table/[code]</code>.</p>
			<ul class="mt-3 list-disc space-y-1 pl-5">
				<li>QR codes are printed from <strong>/dashboard/tables</strong> (A4, 3-up layout).</li>
				<li>Each QR code works without login or app install (PWA).</li>
				<li>If a restaurant is suspended, the QR page shows a "not available" message.</li>
				<li>Table codes can be regenerated from the Tables page — old codes immediately stop working.</li>
			</ul>
		</div>
	</section>

	<!-- Section 6: Known Limitations -->
	<section class="mb-8">
		<div class="mb-3 flex items-center gap-2 text-amber-600">
			<AlertTriangle size={18} />
			<h2 class="text-base font-semibold">6. Known Limitations (Pilot)</h2>
		</div>
		<ul class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
			<li class="border-b border-amber-100 py-1.5 dark:border-amber-800/50">AI answers are limited to restaurant-approved menu data. It will not speculate on unavailable items.</li>
			<li class="border-b border-amber-100 py-1.5 dark:border-amber-800/50">No POS integration. Orders are browse-only.</li>
			<li class="border-b border-amber-100 py-1.5 dark:border-amber-800/50">WhatsApp and external notification providers are mocked in pilot builds.</li>
			<li class="border-b border-amber-100 py-1.5 dark:border-amber-800/50">Custom subdomain (workspace_host) is provisioned automatically but requires DNS wildcard to be live.</li>
			<li class="py-1.5">Billing is not enforced during pilot. Plan limits are tracked but not blocked.</li>
		</ul>
	</section>
</div>

<style>
	@media print {
		:global(body) { font-size: 11pt; }
		section { break-inside: avoid; }
		:global(.dark\:bg-gray-900) { background: white !important; }
	}
</style>
