<script lang="ts">
	import { ArrowRight, QrCode, Store } from '@lucide/svelte';
</script>

<main class="flex min-h-screen items-center justify-center bg-white px-4">
	<div class="w-full max-w-md space-y-8 text-center">
		<h1 class="text-3xl font-bold tracking-tight text-lingua-text">Lingua</h1>
		<p class="text-lg text-lingua-subtle">
			Restaurant Menu Assistant
		</p>

		<div class="space-y-4">
			<a
				href="/login"
				class="tap-target flex items-center justify-center gap-3 rounded-lg bg-lingua-primary px-6 py-4 text-base font-semibold text-white transition-colors hover:brightness-95"
			>
				<Store class="h-5 w-5" />
				Access your restaurant
				<ArrowRight class="h-5 w-5" />
			</a>

			<div class="rounded-lg border border-lingua-border bg-slate-50 p-4 text-left">
				<div class="flex items-start gap-3">
					<QrCode class="mt-0.5 h-5 w-5 shrink-0 text-lingua-subtle" />
					<div>
						<p class="text-sm font-semibold text-lingua-text">Scan a QR code</p>
						<p class="mt-1 text-sm text-lingua-subtle">
							Your table should have a QR code. Scan it to browse the menu,
							ask questions, and get recommendations in your language.
						</p>
					</div>
				</div>
			</div>
		</div>

		<p class="text-xs text-lingua-subtle">
			No account needed to view a restaurant menu.
		</p>
	</div>
</main>