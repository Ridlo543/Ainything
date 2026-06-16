import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock the repository before importing the service under test
// ---------------------------------------------------------------------------

const listFallbackRequestsMock = vi.fn();
const updateFallbackStatusMock = vi.fn();

vi.mock('$lib/server/repositories/staff-inbox-repository', () => ({
	listFallbackRequests: (...args: unknown[]) => listFallbackRequestsMock(...args),
	updateFallbackStatus: (...args: unknown[]) => updateFallbackStatusMock(...args)
}));

const { listRequests, transitionStatus, StaffInboxAuthorizationError, StaffInboxTransitionError } =
	await import('./staff-inbox-service');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const USER_ID = 'user-staff-1';
const ORG_ID = 'org-bali-1';
const RESTAURANT_ID_A = 'a1b2c3d4-e5f6-4a7b-8c9d-000000000001';
const RESTAURANT_ID_B = 'a1b2c3d4-e5f6-4a7b-8c9d-000000000002';
const REQUEST_ID = 'f1e2d3c4-b5a6-4789-abcd-eeeeeeeeeeee';

const makeRequest = (status: 'new' | 'in-progress' | 'resolved') => ({
	id: REQUEST_ID,
	restaurantId: RESTAURANT_ID_A,
	restaurantSlug: 'test-restaurant',
	restaurantName: 'Test Restaurant',
	tableId: '00000000-0000-0000-0000-bbbbbbbbbbbb',
	tableCode: 'T01',
	language: 'en' as const,
	status,
	priority: 'normal' as const,
	guestNeed: 'Need help with menu',
	summary: 'Guest needs assistance',
	lastMessageAt: '2026-01-01T12:00:00Z'
});

// ---------------------------------------------------------------------------
// listRequests
// ---------------------------------------------------------------------------

describe('listRequests', () => {
	beforeEach(() => {
		listFallbackRequestsMock.mockReset();
	});

	it('calls repository with the provided restaurant IDs', async () => {
		listFallbackRequestsMock.mockResolvedValue([makeRequest('new')]);

		const result = await listRequests(USER_ID, ORG_ID, [RESTAURANT_ID_A]);

		expect(listFallbackRequestsMock).toHaveBeenCalledWith([RESTAURANT_ID_A]);
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe(REQUEST_ID);
	});

	it('throws StaffInboxAuthorizationError when restaurantIds is empty', async () => {
		await expect(listRequests(USER_ID, ORG_ID, [])).rejects.toBeInstanceOf(
			StaffInboxAuthorizationError
		);
		expect(listFallbackRequestsMock).not.toHaveBeenCalled();
	});

	it('throws StaffInboxAuthorizationError when userId is empty', async () => {
		await expect(listRequests('', ORG_ID, [RESTAURANT_ID_A])).rejects.toBeInstanceOf(
			StaffInboxAuthorizationError
		);
	});

	it('throws StaffInboxAuthorizationError when organizationId is empty', async () => {
		await expect(listRequests(USER_ID, '', [RESTAURANT_ID_A])).rejects.toBeInstanceOf(
			StaffInboxAuthorizationError
		);
	});

	it('forwards repository errors', async () => {
		listFallbackRequestsMock.mockRejectedValue(new Error('DB offline'));
		await expect(listRequests(USER_ID, ORG_ID, [RESTAURANT_ID_A])).rejects.toThrow('DB offline');
	});
});

// ---------------------------------------------------------------------------
// transitionStatus
// ---------------------------------------------------------------------------

describe('transitionStatus', () => {
	beforeEach(() => {
		listFallbackRequestsMock.mockReset();
		updateFallbackStatusMock.mockReset();
	});

	it('allows new → in_progress', async () => {
		listFallbackRequestsMock.mockResolvedValue([makeRequest('new')]);
		updateFallbackStatusMock.mockResolvedValue(undefined);

		await transitionStatus(USER_ID, REQUEST_ID, RESTAURANT_ID_A, 'in_progress', [RESTAURANT_ID_A]);

		expect(updateFallbackStatusMock).toHaveBeenCalledWith(
			REQUEST_ID,
			RESTAURANT_ID_A,
			'in-progress',
			USER_ID
		);
	});

	it('allows in_progress → resolved', async () => {
		listFallbackRequestsMock.mockResolvedValue([makeRequest('in-progress')]);
		updateFallbackStatusMock.mockResolvedValue(undefined);

		await transitionStatus(USER_ID, REQUEST_ID, RESTAURANT_ID_A, 'resolved', [RESTAURANT_ID_A]);

		expect(updateFallbackStatusMock).toHaveBeenCalledWith(
			REQUEST_ID,
			RESTAURANT_ID_A,
			'resolved',
			USER_ID
		);
	});

	it('rejects resolved → in_progress (terminal state)', async () => {
		listFallbackRequestsMock.mockResolvedValue([makeRequest('resolved')]);

		await expect(
			transitionStatus(USER_ID, REQUEST_ID, RESTAURANT_ID_A, 'in_progress', [RESTAURANT_ID_A])
		).rejects.toBeInstanceOf(StaffInboxTransitionError);

		expect(updateFallbackStatusMock).not.toHaveBeenCalled();
	});

	it('throws StaffInboxAuthorizationError when restaurantId is not in member list', async () => {
		await expect(
			transitionStatus(USER_ID, REQUEST_ID, RESTAURANT_ID_A, 'in_progress', [RESTAURANT_ID_B])
		).rejects.toBeInstanceOf(StaffInboxAuthorizationError);

		expect(listFallbackRequestsMock).not.toHaveBeenCalled();
		expect(updateFallbackStatusMock).not.toHaveBeenCalled();
	});

	it('throws StaffInboxTransitionError when request is not found', async () => {
		// Repository returns empty list (request not in this restaurant)
		listFallbackRequestsMock.mockResolvedValue([]);

		await expect(
			transitionStatus(USER_ID, REQUEST_ID, RESTAURANT_ID_A, 'in_progress', [RESTAURANT_ID_A])
		).rejects.toBeInstanceOf(StaffInboxTransitionError);

		expect(updateFallbackStatusMock).not.toHaveBeenCalled();
	});

	it('throws StaffInboxTransitionError on invalid requestId (non-UUID)', async () => {
		await expect(
			transitionStatus(USER_ID, 'not-a-uuid', RESTAURANT_ID_A, 'in_progress', [RESTAURANT_ID_A])
		).rejects.toBeInstanceOf(StaffInboxTransitionError);
	});

	it('throws StaffInboxTransitionError on invalid restaurantId (non-UUID)', async () => {
		await expect(
			transitionStatus(USER_ID, REQUEST_ID, 'not-a-uuid', 'in_progress', ['not-a-uuid'])
		).rejects.toBeInstanceOf(StaffInboxTransitionError);
	});
});
