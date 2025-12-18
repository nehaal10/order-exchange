
## Key Features

- **Multi-DEX Routing**: Compares quotes from Raydium and Meteora to select the best execution route (Mock Implementation)
- **Real-Time Updates**: WebSocket connection provides live order status updates (PENDING → ROUTING → BUILDING → SUBMITTED → CONFIRMED)
- **Concurrent Processing**: BullMQ worker pool handles 10 orders simultaneously with rate limiting (100 orders/minute)
- **Smart Retry Logic**: Exponential backoff retry strategy (4 attempts: 2s → 4s → 8s) for transient failures
- **Data Integrity**: PostgreSQL as source of truth for all order data
- **Mock DEX Implementation**: Simulates Raydium/Meteora behavior for faster development and testing

## Architecture

### Tech Stack

- **API**: Fastify (Node.js/TypeScript) - High-performance HTTP server
- **Database**: PostgreSQL with pg (node-postgres) - Order persistence
- **Queue**: BullMQ + Redis - Async job processing with retry logic
- **WebSocket**: Native Fastify WebSocket - Real-time status updates
- **Testing**: Vitest - Unit and integration tests
- **Docker**: Containerized infrastructure (PostgreSQL + Redis)

### Request Flow

```
Client → HTTP POST → PostgreSQL (create order)
                   ↓
              WebSocket Upgrade
                   ↓
         Enqueue job to Redis
                   ↓
        Broadcast PENDING status
                   ↓
      Worker picks job from queue
                   ↓
    ROUTING → fetch DEX quotes in parallel
                   ↓
    BUILDING → construct transaction
                   ↓
    SUBMITTED → submit to mock DEX
                   ↓
    CONFIRMED → update PostgreSQL + broadcast
```

**Critical Sequence**:
1. **PostgreSQL WRITE** - Create order record (status: PENDING)
2. **WebSocket UPGRADE** - Establish connection before queueing
3. **WebSocket BROADCAST** - Send initial PENDING event
4. **Redis ENQUEUE** - Add BullMQ job for async processing

This ensures clients receive updates from the beginning and orders exist before processing starts.

## Design Decisions

### 1. MARKET Orders Only

Choose Market Orders only because of its Simplest order type for MVP executes immediately at current price without conditional logic. LIMIT orders require price monitoring and conditional execution. SNIPER orders need token launch detection. MARKET orders demonstrate core routing, queueing, and WebSocket systems without added complexity.

**Extending to LIMIT/SNIPER**:
- Add price comparison logic in worker before execution
- Implement periodic price polling for limit orders
- Add token launch monitoring service for sniper orders
- Update validation to accept `limitPrice` and `targetToken` parameters

### 2. PostgreSQL as Source of Truth

PostgreSQL stores all order data permanently in the `orders` table. 


### 3. WebSocket During HTTP Upgrade

Prevents race conditions by ensuring clients receive all updates from PENDING onwards. Single request creates order and subscribes to updates simultaneously. Client doesn't need to coordinate two separate requests (POST order → connect WebSocket). Server guarantees no missed status events.

### 4. BullMQ for Job Queue

Provides built-in retry, observability, and concurrency control. Implements exponential backoff retry (4 attempts: 2s → 4s → 8s), job metrics, progress tracking, and worker pool with rate limiting. Enables local development without external queue dependencies like AWS SQS.

### 5. Retry Strategy

Configured with 4 attempts and exponential backoff (2s → 4s → 8s). Retryable errors include `DexUnavailableError`, and `TransactionTimeoutError`. This handles transient failures gracefully without infinite loops on permanent errors.

### 6. Concurrent Processing

Configured for 10 concurrent orders with 100 orders/minute rate limit. Prevents DEX API rate limiting and resource overload while balancing throughput with system stability. Orders queue during traffic spikes; scale workers horizontally for higher throughput.


## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Docker Desktop (for PostgreSQL + Redis)
- Git

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd eternalabs
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration (defaults work for local development)
```

4. **Start The Application With Docker (PostgreSQL + Redis + Backend + Redis)**
```bash
npm run docker:up
```
This will automatically initialize the database schema using `scripts/init-db.sql`

5. **View logs**
```bash
npm run docker:logs
```

The API will be available at `http://localhost:8080`

### Testing
```bash
npm run docker:up

npm test

npm run test:watch

npm test -- --coverage
```

## API Documentation

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

**WebSocket Upgrade**:
The client can upgrade the connection to WebSocket by including the `Upgrade: websocket` header. The server will automatically establish a WebSocket connection for real-time status updates.

### Order Types

- `MARKET`: Execute immediately at current market price (currently implemented)

**Note**: Only MARKET orders are supported in the current version.

## WebSocket Events

After connecting via WebSocket upgrade, clients receive real-time status updates:

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

### Status Progression

1. **PENDING**: Order created and queued
2. **ROUTING**: Fetching quotes from Raydium + Meteora
3. **BUILDING**: Constructing transaction with best route
4. **SUBMITTED**: Transaction submitted to DEX
5. **CONFIRMED**: Transaction confirmed (includes signature)
6. **FAILED**: Execution failed (includes error)
7. **CANCELLED**: Order cancelled by user/system

### Connection Cleanup

- WebSocket connections are automatically cleaned up 30 seconds after terminal status (CONFIRMED/FAILED/CANCELLED)
- Multiple clients can subscribe to the same order
- Connections are removed when client disconnects

## Testing

The project includes 12 comprehensive tests covering:

### Test Coverage

1. **DEX Router Service** (2 tests)
   - Best quote selection based on highest amountOut
   - Error handling when all DEXs are unavailable

2. **Mock DEX Service** (2 tests)
   - Valid quote generation with correct fees
   - Transaction signature generation (88 characters)

3. **Redis Service** (2 tests)
   - Order storage and retrieval
   - Pub/Sub status update publishing

4. **Queue Service** (2 tests)
   - Job enqueueing with orderId as jobId
   - Retry configuration (4 attempts, exponential backoff)

5. **WebSocket Service** (2 tests)
   - Connection management for orders
   - Disconnection handling

6. **Order Validation** (2 tests)
   - Valid MARKET order validation
   - Invalid order rejection (negative amounts)

## Demo Video

[Link to YouTube demo video will be added here]

## Deployment

Deployed on Railway: [URL will be added here]
