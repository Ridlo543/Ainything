import { redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import * as Sentry from '@sentry/sveltekit';
import { sentryHandle } from '@sentry/sveltekit';
import { authProvider } from '$lib/server/auth/auth-factory';
import { resolveRoleRedirect } from '$lib/server/auth/role-routing';
import { detectLanguage } from '$lib/i18n/detection';
import type { LanguageTag } from '$lib/domain/menu/types';
import { initTelemetry } from '$lib/telemetry';
import { resolveRouteStrategy, applyCacheHeaders } from '$lib/server/cache/cache-policy';

Sentry.init({
	dsn: process.env.SENTRY_DSN,
	tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.1,
	environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development'
});

initTelemetry();

const PUBLIC_ROUTES = ['/', '/login', '/register'];
const PUBLIC_PREFIXES = [
	'/auth/',
	'/api/public/',
	'/api/health/',
	'/r/',
	'/register/restaurant',
	'/register/organization',
	'/register/confirm'
];

const appHandle: Handle = async ({ event, resolve }) => {
	event.locals.user = await authProvider.getSessionUser(event.cookies, event.request);

	const acceptLang = event.request.headers.get('accept-language');
	event.locals.language = detectLanguage(acceptLang) satisfies LanguageTag;

	const pathname = event.url.pathname;
	const isPublic =
		PUBLIC_ROUTES.includes(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

	if (!isPublic && !event.locals.user) {
		redirect(303, `/login?redirectTo=${encodeURIComponent(pathname)}`);
	}

	if (event.locals.user && pathname === '/login') {
		redirect(303, resolveRoleRedirect(event.locals.user));
	}

	return resolve(event);
};

const cacheHandle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);

	if (!response.headers.has('Cache-Control')) {
		const pathname = event.url.pathname;
		const strategy = resolveRouteStrategy(pathname);

		applyCacheHeaders(response.headers, strategy);
	}

	return response;
};

export const handle = sequence(sentryHandle(), appHandle, cacheHandle);

export const handleError = Sentry.handleErrorWithSentry();
