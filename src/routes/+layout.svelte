<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { getState, dir } from '$lib/i18n';
	import { theme } from '$lib/theme/theme.svelte';
	import { reportWebVitals, flushVitals } from '$lib/telemetry';

	let { children } = $props();

	$effect(() => {
		if (browser) {
			const { language } = getState();
			document.documentElement.lang = language;
			document.documentElement.dir = dir(language);
		}
	});

	$effect(() => {
		if (browser) {
			document.documentElement.dataset.theme = theme.resolved;
			document.documentElement.style.colorScheme = theme.resolved;
		}
	});

	// Wire Core Web Vitals to the analytics backend.
	// We dynamically import the web-vitals library to avoid adding it to the
	// critical bundle. The PerformanceObserver fires after navigation; we flush
	// the in-memory buffer to /api/internal/vitals using sendBeacon (non-blocking).
	$effect(() => {
		if (!browser) return;

		// Snapshot the current path so each flush carries the correct page path.
		const currentPath = $page.url.pathname;

		import('web-vitals')
			.then(({ onLCP, onFID, onINP, onCLS, onTTFB }) => {
				const report = (metric: { name: string; value: number }) => {
					reportWebVitals(metric);
				};
				onLCP(report);
				onFID(report);
				onINP(report);
				onCLS(report);
				onTTFB(report);
			})
			.catch(() => {
				// web-vitals not available — skip silently
			});

		// Flush buffer on page hide (tab close, navigation away).
		function sendBuffer() {
			const entries = flushVitals();
			if (entries.length === 0) return;

			const payload = entries.map((e) => ({ ...e, path: currentPath }));
			const body = JSON.stringify(payload);

			// sendBeacon is best-effort on page unload; fallback to fetch
			if (navigator.sendBeacon) {
				navigator.sendBeacon(
					'/api/internal/vitals',
					new Blob([body], { type: 'application/json' })
				);
			} else {
				fetch('/api/internal/vitals', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body,
					keepalive: true
				}).catch(() => {
					/* fail-open */
				});
			}
		}

		document.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'hidden') sendBuffer();
		});

		return () => {
			document.removeEventListener('visibilitychange', sendBuffer);
		};
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="manifest" href="/manifest.webmanifest" />
	<meta name="theme-color" content="#0f766e" media="(prefers-color-scheme: light)" />
	<meta name="theme-color" content="#0a0f1a" media="(prefers-color-scheme: dark)" />
	<meta
		name="description"
		content="Lingua is a multi-restaurant QR menu and guest support platform for tourist-heavy restaurants."
	/>
</svelte:head>
{@render children()}
