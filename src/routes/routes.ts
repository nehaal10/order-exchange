import fastify from 'fastify'
import websocket from '@fastify/websocket'
import { createOrder, handleOrderStream } from '../controllers/order.controller'

async function startServer() {
  const server = fastify()
  await server.register(websocket)

  // Order execution endpoint (HTTP POST)
  server.post('/api/orders/execute', createOrder)

  // WebSocket streaming endpoint
  server.register(async function (server) {
      server.get('/api/orders/execute', { websocket: true }, handleOrderStream);
  });

  server.listen({ port: 8080, host: '0.0.0.0' }, (err, address) => {
    if (err) {
      console.error(err)
      process.exit(1)
    }
    console.log(`Server listening at ${address}`)
    console.log(`\nAPI Endpoints:`)
    console.log(`  POST /api/orders/execute - Create order and get WebSocket URL`)
  })
}

startServer().catch(err => {
  console.error('Failed to start server:', err)
  process.exit(1)
})