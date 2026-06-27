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

		// CSRF disabled — app uses SameSite session cookies which provide sufficient
		// CSRF protection. The built-in Origin check breaks behind reverse proxies
		// and during E2E tests where request Origin and url.origin differ.
		csrf: {
			checkOrigin: false
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
