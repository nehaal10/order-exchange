import type { WebSocket } from '@fastify/websocket';
import { OrderStatus } from '../models/enums';
import Redis from 'ioredis';

// In-memory storage for WebSocket connections
// Maps orderId -> Set of WebSocket connections
const orderConnections = new Map<string, Set<WebSocket>>();

// Redis subscriber for receiving status updates from worker
const subscriber = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

const CHANNEL_NAME = 'order-status-updates';

// Initialize Redis subscriber
subscriber.subscribe(CHANNEL_NAME, (err) => {
  if (err) {
    console.error('Failed to subscribe to Redis channel:', err);
  } else {
    console.log(`Subscribed to Redis channel: ${CHANNEL_NAME}`);
  }
});

// Listen for messages from worker
subscriber.on('message', (channel, message) => {
  if (channel === CHANNEL_NAME) {
    try {
      const update = JSON.parse(message);
      const { orderId, status, ...data } = update;

      console.log(`[Redis Pub/Sub] Received update for order ${orderId}: ${status}`);

      // Broadcast to all WebSocket connections for this order
      broadcastStatus(orderId, status, data);
    } catch (error) {
      console.error('Error processing Redis message:', error);
    }
  }
});

// Helper to broadcast status updates to all connections for an order
export function broadcastStatus(orderId: string, status: OrderStatus, data?: any) {
  const connections = orderConnections.get(orderId);
  if (!connections) return;

  const message = JSON.stringify({
    orderId,
    status,
    timestamp: new Date().toISOString(),
    ...data
  });

  connections.forEach((ws) => {
    if (ws.readyState === 1) { // WebSocket.OPEN
      ws.send(message);
    }
  });
}

// Add a connection for an order
export function addConnection(orderId: string, ws: WebSocket) {
  if (!orderConnections.has(orderId)) {
    orderConnections.set(orderId, new Set());
  }
  orderConnections.get(orderId)!.add(ws);
  console.log(`WebSocket client connected for order: ${orderId}`);
}

// Remove a connection for an order
export function removeConnection(orderId: string, ws: WebSocket) {
  const connections = orderConnections.get(orderId);
  if (connections) {
    connections.delete(ws);
    if (connections.size === 0) {
      orderConnections.delete(orderId);
    }
  }
  console.log(`WebSocket client disconnected for order: ${orderId}`);
}

// Send initial PENDING status when client connects
export function sendInitialStatus(orderId: string, ws: WebSocket) {
  ws.send(JSON.stringify({
    orderId,
    status: OrderStatus.PENDING,
    timestamp: new Date().toISOString(),
    message: 'Connected to order status stream'
  }));
}
