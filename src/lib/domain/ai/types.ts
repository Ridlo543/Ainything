export type ChatRole = 'customer' | 'assistant' | 'staff' | 'system';
export type ChatSafetyStatus = 'ok' | 'low-confidence' | 'needs-staff' | 'blocked';

export type ChatMessage = {
	id: string;
	sessionId: string;
	role: ChatRole;
	content: string;
	safetyStatus: ChatSafetyStatus;
	createdAt: string;
};

export type AiEventInput = {
	restaurantId: string;
	sessionId: string;
	model: string;
	promptTokens: number;
	completionTokens: number;
	latencyMs: number;
	costUsd: number;
	safetyStatus: ChatSafetyStatus;
	retrievalSource?: string;
	confidence?: number;
};
