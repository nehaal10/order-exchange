-- Create ENUM types
CREATE TYPE order_type AS ENUM ('MARKET', 'LIMIT', 'SNIPER');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'failed', 'cancelled');

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY,
    type order_type NOT NULL,
    status order_status NOT NULL DEFAULT 'pending',
    token_in VARCHAR(44) NOT NULL,
    token_out VARCHAR(44) NOT NULL,
    amount_in DECIMAL(20, 9) NOT NULL,
    limit_price DECIMAL(20, 9),

    -- Execution details (filled on completion - CONFIRMED only)
    executed_price DECIMAL(20, 9),
    amount_out DECIMAL(20, 9),
    dex_used VARCHAR(50),
    tx_signature VARCHAR(88),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT valid_amount CHECK (amount_in > 0)
);

-- Create indexes
CREATE INDEX idx_orders_type_status ON orders(type, status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
