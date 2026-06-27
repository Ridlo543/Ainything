/**
 * Shared cookie name constants.
 * Centralised here so all server routes use the same literal — a typo
 * in one place previously caused a silent auth failure.
 */

/** Public buyer session cookie — set by the catalog/checkout flow. */
export const SESSION_COOKIE = 'ainything_session';
