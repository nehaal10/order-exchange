import { describe, it, expect, vi } from 'vitest';
import { getBestQuote } from '../services/dex-router.service';
import { DexName } from '../models/enums';
import * as mockDex from '../services/mock-dex.service';

describe('DEX Router Service', () => {
  it('should select the best quote based on highest amountOut', async () => {
    vi.spyOn(mockDex, 'getRaydiumQuote').mockResolvedValue({
      dex: DexName.RAYDIUM,
      amountOut: '100.5',
      priceImpact: '0.1',
      fee: 0.0025,
    });

    vi.spyOn(mockDex, 'getMeteoraQuote').mockResolvedValue({
      dex: DexName.METEORA,
      amountOut: '102.3',
      priceImpact: '0.15',
      fee: 0.003,
    });

    const quote = await getBestQuote('SOL', 'USDC', '1.0');

    expect(quote.dex).toBe(DexName.METEORA);
    expect(quote.amountOut).toBe('102.3');
  });

  it('should throw error when all DEXs are unavailable', async () => {
    vi.spyOn(mockDex, 'getRaydiumQuote').mockRejectedValue(
      new Error('DexUnavailableError: Raydium pool temporarily unavailable')
    );

    vi.spyOn(mockDex, 'getMeteoraQuote').mockRejectedValue(
      new Error('DexUnavailableError: Meteora pool temporarily unavailable')
    );

    await expect(getBestQuote('SOL', 'USDC', '1.0')).rejects.toThrow(
      'DexUnavailableError: All DEXs unavailable'
    );
  });
});
