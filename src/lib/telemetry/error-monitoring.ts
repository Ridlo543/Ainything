const sentErrors = new Map<string, number>();

function shouldLog(key: string): boolean {
	const now = Date.now();
	const last = sentErrors.get(key);
	if (last && now - last < 60000) return false;
	sentErrors.set(key, now);
	return true;
}

export function captureError(error: unknown, context?: string) {
	const message = error instanceof Error ? error.message : String(error);
	const key = `${context ?? 'unknown'}:${message}`;

	if (!shouldLog(key)) return;

	console.error(`[telemetry] ${context ?? 'unhandled'} — ${message}`);
}

export function initTelemetry() {
	process.on('uncaughtException', (error) => {
		captureError(error, 'uncaughtException');
	});

	process.on('unhandledRejection', (reason) => {
		captureError(reason, 'unhandledRejection');
	});
}
