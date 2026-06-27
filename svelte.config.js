import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Vite handles Tailwind CSS processing. vitePreprocess enables TypeScript in <script>
	// and style preprocessing in <style> blocks.
	preprocess: vitePreprocess(),

	compilerOptions: {
		// Force runes mode project-wide (except node_modules). Remove in Svelte 6.
		runes: true
	},

	kit: {
		adapter: adapter(),

		// CSRF protection is enabled (default). Trusted origins whitelist covers:
		// - local dev server (vite dev)
		// - Playwright preview server (E2E tests)
		// - production domain (set via PUBLIC_ORIGIN env var at deploy time)
		// Behind reverse proxies the request URL already matches the public origin,
		// so no additional entries are needed there.
		csrf: {
			trustedOrigins: [
				'http://localhost:5173',
				'http://localhost:4173',
				...(process.env.PUBLIC_ORIGIN ? [process.env.PUBLIC_ORIGIN] : [])
			]
		},

		// Path aliases — SvelteKit auto-generates tsconfig paths from these.
		// $lib is handled automatically via kit.files.lib (default: src/lib).
		alias: {
			$utils: 'src/lib/utils',
			$components: 'src/lib/ui'
		}
	}
};

export default config;
