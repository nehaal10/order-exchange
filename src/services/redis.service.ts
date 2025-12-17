import Redis from 'ioredis';
import { Order } from '../models/order.model';
import { OrderStatus } from '../models/enums';
import 'dotenv/config';

// Initialize Redis client
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6380'),
  maxRetriesPerRequest: null, // Required for BullMQ
});

redis.on('connect', () => {
  console.log('Connected to Redis');
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

// Key prefixes for different data types
const KEYS = {
  ORDER: (orderId: string) => `order:${orderId}`,
  ORDER_STATUS: (orderId: string) => `order:${orderId}:status`,
};

// TTL for orders in Redis (24 hours)
const ORDER_TTL = 24 * 60 * 60; // seconds

/**
 * Store order in Redis
 */
export async function storeOrder(order: Partial<Order>): Promise<void> {
  const key = KEYS.ORDER(order.id!);
  await redis.setex(key, ORDER_TTL, JSON.stringify(order));
}

/**
 * Get order from Redis
 */
export async function getOrder(orderId: string): Promise<Order | null> {
  const key = KEYS.ORDER(orderId);
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}

/**
 * Update order status in Redis
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  metadata?: Record<string, any>
): Promise<void> {
  const order = await getOrder(orderId);
  if (!order) {
    throw new Error(`Order ${orderId} not found in Redis`);
  }

  const updatedOrder = {
    ...order,
    status,
    updatedAt: new Date().toISOString(),
    ...metadata,
  };

  await storeOrder(updatedOrder);
}

/**
 * Delete order from Redis (after completion/failure)
 */
export async function deleteOrder(orderId: string): Promise<void> {
  const key = KEYS.ORDER(orderId);
  await redis.del(key);
}

/**
 * Get all active orders (for monitoring/debugging)
 */
export async function getAllActiveOrders(): Promise<Order[]> {
  const keys = await redis.keys('order:*');
  const orderKeys = keys.filter(k => !k.includes(':status'));

  if (orderKeys.length === 0) return [];

  const orders = await redis.mget(orderKeys);
  return orders
    .filter((o): o is string => o !== null)
    .map(o => JSON.parse(o));
}

// Export redis client for use in other services
export { redis };
