import { Worker, Job } from 'bullmq';
import { redis } from '../services/redis.service';
import { OrderJob } from '../models/order.model';
import { OrderStatus } from '../models/enums';
import { updateOrderStatus, publishStatusUpdate } from '../services/redis.service';
import { updateOrderFinalState } from '../services/postgres.service';
import { getBestQuote, executeSwap } from '../services/dex-router.service';
import 'dotenv/config';

// Worker processes orders from BullMQ queue
// Updates Redis for intermediate states, PostgreSQL for terminal states
// Publishes WebSocket events via Redis Pub/Sub for each status change

const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT_ORDERS || '10');

async function processOrder(job: Job<OrderJob>): Promise<void> {
  const { orderId, type, tokenIn, tokenOut, amountIn } = job.data;

  console.log(`\n[Worker] Processing order ${orderId}`);
  console.log(`[Worker] Type: ${type}, ${amountIn} ${tokenIn} -> ${tokenOut}`);

  try {
    // Step 1: ROUTING - Fetch best quote from DEXs
    await updateOrderStatus(orderId, OrderStatus.ROUTING, {
      message: 'Fetching quotes from Raydium and Meteora...',
    });
    await publishStatusUpdate(orderId, OrderStatus.ROUTING, {
      message: 'Fetching quotes from Raydium and Meteora...',
    });

    const bestQuote = await getBestQuote(tokenIn, tokenOut, amountIn);

    console.log(`[Worker] Best route: ${bestQuote.dex} - ${bestQuote.amountOut} output`);

    // Step 2: BUILDING - Prepare transaction
    await updateOrderStatus(orderId, OrderStatus.BUILDING, {
      selectedDex: bestQuote.dex,
      expectedAmountOut: bestQuote.amountOut,
      message: `Building transaction on ${bestQuote.dex}...`,
    });
    await publishStatusUpdate(orderId, OrderStatus.BUILDING, {
      message: `Building transaction on ${bestQuote.dex}...`,
      selectedDex: bestQuote.dex,
      expectedAmountOut: bestQuote.amountOut,
    });

    // Simulate transaction building delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 3: SUBMITTED - Submit transaction to blockchain
    await updateOrderStatus(orderId, OrderStatus.SUBMITTED, {
      message: 'Transaction submitted, awaiting confirmation...',
    });
    await publishStatusUpdate(orderId, OrderStatus.SUBMITTED, {
      message: 'Transaction submitted, awaiting confirmation...',
    });

    const txSignature = await executeSwap(
      bestQuote.dex,
      tokenIn,
      tokenOut,
      amountIn,
      bestQuote.amountOut
    );

    // Step 4: CONFIRMED - Transaction confirmed
    await updateOrderStatus(orderId, OrderStatus.CONFIRMED, {
      actualAmountOut: bestQuote.amountOut,
      transactionSignature: txSignature,
      message: 'Order executed successfully!',
    });
    await publishStatusUpdate(orderId, OrderStatus.CONFIRMED, {
      message: 'Order executed successfully!',
      actualAmountOut: bestQuote.amountOut,
      transactionSignature: txSignature,
      dexUsed: bestQuote.dex,
    });

    // Update PostgreSQL with final state
    await updateOrderFinalState(orderId, OrderStatus.CONFIRMED, {
      executedPrice: (parseFloat(bestQuote.amountOut) / parseFloat(amountIn)).toFixed(9),
      amountOut: bestQuote.amountOut,
      dexUsed: bestQuote.dex,
      txSignature,
    });

    console.log(`[Worker] Order ${orderId} completed successfully`);

  } catch (error: any) {
    console.error(`[Worker] Order ${orderId} failed:`, error.message);

    // Determine if error is retryable
    const isRetryable = error.message.includes('DexUnavailableError') ||
                        error.message.includes('TransactionTimeoutError');

    if (isRetryable && job.attemptsMade < 3) {
      // Let BullMQ handle retry with exponential backoff
      await updateOrderStatus(orderId, OrderStatus.PENDING, {
        message: `Retrying... (attempt ${job.attemptsMade + 1}/4)`,
        willRetry: true,
        attemptsMade: job.attemptsMade,
      });
      await publishStatusUpdate(orderId, OrderStatus.PENDING, {
        message: `Retrying... (attempt ${job.attemptsMade + 1}/4)`,
        willRetry: true,
        attemptsMade: job.attemptsMade,
      });

      throw error; // Re-throw to trigger BullMQ retry
    } else {
      // Non-retryable error or max retries reached - mark as FAILED
      await updateOrderStatus(orderId, OrderStatus.FAILED, {
        message: error.message,
        failureReason: error.message,
        attemptsMade: job.attemptsMade,
      });
      await publishStatusUpdate(orderId, OrderStatus.FAILED, {
        message: error.message,
        failureReason: error.message,
        attemptsMade: job.attemptsMade,
      });

      // Update PostgreSQL with final state
      await updateOrderFinalState(orderId, OrderStatus.FAILED);

      console.log(`[Worker] Order ${orderId} marked as FAILED`);
    }
  }
}

// Create worker instance
export const orderWorker = new Worker<OrderJob>('orders', processOrder, {
  connection: redis,
  concurrency: MAX_CONCURRENT,
  limiter: {
    max: parseInt(process.env.ORDERS_PER_MINUTE || '100'),
    duration: 60000, // 1 minute
  },
});

orderWorker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed`);
});

orderWorker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed after all retries:`, err.message);
});

orderWorker.on('error', (err) => {
  console.error('[Worker] Worker error:', err);
});

console.log(`\n Order processor worker started (concurrency: ${MAX_CONCURRENT})\n`);
