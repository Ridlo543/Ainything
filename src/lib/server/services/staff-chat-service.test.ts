import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock the repository before importing the service under test
// ---------------------------------------------------------------------------

const getRoomContextMock = vi.fn();
const getMessagesByRoomMock = vi.fn();
const insertStaffMessageMock = vi.fn();
const insertBuyerMessageMock = vi.fn();
const getBuyerRoomContextMock = vi.fn();

vi.mock('$lib/server/repositories/staff-chat-repository', () => ({
	getRoomContext: (...args: unknown[]) => getRoomContextMock(...args),
	getMessagesByRoom: (...args: unknown[]) => getMessagesByRoomMock(...args),
	insertStaffMessage: (...args: unknown[]) => insertStaffMessageMock(...args),
	insertBuyerMessage: (...args: unknown[]) => insertBuyerMessageMock(...args),
	getBuyerRoomContext: (...args: unknown[]) => getBuyerRoomContextMock(...args)
}));

// Redis — disabled in unit tests so publish path is a no-op
vi.mock('$lib/server/config/env', () => ({
	appEnv: { redisUrl: null }
}));

vi.mock('$lib/server/cache/redis', () => ({
	getRedisClient: vi.fn()
}));

// SvelteKit error() throws — replicate exact behavior
vi.mock('@sveltejs/kit', () => ({
	error: (status: number, message: string) => {
		const err = new Error(message) as Error & { status: number };
		err.status = status;
		throw err;
	}
}));

const { getChatHistory, sendStaffReply, sendBuyerMessage, chatChannel } =
	await import('./staff-chat-service');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ROOM_ID = 'f1e2d3c4-b5a6-4789-abcd-eeeeeeeeeeee';
const ORG_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-000000000001';
const OUTLET_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-000000000002';
const BUYER_SESSION_ID = 'b1b2b3b4-b5b6-4b7b-8b9b-bbbbbbbbbbbb';
const USER_ID = 'u1u2u3u4-u5u6-4u7u-8u9u-uuuuuuuuuuuu';

const makeRoomContext = (override: Partial<{ buyerSessionId: string | null }> = {}) => ({
	organizationId: ORG_ID,
	outletId: OUTLET_ID,
	buyerSessionId: BUYER_SESSION_ID,
	...override
});

const makeMessage = (role: 'staff' | 'customer' = 'staff') => ({
	id: 'msg-1',
	roomId: ROOM_ID,
	role,
	content: 'Halo, ada yang bisa dibantu?',
	senderName: role === 'staff' ? 'Staff A' : null,
	createdAt: '2026-06-28T12:00:00Z'
});

const makeAuthUser = (outletIds: string[] = [OUTLET_ID]) => ({
	id: USER_ID,
	email: 'staff@example.com',
	name: 'Staff A',
	platformRole: 'staff' as const,
	memberships: [{ organizationId: ORG_ID, outletIds, role: 'staff' as const }]
});

// ---------------------------------------------------------------------------
// chatChannel
// ---------------------------------------------------------------------------

describe('chatChannel', () => {
	it('returns the correct Redis channel name', () => {
		expect(chatChannel(ROOM_ID)).toBe(`chat:${ROOM_ID}`);
	});
});

// ---------------------------------------------------------------------------
// getChatHistory
// ---------------------------------------------------------------------------

