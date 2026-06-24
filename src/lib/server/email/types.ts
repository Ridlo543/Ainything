export interface EmailProvider {
	/**
	 * Send a transactional email.
	 * Resolves on success, throws on failure.
	 */
	send(params: SendEmailParams): Promise<void>;
}

export type SendEmailParams = {
	to: string;
	subject: string;
	/** Plain-text fallback */
	text: string;
	/** HTML body */
	html: string;
};
