import WebSocket from 'ws';

const BASE_URL = 'https://order-exchange.onrender.com';
const WS_BASE_URL = 'wss://order-exchange.onrender.com';

async function createOrder(orderNumber) {
  const response = await fetch(`${BASE_URL}/api/orders/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'MARKET',
      tokenIn: 'So11111111111111111111111111111111111111112',
      tokenOut: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      amountIn: `${Math.random() * 10 + 1}`,
    }),
  });

  const data = await response.json();
  return data.orderId;
}

function connectWebSocket(orderId, orderNumber) {
  return new Promise((resolve) => {
    const ws = new WebSocket(`${WS_BASE_URL}/api/orders/execute?orderId=${orderId}`);

    ws.on('open', () => {
      console.log(`[Order ${orderNumber + 1}] WebSocket connected for order: ${orderId}`);
    });

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      const timestamp = new Date().toISOString().split('T')[1].substring(0, 12);

      console.log(`[${timestamp}] [Order ${orderNumber + 1}] ${message.status} - ${message.message}`);

      // Terminal states (lowercase from backend)
      if (message.status === 'confirmed' || message.status === 'failed' || message.status === 'cancelled') {
        ws.close();
        resolve();
      }
    });

    ws.on('error', (error) => {
      console.error(`[Order ${orderNumber + 1}] WebSocket error:`, error.message);
      resolve();
    });

    ws.on('close', () => {
      console.log(`[Order ${orderNumber + 1}] WebSocket closed`);
    });
  });
}

async function runDemo() {
  console.log('Creating 5 orders concurrently...\n');

  // Create 5 orders simultaneously
  const orderIds = await Promise.all(
    Array.from({ length: 5 }, (_, i) => createOrder(i))
  );

  console.log(`\nCreated ${orderIds.length} orders`);
  console.log('Connecting to WebSockets to trigger worker processing...\n');
  console.log('='.repeat(80) + '\n');

  // Connect to all WebSockets simultaneously to trigger worker
  await Promise.all(orderIds.map((orderId, i) => connectWebSocket(orderId, i)));

  console.log('='.repeat(80));
  console.log('\n✓ All orders processed successfully!\n');
  process.exit(0);
}

runDemo().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
