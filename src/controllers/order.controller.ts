import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateOrderDTO } from '../models/order.model';
import { OrderType, OrderStatus } from '../models/enums';
import { randomUUID } from 'crypto';
import { addConnection, removeConnection, sendInitialStatus } from '../services/websocket.service';
import { storeOrder, getOrder } from '../services/redis.service';
import { createOrderInDB } from '../services/postgres.service';
import { enqueueOrder } from '../services/queue.service';
import type { WebSocket } from '@fastify/websocket';

// Simple validation helper
function validateOrderRequest(body: any): { valid: boolean; error?: string } {
  if (!body.type || !Object.values(OrderType).includes(body.type)) {
    return { valid: false, error: 'Invalid order type. Must be MARKET, LIMIT, or SNIPER' };
  }

  if (!body.tokenIn || typeof body.tokenIn !== 'string') {
    return { valid: false, error: 'tokenIn is required and must be a string' };
  }

  if (!body.tokenOut || typeof body.tokenOut !== 'string') {
    return { valid: false, error: 'tokenOut is required and must be a string' };
  }

  if (!body.amountIn || isNaN(parseFloat(body.amountIn))) {
    return { valid: false, error: 'amountIn is required and must be a number' };
  }

  // For this implementation, only MARKET orders are supported
  if (body.type !== OrderType.MARKET) {
    return { valid: false, error: 'Only MARKET orders are supported in this version. LIMIT and SNIPER coming soon.' };
  }

  return { valid: true };
}

export async function createOrder(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const body = request.body as CreateOrderDTO;

    // Validate request
    const validation = validateOrderRequest(body);
    if (!validation.valid) {
      return reply.status(400).send({
        error: validation.error
      });
    }

    // Generate orderId
    const orderId = randomUUID();

    // Create order object
    const order = {
      id: orderId,
      type: body.type,
      tokenIn: body.tokenIn,
      tokenOut: body.tokenOut,
      amountIn: body.amountIn,
      limitPrice: body.limitPrice,
      status: OrderStatus.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Store in both PostgreSQL (source of truth) and Redis (active processing)
    await Promise.all([
      createOrderInDB(order),
      storeOrder(order)
    ]);

    // Return orderId with WebSocket URL for status streaming
    const host = request.headers.host || 'localhost:8080';
    const protocol = request.headers['x-forwarded-proto'] === 'https' ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${host}/api/orders/execute?orderId=${orderId}`;

    return reply.status(201).send({
      orderId,
      wsUrl,
      type: order.type,
      tokenIn: order.tokenIn,
      tokenOut: order.tokenOut,
      amountIn: order.amountIn,
      limitPrice: order.limitPrice,
      status: order.status,
      message: 'Order created successfully. Connect to wsUrl for real-time updates.'
    });

  } catch (error: any) {
    console.error('Error creating order:', error);
    return reply.status(500).send({
      error: 'Internal server error',
      message: error.message
    });
  }
}

// WebSocket handler for order status streaming
export async function handleOrderStream(connection: WebSocket, req: FastifyRequest) {
  const { orderId } = req.query as { orderId?: string };

  if (!orderId) {
    connection.send(JSON.stringify({
      error: 'orderId is required in query params'
    }));
    connection.close();
    return;
  }

  // Add connection and send initial status
  addConnection(orderId, connection);
  // Enqueue order for processing AFTER WebSocket connection established
  const order = await getOrder(orderId);

  if (order) {
    await enqueueOrder({
      orderId: order.id,
      type: order.type,
      tokenIn: order.tokenIn,
      tokenOut: order.tokenOut,
      amountIn: order.amountIn,
      limitPrice: order.limitPrice,
    });
  }
  
  sendInitialStatus(orderId, connection);
  
  // Handle connection close
  connection.on('close', () => {
    removeConnection(orderId, connection);
  });

  // Handle errors
  connection.on('error', (err: any) => {
    console.error(`WebSocket error for order ${orderId}:`, err);
  });
}