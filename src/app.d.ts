import type { AuthUser } from '$lib/domain/auth/types';
import type { LanguageTag } from '$lib/domain/menu/types';

declare global {
	namespace App {
		interface Locals {
			user: AuthUser | null;
			language: LanguageTag;
		}
	}
}

export {};