describe('getChatHistory', () => {
	beforeEach(() => {
		getRoomContextMock.mockReset();
		getMessagesByRoomMock.mockReset();
	});

	it('returns messages when room exists', async () => {
		getRoomContextMock.mockResolvedValue(makeRoomContext());
		const msgs = [makeMessage()];
		getMessagesByRoomMock.mockResolvedValue(msgs);

		const result = await getChatHistory(ROOM_ID);

		expect(getRoomContextMock).toHaveBeenCalledWith(ROOM_ID);
		expect(getMessagesByRoomMock).toHaveBeenCalledWith(ROOM_ID, 50);
		expect(result).toEqual(msgs);
	});

	it('throws 404 when room does not exist', async () => {
		getRoomContextMock.mockResolvedValue(null);

		await expect(getChatHistory(ROOM_ID)).rejects.toMatchObject({ status: 404 });
		expect(getMessagesByRoomMock).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// sendStaffReply
// ---------------------------------------------------------------------------

describe('sendStaffReply', () => {
	beforeEach(() => {
		getRoomContextMock.mockReset();
		insertStaffMessageMock.mockReset();
	});

	it('inserts and returns the message when access is valid', async () => {
		getRoomContextMock.mockResolvedValue(makeRoomContext());
		const msg = makeMessage('staff');
		insertStaffMessageMock.mockResolvedValue(msg);

		const user = makeAuthUser();
		const result = await sendStaffReply(user, ROOM_ID, 'Halo!');

		expect(insertStaffMessageMock).toHaveBeenCalledWith(
			ROOM_ID,
			USER_ID,
			USER_ID,
			'Halo!',
			ORG_ID,
			OUTLET_ID
		);
		expect(result).toEqual(msg);
	});

	it('throws 404 when room does not exist', async () => {
		getRoomContextMock.mockResolvedValue(null);

		await expect(sendStaffReply(makeAuthUser(), ROOM_ID, 'test')).rejects.toMatchObject({
			status: 404
		});
		expect(insertStaffMessageMock).not.toHaveBeenCalled();
	});

	it('throws 403 when user has no membership in the room org', async () => {
		getRoomContextMock.mockResolvedValue(makeRoomContext());
		const user = makeAuthUser();
		user.memberships = []; // no memberships at all

		await expect(sendStaffReply(user, ROOM_ID, 'test')).rejects.toMatchObject({ status: 403 });
		expect(insertStaffMessageMock).not.toHaveBeenCalled();
	});

	it('throws 403 when user is in org but not in the specific outlet', async () => {
		getRoomContextMock.mockResolvedValue(makeRoomContext());
		// User belongs to org but not the outlet that owns the room
		const user = makeAuthUser(['other-outlet-id']);

		await expect(sendStaffReply(user, ROOM_ID, 'test')).rejects.toMatchObject({ status: 403 });
		expect(insertStaffMessageMock).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// sendBuyerMessage
// ---------------------------------------------------------------------------

describe('sendBuyerMessage', () => {
	beforeEach(() => {
		getBuyerRoomContextMock.mockReset();
		insertBuyerMessageMock.mockReset();
	});

	it('inserts and returns the message when buyer session matches', async () => {
		getBuyerRoomContextMock.mockResolvedValue({ organizationId: ORG_ID, outletId: OUTLET_ID });
		const msg = makeMessage('customer');
		insertBuyerMessageMock.mockResolvedValue(msg);

		const result = await sendBuyerMessage(BUYER_SESSION_ID, ROOM_ID, 'Halo!');

		expect(getBuyerRoomContextMock).toHaveBeenCalledWith(ROOM_ID, BUYER_SESSION_ID);
		expect(insertBuyerMessageMock).toHaveBeenCalledWith(
			ROOM_ID,
			BUYER_SESSION_ID,
			'Halo!',
			ORG_ID,
			OUTLET_ID
		);
		expect(result).toEqual(msg);
	});

	it('throws 403 when room does not exist', async () => {
		getBuyerRoomContextMock.mockResolvedValue(null);

		await expect(sendBuyerMessage(BUYER_SESSION_ID, ROOM_ID, 'test')).rejects.toMatchObject({
			status: 403
		});
		expect(insertBuyerMessageMock).not.toHaveBeenCalled();
	});

	it('throws 403 when buyer session does not own the room', async () => {
		getBuyerRoomContextMock.mockResolvedValue(null);

		await expect(sendBuyerMessage(BUYER_SESSION_ID, ROOM_ID, 'test')).rejects.toMatchObject({
			status: 403
		});
		expect(insertBuyerMessageMock).not.toHaveBeenCalled();
	});
});
