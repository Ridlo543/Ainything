/**
 * SSE endpoint for staff inbox real-time updates.
 *
 * Subscribes to Redis pub/sub channels `fallback:{restaurantId}` for each
 * restaurant the authenticated staff member has access to. Each published
 * event is forwarded as an SSE `message` event to the connected browser.
 *
 * The endpoint requires an authenticated user and resolves the restaurant list
 * from the tenant context (membership-scoped, never from query params).
 *
 * Polling fallback note: In environments that do not support long-lived HTTP
 * connections (e.g. serverless functions, some reverse proxies), the SSE
 * stream will be cut at the platform's request timeout. Clients should detect
 * the `error` event on the EventSource and fall back to polling
 * `/staff/inbox` at a suitable interval (e.g. 30 s). The page.svelte already
 * handles this by re-running the load function when the SSE connection drops.
 *
 * Architecture:
 * - Each SSE connection creates a dedicated Redis subscriber client (required
 *   by node-redis because a subscribed client cannot run regular commands).
 * - The subscriber is torn down when the HTTP connection closes (`request.signal`).
 * - Message payload is the JSON-stringified StaffRequest published by
 *   guest-interaction-service after a fallback is created.
 */

import { resolveTenantContext } from '$lib/server/tenant/tenant-context';
import { getRedisClient } from '$lib/server/cache/redis';
import { appEnv } from '$lib/server/config/env';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) {
		return new Response('Unauthorized', { status: 401 });
	}

	// Resolve restaurant list from membership (server-side only)
	const tenant = await resolveTenantContext(locals.user);
	const restaurantIds = tenant.membership.restaurantIds;

	if (restaurantIds.length === 0) {
		return new Response('No restaurants available', { status: 403 });
	}

	// Build the SSE stream
	const encoder = new TextEncoder();
	const abortSignal = request.signal;

	const stream = new ReadableStream({
		async start(controller) {
			// Send an initial heartbeat so the client knows the connection is live
			controller.enqueue(encoder.encode(': heartbeat\n\n'));

			// If Redis is not configured, keep the connection open but idle.
			// Clients will time out or receive heartbeats only.
			if (!appEnv.redisUrl) {
				console.warn('[SSE] REDIS_URL not configured — SSE will only send heartbeats');

				// Keep the connection open with periodic heartbeats until abort
				const heartbeatInterval = setInterval(() => {
					try {
						controller.enqueue(encoder.encode(': heartbeat\n\n'));
					} catch {
						clearInterval(heartbeatInterval);
					}
				}, 20_000);

				abortSignal.addEventListener('abort', () => {
					clearInterval(heartbeatInterval);
					try {
						controller.close();
					} catch {
						/* already closed */
					}
				});

				return;
			}

			let subscriber: Awaited<ReturnType<typeof getRedisClient>> | null = null;

			try {
				// Duplicate the shared client for pub/sub (a subscribed client cannot
				// issue regular commands — node-redis requires a separate connection).
				const base = await getRedisClient();
				subscriber = base.duplicate();
				await subscriber.connect();

				const channels = restaurantIds.map((id) => `fallback:${id}`);

				// Handle incoming pub/sub messages
				const onMessage = (message: string, channel: string) => {
					if (abortSignal.aborted) {
						return;
					}

					try {
						const ssePayload = `event: fallback\ndata: ${message}\nid: ${channel}\n\n`;
						controller.enqueue(encoder.encode(ssePayload));
					} catch {
						// Controller closed — subscriber will be torn down below
					}
				};

				await subscriber.subscribe(channels, onMessage);

				// Periodic heartbeat to prevent proxy timeouts (every 20 s)
				const heartbeatInterval = setInterval(() => {
					if (abortSignal.aborted) {
						clearInterval(heartbeatInterval);
						return;
					}
					try {
						controller.enqueue(encoder.encode(': heartbeat\n\n'));
					} catch {
						clearInterval(heartbeatInterval);
					}
				}, 20_000);

				// Tear down when the client disconnects
				abortSignal.addEventListener('abort', async () => {
					clearInterval(heartbeatInterval);

					try {
						if (subscriber?.isOpen) {
							await subscriber.unsubscribe(channels);
							await subscriber.quit();
						}
					} catch {
						/* ignore cleanup errors */
					}

					try {
						controller.close();
					} catch {
						/* already closed */
					}
				});
			} catch (err) {
				console.error('[SSE] Failed to set up Redis subscriber', err);

				// Emit an error event so the client can fall back to polling
				try {
					controller.enqueue(
						encoder.encode(`event: error\ndata: ${JSON.stringify({ reason: 'setup-failed' })}\n\n`)
					);
					controller.close();
				} catch {
					/* already closed */
				}

				if (subscriber?.isOpen) {
					await subscriber.quit().catch(() => {});
				}
			}
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no' // disable Nginx buffering for SSE
		}
	});
};
