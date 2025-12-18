import { describe, it, expect, beforeEach } from 'vitest';
import { addConnection, removeConnection, broadcastStatus } from '../services/websocket.service';
import { OrderStatus } from '../models/enums';

class MockWebSocket {
  public readyState = 1;
  public sentMessages: string[] = [];

  send(message: string) {
    this.sentMessages.push(message);
  }
}

describe('WebSocket Service', () => {
  let mockWs: MockWebSocket;
  const testOrderId = 'test-ws-order-123';

  beforeEach(() => {
    mockWs = new MockWebSocket();
  });

  it('should add a WebSocket connection for an order', () => {
    addConnection(testOrderId, mockWs as any);
    broadcastStatus(testOrderId, OrderStatus.PENDING, { message: 'Test' });

    expect(mockWs.sentMessages.length).toBe(1);
    const message = JSON.parse(mockWs.sentMessages[0]);
    expect(message.orderId).toBe(testOrderId);
    expect(message.status).toBe(OrderStatus.PENDING);
  });

  it('should remove a connection', () => {
    addConnection(testOrderId, mockWs as any);
    removeConnection(testOrderId, mockWs as any);
    broadcastStatus(testOrderId, OrderStatus.CONFIRMED, { message: 'Done' });

    expect(mockWs.sentMessages.length).toBe(0);
  });
});
