import type { FallbackPriority } from './types';

export const FALLBACK_PRIORITY_CODES = ['normal', 'high'] as const satisfies readonly FallbackPriority[];

export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
	new: ['in-progress'],
	'in-progress': ['resolved'],
	resolved: []
};
