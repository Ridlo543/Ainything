/**
 * Unit tests for listOrderItemsForAnalytics.
 *
 * The DB pool is mocked — no live database needed.
 * Tests cover: happy path, date range filtering, status included in output,
 * empty result, and correct ISO string mapping.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock the DB pool before importing the module under test
// ---------------------------------------------------------------------------
const queryMock = vi.fn();

vi.mock('$lib/server/db/postgres', () => ({
	getPool: () => ({ query: queryMock }),
	directQuery: vi.fn(),
	withUserContext: vi.fn()
}));

const { listOrderItemsForAnalytics } = await import('./order-repository');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const ORG_ID = '10000000-0000-0000-0000-000000000001';
const OUTLET_ID = '40000000-0000-0000-0000-000000000001';

function makeRow(overrides: Partial<{
	product_id: string | null;
	name: string;
	quantity: number;
	price: number;
	order_status: string;
	order_created_at: Date;
}> = {}) {
	return {
		product_id: 'prod-001',
		name: 'Nasi Goreng',
		quantity: 2,
		price: 35000,
		order_status: 'completed',
		order_created_at: new Date('2026-01-15T10:00:00Z'),
		...overrides
	};
}

// ---------------------------------------------------------------------------
describe('listOrderItemsForAnalytics', () => {
	beforeEach(() => {
		queryMock.mockReset();
	});

	it('returns mapped AnalyticsItem array for completed orders', async () => {
		queryMock.mockResolvedValueOnce({
			rows: [
				makeRow({ name: 'Nasi Goreng', quantity: 2, price: 35000, order_status: 'completed' }),
				makeRow({ name: 'Es Teh', quantity: 1, price: 8000, order_status: 'completed' })
			]
		});

		const from = new Date('2026-01-01T00:00:00Z');
		const to = new Date('2026-02-01T00:00:00Z');

		const result = await listOrderItemsForAnalytics({ organizationId: ORG_ID, outletId: OUTLET_ID, from, to });

		expect(result).toHaveLength(2);
		expect(result[0]).toMatchObject({
			productId: 'prod-001',
			name: 'Nasi Goreng',
			quantity: 2,
			price: 35000,
			orderStatus: 'completed',
			orderCreatedAt: '2026-01-15T10:00:00.000Z'
		});
		expect(result[1].name).toBe('Es Teh');
	});

	it('returns empty array when no rows in range', async () => {
		queryMock.mockResolvedValueOnce({ rows: [] });

		const result = await listOrderItemsForAnalytics({
			organizationId: ORG_ID,
			outletId: OUTLET_ID,
			from: new Date('2020-01-01'),
			to: new Date('2020-01-02')
		});

		expect(result).toEqual([]);
	});

	it('passes correct params to the DB query', async () => {
		queryMock.mockResolvedValueOnce({ rows: [] });

		const from = new Date('2026-01-01T00:00:00Z');
		const to = new Date('2026-04-01T00:00:00Z');

		await listOrderItemsForAnalytics({ organizationId: ORG_ID, outletId: OUTLET_ID, from, to });

		expect(queryMock).toHaveBeenCalledOnce();
		const [sql, params] = queryMock.mock.calls[0];
		expect(sql).toMatch(/order_items/i);
		expect(sql).toMatch(/JOIN orders/i);
		expect(params).toEqual([ORG_ID, OUTLET_ID, from, to]);
	});

	it('includes non-completed statuses in the output (status filter is server-side, not here)', async () => {
		queryMock.mockResolvedValueOnce({
			rows: [
				makeRow({ order_status: 'processing' }),
				makeRow({ order_status: 'cancelled' })
			]
		});

		const result = await listOrderItemsForAnalytics({
			organizationId: ORG_ID,
			outletId: OUTLET_ID,
			from: new Date('2026-01-01'),
			to: new Date('2026-02-01')
		});

		expect(result[0].orderStatus).toBe('processing');
		expect(result[1].orderStatus).toBe('cancelled');
	});

	it('handles null product_id (anonymous/deleted product)', async () => {
		queryMock.mockResolvedValueOnce({
			rows: [makeRow({ product_id: null, name: 'Item Terhapus' })]
		});

		const result = await listOrderItemsForAnalytics({
			organizationId: ORG_ID,
			outletId: OUTLET_ID,
			from: new Date('2026-01-01'),
			to: new Date('2026-02-01')
		});

		expect(result[0].productId).toBeNull();
		expect(result[0].name).toBe('Item Terhapus');
	});

	it('maps order_created_at Date to ISO string', async () => {
		const ts = new Date('2026-03-15T08:30:00.000Z');
		queryMock.mockResolvedValueOnce({
			rows: [makeRow({ order_created_at: ts })]
		});

		const result = await listOrderItemsForAnalytics({
			organizationId: ORG_ID,
			outletId: OUTLET_ID,
			from: new Date('2026-01-01'),
			to: new Date('2026-12-31')
		});

		expect(result[0].orderCreatedAt).toBe(ts.toISOString());
	});

	it('scopes query to correct organization and outlet', async () => {
		queryMock.mockResolvedValueOnce({ rows: [] });

		const differentOrg = '10000000-0000-0000-0000-000000000002';
		const differentOutlet = '40000000-0000-0000-0000-000000000005';

		await listOrderItemsForAnalytics({
			organizationId: differentOrg,
			outletId: differentOutlet,
			from: new Date('2026-01-01'),
			to: new Date('2026-02-01')
		});

		const params = queryMock.mock.calls[0][1];
		expect(params[0]).toBe(differentOrg);
		expect(params[1]).toBe(differentOutlet);
	});
});
