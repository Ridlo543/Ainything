import { Worker } from 'bullmq';
import { redisConnection } from './connection';
import { generateEmbeddingsForRestaurant } from '$lib/server/services/embedding-worker';

export const embeddingWorker = new Worker(
	'embedding-jobs',
	async (job) => {
		const { restaurantId } = job.data;
		console.log(`[Queue] Processing embeddings for restaurant ${restaurantId}`);
		await generateEmbeddingsForRestaurant(restaurantId);
	},
	{ connection: redisConnection }
);

embeddingWorker.on('completed', (job) => {
	console.log(`[Queue] Completed job ${job.id}`);
});

embeddingWorker.on('failed', (job, err) => {
	console.error(`[Queue] Job ${job?.id} failed:`, err);
});
