import fastify from 'fastify'
import { createOrder } from '../controllers/order.controller'

const server = fastify()

// Order execution endpoint
server.post('/api/orders/execute', createOrder)

server.listen({ port: 8080 }, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server listening at ${address}`)
  console.log(`\nAPI Endpoints:`)
  console.log(`  GET  /ping`)
  console.log(`  POST /api/orders/execute`)
})