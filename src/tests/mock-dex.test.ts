import { describe, it, expect } from 'vitest';
import { getRaydiumQuote, submitTransaction } from '../services/mock-dex.service';
import { DexName } from '../models/enums';

describe('Mock DEX Service', () => {
  it('should return valid quote with correct fees', async () => {
    const quote = await getRaydiumQuote('SOL', 'USDC', '1.5');

    expect(quote.dex).toBe(DexName.RAYDIUM);
    expect(parseFloat(quote.amountOut)).toBeGreaterThan(0);
    expect(quote.fee).toBe(0.0025);
  });

  it('should generate valid 88-character transaction signature', async () => {
    const signature = await submitTransaction(
      DexName.RAYDIUM,
      'SOL',
      'USDC',
      '1.0',
      '100.0'
    );

    expect(signature.length).toBe(88);
  });
});
