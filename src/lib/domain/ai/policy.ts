import type { ChatRole, ChatSafetyStatus } from './types';

export const CHAT_ROLE_CODES = [
	'customer',
	'assistant',
	'staff',
	'system'
] as const satisfies readonly ChatRole[];
export const CHAT_SAFETY_CODES = [
	'ok',
	'low-confidence',
	'needs-staff',
	'blocked'
] as const satisfies readonly ChatSafetyStatus[];

export const SAFETY_CONFIDENCE: Record<ChatSafetyStatus, number> = {
	ok: 1.0,
	'low-confidence': 0.5,
	'needs-staff': 0.3,
	blocked: 0.0
};

export const AI_DAILY_CAP = 500;
export const HISTORY_LIMIT = 10;
export const MENU_SNAPSHOT_CAP = 80;
