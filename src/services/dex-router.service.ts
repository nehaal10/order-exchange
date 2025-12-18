import { DexName } from '../models/enums';
import { DexQuote, getRaydiumQuote, getMeteoraQuote, submitTransaction } from './mock-dex.service';

// DEX Router: Fetches quotes from multiple DEXs and selects the best route

export async function getBestQuote(
  tokenIn: string,
  tokenOut: string,
  amountIn: string
): Promise<DexQuote> {
  console.log(`[DEX Router] Fetching quotes for ${amountIn} ${tokenIn} -> ${tokenOut}`);

  try {
    // Fetch quotes from both DEXs in parallel
    const [raydiumQuote, meteoraQuote] = await Promise.allSettled([
      getRaydiumQuote(tokenIn, tokenOut, amountIn),
      getMeteoraQuote(tokenIn, tokenOut, amountIn),
    ]);

    const quotes: DexQuote[] = [];

    if (raydiumQuote.status === 'fulfilled') {
      quotes.push(raydiumQuote.value);
      console.log(`[DEX Router] Raydium quote: ${raydiumQuote.value.amountOut}`);
    } else {
      console.warn(`[DEX Router] Raydium failed: ${raydiumQuote.reason}`);
    }

    if (meteoraQuote.status === 'fulfilled') {
      quotes.push(meteoraQuote.value);
      console.log(`[DEX Router] Meteora quote: ${meteoraQuote.value.amountOut}`);
    } else {
      console.warn(`[DEX Router] Meteora failed: ${meteoraQuote.reason}`);
    }

    if (quotes.length === 0) {
      throw new Error('DexUnavailableError: All DEXs unavailable');
    }

    // Select best quote (highest amountOut)
    const bestQuote = quotes.reduce((best, current) =>
      parseFloat(current.amountOut) > parseFloat(best.amountOut) ? current : best
    );

    console.log(`[DEX Router] Best quote: ${bestQuote.dex} with ${bestQuote.amountOut}`);

    return bestQuote;
  } catch (error: any) {
    console.error('[DEX Router] Error fetching quotes:', error.message);
    throw error;
  }
}

export async function executeSwap(
  dex: DexName,
  tokenIn: string,
  tokenOut: string,
  amountIn: string,
  expectedAmountOut: string
): Promise<string> {
  console.log(`[DEX Router] Executing swap on ${dex}`);

  const txSignature = await submitTransaction(
    dex,
    tokenIn,
    tokenOut,
    amountIn,
    expectedAmountOut
  );

  console.log(`[DEX Router] Transaction confirmed: ${txSignature}`);

  return txSignature;
}
