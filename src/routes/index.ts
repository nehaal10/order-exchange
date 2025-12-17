import fastify from 'fastify'
import websocket from '@fastify/websocket'
import { createOrder, handleOrderStream } from '../controllers/order.controller'

const server = fastify()
await server.register(websocket)

// Order execution endpoint (HTTP POST)
server.post('/api/orders/execute', createOrder)

// WebSocket streaming endpoint
server.register(async function (server) {
    server.get('/api/orders/stream', { websocket: true }, handleOrderStream);
});


server.listen({ port: 8080 }, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server listening at ${address}`)
  console.log(`\nAPI Endpoints:`)
  console.log(`  POST /api/orders/execute - Create order and get WebSocket URL`)
  console.log(`  WS   /api/orders/stream?orderId=<id> - Stream order status updates`)
})