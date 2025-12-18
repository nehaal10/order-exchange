import { describe, it, expect, afterEach, vi } from 'vitest';
import { storeOrder, getOrder, publishStatusUpdate } from '../services/redis.service';
import { OrderStatus, OrderType } from '../models/enums';
import { redis } from '../services/redis.service';

describe('Redis Service', () => {
  const testOrderId = 'test-order-123';

  afterEach(async () => {
    await redis.del(`order:${testOrderId}`);
  });

  it('should store and retrieve an order', async () => {
    const order = {
      id: testOrderId,
      type: OrderType.MARKET,
      tokenIn: 'SOL',
      tokenOut: 'USDC',
      amountIn: '1.5',
      status: OrderStatus.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await storeOrder(order);
    const retrieved = await getOrder(testOrderId);

    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(testOrderId);
    expect(retrieved?.status).toBe(OrderStatus.PENDING);
  });

  it('should publish status update to Redis Pub/Sub', async () => {
    const publishSpy = vi.spyOn(redis, 'publish');

    await publishStatusUpdate(testOrderId, OrderStatus.CONFIRMED, {
      message: 'Order completed',
    });

    expect(publishSpy).toHaveBeenCalledWith(
      'order-status-updates',
      expect.stringContaining(testOrderId)
    );
  });
});
