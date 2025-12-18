import { describe, it, expect, afterEach } from 'vitest';
import { enqueueOrder, orderQueue } from '../services/queue.service';
import { OrderType } from '../models/enums';

describe('Queue Service', () => {
  afterEach(async () => {
    await orderQueue.obliterate({ force: true });
  });

  it('should enqueue job with orderId as jobId', async () => {
    const orderJob = {
      orderId: 'test-queue-order-1',
      type: OrderType.MARKET,
      tokenIn: 'SOL',
      tokenOut: 'USDC',
      amountIn: '1.5',
    };

    await enqueueOrder(orderJob);
    const job = await orderQueue.getJob(orderJob.orderId);

    expect(job).toBeDefined();
    expect(job?.id).toBe(orderJob.orderId);
  });

  it('should have correct retry configuration (4 attempts, exponential backoff)', async () => {
    const orderJob = {
      orderId: 'test-retry-config',
      type: OrderType.MARKET,
      tokenIn: 'SOL',
      tokenOut: 'USDC',
      amountIn: '1.0',
    };

    await enqueueOrder(orderJob);
    const job = await orderQueue.getJob(orderJob.orderId);

    expect(job?.opts.attempts).toBe(4);
    expect(job?.opts.backoff).toEqual({
      type: 'exponential',
      delay: 2000,
    });
  });
});
