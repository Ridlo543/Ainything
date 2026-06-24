import { PUBLIC_SENTRY_DSN } from '$env/static/public';
import * as Sentry from '@sentry/sveltekit';

Sentry.init({
	dsn: PUBLIC_SENTRY_DSN,
	tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE) || 0.1,
	environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE || 'development',
	// Session Replay: mask all text and inputs to prevent accidental PII capture.
	// Guests type free-form questions in the chat UI — we must not send that to Sentry.
	// replaysSessionSampleRate is 0 for public guest routes; error replays are kept
	// but fully masked so no chat content leaks.
	replaysSessionSampleRate: 0,
	replaysOnErrorSampleRate: 1.0,
	integrations: [
		Sentry.replayIntegration({
			maskAllText: true,
			blockAllMedia: true,
			maskAllInputs: true
		})
	]
});

export const handleError = Sentry.handleErrorWithSentry();
