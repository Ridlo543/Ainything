import { Queue } from 'bullmq';
import { redisConnection } from './connection';

export const embeddingQueue = new Queue('embedding-jobs', { connection: redisConnection });

export async function enqueueEmbeddingJob(restaurantId: string) {
	await embeddingQueue.add(
		'generate-embeddings',
		{ restaurantId },
		{
			attempts: 3,
			backoff: { type: 'exponential', delay: 1000 }
		}
	);
}
