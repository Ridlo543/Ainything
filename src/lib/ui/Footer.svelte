<script lang="ts">
	import { QrCode, Globe, MessageCircle, Users } from '@lucide/svelte';
	import { resolve } from '$app/paths';
</script>

<footer class="border-t border-lingua-border bg-lingua-surface">
	<div class="app-container py-12 sm:py-14">
		<div class="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
			<div>
				<a href={resolve('/')} class="flex items-center gap-2.5">
					<div
						class="flex h-9 w-9 items-center justify-center rounded-lg bg-lingua-primary text-white"
					>
						<QrCode size={18} />
					</div>
					<span class="text-lg font-bold tracking-tight text-lingua-text">Lingua</span>
				</a>
				<p class="mt-4 max-w-xs text-sm leading-relaxed text-lingua-subtle">
					QR-based AI menu assistant for tourist-heavy restaurants. Serve international guests with
					confidence.
				</p>
				<div class="mt-5 flex gap-2">
					<a
						href={resolve('/')}
						class="flex h-9 w-9 items-center justify-center rounded-lg bg-lingua-muted text-lingua-subtle transition-colors hover:bg-lingua-primary-soft hover:text-lingua-primary"
						aria-label="Website"
					>
						<Globe size={16} />
					</a>
					<a
						href={resolve('/')}
						class="flex h-9 w-9 items-center justify-center rounded-lg bg-lingua-muted text-lingua-subtle transition-colors hover:bg-lingua-primary-soft hover:text-lingua-primary"
						aria-label="Chat"
					>
						<MessageCircle size={16} />
					</a>
					<a
						href={resolve('/')}
						class="flex h-9 w-9 items-center justify-center rounded-lg bg-lingua-muted text-lingua-subtle transition-colors hover:bg-lingua-primary-soft hover:text-lingua-primary"
						aria-label="Community"
					>
						<Users size={16} />
					</a>
				</div>
			</div>

			<div>
				<h4 class="text-sm font-bold uppercase tracking-wider text-lingua-text">Product</h4>
				<ul class="mt-4 space-y-2.5">
					<li>
						<a
							href="#features"
							class="text-sm text-lingua-subtle transition-colors hover:text-lingua-primary"
							>Features</a
						>
					</li>
					<li>
						<a
							href="#how-it-works"
							class="text-sm text-lingua-subtle transition-colors hover:text-lingua-primary"
							>How it Works</a
						>
					</li>
					<li>
						<a
							href="#pricing"
							class="text-sm text-lingua-subtle transition-colors hover:text-lingua-primary"
							>Pricing</a
						>
					</li>
					<li>
						<a
							href={resolve('/demo')}
							class="text-sm text-lingua-subtle transition-colors hover:text-lingua-primary"
							>Live Demo</a
						>
					</li>
				</ul>
			</div>

			<div>
				<h4 class="text-sm font-bold uppercase tracking-wider text-lingua-text">Company</h4>
				<ul class="mt-4 space-y-2.5">
					<li>
						<a
							href={resolve('/')}
							class="text-sm text-lingua-subtle transition-colors hover:text-lingua-primary"
							>About</a
						>
					</li>
					<li>
						<a
							href={resolve('/')}
							class="text-sm text-lingua-subtle transition-colors hover:text-lingua-primary">Blog</a
						>
					</li>
					<li>
						<a
							href={resolve('/')}
							class="text-sm text-lingua-subtle transition-colors hover:text-lingua-primary"
							>Careers</a
						>
					</li>
					<li>
						<a
							href="mailto:pilot@lingua.app"
							class="text-sm text-lingua-subtle transition-colors hover:text-lingua-primary"
							>Contact</a
						>
					</li>
				</ul>
			</div>

			<div>
				<h4 class="text-sm font-bold uppercase tracking-wider text-lingua-text">Legal</h4>
				<ul class="mt-4 space-y-2.5">
					<li>
						<a
							href={resolve('/')}
							class="text-sm text-lingua-subtle transition-colors hover:text-lingua-primary"
							>Privacy Policy</a
						>
					</li>
					<li>
						<a
							href={resolve('/')}
							class="text-sm text-lingua-subtle transition-colors hover:text-lingua-primary"
							>Terms of Service</a
						>
					</li>
					<li>
						<a
							href={resolve('/')}
							class="text-sm text-lingua-subtle transition-colors hover:text-lingua-primary"
							>Cookie Policy</a
						>
					</li>
				</ul>
			</div>
		</div>

		<div
			class="mt-10 flex flex-col items-center justify-between gap-3 border-t border-lingua-border pt-6 sm:flex-row"
		>
			<p class="text-xs text-lingua-subtle">&copy; 2026 Lingua. All rights reserved.</p>
			<p class="text-xs text-lingua-subtle">Made with care for restaurant owners worldwide.</p>
		</div>
	</div>
</footer>
