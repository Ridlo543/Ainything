/**
 * k6 load test — Ainything public API endpoints
 *
 * Targets:
 *   GET  /api/public/bootstrap   (30 req/60s per IP)
 *   POST /api/public/sessions    ( 5 req/60s per IP)
 *   POST /api/public/chat        (20 req/60s per session)
 *   POST /api/public/feedback    (10 req/60s per session)
 *   POST /api/public/fallback    ( 5 req/60s per session)
 *
 * Usage:
 *   # Install k6: https://k6.io/docs/getting-started/installation/
 *   # Start the app first: pnpm build && pnpm preview
 *   k6 run tests/load/k6-public-endpoints.js
 *
 *   # Against staging:
 *   k6 run -e BASE_URL=https://Ainything.example.com tests/load/k6-public-endpoints.js
 *
 *   # Smoke test (1 VU, 10 iterations):
 *   k6 run --vus 1 --iterations 10 tests/load/k6-public-endpoints.js
 *
 *   # Stress test (50 VUs, 2 minutes):
 *   k6 run --vus 50 --duration 2m tests/load/k6-public-endpoints.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4173';

// Seed data matching 0001_demo_multi_tenant_data.sql
const RESTAURANT_SLUG = 'uma-karang';
const TABLE_CODE = 'T07';

// ---------------------------------------------------------------------------
// Custom metrics
// ---------------------------------------------------------------------------

const bootstrapErrors = new Rate('bootstrap_errors');
const sessionErrors = new Rate('session_errors');
const chatErrors = new Rate('chat_errors');
const feedbackErrors = new Rate('feedback_errors');
const fallbackErrors = new Rate('fallback_errors');

const bootstrapDuration = new Trend('bootstrap_duration', true);
const sessionDuration = new Trend('session_duration', true);
const chatDuration = new Trend('chat_duration', true);

// ---------------------------------------------------------------------------
// k6 options (default: moderate load)
// ---------------------------------------------------------------------------

export const options = {
	scenarios: {
		// Ramp up to 10 VUs over 30s, hold for 90s, ramp down
		public_api: {
			executor: 'ramping-vus',
			startVUs: 1,
			stages: [
				{ duration: '30s', target: 10 }, // ramp up
				{ duration: '90s', target: 10 }, // hold
				{ duration: '15s', target: 0 } // ramp down
			]
		}
	},
	thresholds: {
		// 95th percentile response times
		bootstrap_duration: ['p(95)<800'],
		session_duration: ['p(95)<500'],
		chat_duration: ['p(95)<3000'], // AI calls can be slow

		// Error rates — allow <5%
		bootstrap_errors: ['rate<0.05'],
		session_errors: ['rate<0.05'],
		chat_errors: ['rate<0.05'],
		feedback_errors: ['rate<0.05'],
		fallback_errors: ['rate<0.05']
	}
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const headers = {
	'Content-Type': 'application/json',
	Accept: 'application/json'
};

function post(path, body, extraHeaders = {}) {
	return http.post(`${BASE_URL}${path}`, JSON.stringify(body), {
		headers: { ...headers, ...extraHeaders },
		tags: { endpoint: path }
	});
}

function get(path) {
	return http.get(`${BASE_URL}${path}`, {
		headers: { Accept: 'application/json' },
		tags: { endpoint: path }
	});
}

// ---------------------------------------------------------------------------
// Main scenario
// ---------------------------------------------------------------------------

export default function () {
	// 1. Bootstrap — load restaurant + menu
	const bootRes = get(`/api/public/bootstrap?restaurant=${RESTAURANT_SLUG}&table=${TABLE_CODE}`);
	bootstrapDuration.add(bootRes.timings.duration);
	bootstrapErrors.add(
		!check(bootRes, {
			'bootstrap 200': (r) => r.status === 200,
			'bootstrap has restaurantName': (r) => {
				try {
					const body = JSON.parse(r.body);
					return typeof body.restaurantName === 'string';
				} catch {
					return false;
				}
			}
		})
	);

	sleep(0.5);

	// 2. Create session
	const sessRes = post('/api/public/sessions', {
		restaurantSlug: RESTAURANT_SLUG,
		tableCode: TABLE_CODE,
		preferences: { language: 'en' }
	});
	sessionDuration.add(sessRes.timings.duration);
	sessionErrors.add(
		!check(sessRes, {
			'session 201': (r) => r.status === 201,
			'session has sessionId': (r) => {
				try {
					return !!JSON.parse(r.body).sessionId;
				} catch {
					return false;
				}
			}
		})
	);

	let sessionToken = null;
	try {
		sessionToken = JSON.parse(sessRes.body).sessionId;
	} catch {
		// session failed — skip dependent calls
	}

	sleep(0.3);

	if (!sessionToken) {
		sleep(1);
		return;
	}

	// 3. Chat — send a question (AI endpoint)
	const sessionHeader = { 'X-Session-Token': sessionToken };
	const chatRes = post(
		'/api/public/chat',
		{
			restaurantSlug: RESTAURANT_SLUG,
			tableCode: TABLE_CODE,
			message: 'Is the Nasi Goreng halal?'
		},
		sessionHeader
	);
	chatDuration.add(chatRes.timings.duration);
	chatErrors.add(
		!check(chatRes, {
			'chat 201 or 200': (r) => r.status === 200 || r.status === 201,
			'chat has answer': (r) => {
				try {
					return typeof JSON.parse(r.body).answer === 'string';
				} catch {
					return false;
				}
			}
		})
	);

	sleep(1);

	// 4. Feedback
	const fbRes = post(
		'/api/public/feedback',
		{
			restaurantSlug: RESTAURANT_SLUG,
			tableCode: TABLE_CODE,
			rating: 'helpful'
		},
		sessionHeader
	);
	feedbackErrors.add(
		!check(fbRes, {
			'feedback 201': (r) => r.status === 201
		})
	);

	sleep(0.3);

	// 5. Fallback (staff request) — sampled 20% of VUs to avoid triggering too many
	if (Math.random() < 0.2) {
		const fallRes = post(
			'/api/public/fallback',
			{
				restaurantSlug: RESTAURANT_SLUG,
				tableCode: TABLE_CODE,
				reason: 'guest_requested'
			},
			sessionHeader
		);
		fallbackErrors.add(
			!check(fallRes, {
				'fallback 201': (r) => r.status === 201
			})
		);
	}

	sleep(0.5);
}
