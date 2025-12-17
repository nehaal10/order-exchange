import { Queue, QueueEvents } from 'bullmq';
import { redis } from './redis.service';
import { OrderJob } from '../models/order.model';
import 'dotenv/config';

// Create BullMQ queue for order processing
export const orderQueue = new Queue<OrderJob>('orders', {
  connection: redis,
  defaultJobOptions: {
    attempts: 4, // 1 initial + 3 retries
    backoff: {
      type: 'exponential',
      delay: 2000, // 2s, 4s, 8s
    },
    removeOnComplete: {
      age: 24 * 60 * 60, // Keep completed jobs for 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 60 * 60, // Keep failed jobs for 7 days
    },
  },
});

// Queue events listener
const queueEvents = new QueueEvents('orders', {
  connection: redis,
});

queueEvents.on('completed', ({ jobId }) => {
  console.log(`Order ${jobId} completed successfully`);
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`Order ${jobId} failed:`, failedReason);
});

// Add order to queue
export async function enqueueOrder(orderJob: OrderJob): Promise<void> {
  await orderQueue.add('process-order', orderJob, {
    jobId: orderJob.orderId,
  });
  const counts = await orderQueue.getJobCounts();
  console.log('Job Counts:', counts);

}

// Get job status
export async function getJobStatus(orderId: string) {
  const job = await orderQueue.getJob(orderId);
  if (!job) return null;

  const state = await job.getState();
  return {
    id: job.id,
    state,
    progress: job.progress,
    attemptsMade: job.attemptsMade,
    failedReason: job.failedReason,
  };
}

console.log('BullMQ order queue initialized');
