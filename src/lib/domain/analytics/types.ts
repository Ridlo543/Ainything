export type OutletMetrics = {
	outletId: string;
	/** Rolling window in days used for the query. */
	windowDays: number;
	totalChats: number;
	/** 0-100 integer percentage of chats that returned 'ok' safety status. */
	helpfulRate: number;
	/** 0-100 integer percentage of chats that triggered needs-staff or blocked. */
	fallbackRate: number;
	/** 95th-percentile LLM latency in ms (null when no data). */
	latencyP95: number | null;
	/** Count of positive feedback responses in the window. */
	helpfulFeedback: number;
	/** Total feedback responses in the window. */
	totalFeedback: number;
};
