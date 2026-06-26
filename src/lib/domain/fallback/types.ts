import type { LanguageTag } from '$lib/domain/menu/types';

export type FallbackStatus = 'new' | 'in-progress' | 'resolved';
export type FallbackPriority = 'normal' | 'high';

export type StaffRequest = {
	id: string;
	outletId: string;
	outletSlug: string;
	outletName: string;
	tableId: string;
	tableCode: string;
	language: LanguageTag;
	status: FallbackStatus;
	priority: FallbackPriority;
	guestNeed: string;
	summary: string;
	lastMessageAt: string;
};
