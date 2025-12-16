import { OrderType, OrderStatus, DexName } from './enums';

// Active order stored in Redis
export interface Order {
  id: string;
  type: OrderType;
  status: OrderStatus;

  tokenIn: string;
  tokenOut: string;
  amountIn: string;

  limitPrice?: string;

  selectedDex?: DexName;
  expectedAmountOut?: string;
  actualAmountOut?: string;
  slippageTolerance: number;

  transactionSignature?: string;

  retryCount: number;
  maxRetries: number;

  message?: string;
  willRetry?: boolean;
  attemptsMade?: number;
  failureReason?: string;

  createdAt: string;
  updatedAt: string;
}

// DTO for creating orders
export interface CreateOrderDTO {
  type: OrderType;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  limitPrice?: string;
  slippageTolerance?: number;
}

// WebSocket event structure
export interface StatusUpdateEvent {
  event: 'status_update' | 'order_created';
  orderId: string;
  status: OrderStatus;
  timestamp: string;
  data?: Partial<Order>;
}

// Job data for BullMQ
export interface OrderJob {
  orderId: string;
  type: OrderType;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  limitPrice?: string;
  slippageTolerance: number;
}

// DEX quote response
export interface DexQuote {
  dex: DexName;
  amountOut: string;
  priceImpact: string;
  fee: number;
}
