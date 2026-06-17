import type { AppUser, LanguageTag } from '$lib/domain/menu/types';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: AppUser | null;
			/** Resolved from Accept-Language header in hooks.server.ts. Falls back to 'en'. */
			language: LanguageTag;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
