# Solana DEX Order Execution Engine

A limit order execution system with mock DEX routing (Raydium/Meteora), WebSocket status streaming, and BullMQ-based concurrent processing.

## Key Features

- **Multi-DEX Routing**: Compares quotes from Raydium and Meteora to select the best execution route (Mock Implementation)
- **Real-Time Updates**: WebSocket connection provides live order status updates
- **Concurrent Processing**: Handles 10 orders simultaneously with rate limiting (100 orders/minute)
- **Smart Retry Logic**: Exponential backoff retry strategy for transient failures
- **Mock DEX Implementation**: Simulates Raydium/Meteora behavior for faster development and testing

## Architecture

### Tech Stack

- **API**: Fastify (Node.js/TypeScript) - High-performance HTTP server
- **Database**: PostgreSQL with pg (node-postgres) - Order persistence
- **Queue**: BullMQ + Redis - Async job processing with retry logic
- **WebSocket**: Native Fastify WebSocket - Real-time status updates
- **Testing**: Vitest - Unit and integration tests
- **Docker**: Containerized infrastructure (PostgreSQL + Redis)

### Order Status Flow

```
PENDING → ROUTING → BUILDING → SUBMITTED → CONFIRMED
                                         ↘ FAILED
```

1. **PENDING**: Order created and queued
2. **ROUTING**: Fetching quotes from Raydium + Meteora
3. **BUILDING**: Constructing transaction with best route
4. **SUBMITTED**: Transaction submitted to DEX
5. **CONFIRMED**: Transaction confirmed (includes signature)
6. **FAILED**: Execution failed (includes error)

## Design Decisions

### 1. MARKET Orders Only

Chose MARKET orders as the simplest order type for MVP - executes immediately at current price without conditional logic. LIMIT orders require price monitoring and conditional execution, while SNIPER orders need token launch detection.

### 2. Mock DEX Implementation

Demonstrates architecture without Solana blockchain complexity. Mock DEXs allow deterministic testing with simulated latency and failures. All routing logic in `DexRouterService` remains unchanged when migrating to real Raydium/Meteora SDKs.

### 3. PostgreSQL as Source of Truth

Stores all order data permanently in the `orders` table. Redis only holds queue jobs with auto-cleanup. Can rebuild queue from PostgreSQL if Redis fails.

### 4. WebSocket During HTTP Upgrade

Prevents race conditions by ensuring clients receive all updates from PENDING onwards. Single request creates order and subscribes to updates simultaneously, guaranteeing no missed status events.

### 5. BullMQ for Job Queue

Provides built-in retry (4 attempts: 2s → 4s → 8s exponential backoff), observability, concurrency control (10 concurrent orders, 100/minute rate limit), and local development without external queue dependencies.

## Extending to Other Order Types

To add support for LIMIT and SNIPER orders:

**LIMIT Orders**: Add price comparison logic in worker before execution, implement periodic price polling to monitor market prices, and update validation to accept `limitPrice` parameter.

**SNIPER Orders**: Implement token launch monitoring service to detect new token deployments, add conditional execution logic for target tokens, and update validation to accept `targetToken` parameter.

The existing routing, queueing, and WebSocket infrastructure remains unchanged - only worker execution logic needs modification.

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Docker Desktop (for PostgreSQL + Redis)

### Installation

1. **Clone and install**
```bash
git clone <your-repo-url>
cd eternalabs
npm install
```

2. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration (defaults work for local development)
```

3. **Start infrastructure and application**
```bash
npm run docker:up
```
This automatically initializes the database schema using `scripts/init-db.sql`

4. **View logs**
```bash
npm run docker:logs
```

The API will be available at `http://localhost:8080`

## API Usage

### Create Order

**Endpoint**: `POST /api/orders/execute`

**Request Body**:
```json
{
  "type": "MARKET",
  "tokenIn": "So11111111111111111111111111111111111111112",
  "tokenOut": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "amountIn": "1.5"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "orderId": "cm6m6w3cj0000qpjc5z7e8d9f",
    "status": "PENDING",
    "message": "Order created and queued for execution"
  }
}
```

### WebSocket Updates

Include `Upgrade: websocket` header to receive real-time status updates:

```json
{
  "orderId": "cm6m6w3cj0000qpjc5z7e8d9f",
  "status": "ROUTING",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "metadata": {
    "message": "Fetching quotes from DEXs"
  }
}
```

WebSocket connections are automatically cleaned up 30 seconds after terminal status (CONFIRMED/FAILED).

## Testing

Run tests (requires infrastructure running):

```bash
npm run docker:up
npm test
npm run test:watch
npm test -- --coverage
```

The project includes 12 tests covering:
- DEX Router Service (quote selection, error handling)
- Mock DEX Service (quote generation, transaction signatures)
- Redis Service (storage, pub/sub)
- Queue Service (job enqueueing, retry configuration)
- WebSocket Service (connection management)
- Order Validation (valid/invalid orders)

## Demo Video

[Link to YouTube demo video will be added here]

## Deployment

Deployed on Railway: [URL will be added here]
