import pkg from 'pg';
const { Pool } = pkg;
import { Order } from '../models/order.model';
import { OrderStatus, OrderType } from '../models/enums';
import 'dotenv/config';

// Database representation of an order (matches PostgreSQL schema)
export interface DBOrder {
  id: string;
  type: OrderType;
  status: OrderStatus;
  token_in: string;
  token_out: string;
  amount_in: string;
  limit_price?: string;
  executed_price?: string;
  amount_out?: string;
  dex_used?: string;
  tx_signature?: string;
  created_at: string;
  completed_at?: string;
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('PostgreSQL error:', err);
});

/**
 * Create order in PostgreSQL (initial PENDING state)
 */
export async function createOrderInDB(order: Partial<Order>): Promise<void> {
  const query = `
    INSERT INTO orders (
      id, type, status, token_in, token_out, amount_in,
      limit_price, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `;

  const values = [
    order.id,
    order.type,
    OrderStatus.PENDING,
    order.tokenIn,
    order.tokenOut,
    order.amountIn,
    order.limitPrice || null,
    order.createdAt || new Date().toISOString(),
  ];

  await pool.query(query, values);
}

/**
 * Update order with final result (CONFIRMED or FAILED)
 * Called by API layer when worker completes processing
 */
export async function updateOrderFinalState(
  orderId: string,
  status: OrderStatus,
  result?: {
    executedPrice?: string;
    amountOut?: string;
    dexUsed?: string;
    txSignature?: string;
  }
): Promise<void> {
  const query = `
    UPDATE orders SET
      status = $1,
      executed_price = $2,
      amount_out = $3,
      dex_used = $4,
      tx_signature = $5,
      completed_at = NOW()
    WHERE id = $6
  `;

  const values = [
    status,
    result?.executedPrice || null,
    result?.amountOut || null,
    result?.dexUsed || null,
    result?.txSignature || null,
    orderId,
  ];

  await pool.query(query, values);
}

/**
 * Get order by ID from PostgreSQL
*/ 
export async function getOrderFromDB(orderId: string): Promise<DBOrder | null> {
  const query = 'SELECT * FROM orders WHERE id = $1';
  const result = await pool.query(query, [orderId]);

  if (result.rows.length === 0) return null;

  return result.rows[0] as DBOrder;
}

export { pool };
