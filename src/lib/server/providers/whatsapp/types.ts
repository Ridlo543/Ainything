export type LanguageTag = string;

export type WhatsappMessageRequest = {
	guestSessionId: string;
	phoneNumber: string;
	message: string;
	languageTag: LanguageTag;
};

export type WhatsappMessageResult = {
	messageId: string;
	status: 'sent' | 'failed' | 'queued';
	errorReason?: string;
	provider: string;
	latencyMs: number;
};

export interface WhatsappProvider {
	sendMessage(request: WhatsappMessageRequest): Promise<WhatsappMessageResult>;
}
