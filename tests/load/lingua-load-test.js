import { check, sleep } from 'k6';
import http from 'k6/http';

/**
 * Load Testing Script for Lingua
 *
 * Test scenarios:
 * 1. Customer flow - browse menu, chat with AI
 * 2. Staff flow - login, manage menu items
 * 3. Concurrent users simulation (100 concurrent)
 */

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:5173';

// Guest session storage
let guestSessionId = null;

/**
 * Customer Flow Scenario
 * - Visit landing page
 * - Select restaurant (rempah-terrace)
 * - View menu categories
 * - Chat with AI assistant
 * - Submit feedback
 */
export const customerFlow = function () {
	const res = http.get(`${BASE_URL}/menu/rempah-terrace`);
	check(res, {
		'landing page loads': (r) => r.status === 200,
		'menu rendered': (r) => r.body.includes('rempah-terrace')
	});

	sleep(1);

	// Chat with AI
	const chatRes = http.post(
		`${BASE_URL}/api/chat`,
		JSON.stringify({
			message: 'What do you recommend?',
			sessionId: guestSessionId || 'test-session'
		}),
		{ headers: { 'Content-Type': 'application/json' } }
	);

	check(chatRes, {
		'chat API responds': (r) => r.status === 200
	});

	sleep(1);

	// Submit feedback
	const feedbackRes = http.post(
		`${BASE_URL}/api/feedback`,
		JSON.stringify({
			helpful: true,
			comment: 'Great experience!'
		}),
		{ headers: { 'Content-Type': 'application/json' } }
	);

	check(feedbackRes, {
		'feedback submitted': (r) => r.status === 200
	});

	sleep(1);
};

/**
 * Staff Login Scenario
 * - Login as restaurant admin
 * - Navigate to dashboard
 */
export const staffLogin = function () {
	const res = http.post(
		`${BASE_URL}/login`,
		JSON.stringify({
			email: 'owner@bali-table.test',
			password: 'password'
		}),
		{ headers: { 'Content-Type': 'application/json' } }
	);

	check(res, {
		'login successful': (r) => r.status === 200
	});

	sleep(1);
};

/**
 * Menu Admin Scenario
 * - Login
 * - View menu items
 * - Edit menu item
 */
export const menuAdmin = function () {
	// Login
	http.post(
		`${BASE_URL}/login`,
		JSON.stringify({
			email: 'owner@bali-table.test',
			password: 'password'
		}),
		{ headers: { 'Content-Type': 'application/json' } }
	);

	sleep(1);

	// View menu
	const menuRes = http.get(`${BASE_URL}/admin/menu/rempah-terrace`);
	check(menuRes, {
		'menu list loads': (r) => r.status === 200
	});

	sleep(1);
};

/**
 * API Health Check Scenario
 * - Check service health
 */
export const healthCheck = function () {
	const res = http.get(`${BASE_URL}/api/health`);
	check(res, {
		'health check passes': (r) => r.status === 200
	});
	sleep(0.5);
};

/**
 * Main Test Options
 */
export const options = {
	scenarios: {
		customer_burst: {
			executor: 'constant-vus',
			vus: 50,
			duration: '30s',
			exec: 'customerFlow',
			tags: { scenario: 'customer' }
		},
		staff_load: {
			executor: 'ramping-vus',
			startVUs: 10,
			stages: [
				{ duration: '10s', target: 20 },
				{ duration: '30s', target: 20 },
				{ duration: '10s', target: 0 }
			],
			exec: 'staffLogin',
			tags: { scenario: 'staff' }
		},
		mixed_traffic: {
			executor: 'shared-iterations',
			iterations: 100,
			vus: 30,
			exec: 'customerFlow',
			tags: { scenario: 'mixed' }
		},
		spike_test: {
			executor: 'ramping-arrival-rate',
			startRate: 10,
			timeUnit: '1s',
			preAllocatedVUs: 100,
			maxVUs: 200,
			stages: [
				{ duration: '10s', target: 100 },
				{ duration: '20s', target: 100 },
				{ duration: '10s', target: 0 }
			],
			exec: 'customerFlow',
			tags: { scenario: 'spike' }
		}
	},
	thresholds: {
		http_req_duration: ['p(95)<2000', 'p(99)<3000'],
		http_req_failed: ['rate<0.01']
	}
};
