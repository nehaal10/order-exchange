import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateOrderDTO } from '../models/order.model';
import { OrderType } from '../models/enums';
import { randomUUID } from 'crypto';

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

  if (body.slippageTolerance !== undefined &&
      (isNaN(parseFloat(body.slippageTolerance)) ||
       parseFloat(body.slippageTolerance) < 0 ||
       parseFloat(body.slippageTolerance) > 100)) {
    return { valid: false, error: 'slippageTolerance must be between 0 and 100' };
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

    // For now, just return the orderId
    // We'll add WebSocket upgrade in next commit
    return reply.status(201).send({
      orderId,
      type: body.type,
      tokenIn: body.tokenIn,
      tokenOut: body.tokenOut,
      amountIn: body.amountIn,
      limitPrice: body.limitPrice,
      slippageTolerance: body.slippageTolerance,
      status: 'pending',
      message: 'Order created successfully'
    });

  } catch (error: any) {
    console.error('Error creating order:', error);
    return reply.status(500).send({
      error: 'Internal server error',
      message: error.message
    });
  }
}
