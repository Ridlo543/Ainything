import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind CSS classes safely, resolving conflicts.
 * Used by all shadcn-svelte components.
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// Re-export type helpers used by shadcn-svelte components.
// These originate from bits-ui but are conventionally placed in the utils barrel.
export type {
	WithElementRef,
	WithoutChildren,
	WithoutChild,
	WithoutChildrenOrChild
} from 'bits-ui';
