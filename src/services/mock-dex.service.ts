import { DexName } from '../models/enums';

// Mock DEX service to simulate Raydium and Meteora quotes
// Simulates network latency and pricing variance for realistic testing

const MOCK_LATENCY_MS = 200; // 200ms simulated network delay
const FAILURE_RATE = 0.05; // 5% random failure rate

export interface DexQuote {
  dex: DexName;
  amountOut: string;
  priceImpact: string;
  fee: number;
}

function simulateLatency(): Promise<void> {
  return new Promise(resolve =>
    setTimeout(resolve, MOCK_LATENCY_MS + Math.random() * 50)
  );
}

// Simulates fetching a quote from Raydium
export async function getRaydiumQuote(
  _tokenIn: string,
  _tokenOut: string,
  amountIn: string
): Promise<DexQuote> {
  await simulateLatency();

  // 5% chance to simulate DEX unavailability
  if (Math.random() < FAILURE_RATE) {
    throw new Error('DexUnavailableError: Raydium pool temporarily unavailable');
  }

  // Mock calculation: simple conversion with random variance
  const baseAmount = parseFloat(amountIn);
  const variance = 0.98 + Math.random() * 0.04; // ±2% variance
  const raydiumBonus = 1.001; // Raydium slightly better (0.1% bonus)
  const amountOut = (baseAmount * 100 * variance * raydiumBonus).toFixed(6); // Mock 1:100 rate

  return {
    dex: DexName.RAYDIUM,
    amountOut,
    priceImpact: (Math.random() * 0.5).toFixed(4), // 0-0.5% impact
    fee: 0.0025, // 0.25% fee
  };
}

// Simulates fetching a quote from Meteora
export async function getMeteoraQuote(
  _tokenIn: string,
  _tokenOut: string,
  amountIn: string
): Promise<DexQuote> {
  await simulateLatency();

  // 5% chance to simulate DEX unavailability
  if (Math.random() < FAILURE_RATE) {
    throw new Error('DexUnavailableError: Meteora pool temporarily unavailable');
  }

  // Mock calculation: simple conversion with random variance
  const baseAmount = parseFloat(amountIn);
  const variance = 0.98 + Math.random() * 0.04; // ±2% variance
  const amountOut = (baseAmount * 100 * variance).toFixed(6); // Mock 1:100 rate

  return {
    dex: DexName.METEORA,
    amountOut,
    priceImpact: (Math.random() * 0.5).toFixed(4), // 0-0.5% impact
    fee: 0.003, // 0.3% fee (slightly higher than Raydium)
  };
}

// Simulates transaction submission
export async function submitTransaction(
  _dex: DexName,
  _tokenIn: string,
  _tokenOut: string,
  _amountIn: string,
  _expectedAmountOut: string
): Promise<string> {
  await simulateLatency();

  // 5% chance to simulate transaction failure
  if (Math.random() < FAILURE_RATE) {
    throw new Error('TransactionTimeoutError: Transaction confirmation timeout');
  }

  // Generate mock transaction signature
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let signature = '';
  for (let i = 0; i < 88; i++) {
    signature += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return signature;
}

console.log('Mock DEX service initialized');
