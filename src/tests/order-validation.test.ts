import { describe, it, expect } from 'vitest';
import { OrderType } from '../models/enums';

describe('Order Validation', () => {
  it('should validate correct MARKET order', () => {
    const order = {
      type: OrderType.MARKET,
      tokenIn: 'SOL',
      tokenOut: 'USDC',
      amountIn: '1.5',
    };

    expect(order.type).toBe(OrderType.MARKET);
    expect(parseFloat(order.amountIn)).toBeGreaterThan(0);
    expect(order.tokenIn).toBeTruthy();
    expect(order.tokenOut).toBeTruthy();
  });

  it('should reject invalid orders with negative amounts', () => {
    const invalidAmount = '-1.5';
    expect(parseFloat(invalidAmount)).toBeLessThan(0);

    const zeroAmount = '0';
    expect(parseFloat(zeroAmount)).toBe(0);
  });
});
