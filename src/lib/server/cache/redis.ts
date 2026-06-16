import { building } from '$app/environment';
import { createClient } from 'redis';
import { appEnv } from '$lib/server/config/env';

type RedisClient = ReturnType<typeof createClient>;

let client: RedisClient | null = null;
let connectPromise: Promise<RedisClient> | null = null;

export async function getRedisClient() {
	if (building) {
		throw new Error('Redis client is not available while building the app');
	}

	if (!appEnv.redisUrl) {
		throw new Error('REDIS_URL is not configured');
	}

	if (!client) {
		client = createClient({ url: appEnv.redisUrl });
		client.on('error', (error) => {
			console.error('Redis client error', error);
		});
	}

	if (!client.isOpen) {
		connectPromise ??= client.connect().then(() => client as RedisClient);

		try {
			await connectPromise;
		} finally {
			connectPromise = null;
		}
	}

	return client;
}

export async function checkRedisHealth() {
	const redis = await getRedisClient();
	return (await redis.ping()) === 'PONG';
}
